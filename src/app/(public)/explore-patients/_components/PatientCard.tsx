"use client";

import Link from "next/link";
import { useState } from "react";
import type { Patient } from "~/types";
import { PatientAvatar } from "~/components/features/explore-patients/PatientAvatar";
import { Clock } from "lucide-react";
import {
  getDifficultyAccessibleText,
  getDifficultyIcon,
  getDifficultyIconClass,
  type DifficultyLevel,
} from "~/lib/constants/difficulty";
import { createPatientSlug } from "~/lib/utils/slugify";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

interface PatientCardProps {
  patient: Patient;
}

export function PatientCard({ patient }: PatientCardProps) {
  const [areObjectivesExpanded, setAreObjectivesExpanded] = useState(false);

  return (
    <Card
      className="patient-card flex h-full flex-col !bg-surface-primary"
      role="listitem"
      itemScope
      itemType="https://schema.org/Person"
    >
      { }
      <CardHeader className="flex flex-col items-center space-y-4 pb-4">
        <PatientAvatar
          name={patient.name}
          avatarUrl={patient.avatarUrl}
        />

        { }
        <div className="w-full">
          <div className="flex items-center justify-between mb-2">
            <CardTitle
              id={`patient-${patient.id}-title`}
              className="text-xl text-foreground"
              itemProp="name"
            >
              {patient.name}
            </CardTitle>
            <Badge variant="secondary" itemProp="age" className="bg-primary-green text-text-inverse">
              {patient.age} anni
            </Badge>
          </div>

          { }
          <CardDescription className="text-left text-muted-foreground" itemProp="description">
            {patient.smallDescription}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        { }
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary-green">Obiettivi:</p>
          <ul className="space-y-1" role="list">
            {patient.objectives.slice(0, 2).map((objective, index) => (
              <li
                key={index}
                className="text-sm text-muted-foreground flex items-start"
                role="listitem"
              >
                <span className="mr-2 mt-1 h-1 w-1 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                <span>{objective}</span>
              </li>
            ))}
            {patient.objectives.length > 2 && (
              <li role="listitem">
                <button
                  type="button"
                  className="cursor-pointer text-xs text-muted-foreground underline decoration-dashed underline-offset-4 transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-green focus-visible:ring-offset-2"
                  onClick={() =>
                    setAreObjectivesExpanded((currentValue) => !currentValue)
                  }
                  aria-expanded={areObjectivesExpanded}
                >
                  +{patient.objectives.length - 2} altri obiettivi
                </button>
                {areObjectivesExpanded && (
                  <ul className="mt-2 space-y-1" role="list">
                    {patient.objectives.slice(2).map((objective, index) => (
                      <li
                        key={`${objective}-${index}`}
                        className="text-sm text-muted-foreground flex items-start"
                        role="listitem"
                      >
                        <span className="mr-2 mt-1 h-1 w-1 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                        <span>{objective}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )}
          </ul>
        </div>

        { }
        <div className="mt-4 space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm">Difficoltà:</span>
            <div className="patient-card-difficulty">
              <span
                className={getDifficultyIconClass(
                  patient.difficulty as DifficultyLevel,
                )}
                aria-label={getDifficultyAccessibleText(
                  patient.difficulty as DifficultyLevel,
                )}
                role="img"
              >
                {getDifficultyIcon(patient.difficulty as DifficultyLevel)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm">Durata stimata:</span>
            <div className="flex items-center space-x-1 text-sm text-primary-yellow">
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span className="text-text-tertiary text-sm">
                {patient.estimatedDuration} min
              </span>
            </div>
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
