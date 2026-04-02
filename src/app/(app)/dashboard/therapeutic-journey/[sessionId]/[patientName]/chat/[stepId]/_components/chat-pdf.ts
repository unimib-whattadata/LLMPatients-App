import type { User } from "~/types";

import { formatSessionTime } from "./chat-utils";
import {
  buildPdfStepScopedVectorTimeline,
  clampTimelineIntensity,
  getPdfSeriesColor,
  getPdfSeriesKeys,
  getPdfSeriesLabel,
  normalizeEmotionToken,
  type PdfEmotionChartPoint,
} from "./chat-emotion-utils";
import type { ChatMessage, PatientData, TherapySessionData } from "./chat-types";
import type { QuestionAnswerRow } from "./chat-message-utils";

interface ExportChatStepPdfOptions {
  patient: PatientData;
  therapySession?: TherapySessionData;
  stepId: number;
  user: User;
  sessionTime: number;
  messages: ChatMessage[];
  isStepCompleted: boolean;
  questionAnswerRows: QuestionAnswerRow[];
  pdfHeaderAvatarDataUrl: string | null;
  patientAvatarInitials: string;
}

function normalizePdfText(value: string | null | undefined): string {
  if (!value?.trim()) return "N/A";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function exportChatStepPdf({
  patient,
  therapySession,
  stepId,
  user,
  sessionTime,
  messages,
  isStepCompleted,
  questionAnswerRows,
  pdfHeaderAvatarDataUrl,
  patientAvatarInitials,
}: ExportChatStepPdfOptions): Promise<void> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const exportDateTime = new Date().toLocaleString("en-US");

  const metadataRows: Array<[string, string]> = [
    ["Patient Name", normalizePdfText(patient.name)],
    ["Internal Patient ID", normalizePdfText(patient.id)],
    ["External Patient ID", normalizePdfText(therapySession?.externalPatientId)],
    ["Therapy Session ID", normalizePdfText(therapySession?.id)],
    ["Session Number", String(therapySession?.sessionNumber ?? "N/A")],
    ["Session Step", `Session ${stepId}`],
    ["Therapist", normalizePdfText(user.name ?? user.email)],
    ["Duration", formatSessionTime(sessionTime)],
    ["Total Messages", String(messages.length)],
    ["Status", isStepCompleted ? "Completed" : "In Progress"],
    ["Export Date", exportDateTime],
  ];

  doc.setFillColor(28, 25, 23);
  doc.rect(0, 0, pageWidth, 36, "F");
  doc.setFillColor(132, 204, 22);
  doc.rect(0, 34, pageWidth, 2, "F");

  const headerAvatarSize = 20;
  const headerAvatarX = pageWidth - marginX - headerAvatarSize;
  const headerAvatarY = 8;
  const headerTextMaxWidth = headerAvatarX - marginX - 5;

  doc.setDrawColor(132, 204, 22);
  doc.setLineWidth(0.8);
  doc.rect(
    headerAvatarX - 1,
    headerAvatarY - 1,
    headerAvatarSize + 2,
    headerAvatarSize + 2,
    "S",
  );

  if (pdfHeaderAvatarDataUrl) {
    const imageFormat = pdfHeaderAvatarDataUrl.startsWith("data:image/png")
      ? "PNG"
      : "JPEG";
    doc.addImage(
      pdfHeaderAvatarDataUrl,
      imageFormat,
      headerAvatarX,
      headerAvatarY,
      headerAvatarSize,
      headerAvatarSize,
    );
  } else {
    doc.setFillColor(68, 64, 60);
    doc.rect(
      headerAvatarX,
      headerAvatarY,
      headerAvatarSize,
      headerAvatarSize,
      "F",
    );
    doc.setTextColor(245, 245, 244);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(
      patientAvatarInitials,
      headerAvatarX + headerAvatarSize / 2,
      headerAvatarY + headerAvatarSize / 2 + 1,
      { align: "center" },
    );
  }

  doc.setTextColor(245, 245, 244);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Therapy Conversation Report", marginX, 14, {
    maxWidth: headerTextMaxWidth,
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${normalizePdfText(patient.name)} · Session ${stepId}`, marginX, 21, {
    maxWidth: headerTextMaxWidth,
  });
  doc.text(`Generated on ${exportDateTime}`, marginX, 27, {
    maxWidth: headerTextMaxWidth,
  });

  autoTable(doc, {
    startY: 42,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    head: [["Field", "Value"]],
    body: metadataRows,
    styles: {
      fontSize: 8.5,
      cellPadding: 2.8,
      textColor: [41, 37, 36],
      lineColor: [214, 211, 209],
      lineWidth: 0.2,
      valign: "middle",
    },
    headStyles: {
      fillColor: [54, 83, 20],
      textColor: [245, 245, 244],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [250, 250, 249],
    },
    columnStyles: {
      0: {
        cellWidth: 48,
        fontStyle: "bold",
        fillColor: [245, 245, 244],
      },
      1: {
        cellWidth: pageWidth - marginX * 2 - 48,
      },
    },
  });

  const docWithTableState = doc as typeof doc & {
    lastAutoTable?: { finalY?: number };
  };
  let contentY = (docWithTableState.lastAutoTable?.finalY ?? 94) + 8;

  const addTextSection = (title: string, rawText: string | null | undefined) => {
    const sectionText = normalizePdfText(rawText);
    if (sectionText === "N/A") return;

    const maxWidth = pageWidth - marginX * 2;
    const titleLines = doc.splitTextToSize(title, maxWidth) as string[];
    const bodyLines = doc.splitTextToSize(sectionText, maxWidth) as string[];
    const requiredHeight = titleLines.length * 5 + bodyLines.length * 4.8 + 5;

    if (contentY + requiredHeight > pageHeight - 24) {
      doc.addPage();
      contentY = 18;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(28, 25, 23);
    doc.text(titleLines, marginX, contentY);
    contentY += titleLines.length * 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(68, 64, 60);
    doc.text(bodyLines, marginX, contentY);
    contentY += bodyLines.length * 4.8 + 4;
  };

  const addBulletListSection = (title: string, items: string[]) => {
    const normalizedItems = items
      .map((item) => normalizePdfText(item))
      .filter((item) => item !== "N/A");
    if (normalizedItems.length === 0) return;

    const maxWidth = pageWidth - marginX * 2;
    const bulletIndent = 4;
    const bulletTextWidth = maxWidth - bulletIndent;
    const titleLines = doc.splitTextToSize(title, maxWidth) as string[];
    const bulletLineGroups = normalizedItems.map(
      (item) => doc.splitTextToSize(item, bulletTextWidth) as string[],
    );
    const bulletContentHeight = bulletLineGroups.reduce(
      (height, lines) => height + lines.length * 4.8 + 1,
      0,
    );
    const requiredHeight = titleLines.length * 5 + bulletContentHeight + 4;

    if (contentY + requiredHeight > pageHeight - 24) {
      doc.addPage();
      contentY = 18;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(28, 25, 23);
    doc.text(titleLines, marginX, contentY);
    contentY += titleLines.length * 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(68, 64, 60);

    bulletLineGroups.forEach((lines) => {
      const bulletHeight = lines.length * 4.8 + 1;
      if (contentY + bulletHeight > pageHeight - 24) {
        doc.addPage();
        contentY = 18;
      }
      doc.text("•", marginX, contentY);
      doc.text(lines, marginX + bulletIndent, contentY);
      contentY += bulletHeight;
    });

    contentY += 3;
  };

  addTextSection("Patient Description", patient.smallDescription);
  addTextSection("Background", patient.background);
  addBulletListSection("Therapeutic Goals", patient.objectives);

  const addEmotionTrendSection = () => {
    const normalizedVectorTimeline = buildPdfStepScopedVectorTimeline(
      messages,
      stepId,
    );
    if (normalizedVectorTimeline.length === 0) return;

    const seriesKeys = getPdfSeriesKeys(normalizedVectorTimeline);
    if (seriesKeys.length === 0) return;

    const chartPoints: PdfEmotionChartPoint[] = normalizedVectorTimeline.map(
      (point) => {
        const values: Record<string, number> = {};
        seriesKeys.forEach((seriesKey) => {
          values[seriesKey] = clampTimelineIntensity(point.vector[seriesKey] ?? 0);
        });

        const dominant = normalizeEmotionToken(point.dominant);
        const dominantIntensity =
          values[dominant] ?? Math.max(0, ...Object.values(values));

        return {
          turnIndex: point.turn_index,
          dominant,
          values,
          dominantIntensity,
        };
      },
    );

    if (chartPoints.length === 0) return;

    const chartWidth = pageWidth - marginX * 2;
    const chartHeight = 46;
    const chartPadding = { top: 4, right: 6, bottom: 9, left: 14 };
    const legendLineHeight = 4.6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);

    let legendRows = 1;
    let occupiedLegendWidth = 0;
    seriesKeys.forEach((seriesKey) => {
      const label = getPdfSeriesLabel(seriesKey);
      const itemWidth = 8 + doc.getTextWidth(label);
      if (occupiedLegendWidth > 0 && occupiedLegendWidth + itemWidth > chartWidth) {
        legendRows += 1;
        occupiedLegendWidth = itemWidth;
        return;
      }

      occupiedLegendWidth += itemWidth;
    });

    const latestPoint = chartPoints[chartPoints.length - 1]!;
    const requiredHeight =
      6 + chartHeight + 4 + legendRows * legendLineHeight + 6.5;

    if (contentY + requiredHeight > pageHeight - 24) {
      doc.addPage();
      contentY = 18;
    }

    doc.setFillColor(54, 83, 20);
    doc.rect(marginX, contentY - 4.5, pageWidth - marginX * 2, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(245, 245, 244);
    doc.text("Emotion Trend", marginX + 3, contentY + 1.2);
    contentY += 8;

    const chartX = marginX;
    const chartY = contentY;
    const chartInnerX = chartX + chartPadding.left;
    const chartInnerY = chartY + chartPadding.top;
    const chartInnerWidth = chartWidth - chartPadding.left - chartPadding.right;
    const chartInnerHeight = chartHeight - chartPadding.top - chartPadding.bottom;

    doc.setFillColor(250, 250, 249);
    doc.rect(chartX, chartY, chartWidth, chartHeight, "F");
    doc.setDrawColor(214, 211, 209);
    doc.setLineWidth(0.25);
    doc.rect(chartX, chartY, chartWidth, chartHeight, "S");

    [1, 0.5, 0].forEach((value) => {
      const y = chartInnerY + (1 - value) * chartInnerHeight;
      doc.setDrawColor(231, 229, 228);
      doc.setLineWidth(0.2);
      doc.line(chartInnerX, y, chartInnerX + chartInnerWidth, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(120, 113, 108);
      doc.text(value.toFixed(1), chartInnerX - 1.8, y + 1.2, {
        align: "right",
      });
    });

    doc.setDrawColor(168, 162, 158);
    doc.setLineWidth(0.3);
    doc.line(
      chartInnerX,
      chartInnerY + chartInnerHeight,
      chartInnerX + chartInnerWidth,
      chartInnerY + chartInnerHeight,
    );

    const minTurn = chartPoints[0]!.turnIndex;
    const maxTurn = chartPoints[chartPoints.length - 1]!.turnIndex;
    const turnRange = maxTurn - minTurn;
    const dominantSnapshotKey = latestPoint.dominant;
    const getPointX = (turnIndex: number) =>
      turnRange === 0
        ? chartInnerX + chartInnerWidth / 2
        : chartInnerX + ((turnIndex - minTurn) / turnRange) * chartInnerWidth;
    const getPointY = (value: number) =>
      chartInnerY + (1 - clampTimelineIntensity(value)) * chartInnerHeight;

    seriesKeys.forEach((seriesKey) => {
      const [r, g, b] = getPdfSeriesColor(seriesKey);
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(seriesKey === dominantSnapshotKey ? 0.9 : 0.55);

      for (let index = 1; index < chartPoints.length; index += 1) {
        const previousPoint = chartPoints[index - 1]!;
        const currentPoint = chartPoints[index]!;
        doc.line(
          getPointX(previousPoint.turnIndex),
          getPointY(previousPoint.values[seriesKey] ?? 0),
          getPointX(currentPoint.turnIndex),
          getPointY(currentPoint.values[seriesKey] ?? 0),
        );
      }
    });

    const [dominantR, dominantG, dominantB] = getPdfSeriesColor(latestPoint.dominant);
    doc.setFillColor(dominantR, dominantG, dominantB);
    doc.circle(
      getPointX(latestPoint.turnIndex),
      getPointY(latestPoint.dominantIntensity),
      1.1,
      "F",
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(120, 113, 108);
    if (turnRange === 0) {
      doc.text(
        `Turn ${minTurn}`,
        chartInnerX + chartInnerWidth / 2,
        chartY + chartHeight - 1.5,
        { align: "center" },
      );
    } else {
      doc.text(`Turn ${minTurn}`, chartInnerX, chartY + chartHeight - 1.5);
      doc.text(
        `Turn ${maxTurn}`,
        chartInnerX + chartInnerWidth,
        chartY + chartHeight - 1.5,
        { align: "right" },
      );
    }

    contentY += chartHeight + 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    let legendX = marginX;
    let legendY = contentY;

    seriesKeys.forEach((seriesKey) => {
      const label = getPdfSeriesLabel(seriesKey);
      const labelWidth = doc.getTextWidth(label);
      const itemWidth = 8 + labelWidth;

      if (legendX > marginX && legendX + itemWidth > marginX + chartWidth) {
        legendX = marginX;
        legendY += legendLineHeight;
      }

      const [r, g, b] = getPdfSeriesColor(seriesKey);
      doc.setFillColor(r, g, b);
      doc.rect(legendX, legendY - 1.6, 2.2, 2.2, "F");
      doc.setTextColor(68, 64, 60);
      doc.text(label, legendX + 3.2, legendY);
      legendX += itemWidth;
    });

    contentY = legendY + 4.5;
    const latestDominantLabel = getPdfSeriesLabel(latestPoint.dominant);
    const latestDominantIntensity = Math.round(
      clampTimelineIntensity(latestPoint.dominantIntensity) * 100,
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(68, 64, 60);
    doc.text(
      `Latest dominant emotion: ${latestDominantLabel} (${latestDominantIntensity}%)`,
      marginX,
      contentY,
    );
    contentY += 6;
  };

  addEmotionTrendSection();

  if (contentY > pageHeight - 90) {
    doc.addPage();
    contentY = 18;
  }

  doc.setFillColor(54, 83, 20);
  doc.rect(marginX, contentY - 4.5, pageWidth - marginX * 2, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(245, 245, 244);
  doc.text("Session Transcript", marginX + 3, contentY + 1.2);

  const tableBody: Array<[string, string, string, string]> =
    questionAnswerRows.length > 0
      ? questionAnswerRows.map((row, index) => [
          String(index),
          row.question || " ",
          row.answer || " ",
          " ",
        ])
      : [["0", "No questions recorded", "No responses recorded", " "]];
  const tableContentWidth = pageWidth - marginX * 2;
  const indexColumnWidth = tableContentWidth * 0.08;
  const questionColumnWidth = tableContentWidth * 0.31;
  const answerColumnWidth = tableContentWidth * 0.31;
  const analysisColumnWidth =
    tableContentWidth - indexColumnWidth - questionColumnWidth - answerColumnWidth;

  autoTable(doc, {
    startY: contentY + 8,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    tableWidth: tableContentWidth,
    head: [["#", "Question", "Answer", "Therapist Analysis"]],
    body: tableBody,
    styles: {
      fontSize: 8.2,
      cellPadding: 2.5,
      valign: "top",
      overflow: "linebreak",
      textColor: [28, 25, 23],
      minCellHeight: 12,
      lineColor: [214, 211, 209],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [132, 204, 22],
      textColor: [12, 10, 9],
      fontStyle: "bold",
      halign: "left",
    },
    alternateRowStyles: {
      fillColor: [250, 250, 249],
    },
    columnStyles: {
      0: { cellWidth: indexColumnWidth, halign: "center" },
      1: { cellWidth: questionColumnWidth },
      2: { cellWidth: answerColumnWidth },
      3: { cellWidth: analysisColumnWidth, minCellHeight: 20 },
    },
  });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(214, 211, 209);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 113, 108);
    doc.text(
      `LLMPatients App · ${normalizePdfText(patient.name)}`,
      marginX,
      pageHeight - 7,
    );
    doc.text(`Page ${page}/${totalPages}`, pageWidth - marginX, pageHeight - 7, {
      align: "right",
    });
  }

  const safePatientName = normalizePdfText(patient.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const filename = `report-${safePatientName || "patient"}-session-${stepId}.pdf`;
  const pdfBlob = doc.output("blob");
  const downloadUrl = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
}
