import Link from "next/link";
import type { VirtualPatient } from "~/server/api/routers/patients";
import { PatientAvatar } from "./PatientAvatar";
import { PatientTags } from "./PatientTags";
import { ClockIcon } from "@heroicons/react/24/outline";

interface PatientCardProps {
  patient: VirtualPatient;
}

/**
 * PatientCard Component
 * Enhanced patient information card with improved styling and accessibility
 */
export function PatientCard({ patient }: PatientCardProps) {
  const getDifficultyClass = (difficulty: string) => {
    switch (difficulty) {
      case "Facile":
        return "patient-card-difficulty-icon patient-card-difficulty-icon--easy";
      case "Medio":
        return "patient-card-difficulty-icon patient-card-difficulty-icon--medium";
      case "Difficile":
        return "patient-card-difficulty-icon patient-card-difficulty-icon--hard";
      default:
        return "patient-card-difficulty-icon";
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case "Facile":
        return "•";
      case "Medio":
        return "••";
      case "Difficile":
        return "•••";
      default:
        return "•";
    }
  };

  const getDifficultyAccessibleText = (difficulty: string) => {
    switch (difficulty) {
      case "Facile":
        return "Livello facile";
      case "Medio":
        return "Livello medio";
      case "Difficile":
        return "Livello difficile";
      default:
        return "Livello non specificato";
    }
  };

  return (
    <article
      className="patient-card"
      aria-labelledby={`patient-${patient.id}-title`}
      role="listitem"
      itemScope
      itemType="https://schema.org/Person"
    >
      {/* Patient Avatar */}
      <PatientAvatar
        name={patient.name}
        avatarUrl={patient.avatarUrl}
        avatarType={patient.avatarType}
      />

      {/* Card Content */}
      <div className="patient-card-content">
        {/* Patient Info */}
        <div className="patient-card-main-content">
          {/* Name and Age */}
          <header className="patient-card-header">
            <h3 id={`patient-${patient.id}-title`} className="patient-card-title" itemProp="name">
              {patient.name}
            </h3>
            <span className="patient-card-age" aria-label={`${patient.age} anni di eta`} itemProp="age">
              {patient.age} anni
            </span>
          </header>

          {/* Condition */}
          <p className="patient-card-condition" itemProp="description">
            {patient.condition}
          </p>

          {/* Background Description */}
          <p className="patient-card-description" itemProp="additionalProperty">
            {patient.background}
          </p>

          {/* Objectives */}
          <div className="patient-card-objectives">
            <p className="patient-card-objectives-title">
              Obiettivi:
            </p>
            <ul className="patient-card-objective-list" role="list">
              {patient.objectives.slice(0, 2).map((objective, index) => (
                <li key={index} className="patient-card-objective-item" role="listitem">
                  <span className="patient-card-objective-bullet" aria-hidden="true">-</span>
                  <span className="patient-card-objective-text">{objective}</span>
                </li>
              ))}
              {patient.objectives.length > 2 && (
                <li className="patient-card-objective-more" role="listitem">
                  +{patient.objectives.length - 2} altri obiettivi
                </li>
              )}
            </ul>
          </div>

          {/* Metadata */}
          <div className="patient-card-metadata">
            <div className="patient-card-difficulty">
              <span 
                className={getDifficultyClass(patient.difficulty)}
                aria-label={getDifficultyAccessibleText(patient.difficulty)}
                role="img"
              >
                {getDifficultyIcon(patient.difficulty)}
              </span>
              <span>{patient.difficulty}</span>
            </div>
            <div className="patient-card-duration">
              <ClockIcon className="patient-card-duration-icon" aria-hidden="true" />
              <span>{patient.estimatedDuration} min</span>
            </div>
          </div>

          {/* Tags */}
          <PatientTags tags={patient.tags} />
        </div>

        {/* Action Button */}
        <Link
          href={`/explore-patients/${patient.id}`}
          className="patient-card-button"
          aria-label={`Inizia simulazione con ${patient.name}`}
        >
          Continua con {patient.name}
        </Link>
      </div>
    </article>
  );
}