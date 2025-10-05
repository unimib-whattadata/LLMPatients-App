/**
 * Create Patient Content Component
 *
 * Interface for creating new patient cases and medical scenarios
 * for student clinical simulations
 */

"use client";

import { useState } from "react";
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
  name: z.string().trim().min(1, "Il nome del paziente è obbligatorio"),
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
  avatarType: z.enum(["photo", "illustration", "avatar"]),
  difficulty: z
    .number()
    .min(1, "Difficoltà minima 1")
    .max(5, "Difficoltà massima 5"),
  estimatedDuration: z
    .number()
    .min(15, "Durata minima 15 minuti")
    .max(240, "Durata massima 240 minuti"),
  details: detailsSchema,
});

type CreatePatientValues = z.infer<typeof createPatientSchema>;

export function CreatePatientContent() {
  const [showJsonTemplate, setShowJsonTemplate] = useState(false);

  const form = useForm<CreatePatientValues>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: {
      name: "",
      smallDescription: "",
      background: "",
      objectives: [""],
      avatarUrl: "",
      avatarType: "illustration",
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
    onSuccess: () => {
      toast.success("Paziente creato con successo!");
      form.reset();
      setShowJsonTemplate(false);
    },
    onError: (error) => {
      toast.error(`Errore nella creazione: ${error.message}`);
    },
  });

  const jsonTemplate: Record<string, unknown> = {
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
    },
  };

  const loadJsonTemplate = () => {
    form.setValue("details", JSON.stringify(jsonTemplate, null, 2), {
      shouldDirty: true,
      shouldValidate: true,
    });
    setShowJsonTemplate(false);
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
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(async (values) => {
                try {
                  await createPatientMutation.mutateAsync(values);
                } catch (error) {
                  console.error("Error creating patient:", error);
                }
              })}
              className="space-y-8"
            >
            {/* Basic Information */}
            <div className="dashboard-panel">
              <h3 className="text-lg font-semibold mb-4 text-white">Informazioni Base</h3>
              <p className="text-sm text-gray-400 mb-6">Dati essenziali del paziente</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="label-required">Nome Paziente</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Inserisci il nome del paziente"
                          {...field}
                        />
                      </FormControl>
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
                          placeholder="Es. Disturbo d'Ansia"
                          maxLength={500}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value.length}/500 caratteri
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
                        placeholder="Background medico e storia del paziente..."
                        rows={4}
                        maxLength={2000}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value.length}/2000 caratteri
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Objectives */}
            <div className="dashboard-panel">
              <h3 className="text-lg font-semibold mb-4 text-white">Obiettivi Terapeutici</h3>
              <p className="text-sm text-gray-400 mb-6">Definisci gli obiettivi del trattamento</p>

              <div className="space-y-4">
                {objectives.map((_, index) => (
                  <FormField
                    key={`objective-${index}`}
                    control={form.control}
                    name={`objectives.${index}`}
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <div className="flex items-center gap-3">
                          <FormControl>
                            <Input
                              placeholder="Inserisci un obiettivo terapeutico"
                              {...field}
                            />
                          </FormControl>
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
                Aggiungi Obiettivo
              </Button>
            </div>

            {/* Configuration */}
            <div className="dashboard-panel">
              <h3 className="text-lg font-semibold mb-4 text-white">Configurazione Caso</h3>
              <p className="text-sm text-gray-400 mb-6">Impostazioni per la simulazione</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="label-required">
                        Difficoltà <span className="text-xs text-gray-400">( {field.value}/5 )</span>
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={1}
                          max={5}
                          step={1}
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                          aria-label="Livello di difficoltà"
                        />
                      </FormControl>
                      <FormDescription>
                        Seleziona il livello di complessità del caso clinico.
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
                          min={15}
                          max={240}
                          step={5}
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                          aria-label="Durata stimata in minuti"
                        />
                      </FormControl>
                      <FormDescription>
                        Durata prevista della simulazione (15–240 minuti).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="avatarType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Tipo Avatar</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona il tipo di avatar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="illustration">Illustrazione</SelectItem>
                          <SelectItem value="photo">Foto</SelectItem>
                          <SelectItem value="avatar">Avatar</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>URL Avatar</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://example.com/avatar.jpg"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Patient Details (JSON) */}
            <div className="dashboard-panel">
              <h3 className="text-lg font-semibold mb-4 text-white">Dettagli Paziente (JSON)</h3>
              <p className="text-sm text-gray-400 mb-6">Informazioni strutturate del paziente in formato JSON</p>

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
                          variant="outline"
                          size="sm"
                          onClick={loadJsonTemplate}
                        >
                          Carica Template
                        </Button>
                      </div>
                    </div>

                    {showJsonTemplate ? (
                      <div className="p-4 bg-gray-800 rounded-lg mb-4">
                        <h4 className="font-medium mb-2 text-white">Template JSON:</h4>
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                          {JSON.stringify(jsonTemplate, null, 2)}
                        </pre>
                      </div>
                    ) : null}

                    <FormControl>
                      <Textarea
                        rows={12}
                        className="font-mono text-sm"
                        placeholder='{"demographic_sociocultural_information": {"age": "28", "gender": "Maschio", ...}}'
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Inserisci i dettagli strutturati del paziente in formato JSON valido.
                      Usa il template come riferimento per la struttura.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-4 pt-6">
              <Button
                type="submit"
                className="min-w-[140px]"
                isLoading={createPatientMutation.isPending}
                disabled={createPatientMutation.isPending}
              >
                {createPatientMutation.isPending ? "Creazione..." : "Crea Paziente"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.history.back()}
                disabled={createPatientMutation.isPending}
              >
                Annulla
              </Button>
            </div>
          </form>
        </Form>
        </div>
      </section>
    </div>
  );
}
