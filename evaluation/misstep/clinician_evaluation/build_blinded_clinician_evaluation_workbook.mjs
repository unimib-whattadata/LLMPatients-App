import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = path.dirname(fileURLToPath(import.meta.url));
const misstepDir = path.resolve(outputDir, "..");
const sourceTranscriptDir = path.join(misstepDir, "transcripts");
const outputPath = path.join(outputDir, "LLMPatients_Misstep_Blinded_Clinician_Evaluation_Workbook.xlsx");

const transcriptIds = Array.from({ length: 20 }, (_, idx) => `T${String(idx + 1).padStart(3, "0")}`);

const colors = {
  navy: "#204C81",
  blueText: "#17324D",
  paleBlue: "#EAF1F8",
  headerBlue: "#D9E8F5",
  yellowInput: "#FFF2CC",
  border: "#C7D3DF",
  patient: "#F6FBFF",
  therapist: "#F9FAFB",
  section: "#EEF4FA",
};

const ratingDefinitions = [
  ["profile_coherence_1_5", "The patient presentation remains internally consistent with a plausible case profile."],
  ["multisession_continuity_1_5", "The patient carries forward relevant information across sessions in a coherent way."],
  ["clinical_plausibility_training_1_5", "The interaction is clinically plausible enough to support psychotherapy/interviewing training."],
  ["resistance_alliance_realism_1_5", "The patient's alliance, hesitation, resistance or rupture responses feel realistic."],
  ["educational_usefulness_1_5", "The transcript would be useful for trainee reflection or deliberate practice."],
  ["traceability_supervision_1_5", "The transcript gives enough observable material for supervision or feedback."],
];

const misstepDefinitions = [
  ["Safety / risk management", "Inadequate handling of safety, risk, suicidality, self-harm, crisis escalation or protective planning.", "Avoiding disclosed risk; vague reassurance; no safety plan when risk cues appear."],
  ["Empathy / listening", "Failure to listen empathically or response is dismissive, blaming, minimizing or invalidating.", "Cutting off emotion; minimizing distress; blaming lack of progress; ignoring rupture."],
  ["Structure / monitoring", "Poor session structure, weak monitoring, skipped assessment or premature move to techniques.", "Rushing intake; moving to exercises too early; ending without summary or next step."],
  ["Premature interpretation / diagnostic overreach", "Premature interpretation, diagnosis or causal explanation without enough evidence or collaboration.", "Labeling too early; unsupported diagnostic claim; telling the patient what resistance means."],
  ["Boundaries / self-disclosure", "Professional boundary crossing or self-disclosure that shifts focus away from the patient.", "Unrestricted messaging; over-sharing therapist experience; unclear availability."],
];

const misstepCategoryOptions = misstepDefinitions.map(([label]) => label);

function splitWrappedText(text, maxLen = 32000) {
  if (!text || text.length <= maxLen) return text || "";
  return text.slice(0, maxLen - 20) + " [TRUNCATED FOR EXCEL CELL LIMIT]";
}

function contextSnippet(text, maxLen = 260) {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen).trim()}... [full context below]`;
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

async function parseTranscript(transcriptId) {
  const filePath = path.join(sourceTranscriptDir, `transcript_${transcriptId}.md`);
  const text = blindTranscript(await fs.readFile(filePath, "utf8"));
  const lines = text.split(/\r?\n/);
  let sessionNumber = "";
  let sessionTitle = "";
  const rows = [];

  for (const line of lines) {
    const sessionMatch = line.match(/^## Session\s+(\d+):\s*(.+)$/);
    if (sessionMatch) {
      sessionNumber = Number(sessionMatch[1]);
      sessionTitle = sessionMatch[2].trim();
      continue;
    }
    const turnMatch = line.match(/^\*\*(Therapist|Patient)\s+(\d+):\*\*\s*(.*)$/);
    if (turnMatch) {
      rows.push({
        transcriptId,
        session: sessionNumber,
        sessionTitle,
        turn: Number(turnMatch[2]),
        speaker: turnMatch[1],
        turnLabel: `${turnMatch[1]} ${turnMatch[2]}`,
        turnReference: `Session ${sessionNumber}, ${turnMatch[1]} ${turnMatch[2]}`,
        text: splitWrappedText(turnMatch[3].trim()),
      });
    }
  }
  return rows;
}

function styleTitle(sheet, title, subtitle, widthCells = "A1:J1") {
  sheet.getRange(widthCells).merge();
  sheet.getRange("A1").values = [[title]];
  sheet.getRange(widthCells).format.fill.color = colors.navy;
  sheet.getRange(widthCells).format.font.color = "#FFFFFF";
  sheet.getRange(widthCells).format.font.bold = true;
  sheet.getRange(widthCells).format.font.size = 15;
  sheet.getRange(widthCells).format.horizontalAlignment = "Left";
  sheet.getRange(widthCells).format.rowHeightPx = 28;

  if (subtitle) {
    const subtitleRange = widthCells.replace(/1/g, "2");
    sheet.getRange(subtitleRange).merge();
    sheet.getRange("A2").values = [[subtitle]];
    sheet.getRange(subtitleRange).format.fill.color = colors.paleBlue;
    sheet.getRange(subtitleRange).format.font.color = "#1F2937";
    sheet.getRange(subtitleRange).format.wrapText = true;
    sheet.getRange(subtitleRange).format.rowHeightPx = 38;
  }
}

function styleHeader(range) {
  range.format.fill.color = colors.headerBlue;
  range.format.font.bold = true;
  range.format.font.color = colors.blueText;
  range.format.wrapText = true;
  range.format.verticalAlignment = "Middle";
}

function styleBody(range) {
  range.format.wrapText = true;
  range.format.verticalAlignment = "Top";
}

function styleInput(range) {
  range.format.fill.color = colors.yellowInput;
  range.format.wrapText = true;
  range.format.verticalAlignment = "Top";
}

function styleSection(range) {
  range.merge();
  range.format.fill.color = colors.section;
  range.format.font.bold = true;
  range.format.font.color = colors.blueText;
  range.format.wrapText = true;
  range.format.rowHeightPx = 24;
}

function setWidths(sheet, widths) {
  widths.forEach((width, col) => {
    sheet.getRangeByIndexes(0, col, 1, 1).format.columnWidthPx = width;
  });
}

function addTable(sheet, rangeAddress, name, style = "TableStyleMedium2") {
  const table = sheet.tables.add(rangeAddress, true, name);
  table.style = style;
  table.showFilterButton = true;
  return table;
}

function addValidation(sheet, rangeAddress, rule) {
  sheet.getRange(rangeAddress).dataValidation = { rule };
}

function addBorders(range) {
  range.format.borders = { all: { style: "Continuous", color: colors.border, weight: "Thin" } };
}

function sheetFormulaForClinicianId() {
  return '=IF(Instructions!$B$15="","",Instructions!$B$15)';
}

function buildInstructions(workbook) {
  const sheet = workbook.worksheets.add("Instructions");
  sheet.showGridLines = false;
  styleTitle(
    sheet,
    "LLMPatients Clinician Evaluation Packet",
    "Use one transcript tab at a time. Each tab contains the transcript, rating form and misstep annotation form.",
    "A1:C1",
  );

  const rows = [
    ["Workflow", "1) Enter your clinician ID below. 2) Open T001. 3) Complete Step 1 ratings. 4) In Step 2, annotate each therapist turn directly. 5) Use Step 3 only if you need the full transcript context."],
    ["Blinding", "Do not infer or record which system generated a transcript. Condition labels, model details, script variants and system metadata are intentionally omitted."],
    ["Rating scale", "Use integers only: 1 = very poor / not suitable; 2 = weak; 3 = adequate but mixed; 4 = good; 5 = excellent."],
    ["Misstep coding", "For each therapist turn, set Misstep? to Yes or No. If Yes, choose one category, add confidence and write a short rationale or feedback note."],
    ["No clear misstep", "If there is no clear misstep for a therapist turn, leave Misstep? as No and leave the remaining annotation fields blank."],
    ["Turn references", "Use exact labels such as Session 2, Therapist 4. They appear above each dialogue turn in the transcript area."],
    ["Confidence", "1 = low / ambiguous; 2 = moderate; 3 = high / clear."],
    ["Do not use", "Do not use raw folders, manifests, repository files, condition keys, model metadata or guesses about the generating system."],
    ["Return", "Return the completed workbook. Do not add condition labels or system guesses."],
  ];

  sheet.getRange("A4:B12").values = rows;
  styleHeader(sheet.getRange("A4:A12"));
  styleBody(sheet.getRange("B4:B12"));
  addBorders(sheet.getRange("A4:B12"));
  sheet.getRange("A4:B12").format.rowHeightPx = 46;

  sheet.getRange("A15:B15").values = [["clinician_id", ""]];
  styleHeader(sheet.getRange("A15:A15"));
  styleInput(sheet.getRange("B15:B15"));
  addBorders(sheet.getRange("A15:B15"));

  sheet.getRange("A18:C18").values = [["Input color legend", "Yellow cells are intended for clinician input.", "Blue headers and transcript text should not be edited."]];
  styleHeader(sheet.getRange("A18:C18"));
  addBorders(sheet.getRange("A18:C18"));

  setWidths(sheet, [190, 850, 420]);
  sheet.freezePanes.freezeRows(3);
}

function buildDefinitions(workbook) {
  const sheet = workbook.worksheets.add("Definitions");
  sheet.showGridLines = false;
  styleTitle(sheet, "Definitions and Coding Rules", "Use these definitions while completing each transcript tab.", "A1:C1");

  sheet.getRange("A4:B4").values = [["Rating dimension", "Definition"]];
  sheet.getRange(`A5:B${4 + ratingDefinitions.length}`).values = ratingDefinitions;
  styleHeader(sheet.getRange("A4:B4"));
  styleBody(sheet.getRange(`A5:B${4 + ratingDefinitions.length}`));
  addTable(sheet, `A4:B${4 + ratingDefinitions.length}`, "RatingDefinitions");

  const misstepStart = 14;
  sheet.getRange(`A${misstepStart}:C${misstepStart}`).values = [["Misstep category", "Positive label when", "Examples"]];
  sheet.getRange(`A${misstepStart + 1}:C${misstepStart + misstepDefinitions.length}`).values = misstepDefinitions;
  styleHeader(sheet.getRange(`A${misstepStart}:C${misstepStart}`));
  styleBody(sheet.getRange(`A${misstepStart + 1}:C${misstepStart + misstepDefinitions.length}`));
  addTable(sheet, `A${misstepStart}:C${misstepStart + misstepDefinitions.length}`, "MisstepDefinitions");
  setWidths(sheet, [285, 560, 560]);
  sheet.freezePanes.freezeRows(3);
}

function buildProgress(workbook) {
  const sheet = workbook.worksheets.add("Progress");
  sheet.showGridLines = false;
  styleTitle(sheet, "Progress Tracker", "Use this optional sheet to track which transcript tabs are complete.", "A1:F1");

  const rows = transcriptIds.map((id) => [id, id, "Not started", "Not started", "No", ""]);
  sheet.getRange("A4:F4").values = [["transcript_id", "worksheet", "rating_status", "misstep_status", "ready_to_return", "notes"]];
  sheet.getRange(`A5:F${4 + rows.length}`).values = rows;
  styleHeader(sheet.getRange("A4:F4"));
  styleInput(sheet.getRange(`C5:F${4 + rows.length}`));
  addTable(sheet, `A4:F${4 + rows.length}`, "ProgressTracker");
  addValidation(sheet, `C5:D${4 + rows.length}`, { type: "list", values: ["Not started", "In progress", "Complete"] });
  addValidation(sheet, `E5:E${4 + rows.length}`, { type: "list", values: ["No", "Yes"] });
  setWidths(sheet, [120, 110, 150, 150, 135, 520]);
  sheet.freezePanes.freezeRows(4);
}

function getTherapistAnnotationRows(rows) {
  return rows
    .filter((turn) => turn.speaker === "Therapist")
    .map((turn) => {
      const patientResponse = rows.find(
        (candidate) => candidate.speaker === "Patient"
          && candidate.session === turn.session
          && candidate.turn === turn.turn,
      );
      return [
        turn.session,
        turn.turnReference,
        turn.text,
        contextSnippet(patientResponse?.text || ""),
        "No",
        "",
        "",
        "",
        "",
        "",
      ];
    });
}

function buildTranscriptSheet(workbook, transcriptId, rows) {
  const sheet = workbook.worksheets.add(transcriptId);
  sheet.showGridLines = false;
  setWidths(sheet, [210, 150, 380, 380, 145, 220, 95, 300, 320, 220]);
  styleTitle(
    sheet,
    `${transcriptId} - Blinded Transcript Evaluation`,
    "Complete Step 1 and Step 2 in the yellow cells. Use the transcript blocks below for turn references.",
    "A1:J1",
  );

  sheet.getRange("A4:J4").values = [["Step 1 - Transcript-level ratings. Put a score from 1 to 5 in each yellow score cell. Optional notes can stay blank."]];
  styleSection(sheet.getRange("A4:J4"));
  sheet.getRange("A5:C5").values = [["Dimension", "Score 1-5", "Optional notes"]];
  styleHeader(sheet.getRange("A5:C5"));
  const ratingRows = [
    ["Profile coherence", "", ""],
    ["Multi-session continuity", "", ""],
    ["Clinical plausibility for training", "", ""],
    ["Resistance/alliance realism", "", ""],
    ["Educational usefulness", "", ""],
    ["Traceability/supervision usefulness", "", ""],
  ];
  sheet.getRange("A6:C11").values = ratingRows;
  styleHeader(sheet.getRange("A6:A11"));
  styleInput(sheet.getRange("B6:B11"));
  styleInput(sheet.getRange("C6:C11"));
  addBorders(sheet.getRange("A5:C11"));
  addValidation(sheet, "B6:B11", { type: "whole", operator: "between", formula1: 1, formula2: 5 });
  sheet.getRange("A5:C11").format.rowHeightPx = 28;

  sheet.getRange("E5:F7").values = [
    ["clinician_id", ""],
    ["transcript_id", transcriptId],
    ["rating_complete", "No"],
  ];
  sheet.getRange("F5:F5").formulas = [[sheetFormulaForClinicianId()]];
  styleHeader(sheet.getRange("E5:E7"));
  styleBody(sheet.getRange("F5:F6"));
  styleInput(sheet.getRange("F7:F7"));
  addBorders(sheet.getRange("E5:F7"));
  addValidation(sheet, "F7:F7", { type: "list", values: ["No", "Yes"] });

  sheet.getRange("A13:J13").values = [["Step 2 - Direct therapist-turn misstep annotation. Review each therapist turn and annotate in the yellow cells on the same row."]];
  styleSection(sheet.getRange("A13:J13"));
  sheet.getRange("A14:J14").values = [["Default is No. If a therapist turn contains a clear misstep, change Misstep? to Yes, choose a category, add confidence and briefly explain why. Patient context is shortened here; full dialogue is in Step 3."]];
  sheet.getRange("A14:J14").merge();
  sheet.getRange("A14:J14").format.fill.color = colors.paleBlue;
  sheet.getRange("A14:J14").format.font.color = colors.blueText;
  sheet.getRange("A14:J14").format.wrapText = true;
  sheet.getRange("A14:J14").format.rowHeightPx = 28;

  sheet.getRange("A15:J15").values = [[
    "Session",
    "Turn reference",
    "Therapist turn",
    "Patient response/context",
    "Misstep?",
    "Category",
    "Confidence 1-3",
    "Why this is a misstep",
    "Better response / feedback",
    "Optional notes",
  ]];
  styleHeader(sheet.getRange("A15:J15"));
  const annotationRows = getTherapistAnnotationRows(rows);
  sheet.getRange("A16:J30").values = annotationRows;
  styleBody(sheet.getRange("A16:D30"));
  styleInput(sheet.getRange("E16:J30"));
  addBorders(sheet.getRange("A15:J30"));
  addValidation(sheet, "E16:E30", { type: "list", values: ["No", "Yes"] });
  addValidation(sheet, "F16:F30", { type: "list", values: misstepCategoryOptions });
  addValidation(sheet, "G16:G30", { type: "whole", operator: "between", formula1: 1, formula2: 3 });
  sheet.getRange("A16:J30").format.rowHeightPx = 72;

  sheet.getRange("A32:J32").values = [["Step 3 - Full transcript context. Use this only when you need to inspect the surrounding dialogue."]];
  styleSection(sheet.getRange("A32:J32"));
  sheet.getRange("A33:J33").values = [["Each block below shows the exact turn reference followed by the dialogue text."]];
  sheet.getRange("A33:J33").merge();
  sheet.getRange("A33:J33").format.fill.color = colors.paleBlue;
  sheet.getRange("A33:J33").format.font.color = colors.blueText;
  sheet.getRange("A33:J33").format.wrapText = true;
  sheet.getRange("A33:J33").format.rowHeightPx = 24;

  let rowCursor = 34;
  for (const turn of rows) {
    const metaFill = turn.speaker === "Therapist" ? colors.therapist : colors.patient;
    sheet.getRange(`A${rowCursor}:J${rowCursor}`).merge();
    sheet.getRange(`A${rowCursor}`).values = [[`${turn.turnReference} | ${turn.sessionTitle}`]];
    sheet.getRange(`A${rowCursor}:J${rowCursor}`).format.fill.color = metaFill;
    sheet.getRange(`A${rowCursor}:J${rowCursor}`).format.font.bold = true;
    sheet.getRange(`A${rowCursor}:J${rowCursor}`).format.font.color = colors.blueText;
    sheet.getRange(`A${rowCursor}:J${rowCursor}`).format.wrapText = true;
    sheet.getRange(`A${rowCursor}:J${rowCursor}`).format.rowHeightPx = 22;

    const textRow = rowCursor + 1;
    sheet.getRange(`A${textRow}:J${textRow}`).merge();
    sheet.getRange(`A${textRow}`).values = [[turn.text]];
    sheet.getRange(`A${textRow}:J${textRow}`).format.fill.color = metaFill;
    sheet.getRange(`A${textRow}:J${textRow}`).format.wrapText = true;
    sheet.getRange(`A${textRow}:J${textRow}`).format.verticalAlignment = "Top";
    sheet.getRange(`A${textRow}:J${textRow}`).format.rowHeightPx = turn.text.length > 420 ? 86 : 66;
    addBorders(sheet.getRange(`A${rowCursor}:J${textRow}`));
    rowCursor += 2;
  }

  sheet.freezePanes.freezeRows(15);
  sheet.freezePanes.freezeColumns(4);
}

const workbook = Workbook.create();

buildInstructions(workbook);
buildDefinitions(workbook);
buildProgress(workbook);

for (const transcriptId of transcriptIds) {
  const rows = await parseTranscript(transcriptId);
  buildTranscriptSheet(workbook, transcriptId, rows);
}

if (process.env.RENDER_PREVIEWS === "1") {
  const previewRanges = [
    ["Instructions", "A1:C19"],
    ["Definitions", "A1:C22"],
    ["Progress", "A1:F25"],
    ["T001", "A1:J36"],
    ["T010", "A1:J36"],
    ["T020", "A1:J36"],
  ];

  for (const [sheetName, range] of previewRanges) {
    await workbook.render({ sheetName, range, scale: 1, format: "png" });
  }
}

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);
