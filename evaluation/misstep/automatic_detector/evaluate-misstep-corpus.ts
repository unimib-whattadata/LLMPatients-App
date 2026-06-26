import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import YAML from "yaml";

import { MISSTEP_CATEGORIES } from "../../../src/lib/missteps";
import { evaluateStepMissteps } from "../../../src/server/services/misstep-evaluator";

type TranscriptMetadata = {
  transcriptId: string;
  patientId: string;
  conditionCode: string;
  scriptVariant: string;
};

type Message = {
  id: string;
  content: string;
  sender: "user" | "patient";
  stepId: number;
  timestamp: string;
};

type PatientForEvaluation = Parameters<typeof evaluateStepMissteps>[0]["patient"];

const DEFAULT_TRANSCRIPT_DIR = path.resolve(
  process.cwd(),
  "evaluation/misstep/transcripts",
);
const DEFAULT_OUTPUT_DIR = path.resolve(
  process.cwd(),
  "evaluation/misstep/automatic_detector",
);
const DEFAULT_PATIENT_FALLBACK_MESSAGES = [
  "I'm sorry, I'm not sure how to respond. Could you repeat that?",
  "I'm sorry, I'm not sure how to respond.",
] as const;
const OMITTABLE_PUNCTUATION = /[^\p{L}\p{N}\s']/gu;
const WHITESPACE = /\s+/g;

function getArg(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(OMITTABLE_PUNCTUATION, " ")
    .replace(WHITESPACE, " ")
    .trim();
}

function parseMetadata(markdown: string): TranscriptMetadata {
  const get = (label: string) => {
    const match = markdown.match(new RegExp(`^${label}:\\s*(.+)$`, "m"));
    return match?.[1]?.trim() ?? "";
  };

  const transcriptId =
    markdown.match(/^#\s+(T\d{3})\s*$/m)?.[1] ?? get("Transcript ID");

  return {
    transcriptId,
    patientId: get("Patient"),
    conditionCode: get("Condition code"),
    scriptVariant: get("Script variant"),
  };
}

function parseMessages(markdown: string, transcriptId: string): Message[] {
  const messages: Array<Omit<Message, "id" | "timestamp">> = [];
  let current: Omit<Message, "id" | "timestamp"> | null = null;

  const flush = () => {
    if (!current) return;
    const content = current.content.trim();
    if (content) {
      messages.push({ ...current, content });
    }
    current = null;
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    const turnMatch = line.match(/^\*\*(Therapist|Patient)\s+\d+:\*\*\s*(.*)$/);

    if (turnMatch) {
      flush();
      current = {
        content: turnMatch[2]?.trim() ?? "",
        sender: turnMatch[1] === "Therapist" ? "user" : "patient",
        stepId: 1,
      };
      continue;
    }

    if (
      !current ||
      !line ||
      line.startsWith("#") ||
      line.startsWith("_System metadata:")
    ) {
      continue;
    }

    current.content = `${current.content}\n${line}`.trim();
  }

  flush();

  const baseTime = Date.UTC(2026, 0, 1, 0, 0, 0);
  return messages.map((message, index) => ({
    ...message,
    id: `${transcriptId}-${index + 1}`,
    timestamp: new Date(baseTime + index * 60_000).toISOString(),
  }));
}

function buildNormalizedMessages(messages: Message[]) {
  const ignoredPatientMessages = new Set(
    DEFAULT_PATIENT_FALLBACK_MESSAGES.map((message) => normalizeText(message)),
  );

  return messages
    .filter((message) => {
      if (!message.content.trim()) return false;
      if (
        message.sender === "patient" &&
        ignoredPatientMessages.has(normalizeText(message.content))
      ) {
        return false;
      }
      return true;
    })
    .map((message, index) => ({ ...message, turnId: index + 1 }));
}

function readPatient(patientId: string): PatientForEvaluation {
  const patientPath = path.resolve(process.cwd(), "patients", `${patientId}.yaml`);
  const parsed = YAML.parse(readFileSync(patientPath, "utf8")) as {
    identifiers?: { patientId?: string };
    profile?: {
      name?: string;
      gender?: string | null;
      smallDescription?: string | null;
      diagnosis?: string | null;
      psychologicalProfile?: string | null;
    };
    therapy?: {
      objectives?: string[];
      difficulty?: number | null;
    };
    clinical?: {
      clinicalCase?: string | null;
      details?: unknown;
    };
  };

  return {
    id: parsed.identifiers?.patientId ?? patientId,
    name: parsed.profile?.name ?? patientId,
    smallDescription: parsed.profile?.smallDescription ?? null,
    details:
      parsed.clinical?.details === undefined
        ? null
        : JSON.stringify(parsed.clinical.details),
    background: parsed.clinical?.clinicalCase ?? null,
    objectives: parsed.therapy?.objectives ?? [],
    diagnosis: parsed.profile?.diagnosis ?? null,
    difficulty: parsed.therapy?.difficulty ?? null,
    gender: parsed.profile?.gender ?? null,
    psychologicalProfile: parsed.profile?.psychologicalProfile ?? null,
  };
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

async function main() {
  const transcriptDir = getArg("transcript-dir", DEFAULT_TRANSCRIPT_DIR);
  const outputDir = getArg("output-dir", DEFAULT_OUTPUT_DIR);
  const limit = Number.parseInt(getArg("limit", "0"), 10);

  mkdirSync(outputDir, { recursive: true });

  const transcriptFiles = readdirSync(transcriptDir)
    .filter((file) => /^transcript_T\d{3}\.md$/.test(file))
    .sort()
    .slice(0, limit > 0 ? limit : undefined);

  const results = [];

  for (const file of transcriptFiles) {
    const markdown = readFileSync(path.join(transcriptDir, file), "utf8");
    const metadata = parseMetadata(markdown);
    const messages = parseMessages(markdown, metadata.transcriptId);
    const normalizedMessages = buildNormalizedMessages(messages);
    const normalizedByTurnId = new Map(
      normalizedMessages.map((message) => [message.turnId, message]),
    );
    const therapistTurnByMessageId = new Map<string, number>();
    let therapistTurn = 0;

    for (const message of normalizedMessages) {
      if (message.sender === "user") {
        therapistTurn += 1;
        therapistTurnByMessageId.set(message.id, therapistTurn);
      }
    }

    process.stderr.write(
      `Evaluating ${metadata.transcriptId} (${metadata.scriptVariant}) with ${therapistTurn} therapist turns...\n`,
    );

    const evaluation = await evaluateStepMissteps({
      therapySessionId: metadata.transcriptId,
      stepNumber: 1,
      messages,
      patient: readPatient(metadata.patientId),
    });

    const detected = evaluation.categories.filter((category) => category.present);
    const detectedCategories = detected.map((category) => {
      const therapistTurns = [
        ...new Set(
          category.evidence
            .flatMap((item) => item.turnIds ?? [])
            .map((turnId) => normalizedByTurnId.get(turnId))
            .filter((message): message is Message & { turnId: number } =>
              Boolean(message),
            )
            .filter((message) => message.sender === "user")
            .map((message) => therapistTurnByMessageId.get(message.id))
            .filter((turn): turn is number => typeof turn === "number"),
        ),
      ].sort((left, right) => left - right);

      return {
        id: category.id,
        label: category.label,
        severity: category.severity,
        confidence: category.confidence,
        therapistTurns,
        evidence: category.evidence,
      };
    });

    results.push({
      ...metadata,
      modelName: evaluation.modelName,
      detectorVersion: evaluation.detectorVersion,
      computedAt: evaluation.computedAt,
      summary: evaluation.summary,
      detectedCategories,
      allCategories: evaluation.categories,
    });
  }

  const jsonPath = path.join(outputDir, "misstep_corpus_app_results.json");
  const csvPath = path.join(outputDir, "misstep_corpus_app_summary.csv");
  writeFileSync(jsonPath, `${JSON.stringify(results, null, 2)}\n`);

  const rows = [
    [
      "transcript_id",
      "patient_id",
      "condition_code",
      "script_variant",
      "model_name",
      "detected_count",
      "high_severity_detected_count",
      "therapist_turn_count",
      "detected_categories",
      "evidence_therapist_turns",
    ],
    ...results.map((result) => [
      result.transcriptId,
      result.patientId,
      result.conditionCode,
      result.scriptVariant,
      result.modelName,
      result.summary.detectedCount,
      result.summary.highSeverityDetectedCount,
      result.summary.therapistTurnCount,
      result.detectedCategories
        .map(
          (category) =>
            `${category.id}:${category.confidence.toFixed(2)}(sev${category.severity})`,
        )
        .join("; "),
      result.detectedCategories
        .map(
          (category) =>
            `${category.id}=[${category.therapistTurns.join("|")}]`,
        )
        .join("; "),
    ]),
  ];

  writeFileSync(
    csvPath,
    `${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`,
  );

  const byVariant = new Map<string, { transcripts: number; flagged: number }>();
  for (const result of results) {
    const current = byVariant.get(result.scriptVariant) ?? {
      transcripts: 0,
      flagged: 0,
    };
    current.transcripts += 1;
    if (result.summary.detectedCount > 0) current.flagged += 1;
    byVariant.set(result.scriptVariant, current);
  }

  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${csvPath}`);
  console.log(
    JSON.stringify(
      {
        transcripts: results.length,
        byVariant: Object.fromEntries(byVariant),
        categories: MISSTEP_CATEGORIES.map((category) => category.id),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
