"""Render descriptive paired results; no model calls and no inferential pooling."""
import json,statistics,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
POSITIONS=('start','middle','end');LABELS={'start':'Inizio','middle':'Centro','end':'Fine'}
ARMS=('full_history','drop_start_50','drop_middle_50','drop_end_50','drop_start_75','drop_middle_75','drop_end_75')
NAMES={'full_history':'Nessun taglio','drop_start_50':'Inizio 50%','drop_middle_50':'Centro 50%','drop_end_50':'Fine 50%','drop_start_75':'Inizio 75%','drop_middle_75':'Centro 75%','drop_end_75':'Fine 75%','auto_plugin':'Plugin automatico'}
def read(p):return json.loads(Path(p).read_text())
def num(x,d=1):return 'N/V' if x is None else f'{x:,.{d}f}'.replace(',','@').replace('.',',').replace('@','.')
def metric(x):return f"{x['correct']}/{x['total']} ({num(x['percent'])}%)" if x['total'] else 'N/V'
def table(headers,rows):return '\n'.join(['| '+' | '.join(headers)+' |','|'+'|'.join('---' for _ in headers)+'|']+['| '+' | '.join(map(str,r))+' |' for r in rows])
def main():
 r=read(ROOT/'analysis/results.json');v=read(ROOT/'analysis/runtime-verification.json');s=read(ROOT/'runtime/state.json')
 cells={(c['mode'],c['fact_position'],c['baseline_arm']):c for c in r['cells']}
 # The baseline archive calls its uncut arm flat_full_history; normalize labels only.
 uncut=next(c['baseline_arm'] for c in r['cells'] if c['mode']=='manual' and not c['baseline_arm'].startswith('drop_'))
 arms=(uncut,)+ARMS[1:];NAMES[uncut]='Nessun taglio'
 contexts=read(ROOT/'contexts.json');native=[j['native_prompt_tokens'] for j in r['unique_generations'] if j['status']=='complete']
 sections=['# Memoria strutturata e baseline negli stessi scenari regionali',
 '''## Material Passport e domanda sperimentale

Confronto autorizzato su cinque pazienti simulati. Si usano gli stessi 30 archivi integrali del test regionale: cinque profili, fatti all’inizio/al centro/alla fine, lunghezze di circa 64 mila e 1,2 milioni di token. Profilo, istruzioni, sei domande e risposte attese sono identici. Si confrontano **politiche di conservazione e recupero della memoria**.

La baseline mantiene nel prompt tutta la cronologia o la parte rimasta dopo un taglio. Il componente strutturato `EvidenceMemory` ricerca nell’archivio persistente integrale e consegna al modello un massimo di otto evidenze, con budget nativo di 1.800 token stimati per gli elementi selezionati. Il taglio del prompt della baseline non cancella l’archivio strutturato. Non è un confronto a parità di informazioni dopo il taglio, né un test di perdita dei dati prima dell’acquisizione.

È valutato il componente di recupero nativo, con fatti validati e utterance originali, **non l’intero grafo dell’applicazione**. Sommari, riflessioni, cronologia recente, memoria episodica e stato dinamico non sono aggiunti. I dialoghi di riempimento sono indicizzati come testo grezzo; non sono elaborati dal consolidamento dei fatti. La prova non sostituisce il confronto longitudinale sulle undici sessioni.
''',
 f'''## Conteggi e valutazione

- **{r['complete_unique_generations']}/{r['planned_unique_generations']} risposte strutturate complete**, {r['source_contexts']} contesti e {r['mapped_comparisons']} confronti abbinati con gli esiti già archiviati della baseline.
- Ogni risposta strutturata a 64k è condivisa fra sette condizioni della baseline. Le 120 coppie **non sono 120 generazioni strutturate indipendenti**. Hash distinti dei prompt: {r['planned_unique_generations']}.
- Unità di caso: cinque profili. Ogni cella completa misura 20 categorie di richiamo positivo (4 × 5) e 45 campi (9 × 5). Una categoria passa solo se tutti i campi e i rapporti sono corretti.
- Nome/età e cognome mai stabilito restano controlli separati. L’astensione su un fatto della storia integrale conta come mancato richiamo, pur potendo essere appropriata rispetto al prompt rimasto.
- Due valutatori automatici in contesti separati, senza metadati di posizione, lunghezza, condizione o evidenze. Disaccordi iniziali: **{r['disagreement_categories']} categorie**. Il codice usa un eventuale terzo giudizio soltanto sulle categorie discordanti. Giudizi della baseline riutilizzati senza modifiche.
- L’accordo iniziale è 180/180 categorie e 360/360 campi; nessun adjudicator è stato necessario. Il contenuto delle risposte può suggerire una perdita di contesto: l’efficacia del mascheramento non è stata misurata.
- Modello richiesto ai valutatori: `gpt-6-astra`, effort `xhigh`; identità effettiva non esposta dal runtime. Non sono giudizi clinici umani.
''']
 totals=r['unique_semantic_totals']
 sections.append('## Risposte strutturate distinte\n\n'+table(['Lunghezza integrale','Fatti','Richiamo: categorie','Richiamo: campi','Complessive: categorie','Token nativi medi'],[
  [num(target,0),LABELS[pos],metric(cells[(mode,pos,arm)]['structured']['history_categories']),metric(cells[(mode,pos,arm)]['structured']['history_fields']),metric(cells[(mode,pos,arm)]['structured']['categories']),num(cells[(mode,pos,arm)]['mean_structured_native_prompt_tokens'])]
  for target,mode,arm in ((64000,'manual',uncut),(1200000,'auto_plugin','auto_plugin')) for pos in POSITIONS
 ])+f"\n\nTotali sulle sole generazioni distinte: {metric(totals['history_categories'])} categorie di richiamo e {metric(totals['history_fields'])} campi di richiamo. Includendo i controlli: {metric(totals['categories'])} categorie e {metric(totals['fields'])} campi. Questi totali non sono una media ponderata dei 120 esiti baseline e non stimano un unico effetto comparativo.")
 for pos in POSITIONS:
  group=[cells[('manual',pos,a)] for a in arms]
  sections.append(f'## Archivio da circa 64 mila token: fatti {LABELS[pos].lower()}\n\n'+table(['Politica baseline','Baseline: richiamo','Strutturato: richiamo','Differenza (pp)','Campi B / S','Profili S migliori / pari / peggiori'],[
    [NAMES[c['baseline_arm']],metric(c['baseline']['history_categories']),metric(c['structured']['history_categories']),num(c['history_difference_pp']),f"{c['baseline']['history_fields']['correct']}/{c['baseline']['history_fields']['total']} / {c['structured']['history_fields']['correct']}/{c['structured']['history_fields']['total']}",f"{c['profile_wins']} / {c['profile_ties']} / {c['profile_losses']}"] for c in group
   ])+'\n\nLa stessa risposta strutturata di ciascun profilo è riutilizzata nelle sette righe. Le percentuali di taglio riguardano la cronologia; profilo, istruzioni e domanda sono protetti.')
 group=[cells[('auto_plugin',p,'auto_plugin')] for p in POSITIONS]
 sections.append('## Archivio da circa 1,2 milioni di token: plugin OpenRouter\n\n'+table(['Fatti','Baseline: richiamo','Strutturato: richiamo','Differenza (pp)','Campi B / S','Profili S migliori / pari / peggiori'],[
   [LABELS[c['fact_position']],metric(c['baseline']['history_categories']),metric(c['structured']['history_categories']),num(c['history_difference_pp']),f"{c['baseline']['history_fields']['correct']}/45 / {c['structured']['history_fields']['correct']}/45",f"{c['profile_wins']} / {c['profile_ties']} / {c['profile_losses']}"] for c in group
 ])+'\n\nIl plugin è `context-compression`. Il testo dopo la trasformazione non è restituito dall’API: non sono direttamente osservabili le fonti rimaste. I tagli locali a 64k e il plugin a 1,2M sono condizioni distinte e non isolano da soli un effetto della lunghezza.')
 tokenrows=[]
 for mode,arm in [('manual',a) for a in arms]+[('auto_plugin','auto_plugin')]:
  for pos in POSITIONS:
   c=cells[(mode,pos,arm)]
   tokenrows.append([('64k / ' if mode=='manual' else '1,2M / ')+NAMES[arm],LABELS[pos],num(c['mean_baseline_native_prompt_tokens']),num(c['mean_structured_native_prompt_tokens']),num(100*c['mean_paired_native_input_reduction'],2) if c['mean_paired_native_input_reduction'] is not None else 'N/V',f"{c['paired_profiles']}/5"])
 sections.append('## Dimensione effettiva degli input\n\n'+table(['Archivio e politica baseline','Fatti','Token B medi','Token S medi','Riduzione S vs B (%)','Coppie complete'],tokenrows)+f"\n\nGli input strutturati completi variano fra **{num(min(native),0)} e {num(max(native),0)} token nativi**, inclusi profilo e domande. Differenze dal conteggio locale meno un token: {len(v['structured_native_differences'])}. La corrispondenza dei conteggi non rileva riduzioni ulteriori dei piccoli prompt; il testo trasformato non è esposto.")
 sections.append(f'''## Esecuzione e riproducibilità

Modello attestato: `{', '.join(r['observed_models'])}`; provider: {', '.join(r['observed_providers'])}. Temperatura 0,7; top-p 0,95; massimo output 4.096 token; ragionamento richiesto 1.024; stop `\\nTherapist:` e `Therapist:`. Nessun seed API, top-k non inoltrato, nessun fallback. Un solo messaggio utente, plugin di compressione attivo anche sui piccoli input strutturati. Ordine randomizzato con seed locale 2026100101, esportazione cieca con 2026100102.

Retrieval nativo invariato: `EvidenceMemory`, otto elementi, budget 1.800 token stimati, `all-MiniLM-L6-v2` revisione `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`. La domanda accorpa sei quesiti: 272 token dell’encoder contro un massimo di 256, con troncamento dell’embedding come nella prova di lunghezza. La ricerca lessicale usa il testo integrale della domanda. Cronologia dei record e dei fatti reindicizzata sulle posizioni effettive; testo, valori, chiavi, stati, citazioni e identificatori sono preservati. Vedere `preparation.json`, `archive-view.json` e audit di preparazione.

Raccolta UTC: {s['started_at']} → {s.get('completed_at',s.get('stopped_at'))}. **{r['http_requests']} richieste HTTP**, {r['http_responses']} risposte native e {r['http_errors']} errori API. Ritentativi tecnici: {len(v['retried_jobs'])} job; recuperi per limite di output: {len(v['output_recovery_jobs'])}. Nessuna rigenerazione basata sull’accuratezza.

**Costo delle sole chiamate strutturate: {num(r['observed_new_cost_usd'],6)} USD**; costo storico delle 120 condizioni baseline: {num(r['baseline_historical_observed_cost_usd'],6)} USD, senza nuove chiamate baseline. Costi di embedding locale e valutazione automatizzata non inclusi. Le risposte condivise sono contate una sola volta nei costi e nei token totali. Verificati {v['frozen_files_verified']} file congelati, {v['sources_verified']} sorgenti e tutti gli archivi nativi.
''')
 sections.append('## Interpretazione dei risultati\n\nIl componente conserva un vantaggio di richiamo quando la baseline perde i fatti dal proprio input, ma il recupero rimane incompleto. Con plugin e fatti al centro dell’archivio da 1,2M, baseline **0/20** categorie e componente **4/20** (20%): quattro profili migliorano e uno è pari. Con i fatti all’inizio o alla fine, baseline **20/20** e componente **4/20**: tutti e cinque i profili peggiorano. Non è dimostrata una superiorità generale.\n\nA 64k senza tagli la baseline ottiene **20/20** in tutte le posizioni; il componente **7/20** all’inizio e **6/20** al centro/alla fine. Quando i tagli annullano il richiamo della baseline, il componente conserva quel 30–35%. Con fatti centrali e taglio finale del 50%, la differenza di categorie è +5 punti (6/20 contro 5/20), mentre i campi sono pari a 15/45: i due indicatori non vanno confusi.\n\nL’ispezione delle evidenze effettivamente consegnate rileva valori o rapporti richiesti non selezionati e conserva separatamente citazioni del terapeuta, ricordi/proposte del paziente, valori obsoleti e informazioni parziali (`analysis/delivered-support-audit.json`). È un’analisi descrittiva successiva alla preparazione, svolta senza leggere le risposte, con criteri propri; non sostituisce i giudizi ciechi e non dimostra da sola il meccanismo causale di ciascun errore. L’archivio integro non garantisce che le otto evidenze coprano tutti i quesiti.\n\nA parità di profilo e lunghezza, le tre posizioni consegnano gli stessi contenuti semantici selezionati, con metadati cronologici reindicizzati e prompt testualmente diversi. Le piccole differenze fra risposte strutturate non vanno interpretate come un effetto isolato della posizione; i metadati variano e la generazione è stocastica.\n')
 sections.append('## Esempio abbinato: Daniel, fatti centrali a 1,2M\n\nLa baseline (job `108`) dice che i nomi delle sedi corrente e precedente non sono stati stabiliti. Lo strutturato (job `015`) indica invece correttamente “Plover Annex” come sede corrente e “Larch Reading Room” come precedente. Questa categoria passa con lo strutturato e fallisce con la baseline.\n\nLa stessa risposta strutturata però non recupera il titolo del quaderno e fornisce valori errati per appuntamenti e attività: il suo richiamo è 1/4 categorie, non 4/4. L’esempio mostra insieme il recupero utile e il limite residuo. Risposte integrali, gold e identificativi nativi sono in `analysis/illustrative-paired-example.json`; nessun caso è selezionato o escluso dal calcolo delle tabelle.\n')
 sections.append('''## Calcoli e limiti

- Accuratezza = risposte interamente corrette / risposte valutabili per l’indicatore × 100. Campo e categoria hanno denominatori distinti.
- Differenza abbinata per cella = media sui cinque profili di `(categorie S − categorie B) / 4 × 100`. Per i campi il divisore è nove. Vittoria/parità/sconfitta confrontano le categorie del singolo profilo, non test statistici.
- Riduzione dei token = media per profilo di `1 − token nativi S / token nativi B`; non è necessariamente uguale al rapporto delle medie.
- Le risposte mancanti restano esiti di disponibilità. Le differenze usano solo coppie complete, con denominatori dichiarati. Non si convertono errori di servizio in errori semantici.
- La prova è esplorativa e motivata dai risultati regionali già noti; i prompt, il protocollo e la rubrica sono congelati prima delle chiamate strutturate. Le due politiche sono raccolte separatamente nel tempo, senza randomizzazione simultanea fra bracci.
- Cinque profili, una risposta per contesto, un blocco di 45 scambi originali e riempimento sintetico non stimano una prestazione clinica di popolazione. Posizioni, campi e confronti condivisi sono dipendenti. Non sono calcolati intervalli binomiali indipendenti o p-value.
- Il recupero usa sia fatti validati sia utterance: non si attribuisce l’effetto alla sola rappresentazione in fatti. Un archivio integro rende possibile il recupero, ma non garantisce che otto evidenze includano ogni dettaglio richiesto.
- Un eventuale vantaggio dopo la perdita di testo nel prompt dimostra utilità della persistenza e selezione nei casi osservati. Non dimostra superiorità generale del sistema completo, né modifica i risultati del confronto sulle undici sessioni.

## Controllo dell’interpretazione statistica: 11/11

| Rischio | Controllo e limite |
|---|---|
| Simpson | Tutte le 24 celle e le coppie individuali sono conservate; non si confondono posizioni e politiche con una sola media. |
| Fallacia ecologica | Risultati limitati ai cinque profili simulati; nessuna inferenza su pazienti reali. |
| Berkson | Profili e scenari intenzionali già disponibili; nessuna esclusione per esito, ma selezione che limita la generalizzazione. |
| Collider | Nessun aggiustamento per variabili prodotte dalle risposte; disponibilità e confronto sulle coppie complete sono espliciti. |
| Tasso di base | Le proporzioni artificiali di tagli e posizioni non stimano la frequenza dei guasti nell’uso reale. |
| Regressione verso la media | Sono inclusi anche tutti i controlli baseline riusciti; una generazione non stima la variabilità delle repliche. |
| Sopravvivenza | Tutti i 30 contesti e i 120 collegamenti sono riportati; errori tecnici e mancanze restano visibili. |
| Confronti multipli | Nessuna selezione delle sole celle favorevoli, nessun p-value; 120 coppie non diventano 120 risposte strutturate indipendenti. |
| Percorsi analitici | Disegno e input congelati prima delle risposte; eventuali correzioni del codice di analisi sono separate e tracciate. |
| Correlazione e causalità | Confronto di politiche con informazioni diverse dopo il taglio; componente, archivio e tempi di raccolta impediscono una conclusione causale sul sistema completo. |
| Causalità inversa | I punteggi non determinano prompt, posizione, budget o ripetizioni. |

## Materiali nella copia di lavoro

`outputs/structured-regional-comparison-2026-10-01/`: `PROTOCOL.md`, `preparation.json`, `manifest.json`, `contexts.json`, `schedule.json`, `inputs/`, `runtime/`, `review/ratings/`, `analysis/results.json`, `analysis/runtime-verification.json` e `final-manifest.json`. I file `selected-evidence.json`, `structured_evidence.txt` e `archive-view.json` documentano ciò che entra nel prompt e la provenienza. I corpora integrali sono referenziati all’archivio regionale sigillato, senza duplicarli.

`figures/paired-regional-recall.png` e `.svg` visualizzano tutte le 24 celle. `previous-review-response/` conserva l’esportazione TeX/PDF precedente con hash. I percorsi locali non implicano pubblicazione remota.
''')
 (ROOT/'REPORT.md').write_text('\n\n'.join(sections)+'\n')
 print('REPORT.md rendered from archived metrics.')
if __name__=='__main__':main()
