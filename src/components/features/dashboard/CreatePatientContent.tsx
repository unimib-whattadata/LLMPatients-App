/**
 * Create Patient Content Component
 *
 * Interface for creating new patient cases and medical scenarios
 * for student clinical simulations
 */

"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { toast } from "sonner";

interface PatientFormData {
  name: string;
  smallDescription: string;
  background: string;
  objectives: string[];
  avatarUrl: string;
  avatarType: "photo" | "illustration" | "avatar";
  difficulty: number;
  estimatedDuration: number;
  details: string;
}

export function CreatePatientContent() {
  const [patientData, setPatientData] = useState<PatientFormData>({
    name: "",
    smallDescription: "",
    background: "",
    objectives: [""],
    avatarUrl: "",
    avatarType: "illustration",
    difficulty: 1,
    estimatedDuration: 30,
    details: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newObjective, setNewObjective] = useState("");
  const [showJsonTemplate, setShowJsonTemplate] = useState(false);

  const createPatientMutation = api.patients.createPatient.useMutation({
    onSuccess: () => {
      toast.success("Paziente creato con successo!");
      // Reset form
      setPatientData({
        name: "",
        smallDescription: "",
        background: "",
        objectives: [""],
        avatarUrl: "",
        avatarType: "illustration",
        difficulty: 1,
        estimatedDuration: 30,
        details: "",
      });
      setNewObjective("");
      setShowJsonTemplate(false);
    },
    onError: (error) => {
      toast.error(`Errore nella creazione: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Filter out empty objectives
      const filteredObjectives = patientData.objectives.filter(obj => obj.trim() !== "");
      
      await createPatientMutation.mutateAsync({
        ...patientData,
        objectives: filteredObjectives,
      });
    } catch (error) {
      console.error("Error creating patient:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addObjective = () => {
    if (newObjective.trim()) {
      setPatientData({
        ...patientData,
        objectives: [...patientData.objectives, newObjective.trim()],
      });
      setNewObjective("");
    }
  };

  const removeObjective = (index: number) => {
    setPatientData({
      ...patientData,
      objectives: patientData.objectives.filter((_, i) => i !== index),
    });
  };

  const updateObjective = (index: number, value: string) => {
    const newObjectives = [...patientData.objectives];
    newObjectives[index] = value;
    setPatientData({ ...patientData, objectives: newObjectives });
  };

  const jsonTemplate = {
    demographic_sociocultural_information: {
      age: "28",
      gender: "Maschio",
      marital_status: "Single",
      cultural_background: "Background culturale del paziente",
      religious_beliefs: "Credenze religiose",
      spoken_language: "Italiano",
      migration_status: "Residente nativo"
    },
    family_social_history: {
      developmental_family_dynamics: "Dinamiche familiari durante lo sviluppo",
      current_parent_relationships: "Relazioni attuali con i genitori",
      childhood_experiences: "Esperienze infantili significative",
      abuse_history: "Storia di abusi (se presente)"
    },
    psychological_profile_and_cognitive_functioning: {
      current_and_past_psychiatric_diagnoses: "Diagnosi psichiatriche attuali e passate",
      main_symptoms: "Sintomi principali",
      emotional_reactions_and_mood: "Reazioni emotive e umore",
      self_perception_and_identity: "Percezione di sé e identità"
    }
  };

  const loadJsonTemplate = () => {
    setPatientData({
      ...patientData,
      details: JSON.stringify(jsonTemplate, null, 2)
    });
    setShowJsonTemplate(false);
  };

  const validateForm = () => {
    const errors: string[] = [];
    
    if (!patientData.name.trim()) {
      errors.push("Il nome del paziente è obbligatorio");
    }
    
    if (!patientData.smallDescription.trim()) {
      errors.push("La descrizione breve è obbligatoria");
    }
    
    if (!patientData.background.trim()) {
      errors.push("La storia clinica è obbligatoria");
    }
    
    if (patientData.objectives.filter(obj => obj.trim() !== "").length === 0) {
      errors.push("Almeno un obiettivo terapeutico è obbligatorio");
    }
    
    if (!patientData.details.trim()) {
      errors.push("I dettagli JSON sono obbligatori");
    } else {
      try {
        JSON.parse(patientData.details);
      } catch {
        errors.push("I dettagli JSON non sono in formato valido");
      }
    }
    
    return errors;
  };

  return (
    <div className="dashboard-panel-stack">
      <section
        className="dashboard-section"
        aria-labelledby="create-patient-form"
      >
        <div className="dashboard-section__header">
          <div>
            <h2 id="create-patient-form" className="dashboard-section__title">
              Crea Nuovo Paziente
            </h2>
            <p className="dashboard-section__description">
              Inserisci le informazioni complete per creare un nuovo caso clinico
            </p>
          </div>
        </div>

        <div className="dashboard-panel">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="dashboard-panel">
              <h3 className="text-lg font-semibold mb-4 text-white">Informazioni Base</h3>
              <p className="text-sm text-gray-400 mb-6">Dati essenziali del paziente</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="unified-form-group">
                  <label htmlFor="patient-name" className="unified-form-label label-required">
                    Nome Paziente
                  </label>
                  <input
                    id="patient-name"
                    type="text"
                    value={patientData.name}
                    onChange={(e) =>
                      setPatientData({ ...patientData, name: e.target.value })
                    }
                    className="unified-form-input"
                    placeholder="Inserisci il nome del paziente"
                    required
                  />
                </div>
                
                <div className="unified-form-group">
                  <label htmlFor="small-description" className="unified-form-label label-required">
                    Descrizione Breve
                  </label>
                  <input
                    id="small-description"
                    type="text"
                    value={patientData.smallDescription}
                    onChange={(e) =>
                      setPatientData({ ...patientData, smallDescription: e.target.value })
                    }
                    className="unified-form-input"
                    placeholder="Es. Disturbo d'Ansia"
                    maxLength={500}
                    required
                  />
                  <p className="field-help">
                    {patientData.smallDescription.length}/500 caratteri
                  </p>
                </div>
              </div>

              <div className="unified-form-group">
                <label htmlFor="background" className="unified-form-label label-required">
                  Storia Clinica
                </label>
                <textarea
                  id="background"
                  value={patientData.background}
                  onChange={(e) =>
                    setPatientData({ ...patientData, background: e.target.value })
                  }
                  rows={4}
                  className="unified-form-input"
                  placeholder="Background medico e storia del paziente..."
                  maxLength={2000}
                  required
                />
                <p className="field-help">
                  {patientData.background.length}/2000 caratteri
                </p>
              </div>
            </div>

            {/* Objectives */}
            <div className="dashboard-panel">
              <h3 className="text-lg font-semibold mb-4 text-white">Obiettivi Terapeutici</h3>
              <p className="text-sm text-gray-400 mb-6">Definisci gli obiettivi del trattamento</p>
              
              {patientData.objectives.map((objective, index) => (
                <div key={index} className="unified-form-group">
                  <div className="flex items-center gap-3">
                    <input
                      value={objective}
                      onChange={(e) => updateObjective(index, e.target.value)}
                      className="unified-form-input flex-1"
                      placeholder="Inserisci un obiettivo terapeutico"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeObjective(index)}
                      disabled={patientData.objectives.length === 1}
                      className="shrink-0"
                    >
                      Rimuovi
                    </Button>
                  </div>
                </div>
              ))}
              
              <div className="unified-form-group">
                <div className="flex items-center gap-3">
                  <input
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                    className="unified-form-input flex-1"
                    placeholder="Aggiungi nuovo obiettivo"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addObjective}
                    disabled={!newObjective.trim()}
                    className="shrink-0"
                  >
                    Aggiungi
                  </Button>
                </div>
              </div>
            </div>

            {/* Configuration */}
            <div className="dashboard-panel">
              <h3 className="text-lg font-semibold mb-4 text-white">Configurazione Caso</h3>
              <p className="text-sm text-gray-400 mb-6">Impostazioni per la simulazione</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="unified-form-group">
                  <label htmlFor="difficulty" className="unified-form-label label-required">
                    Difficoltà
                  </label>
                  <select
                    id="difficulty"
                    value={patientData.difficulty}
                    onChange={(e) =>
                      setPatientData({ ...patientData, difficulty: parseInt(e.target.value) })
                    }
                    className="unified-form-input"
                    required
                  >
                    <option value={1}>Facile</option>
                    <option value={2}>Medio</option>
                    <option value={3}>Difficile</option>
                  </select>
                </div>
                
                <div className="unified-form-group">
                  <label htmlFor="estimated-duration" className="unified-form-label label-required">
                    Durata Stimata (min)
                  </label>
                  <input
                    id="estimated-duration"
                    type="number"
                    min="5"
                    max="180"
                    value={patientData.estimatedDuration}
                    onChange={(e) =>
                      setPatientData({ ...patientData, estimatedDuration: parseInt(e.target.value) })
                    }
                    className="unified-form-input"
                    required
                  />
                </div>
                
                <div className="unified-form-group">
                  <label htmlFor="avatar-type" className="unified-form-label">
                    Tipo Avatar
                  </label>
                  <select
                    id="avatar-type"
                    value={patientData.avatarType}
                    onChange={(e) =>
                      setPatientData({ ...patientData, avatarType: e.target.value as "photo" | "illustration" | "avatar" })
                    }
                    className="unified-form-input"
                  >
                    <option value="illustration">Illustrazione</option>
                    <option value="photo">Foto</option>
                    <option value="avatar">Avatar</option>
                  </select>
                </div>
              </div>

              <div className="unified-form-group">
                <label htmlFor="avatar-url" className="unified-form-label">
                  URL Avatar
                </label>
                <input
                  id="avatar-url"
                  type="url"
                  value={patientData.avatarUrl}
                  onChange={(e) =>
                    setPatientData({ ...patientData, avatarUrl: e.target.value })
                  }
                  className="unified-form-input"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
            </div>

            {/* Patient Details (JSON) */}
            <div className="dashboard-panel">
              <h3 className="text-lg font-semibold mb-4 text-white">Dettagli Paziente (JSON)</h3>
              <p className="text-sm text-gray-400 mb-6">Informazioni strutturate del paziente in formato JSON</p>
              
              <div className="unified-form-group">
                <div className="flex items-center justify-between mb-4">
                  <label htmlFor="patient-details" className="unified-form-label label-required">
                    Dettagli JSON
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowJsonTemplate(!showJsonTemplate)}
                    >
                      {showJsonTemplate ? "Nascondi" : "Mostra"} Template
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={loadJsonTemplate}
                    >
                      Carica Template
                    </Button>
                  </div>
                </div>
                
                {showJsonTemplate && (
                  <div className="p-4 bg-gray-800 rounded-lg mb-4">
                    <h4 className="font-medium mb-2 text-white">Template JSON:</h4>
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                      {JSON.stringify(jsonTemplate, null, 2)}
                    </pre>
                  </div>
                )}
                
                <textarea
                  id="patient-details"
                  value={patientData.details}
                  onChange={(e) =>
                    setPatientData({ ...patientData, details: e.target.value })
                  }
                  rows={12}
                  className="unified-form-input font-mono text-sm"
                  placeholder='{"demographic_sociocultural_information": {"age": "28", "gender": "Maschio", ...}}'
                  required
                />
                <p className="field-help">
                  Inserisci i dettagli strutturati del paziente in formato JSON valido. 
                  Usa il template come riferimento per la struttura.
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <Button 
                type="submit" 
                variant="default" 
                size="default"
                disabled={isSubmitting}
                className="min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creazione...
                  </>
                ) : (
                  "Crea Paziente"
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="default"
                onClick={() => window.history.back()}
                disabled={isSubmitting}
              >
                Annulla
              </Button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
