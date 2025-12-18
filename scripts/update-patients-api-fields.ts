#!/usr/bin/env tsx

/**
 * Script to update existing patients with new API-compatible fields:
 * - gender
 * - diagnosis
 * - psychologicalProfile
 * - currentMedications
 * - previousSessions
 * 
 * This script extracts these fields from the existing details JSON data.
 */

import { config } from "dotenv";
import { db } from "../src/server/db";
import { patients } from "../src/server/db/schema";
import { eq } from "drizzle-orm";

// Load environment variables
config();

interface PatientDetails {
  demographicAndSocioculturalInformation?: {
    gender?: string;
  };
  disorder?: {
    disorderName?: string;
  };
  psychologicalProfileAndCognitiveFunctioning?: {
    affectiveEmotionalFunctioningAndMoodRegulation?: string;
    psychiatricComorbidities?: string;
    senseOfSelfAndOthers?: string;
    thoughtFunctioningAndCognitiveStyle?: string;
  };
  treatmentsAndInterventions?: {
    medicationHistory?: string;
    pharmacologicalTreatments?: string;
    previousTherapeuticExperiences?: string;
  };
}

function extractGender(details: PatientDetails): string | null {
  return details.demographicAndSocioculturalInformation?.gender || null;
}

function extractDiagnosis(details: PatientDetails): string | null {
  return details.disorder?.disorderName || null;
}

function extractPsychologicalProfile(details: PatientDetails): string | null {
  const profile = details.psychologicalProfileAndCognitiveFunctioning;
  if (!profile) return null;

  const parts: string[] = [];
  
  if (profile.affectiveEmotionalFunctioningAndMoodRegulation) {
    parts.push(`Affective/Emotional: ${profile.affectiveEmotionalFunctioningAndMoodRegulation}`);
  }
  if (profile.psychiatricComorbidities) {
    parts.push(`Comorbidities: ${profile.psychiatricComorbidities}`);
  }
  if (profile.senseOfSelfAndOthers) {
    parts.push(`Self/Others: ${profile.senseOfSelfAndOthers}`);
  }
  if (profile.thoughtFunctioningAndCognitiveStyle) {
    parts.push(`Cognitive Style: ${profile.thoughtFunctioningAndCognitiveStyle}`);
  }

  return parts.length > 0 ? parts.join(". ") : null;
}

function extractCurrentMedications(details: PatientDetails): string[] {
  const treatments = details.treatmentsAndInterventions;
  if (!treatments) return [];

  const medications: string[] = [];
  
  // Try to extract from medicationHistory
  if (treatments.medicationHistory) {
    const medHistory = treatments.medicationHistory.toLowerCase();
    // Look for common medication patterns
    if (medHistory.includes("ssri") || medHistory.includes("antidepressant")) {
      medications.push("Antidepressants");
    }
    if (medHistory.includes("anxiolytic") || medHistory.includes("benzodiazepine")) {
      medications.push("Anxiolytics");
    }
    if (medHistory.includes("antipsychotic") || medHistory.includes("neuroleptic")) {
      medications.push("Antipsychotics");
    }
    if (medHistory.includes("mood stabilizer") || medHistory.includes("stabilizzatore")) {
      medications.push("Mood Stabilizers");
    }
  }

  // Try to extract from pharmacologicalTreatments
  if (treatments.pharmacologicalTreatments) {
    const pharmTreat = treatments.pharmacologicalTreatments.toLowerCase();
    if (pharmTreat.includes("ssri") || pharmTreat.includes("antidepressant")) {
      if (!medications.includes("Antidepressants")) {
        medications.push("Antidepressants");
      }
    }
    if (pharmTreat.includes("anxiolytic") || pharmTreat.includes("benzodiazepine")) {
      if (!medications.includes("Anxiolytics")) {
        medications.push("Anxiolytics");
      }
    }
  }

  // If no medications found but there's a medication history, use a generic description
  if (medications.length === 0 && treatments.medicationHistory) {
    const medHistory = treatments.medicationHistory.trim();
    if (medHistory && medHistory !== "Nessuno" && medHistory !== "None" && !medHistory.includes("Non applicabile")) {
      medications.push(medHistory);
    }
  }

  return medications;
}

function extractPreviousSessions(details: PatientDetails): number {
  const treatments = details.treatmentsAndInterventions;
  if (!treatments) return 0;

  const previousTherapy = treatments.previousTherapeuticExperiences;
  if (!previousTherapy) return 0;

  // Try to extract number from text
  const lowerText = previousTherapy.toLowerCase();
  
  // If it says "Nessuna" or "None", return 0
  if (lowerText.includes("nessuna") || lowerText.includes("none") || lowerText.includes("non applicabile")) {
    return 0;
  }

  // Try to find numbers in the text
  const numberMatch = previousTherapy.match(/\d+/);
  if (numberMatch) {
    return parseInt(numberMatch[0]!, 10) || 0;
  }

  // If there's any mention of therapy but no number, assume at least 1
  if (lowerText.includes("terapia") || lowerText.includes("therapy") || lowerText.includes("trattamento")) {
    return 1;
  }

  return 0;
}

async function updatePatients() {
  console.log("🔄 Starting patient update process...\n");

  try {
    // Get all patients
    const allPatients = await db.select().from(patients);

    console.log(`📋 Found ${allPatients.length} patients to update\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const patient of allPatients) {
      try {
        // Parse details JSON
        let details: PatientDetails = {};
        try {
          details = JSON.parse(patient.details) as PatientDetails;
        } catch (error) {
          console.error(`❌ Error parsing details for patient ${patient.name} (${patient.id}):`, error);
          errors++;
          continue;
        }

        // Extract fields
        const gender = extractGender(details);
        const diagnosis = extractDiagnosis(details);
        const psychologicalProfile = extractPsychologicalProfile(details);
        const currentMedications = extractCurrentMedications(details);
        const previousSessions = extractPreviousSessions(details);

        // Check if any updates are needed
        const needsUpdate = 
          patient.gender !== gender ||
          patient.diagnosis !== diagnosis ||
          patient.psychologicalProfile !== psychologicalProfile ||
          patient.currentMedications !== JSON.stringify(currentMedications) ||
          patient.previousSessions !== previousSessions;

        if (!needsUpdate) {
          console.log(`⏭️  Skipping ${patient.name} - already up to date`);
          skipped++;
          continue;
        }

        // Update patient
        await db
          .update(patients)
          .set({
            gender: gender ?? null,
            diagnosis: diagnosis ?? null,
            psychologicalProfile: psychologicalProfile ?? null,
            currentMedications: currentMedications.length > 0 ? JSON.stringify(currentMedications) : null,
            previousSessions: previousSessions,
            updatedAt: new Date(),
          })
          .where(eq(patients.id, patient.id));

        console.log(`✅ Updated ${patient.name}:`);
        console.log(`   - Gender: ${gender || "N/A"}`);
        console.log(`   - Diagnosis: ${diagnosis || "N/A"}`);
        console.log(`   - Psychological Profile: ${psychologicalProfile ? "Yes" : "No"}`);
        console.log(`   - Current Medications: ${currentMedications.length > 0 ? currentMedications.join(", ") : "None"}`);
        console.log(`   - Previous Sessions: ${previousSessions}`);
        console.log();

        updated++;
      } catch (error) {
        console.error(`❌ Error updating patient ${patient.name} (${patient.id}):`, error);
        errors++;
      }
    }

    console.log("\n📊 Update Summary:");
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📋 Total: ${allPatients.length}`);

    if (errors === 0) {
      console.log("\n🎉 All patients updated successfully!");
    } else {
      console.log(`\n⚠️  Completed with ${errors} error(s)`);
    }
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run the update
updatePatients()
  .then(() => {
    console.log("\n✨ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });


