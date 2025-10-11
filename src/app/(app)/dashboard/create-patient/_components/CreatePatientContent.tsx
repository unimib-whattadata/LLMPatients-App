
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Slider } from "~/components/ui/slider";
import { api } from "~/trpc/react";

const objectiveSchema = z
  .string()
  .trim()
  .min(1, "L'obiettivo non può essere vuoto");

const detailsSchema = z
  .string()
  .min(1, "I dettagli JSON sono obbligatori")
  .superRefine((value, ctx) => {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (typeof parsed !== "object" || parsed === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "I dettagli devono essere un oggetto JSON valido",
        });
        return;
      }

      const parsedKeys = Object.keys(parsed as Record<string, unknown>);
      if (parsedKeys.length <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Il JSON deve contenere almeno una chiave",
        });
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "I dettagli JSON non sono in formato valido",
      });
    }
  });

const createPatientSchema = z.object({
  name: z.string().trim().min(1, "Il nome del paziente è obbligatorio").max(255, "Massimo 255 caratteri"),
  smallDescription: z
    .string()
    .trim()
    .min(1, "La descrizione breve è obbligatoria")
    .max(500, "Massimo 500 caratteri"),
  background: z
    .string()
    .trim()
    .min(1, "La storia clinica è obbligatoria")
    .max(2000, "Massimo 2000 caratteri"),
  objectives: z
    .array(objectiveSchema)
    .min(1, "Almeno un obiettivo terapeutico è obbligatorio"),
  avatarUrl: z.string().trim().optional().or(z.literal("")),
  difficulty: z
    .number()
    .min(1, "Difficoltà minima 1")
    .max(3, "Difficoltà massima 3"),
  estimatedDuration: z
    .number()
    .min(5, "Durata minima 5 minuti")
    .max(180, "Durata massima 180 minuti"),
  details: detailsSchema,
});

type CreatePatientValues = z.infer<typeof createPatientSchema>;

export function CreatePatientContent() {
  const router = useRouter();
  const [showJsonTemplate, setShowJsonTemplate] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const form = useForm<CreatePatientValues>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: {
      name: "",
      smallDescription: "",
      background: "",
      objectives: [""],
      avatarUrl: "",
      difficulty: 1,
      estimatedDuration: 30,
      details: "",
    },
  });

  const objectives = form.watch("objectives") ?? [""];

  const handleObjectiveRemove = (index: number) => {
    if (objectives.length <= 1) {
      return;
    }
    const next = objectives.filter((_, i) => i !== index);
    form.setValue("objectives", next.length ? next : [""], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleObjectiveAdd = () => {
    form.setValue("objectives", [...objectives, ""], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const createPatientMutation = api.patients.createPatient.useMutation({
    onSuccess: (data) => {
      toast.success("Paziente creato con successo!", {
        description: "Il nuovo caso clinico è stato aggiunto al sistema",
      });
      form.reset();
      setShowJsonTemplate(false);
      
      // Redirect to explore patients or dashboard after a short delay
      setTimeout(() => {
        router.push("/explore-patients");
      }, 1500);
    },
    onError: (error) => {
      toast.error("Errore nella creazione del paziente", {
        description: error.message,
      });
    },
  });

  const jsonTemplate: Record<string, unknown> = {
    demographicAndSocioculturalInformation: {
      age: 28,
      gender: "Maschio",
      maritalStatus: "Single",
      culturalBackground: "Background culturale del paziente",
      religiousBeliefs: "Credenze religiose",
      spokenLanguage: "Italiano",
      migrationStatus: "Residente nativo",
      educationLevel: "Laurea triennale",
      occupation: "Professione del paziente",
      livingSituation: "Vive da solo/in famiglia"
    },
    familySocialHistory: {
      developmentalFamilyDynamics: "Dinamiche familiari durante lo sviluppo",
      currentParentRelationships: "Relazioni attuali con i genitori",
      childhoodExperiences: "Esperienze infantili significative",
      abuseHistory: "Storia di abusi (se presente)",
      siblingRelationships: "Relazioni con fratelli/sorelle",
      significantRelationships: "Relazioni significative attuali"
    },
    psychologicalProfileAndCognitiveFunctioning: {
      currentAndPastPsychiatricDiagnoses: "Diagnosi psichiatriche attuali e passate",
      mainSymptoms: "Sintomi principali presentati",
      emotionalReactionsAndMood: "Reazioni emotive e tono dell'umore",
      selfPerceptionAndIdentity: "Percezione di sé e identità",
      copingMechanisms: "Meccanismi di coping utilizzati",
      cognitivePatterns: "Pattern cognitivi ricorrenti"
    },
    medicalHistory: {
      chronicConditions: "Condizioni mediche croniche",
      medications: "Farmaci assunti attualmente",
      substanceUse: "Uso di sostanze (alcol, droghe, ecc.)",
      sleepPatterns: "Pattern del sonno",
      diet: "Alimentazione"
    },
    therapyHistory: {
      previousTherapies: "Terapie precedenti",
      responseToTreatment: "Risposta ai trattamenti precedenti",
      currentMotivation: "Motivazione attuale alla terapia",
      therapeuticGoals: "Obiettivi terapeutici del paziente"
    }
  };

  const loadJsonTemplate = () => {
    form.setValue("details", JSON.stringify(jsonTemplate, null, 2), {
      shouldDirty: true,
      shouldValidate: true,
    });
    setShowJsonTemplate(false);
  };

  if (!isMounted) {
    return (
      <div className="dashboard-panel-stack">
        <section className="dashboard-section" aria-labelledby="create-patient-form">
          <div className="dashboard-section__header">
            <div>
              <h1 id="create-patient-form" className="dashboard-section__title">
                Crea Nuovo Paziente
              </h1>
              <p className="dashboard-section__description">
                Inserisci le informazioni complete per creare un nuovo caso clinico da utilizzare nelle simulazioni terapeutiche
              </p>
            </div>
          </div>
          <div className="dashboard-panel bg-gray-900/40 border border-gray-800">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-primary-green" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-gray-400">Caricamento form...</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="dashboard-panel-stack">
      <section
        className="dashboard-section"
        aria-labelledby="create-patient-form"
      >
        <div className="dashboard-section__header">
          <div>
            <h1 id="create-patient-form" className="dashboard-section__title">
              Crea Nuovo Paziente
            </h1>
            <p className="dashboard-section__description">
              Inserisci le informazioni complete per creare un nuovo caso clinico da utilizzare nelle simulazioni terapeutiche
            </p>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (values) => {
              try {
                // Extract age from details JSON
                let age = 30; // Default age
                try {
                  const detailsObj = JSON.parse(values.details);
                  const extractedAge = 
                    detailsObj?.demographicAndSocioculturalInformation?.age ||
                    detailsObj?.demographic_sociocultural_information?.age;
                  if (extractedAge) {
                    // Handle both string and number formats
                    age = typeof extractedAge === 'number' 
                      ? extractedAge 
                      : parseInt(String(extractedAge), 10);
                    if (isNaN(age) || age < 1 || age > 120) {
                      age = 30; // Fallback to default if invalid
                    }
                  }
                } catch (error) {
                  console.error("Failed to extract age from details:", error);
                }

                await createPatientMutation.mutateAsync({
                  ...values,
                  age,
                });
              } catch (error) {
                console.error("Error creating patient:", error);
              }
            })}
            className="space-y-6"
          >
            {}
            <div className="dashboard-panel bg-gray-900/40 border border-gray-800">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Informazioni Base</h3>
                <p className="text-sm text-gray-400">Dati essenziali del paziente</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="label-required">Nome Paziente</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Es. Maria Rossi"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value.length}/255 caratteri
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
                <FormField
                  control={form.control}
                  name="smallDescription"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="label-required">Descrizione Breve</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Es. Disturbo d'Ansia Generalizzato"
                          maxLength={500}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Breve descrizione della condizione principale ({field.value.length}/500 caratteri)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="background"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="label-required">Storia Clinica</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrivi il background clinico del paziente: anamnesi, eventi significativi, sviluppo della condizione attuale..."
                        rows={6}
                        maxLength={2000}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Storia e contesto clinico del caso ({field.value.length}/2000 caratteri)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {}
            <div className="dashboard-panel bg-gray-900/40 border border-gray-800">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Obiettivi Terapeutici</h3>
                <p className="text-sm text-gray-400">Definisci gli obiettivi clinici e terapeutici del caso</p>
              </div>

              <div className="space-y-4">
                {objectives.map((_, index) => (
                  <FormField
                    key={`objective-${index}`}
                    control={form.control}
                    name={`objectives.${index}`}
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <FormControl>
                              <Input
                                placeholder={`Obiettivo ${index + 1}: Es. Ridurre sintomi ansiosi attraverso tecniche di rilassamento`}
                                {...field}
                              />
                            </FormControl>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleObjectiveRemove(index)}
                            disabled={objectives.length === 1}
                            className="shrink-0"
                          >
                            Rimuovi
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleObjectiveAdd}
              >
                + Aggiungi Obiettivo
              </Button>
            </div>

            {}
            <div className="dashboard-panel bg-gray-900/40 border border-gray-800">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Configurazione Caso</h3>
                <p className="text-sm text-gray-400">Impostazioni per la simulazione</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="label-required">
                        Difficoltà <span className="text-xs text-gray-400">( {field.value}/3 )</span>
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={1}
                          max={3}
                          step={1}
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                          aria-label="Livello di difficoltà"
                        />
                      </FormControl>
                      <FormDescription>
                        Livello di complessità: 1=Principiante, 2=Intermedio, 3=Avanzato
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estimatedDuration"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="label-required">
                        Durata Stimata (min) <span className="text-xs text-gray-400">( {field.value} min )</span>
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={5}
                          max={180}
                          step={5}
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                          aria-label="Durata stimata in minuti"
                        />
                      </FormControl>
                      <FormDescription>
                        Durata prevista della simulazione (5–180 minuti).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4 border-t border-gray-700">
                <FormField
                  control={form.control}
                  name="avatarUrl"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>URL Avatar (opzionale)</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://example.com/avatar.jpg"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Link all'immagine avatar del paziente virtuale
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {}
            <div className="dashboard-panel bg-gray-900/40 border border-gray-800">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Dettagli Paziente (JSON)</h3>
                <p className="text-sm text-gray-400">
                  Informazioni strutturate del paziente in formato JSON
                </p>
              </div>

              <FormField
                control={form.control}
                name="details"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <FormLabel className="label-required">Dettagli JSON</FormLabel>
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
                          variant="secondary"
                          size="sm"
                          onClick={loadJsonTemplate}
                        >
                          Carica Template
                        </Button>
                      </div>
                    </div>

                    {showJsonTemplate && (
                      <div className="p-4 bg-gray-800/60 border border-gray-700 rounded-xl mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-white flex items-center gap-2">
                            <svg className="w-4 h-4 text-primary-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Template JSON Completo
                          </h4>
                          <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">Copia e personalizza</span>
                        </div>
                        <div className="bg-gray-900/60 rounded-lg p-4 overflow-x-auto">
                          <pre className="text-xs text-gray-300 whitespace-pre font-mono">
                            {JSON.stringify(jsonTemplate, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    <FormControl>
                      <Textarea
                        rows={14}
                        className="font-mono text-sm"
                        placeholder='{"demographicAndSocioculturalInformation": {"age": 28, "gender": "Maschio", ...}}'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="dashboard-panel bg-gray-900/40 border border-gray-800">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  type="submit"
                  className="flex-1 sm:flex-initial min-w-[160px] bg-primary-green hover:bg-primary-green/90 text-white font-semibold"
                  isLoading={createPatientMutation.isPending}
                  disabled={createPatientMutation.isPending}
                  size="lg"
                >
                  {createPatientMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creazione in corso...
                    </span>
                  ) : (
                    "Crea Paziente"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                  disabled={createPatientMutation.isPending}
                  size="lg"
                  className="flex-1 sm:flex-initial"
                >
                  Annulla
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-4 text-center sm:text-left">
                Tutti i campi contrassegnati con * sono obbligatori
              </p>
            </div>
          </form>
        </Form>
      </section>
    </div>
  );
}
