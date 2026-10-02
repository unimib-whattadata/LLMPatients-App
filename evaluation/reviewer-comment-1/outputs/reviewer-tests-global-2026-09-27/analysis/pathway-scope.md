# Perimetro del percorso a undici sessioni

Verifica del 27 settembre 2026, durante il terzo ciclo. Questa nota descrive
l'implementazione osservata; non modifica protocollo, scenari o codice congelati.

- Il manoscritto (`main.tex:443`) presenta un percorso educativo: due sessioni
  di conoscenza, otto di intervento, una conclusiva.
- L'App assegna questi gruppi nella funzione `getStepDetails` di
  `src/app/(app)/dashboard/therapeutic-journey/[sessionId]/[patientName]/_components/timelineConfig.ts`.
  Le istruzioni della fase sono suggerimenti mostrati al terapeuta.
- Nell'Agent congelato, `agent/api/app.py:56` richiede `step_id`;
  `agent/api/app.py:383` lo conserva come `metadata.initial_step_id` del run.
  `_build_graph_payload` (`agent/api/app.py:398`) unisce stato precedente,
  testo del terapeuta e identificatori, senza inoltrare `step_id` al grafo.
  Non è presente una selezione di prompt del paziente in base a questo numero.
- Il runner longitudinale passa effettivamente il numero previsto alla API
  (`scripts/run_longitudinal_session.py:178`). Nel ledger di Crystal, le prime
  tre sessioni registrano `initial_step_id` 1, 2 e 3. Il primo turno della terza
  sessione riprende `total_turns=11` e contiene riassunto e riflessione precedenti.

**Interpretazione:** il confronto verifica identità e richiamo di fatti lungo
undici sessioni persistenti con testi del terapeuta prefissati. Non costituisce
una verifica di undici sedute cliniche, né dimostra una politica di generazione
del paziente specifica per fase. La rappresentazione delle fasi nell'App è
coerente con un'organizzazione didattica del percorso; questa osservazione non
prova da sola un difetto rispetto a quanto descritto dal manoscritto.

Evidenza runtime: `longitudinal/results/crystal_smith_001/full/session_03/session.json`
e `longitudinal/results/crystal_smith_001/full/runs/continuity_full_crystal_smith_001.json`.
