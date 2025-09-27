import Link from "next/link";
import type { Patient } from "~/types";
import { PatientAvatar } from "./PatientAvatar";
import { ClockIcon } from "@heroicons/react/24/outline";
import {
  getDifficultyIconClass,
  getDifficultyAccessibleText,
  getDifficultyLabel,
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
      className="h-full flex flex-col"
      role="listitem"
      itemScope
      itemType="https://schema.org/Person"
    >
      <CardHeader className="flex flex-row items-start space-y-0 pb-4">
        {/* Patient Avatar */}
        <PatientAvatar
          name={patient.name}
          avatarUrl={patient.avatarUrl}
          avatarType={patient.avatarType}
        />
        
        <div className="flex-1 ml-4">
          <div className="flex items-center justify-between">
            <CardTitle
              id={`patient-${patient.id}-title`}
              className="text-lg"
              itemProp="name"
            >
              {patient.name}
            </CardTitle>
            <Badge variant="secondary" itemProp="age">
              {details.demographic_sociocultural_information?.age || "N/A"} anni
            </Badge>
          </div>
          
          <CardDescription className="mt-1" itemProp="description">
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
          <p className="text-sm font-medium">Obiettivi:</p>
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
              <li className="text-sm text-muted-foreground" role="listitem">
                +{patient.objectives.length - 2} altri obiettivi
              </li>
            )}
          </ul>
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Badge
              variant="outline"
              className={getDifficultyIconClass(patient.difficulty)}
              aria-label={getDifficultyAccessibleText(patient.difficulty)}
            >
              <span className="mr-1">{getDifficultyIcon(patient.difficulty)}</span>
              {getDifficultyLabel(patient.difficulty)}
            </Badge>
          </div>
          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
            <ClockIcon className="h-4 w-4" aria-hidden="true" />
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
