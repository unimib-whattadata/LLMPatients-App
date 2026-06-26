import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const outputDir = path.dirname(fileURLToPath(import.meta.url));
const misstepDir = path.resolve(outputDir, "..");
const sourceTranscriptDir = path.join(misstepDir, "transcripts");
const workbookPath = path.join(outputDir, "LLMPatients_Misstep_Blinded_Clinician_Evaluation_Workbook.xlsx");
const transcriptIds = Array.from({ length: 20 }, (_, idx) => `T${String(idx + 1).padStart(3, "0")}`);
const completeReplyEndPattern = /[.!?…][)'"\]]*$/;

const input = await FileBlob.load(workbookPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const failures = [];
const warnings = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function nonEmpty(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function values(sheetName, range) {
  return workbook.worksheets.getItem(sheetName).getRange(range).values;
}

function blindTranscript(text) {
  const lines = text.split(/\r?\n/);
  const output = [];
  let skipHeader = true;

  for (const line of lines) {
    if (skipHeader) {
      if (line.startsWith("# ")) {
        output.push(line, "", `Transcript ID: ${line.slice(2).trim()}`, "");
      } else if (line.startsWith("## Session")) {
        skipHeader = false;
        output.push(line);
      }
      continue;
    }

    if (/^_System metadata:/.test(line)) continue;
    output.push(line);
  }

  return `${output.join("\n").trim()}\n`;
}

async function sourcePatientTurns(transcriptId) {
  const text = blindTranscript(await fs.readFile(path.join(sourceTranscriptDir, `transcript_${transcriptId}.md`), "utf8"));
  return [...text.matchAll(/\*\*Patient \d+:\*\*\s*([^]*?)(?=\n\n\*\*Therapist|\n\n## Session|$)/g)]
    .map((match) => match[1].trim());
}

const expectedSheets = ["Instructions", "Definitions", "Progress", ...transcriptIds];
for (const sheetName of expectedSheets) {
  try {
    workbook.worksheets.getItem(sheetName);
  } catch {
    failures.push(`Missing sheet: ${sheetName}`);
  }
}

const progressRows = values("Progress", "A5:F24");
assert(progressRows.length === 20, `Progress should contain 20 rows, found ${progressRows.length}.`);
assert(JSON.stringify(progressRows.map((row) => row[0])) === JSON.stringify(transcriptIds), "Progress IDs are not T001-T020 in order.");

for (const transcriptId of transcriptIds) {
  const ratingRows = values(transcriptId, "A6:C11");
  assert(ratingRows.length === 6, `${transcriptId}: expected 6 rating rows.`);
  assert(ratingRows.every((row) => nonEmpty(row[0]) && !nonEmpty(row[1]) && !nonEmpty(row[2])), `${transcriptId}: rating form should have dimensions and blank score/notes cells.`);
  const metadataRows = values(transcriptId, "E5:F7");
  assert(metadataRows[1][1] === transcriptId, `${transcriptId}: transcript_id metadata mismatch.`);
  assert(metadataRows[2][1] === "No", `${transcriptId}: rating_complete should default to No.`);

  const annotationRows = values(transcriptId, "A16:J30");
  assert(annotationRows.length === 15, `${transcriptId}: expected 15 direct therapist-turn annotation rows.`);
  assert(annotationRows.every((row) => nonEmpty(row[0]) && nonEmpty(row[1]) && nonEmpty(row[2]) && nonEmpty(row[3])), `${transcriptId}: annotation rows should include therapist turn and patient context.`);
  assert(annotationRows.every((row) => row[4] === "No" && row.slice(5, 10).every((value) => !nonEmpty(value))), `${transcriptId}: annotation input cells should default to Misstep? = No and otherwise blank.`);

  const transcriptBlock = values(transcriptId, "A34:J93");
  assert(transcriptBlock.length === 60, `${transcriptId}: transcript block should contain 60 rows.`);
  let therapistTurns = 0;
  let patientTurns = 0;
  const sessions = new Set();
  for (let idx = 0; idx < 30; idx++) {
    const meta = transcriptBlock[idx * 2];
    const textRow = transcriptBlock[idx * 2 + 1];
    const metaText = String(meta[0] || "");
    const metaMatch = metaText.match(/^Session (\d+), (Therapist|Patient) \d+/);
    if (metaMatch) {
      sessions.add(Number(metaMatch[1]));
      if (metaMatch[2] === "Therapist") therapistTurns += 1;
      if (metaMatch[2] === "Patient") patientTurns += 1;
    }
    assert(nonEmpty(metaText), `${transcriptId}: missing turn reference at transcript turn ${idx + 1}.`);
    assert(nonEmpty(textRow[0]), `${transcriptId}: missing dialogue text at transcript turn ${idx + 1}.`);
  }
  assert(therapistTurns === 15, `${transcriptId}: expected 15 therapist turns, found ${therapistTurns}.`);
  assert(patientTurns === 15, `${transcriptId}: expected 15 patient turns, found ${patientTurns}.`);
  assert(JSON.stringify([...sessions].sort()) === JSON.stringify([1, 2, 3]), `${transcriptId}: expected sessions 1,2,3.`);

  const patientTexts = await sourcePatientTurns(transcriptId);
  assert(patientTexts.length === 15, `${transcriptId}: source should contain 15 patient turns, found ${patientTexts.length}.`);
  patientTexts.forEach((text, idx) => {
    assert(text.length >= 100, `${transcriptId}: Patient ${idx + 1} source text is suspiciously short (${text.length} chars).`);
    assert(completeReplyEndPattern.test(text), `${transcriptId}: Patient ${idx + 1} source text does not end as a complete sentence.`);
  });
}

const visibleRanges = [
  ["Instructions", "A1:C18"],
  ["Definitions", "A1:C19"],
  ["Progress", "A1:F24"],
  ...transcriptIds.map((id) => [id, "A1:J93"]),
];
const visibleText = visibleRanges
  .flatMap(([sheetName, range]) => values(sheetName, range).flat())
  .filter(nonEmpty)
  .join("\n");
const leakageTerms = ["Full LLMPatients", "Prompt-only", "prompt-only", "baseline", "condition_id", "condition_label", "case_id", "patient_id", "run_id", "provider", "gpt-", "gemini", "claude"];
const foundLeakage = leakageTerms.filter((term) => visibleText.toLowerCase().includes(term.toLowerCase()));
assert(foundLeakage.length === 0, `Potential blinding leakage terms found: ${foundLeakage.join(", ")}`);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
const errorText = errors.ndjson;
assert(errorText.includes("matched 0 entries"), "Formula error scan did not return zero matches.");

if (process.env.RENDER_PREVIEWS === "1") {
  const previews = [
    ["Instructions", "A1:C19"],
    ["Progress", "A1:F25"],
    ["T001", "A1:J40"],
    ["T010", "A1:J40"],
    ["T020", "A1:J40"],
    ["Definitions", "A1:C22"],
  ];

  for (const [sheetName, range] of previews) {
    const blob = await workbook.render({ sheetName, range, scale: 1, format: "png" });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    await fs.writeFile(path.join(outputDir, `preview_${sheetName.replaceAll(" ", "_")}.png`), bytes);
  }
}

console.log(JSON.stringify({
  status: failures.length ? "FAIL" : "PASS",
  failures,
  warnings,
  counts: {
    sheets: expectedSheets.length,
    transcriptSheets: transcriptIds.length,
    progressRows: progressRows.length,
    turnsPerTranscript: 30,
    directAnnotationRowsPerTranscript: 15,
  },
}, null, 2));
