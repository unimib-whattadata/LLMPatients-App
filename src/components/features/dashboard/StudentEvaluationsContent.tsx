"use client";

import { useMemo, useState } from "react";
import {
  DIFFICULTY_LEVELS,
  getDifficultyAccessibleText,
  getDifficultyIconClass,
  getDifficultyIcon,
} from "~/lib/constants/difficulty";
import { api } from "~/trpc/react";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { EmptyState } from "~/components/ui/empty-state";
import { Check, AlertTriangle, Users } from "lucide-react";

interface Evaluation {
  id: string;
  studentName: string;
  patientCase: string;
  score: number;
  completedAt: string;
  status: "completed" | "in-progress" | "failed";
  feedback: string;
  strengths: string[];
  improvements: string[];
  difficulty: 1 | 2 | 3;
  duration: number; // in minutes
}

const MOCK_EVALUATIONS: Evaluation[] = [
  {
    id: "1",
    studentName: "Giovanni Verdi",
    patientCase: "Mario Rossi - Ipertensione",
    score: 85,
    completedAt: "2024-09-03",
    status: "completed",
    feedback:
      "Buona gestione del caso clinico. Lo studente ha dimostrato competenze solide nella diagnosi e nel trattamento dell'ipertensione.",
    strengths: [
      "Anamnesi dettagliata e sistematica",
      "Corretta interpretazione dei parametri vitali",
      "Scelta terapeutica appropriata",
      "Comunicazione efficace con il paziente",
    ],
    improvements: [
      "Velocità nella gestione dell'emergenza",
      "Documentazione clinica più dettagliata",
    ],
    difficulty: DIFFICULTY_LEVELS.MEDIO,
    duration: 45,
  },
  {
    id: "2",
    studentName: "Maria Neri",
    patientCase: "Laura Bianchi - Diabete",
    score: 92,
    completedAt: "2024-09-02",
    status: "completed",
    feedback:
      "Eccellente performance. La studentessa ha gestito il caso con sicurezza e competenza, dimostrando una comprensione approfondita del diabete.",
    strengths: [
      "Diagnosi rapida e precisa",
      "Protocollo terapeutico seguito correttamente",
      "Monitoraggio continuo del paziente",
      "Comunicazione empatica e professionale",
      "Gestione delle complicanze acute",
    ],
    improvements: ["Documentazione clinica più dettagliata"],
    difficulty: DIFFICULTY_LEVELS.FACILE,
    duration: 38,
  },
  {
    id: "3",
    studentName: "Paolo Blu",
    patientCase: "Giuseppe Verde - Asma",
    score: 78,
    completedAt: "2024-09-01",
    status: "completed",
    feedback:
      "Performance soddisfacente con alcuni aspetti da migliorare nella gestione dell'asma acuto.",
    strengths: [
      "Riconoscimento dei sintomi respiratori",
      "Uso corretto dei dispositivi di somministrazione",
      "Monitoraggio della saturazione",
    ],
    improvements: [
      "Gestione delle vie aeree",
      "Protocolli di emergenza",
      "Comunicazione con il paziente in crisi",
      "Velocità di intervento",
    ],
    difficulty: DIFFICULTY_LEVELS.DIFFICILE,
    duration: 52,
  },
];

export function StudentEvaluationsContent() {
  const [filter, setFilter] = useState<"all" | "completed" | "in-progress" | "failed">(
    "all",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(
    null,
  );

  // Fetch evaluation statistics from API
  const { data: evaluationStats, isLoading: statsLoading } =
    api.dashboard.getStudentEvaluationStats.useQuery(undefined, {
      staleTime: 2 * 60 * 1000, // 2 minutes
      retry: 3,
    });

  // Mock data - in real app this would come from API
  const evaluations = MOCK_EVALUATIONS;

  const filteredEvaluations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return evaluations.filter((evaluation) => {
      const matchesStatus =
        filter === "all" ? true : evaluation.status === filter;
      const matchesSearch =
        normalizedSearch.length === 0
          ? true
          : evaluation.studentName.toLowerCase().includes(normalizedSearch) ||
            evaluation.patientCase.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [evaluations, filter, searchTerm]);

  const getStatusBadge = (status: string, score: number) => {
    if (status === "completed") {
      if (score >= 80) {
        return <Badge variant="completed">Eccellente</Badge>;
      }

      if (score >= 60) {
        return <Badge variant="in-progress">Buono</Badge>;
      }

      return <Badge variant="started">Da migliorare</Badge>;
    }

    if (status === "failed") {
      return <Badge variant="destructive">Fallita</Badge>;
    }

    return <Badge variant="in-progress">In corso</Badge>;
  };


  return (
    <div className="dashboard-panel-stack">
      <section className="dashboard-section" aria-labelledby="evaluation-stats">
        <div className="dashboard-section__header">
          <div>
            <h2 id="evaluation-stats" className="dashboard-section__title">
              Statistiche Valutazioni
            </h2>
            <p className="dashboard-section__description">
              Panoramica delle performance degli studenti nelle simulazioni
            </p>
          </div>
        </div>

        {statsLoading ? (
          <div className="dashboard-metric-grid" aria-hidden="true">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="dashboard-metric-card">
                <Skeleton variant="text" className="mb-2 h-4 w-20" />
                <Skeleton variant="text" className="h-8 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="dashboard-metric-grid">
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">
                {evaluationStats?.totalEvaluations ?? 0}
              </span>
              <span className="dashboard-metric-card__label">
                Valutazioni Totali
              </span>
            </div>
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">
                {evaluationStats?.completedEvaluations ?? 0}
              </span>
              <span className="dashboard-metric-card__label">Completate</span>
            </div>
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">
                {evaluationStats?.inProgressEvaluations ?? 0}
              </span>
              <span className="dashboard-metric-card__label">In Corso</span>
            </div>
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-card__value">
                {evaluationStats?.successRate ?? 0}%
              </span>
              <span className="dashboard-metric-card__label">
                Tasso Successo
              </span>
            </div>
          </div>
        )}
      </section>

      <section
        className="dashboard-section"
        aria-labelledby="evaluation-filters"
      >
        <div className="dashboard-section__header">
          <div>
            <h2 id="evaluation-filters" className="dashboard-section__title">
              Filtri e Ricerca
            </h2>
            <p className="dashboard-section__description">
              Filtra le valutazioni per stato e cerca studenti specifici
            </p>
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status-filter">Filtra per stato</Label>
              <Select
                value={filter}
                onValueChange={(value) =>
                  setFilter(value as "all" | "completed" | "in-progress" | "failed")
                }
              >
                <SelectTrigger id="status-filter" className="w-full">
                  <SelectValue placeholder="Seleziona stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="completed">Completate</SelectItem>
                  <SelectItem value="in-progress">In corso</SelectItem>
                  <SelectItem value="failed">Fallite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-search">Cerca studente</Label>
              <Input
                id="student-search"
                type="text"
                placeholder="Nome o caso clinico..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="evaluations-list">
        <div className="dashboard-section__header">
          <div>
            <h2 id="evaluations-list" className="dashboard-section__title">
              Elenco Valutazioni
            </h2>
            <p className="dashboard-section__description">
              Dettaglio delle valutazioni degli studenti
            </p>
          </div>
        </div>

        <div className="rounded-xl">
          {filteredEvaluations.length === 0 ? (
            <EmptyState
              icon={<Users className="h-12 w-12" aria-hidden="true" />}
              title="Nessuna valutazione trovata"
              description="Modifica i filtri o prova una ricerca diversa."
              className="bg-[var(--color-surface-secondary)]"
            />
          ) : (
            <Table className="dashboard-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Studente</TableHead>
                  <TableHead>Caso Clinico</TableHead>
                  <TableHead>Punteggio</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvaluations.map((evaluation) => (
                  <TableRow key={evaluation.id}>
                    <TableCell className="font-medium">
                      {evaluation.studentName}
                    </TableCell>
                    <TableCell>{evaluation.patientCase}</TableCell>
                    <TableCell className="font-semibold">
                      {evaluation.score}/100
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(evaluation.status, evaluation.score)}
                    </TableCell>
                    <TableCell className="text-text-tertiary">
                      {evaluation.completedAt}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedEvaluation(evaluation)}
                        >
                          Visualizza
                        </Button>
                        <Button variant="ghost" size="sm">
                          Report
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      {/* Detailed View Modal */}
      <Dialog
        open={Boolean(selectedEvaluation)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEvaluation(null);
          }
        }}
      >
        <DialogContent className="max-h-[80vh] w-full max-w-2xl overflow-y-auto bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]">
          {selectedEvaluation ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEvaluation.patientCase}</DialogTitle>
                <DialogDescription>
                  Studente: {selectedEvaluation.studentName} • {selectedEvaluation.completedAt} • {selectedEvaluation.duration} min
                </DialogDescription>
              </DialogHeader>

              <div className="mb-6 flex flex-wrap items-center gap-4">
                <div className="patient-card-difficulty">
                  <span
                    className={getDifficultyIconClass(selectedEvaluation.difficulty)}
                    aria-label={getDifficultyAccessibleText(selectedEvaluation.difficulty)}
                    role="img"
                  >
                    {getDifficultyIcon(selectedEvaluation.difficulty)}
                  </span>
                </div>
                <Badge
                  variant={
                    selectedEvaluation.score >= 80
                      ? "completed"
                      : selectedEvaluation.score >= 60
                        ? "in-progress"
                        : "started"
                  }
                  className="text-base font-semibold"
                >
                  {selectedEvaluation.score}/100
                </Badge>
                {getStatusBadge(selectedEvaluation.status, selectedEvaluation.score)}
              </div>

              <div className="mb-6 space-y-2">
                <h4 className="text-lg font-semibold">Feedback Generale</h4>
                <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {selectedEvaluation.feedback}
                </p>
              </div>

              <div className="mb-6 space-y-3">
                <h4 className="text-lg font-semibold">Punti di Forza</h4>
                <ul className="space-y-2">
                  {selectedEvaluation.strengths.map((strength, index) => (
                    <li
                      key={`strength-${index}`}
                      className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]"
                    >
                      <Check className="mt-0.5 h-4 w-4 text-success-500" aria-hidden="true" />
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-6 space-y-3">
                <h4 className="text-lg font-semibold">Aree di Miglioramento</h4>
                <ul className="space-y-2">
                  {selectedEvaluation.improvements.map((improvement, index) => (
                    <li
                      key={`improvement-${index}`}
                      className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-warning-500" aria-hidden="true" />
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <DialogFooter className="flex flex-col gap-3 pt-4 sm:flex-row sm:gap-4">
                <Button variant="outline" className="flex-1">
                  Genera Report
                </Button>
                <Button className="flex-1" onClick={() => setSelectedEvaluation(null)}>
                  Chiudi
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
