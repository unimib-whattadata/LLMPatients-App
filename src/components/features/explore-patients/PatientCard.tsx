import Link from "next/link";
import type { Patient } from "~/types";
import { PatientAvatar } from "./PatientAvatar";
import { Clock } from "lucide-react";
import {
  getDifficultyAccessibleText,
} from "~/lib/constants/difficulty";
import { createPatientSlug } from "~/lib/utils/slugify";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

interface PatientCardProps {
  patient: Patient;
}

/**
 * PatientCard Component
 *
 * Displays patient information in a card format with enhanced styling and accessibility.
 * Shows patient demographics, psychological profile, difficulty level, and estimated duration.
 *
 * Features:
 * - Patient avatar display
 * - Difficulty level indicators with accessibility labels
 * - Patient tags for categorization
 * - Estimated session duration
 * - Link to patient detail page
 *
 * @param patient - Patient object containing all patient information
 * @returns JSX element representing a patient card
 */
export function PatientCard({ patient }: PatientCardProps) {
  let details: {
    demographic_sociocultural_information?: {
      age?: string;
      gender?: string;
    };
    psychological_profile_and_cognitive_functioning?: {
      current_and_past_psychiatric_diagnoses?: string;
    };
  } = {};

  try {
    details = JSON.parse(patient.details) as typeof details;
  } catch (error) {
    console.error("Failed to parse patient details:", error);
    // Fallback to empty object to prevent crashes
    details = {};
  }

  const getDifficultyIcon = (difficulty: number) => {
    switch (difficulty) {
      case 1:
        return "•";
      case 2:
        return "••";
      case 3:
        return "•••";
      default:
        return "•";
    }
  };

  return (
    <Card
      className="h-full flex flex-col patient-card"
      role="listitem"
      itemScope
      itemType="https://schema.org/Person"
    >
      {/* Patient Avatar at the top */}
      <CardHeader className="flex flex-col items-center space-y-4 pb-4">
        <PatientAvatar
          name={patient.name}
          avatarUrl={patient.avatarUrl}
          avatarType={patient.avatarType}
        />
        
        {/* Patient Name and Age */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-2">
            <CardTitle
              id={`patient-${patient.id}-title`}
              className="text-xl"
              itemProp="name"
            >
              {patient.name}
            </CardTitle>
            <Badge variant="secondary" itemProp="age" className="bg-[#8B9769] text-white">
              {details.demographic_sociocultural_information?.age || "N/A"} anni
            </Badge>
          </div>
          
          {/* Small Description under name */}
          <CardDescription className="text-left" itemProp="description">
            {patient.smallDescription}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        {/* Background Description */}
        <p className="text-sm text-muted-foreground mb-4" itemProp="additionalProperty">
          {patient.background}
        </p>

        {/* Objectives */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-[#8B9769]">Obiettivi:</p>
          <ul className="space-y-1" role="list">
            {patient.objectives.slice(0, 2).map((objective, index) => (
              <li
                key={index}
                className="text-sm text-muted-foreground flex items-start"
                role="listitem"
              >
                <span className="mr-2 mt-1 h-1 w-1 rounded-full bg-muted-foreground flex-shrink-0" />
                <span>{objective}</span>
              </li>
            ))}
            {patient.objectives.length > 2 && (
              <li className="text-xs text-gray-800" role="listitem">
                +{patient.objectives.length - 2} altri obiettivi
              </li>
            )}
          </ul>
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between mt-4 pt-4">
          <div className="flex items-center space-x-2">
            <div
              className="flex items-center"
              aria-label={getDifficultyAccessibleText(patient.difficulty)}
            >
              <div 
                className={`flex items-center space-x-1 difficulty-dots ${
                  patient.difficulty === 1 
                    ? 'difficulty-easy' 
                    : patient.difficulty === 2 
                      ? 'difficulty-medium' 
                      : 'difficulty-hard'
                }`}
              >
                {getDifficultyIcon(patient.difficulty)}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-sm text-[#C69A39]">
            <Clock className="h-4 w-4" aria-hidden="true" />
            <span>{patient.estimatedDuration} min</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button asChild className="w-full">
          <Link
            href={`/explore-patients/${patient.id}/${createPatientSlug(patient.name)}`}
            aria-label={`Inizia simulazione con ${patient.name}`}
          >
            Continua con {patient.name}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

