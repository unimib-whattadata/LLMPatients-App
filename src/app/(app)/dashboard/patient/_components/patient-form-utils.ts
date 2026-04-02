export const patientJsonTemplate: Record<string, unknown> = {
  demographicAndSocioculturalInformation: {
    age: 28,
    gender: "Male",
    maritalStatus: "Single",
    culturalBackground: "Patient cultural background",
    religiousBeliefs: "Religious beliefs",
    spokenLanguage: "Italian",
    migrationStatus: "Native resident",
    educationLevel: "Bachelor's degree",
    occupation: "Patient profession",
    livingSituation: "Lives alone/with family",
  },
  familySocialHistory: {
    developmentalFamilyDynamics: "Family dynamics during development",
    currentParentRelationships: "Current relationship with parents",
    childhoodExperiences: "Significant childhood experiences",
    abuseHistory: "Abuse history (if any)",
    siblingRelationships: "Relationships with siblings",
    significantRelationships: "Current significant relationships",
  },
  psychologicalProfileAndCognitiveFunctioning: {
    currentAndPastPsychiatricDiagnoses:
      "Current and past psychiatric diagnoses",
    mainSymptoms: "Main presenting symptoms",
    emotionalReactionsAndMood: "Emotional reactions and mood",
    selfPerceptionAndIdentity: "Self perception and identity",
    copingMechanisms: "Coping mechanisms",
    cognitivePatterns: "Cognitive patterns",
  },
  medicalHistory: {
    chronicConditions: "Chronic medical conditions",
    medications: "Current medications",
    substanceUse: "Substance use",
    sleepPatterns: "Sleep patterns",
    diet: "Diet",
  },
  therapyHistory: {
    previousTherapies: "Previous therapies",
    responseToTreatment: "Response to previous treatments",
    currentMotivation: "Current motivation",
    therapeuticGoals: "Patient therapeutic goals",
  },
};

export function computeAgeFromPatientDetails(details: string) {
  let age = 30;

  try {
    const detailsObj = JSON.parse(details);
    const extractedAge =
      detailsObj?.demographicAndSocioculturalInformation?.age ||
      detailsObj?.demographic_sociocultural_information?.age;
    if (extractedAge) {
      const parsedAge =
        typeof extractedAge === "number"
          ? extractedAge
          : Number.parseInt(String(extractedAge), 10);
      if (!Number.isNaN(parsedAge) && parsedAge >= 1 && parsedAge <= 120) {
        age = parsedAge;
      }
    }
  } catch {
    return age;
  }

  return age;
}
