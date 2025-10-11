import Link from "next/link";
import type { Patient } from "~/types";
import { PatientAvatar } from "~/components/features/explore-patients/PatientAvatar";
import { Clock } from "lucide-react";
import {
  getDifficultyAccessibleText,
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
      className="patient-card flex h-full flex-col !bg-[#2E322B]"
      role="listitem"
      itemScope
      itemType="https://schema.org/Person"
    >
      {}
      <CardHeader className="flex flex-col items-center space-y-4 pb-4">
        <PatientAvatar
          name={patient.name}
          avatarUrl={patient.avatarUrl}
        />
        
        {}
        <div className="w-full">
          <div className="flex items-center justify-between mb-2">
            <CardTitle
              id={`patient-${patient.id}-title`}
              className="text-xl text-white"
              itemProp="name"
            >
              {patient.name}
            </CardTitle>
            <Badge variant="secondary" itemProp="age" className="bg-[#8B9769] text-white">
              {patient.age} anni
            </Badge>
          </div>
          
          {}
          <CardDescription className="text-left text-gray-300" itemProp="description">
            {patient.smallDescription}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        {}
        <div className="space-y-2">
          <p className="text-sm font-medium text-[#8B9769]">Obiettivi:</p>
          <ul className="space-y-1" role="list">
            {patient.objectives.slice(0, 2).map((objective, index) => (
              <li
                key={index}
                className="text-sm text-gray-300 flex items-start"
                role="listitem"
              >
                <span className="mr-2 mt-1 h-1 w-1 rounded-full bg-gray-400 flex-shrink-0" />
                <span>{objective}</span>
              </li>
            ))}
            {patient.objectives.length > 2 && (
              <li className="text-xs text-gray-400" role="listitem">
                +{patient.objectives.length - 2} altri obiettivi
              </li>
            )}
          </ul>
        </div>

        {}
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
