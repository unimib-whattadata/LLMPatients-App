"""Full saved-memory report, including unavailable capacity outcomes."""
import json,statistics
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(p):return json.loads(Path(p).read_text())
def n(x,d=1):return 'N/V' if x is None else f'{x:,.{d}f}'.replace(',','@').replace('.',',').replace('@','.')
def m(x):return f"{x['correct']}/{x['total']} ({n(x['percent'])}%)" if x['total'] else 'N/V'
def table(headers,rows):return '\n'.join(['| '+' | '.join(headers)+' |','|'+'|'.join('---' for _ in headers)+'|']+['| '+' | '.join(map(str,row))+' |' for row in rows])
def main():
 r=read(ROOT/'analysis/results.json');v=read(ROOT/'analysis/runtime-verification.json');state=read(ROOT/'runtime-02/state.json');contexts=read(ROOT/'contexts.json')
 positions=('start','middle','end');labels={'start':'Inizio','middle':'Centro','end':'Fine'}
 cells={(c['mode'],c['fact_position'],c['baseline_arm']):c for c in r['cells']}
 uncut=next(c['baseline_arm'] for c in r['cells'] if c['mode']=='manual' and not c['baseline_arm'].startswith('drop_'))
 arms=(uncut,'drop_start_50','drop_middle_50','drop_end_50','drop_start_75','drop_middle_75','drop_end_75')
 names={uncut:'Nessun taglio','drop_start_50':'Inizio 50%','drop_middle_50':'Centro 50%','drop_end_50':'Fine 50%','drop_start_75':'Inizio 75%','drop_middle_75':'Centro 75%','drop_end_75':'Fine 75%','auto_plugin':'Plugin automatico'}
 unique=r['unique_generations'];success=[j for j in unique if j['status']=='complete'];rejected=[j for j in unique if j['status']=='context_rejected'];native=[j['native_prompt_tokens'] for j in success]
 sections=['# Tutta la memoria salvata: confronto senza selezione o tagli',
 '''## Material Passport e richiesta

Esperimento autorizzato su cinque pazienti simulati. L’utente ha richiesto esplicitamente **tutta la memoria salvata, senza selezione né tagli**. Questa prova invia l’intero deposito persistente; il test precedente limitato a otto evidenze rimane distinto e immutato.

Si usano gli stessi30archivi regionali, gli stessi profili, istruzioni, domande e valori attesi, con Gemini 2.5 Pro. Le120risposte baseline già archiviate vengono riutilizzate; non sono ripetute chiamate baseline. Gli esiti baseline e strutturati sono raccolti in momenti differenti.

Verification Status: **ANALYZED** per l'interpretazione descrittiva. La verifica meccanica di input, archivi nativi, conteggi e hash è completata; non si dichiara una replica indipendente dei risultati stocastici.
''',
 '''## Che cosa viene inviato

Per ogni profilo, il prefisso verificato al termine della sessione9 contiene **81record**: 45scambi originali, 9blocchi di fatti, 9riepiloghi episodici, 9riflessioni e9versioni del riepilogo a lungo termine. La SHA256 degli81record coincide esattamente con quella registrata alla chiusura della sessione9. Nessuna risposta delle successive sessioni10/11 entra nel prompt.

Sono conservati **tutti i campi di tutti i record**, le versioni precedenti dei riepiloghi e i log di estrazione, comprese le proposte rifiutate. Queste ultime mantengono le chiavi di quarantena e non sono presentate come fatti validati. Tutti gli scambi aggiunti nei30scenari vengono inclusi. Non si eseguono retrieval, selezione delle otto evidenze, filtri di recenza o troncamenti dei riepiloghi.

Gli81record originali mantengono ogni valore e la loro sequenza relativa. Ogni record non conversazionale rimane dopo lo scambio che lo precedeva nel deposito; metadati esterni descrivono la posizione sperimentale del blocco nella cronologia. I campi originali conservano la provenienza nativa. Ogni scambio originale e aggiunto compare una volta come record conversazionale.

Il riempimento era stato salvato soltanto come testo grezzo. Non viene attribuito ai riepiloghi un’elaborazione di quel riempimento che non è avvenuta. **Questa è una prova di invio integrale della memoria durevole, non una riesecuzione dell’intero grafo sui dialoghi aggiunti.** Cache di stato, log API e duplicazioni del profilo esterne al deposito non sono record aggiuntivi della memoria; il CASE comune rimane identico.

La compressione del prompt è esplicitamente disattivata con `plugins:[{"id":"context-compression","enabled":false}]`, secondo la [documentazione OpenRouter](https://openrouter.ai/docs/guides/features/message-transforms). I file su disco usano gzip senza perdita; prima della richiesta viene ripristinato il testo completo. Questa codifica dei file non riduce il contenuto ricevuto dall’API.
''']
 totals=r['unique_semantic_totals']
 cut_scores=[c['baseline']['history_categories']['percent'] for c in r['cells'] if c['mode']=='manual' and c['baseline_arm'].startswith('drop_')]
 sections.insert(1,f'''## Risultato essenziale

Nei15scenari derivati dalle cronologie baseline da64k, la memoria completa ottiene **{m(totals['history_categories'])} categorie di richiamo** e **{m(totals['history_fields'])} campi**. Anche la baseline integra ottiene100% in tutte e tre le posizioni. Con i tagli baseline, il richiamo varia da{n(min(cut_scores),0)}% a{n(max(cut_scores),0)}% fra le celle; lo strutturato conserva tutta la memoria e resta al100% nei casi valutati.

Questo recupero completo richiede **{n(min(native),0)}–{n(max(native),0)} token nativi** per richiesta. Nei15scenari derivati da1,2milioni di token, il deposito completo supera il limite API di8MB e tutte le richieste vengono rifiutate. Per questi scenari non esiste un punteggio di accuratezza strutturata; la baseline con plugin resta valutabile e conserva i risultati riportati sotto.
''')
 inventory=read(ROOT/'audit/saved-memory-inventory.json')
 sections.append('### Inventario della memoria originaria\n\n'+table(['Profilo','Scambi','Blocchi fatti','Fatti validati','Proposte rifiutate archiviate','Riepiloghi / riflessioni / versioni a lungo termine'],[
  [p['patient_id'],45,9,p['complete_preprobe_memory']['validated_fact_count'],p['complete_preprobe_memory']['rejected_fact_proposal_count'],'9 / 9 / 9'] for p in inventory['profiles']]))
 sections.append(f'''## Disponibilità e dimensioni

**{len(success)}/{len(unique)} risposte strutturate complete**; {len(rejected)} input rifiutati per capacità. I rifiuti non diventano risposte semanticamente errate. Ogni risposta strutturata a64k è condivisa tra sette condizioni baseline: 30contesti e120confronti mappati non equivalgono a120generazioni indipendenti. Sono valutabili {sum(c['paired_profiles'] for c in r['cells'])} coppie.

'''+table(['Cronologia baseline integrale','Posizione fatti','Token locali: memoria completa (min–max)','Token nativi medi S','Risposte S','Baseline: richiamo','Strutturato: richiamo'],[
  [n(target,0),labels[pos],f"{n(min(x['local_prompt_tokens'] for x in contexts if x['target_tokens']==target and x['fact_position']==pos),0)}–{n(max(x['local_prompt_tokens'] for x in contexts if x['target_tokens']==target and x['fact_position']==pos),0)}",n(cells[(mode,pos,arm)]['mean_structured_native_prompt_tokens']),f"{cells[(mode,pos,arm)]['structured_completed']}/5",m(cells[(mode,pos,arm)]['baseline']['history_categories']),m(cells[(mode,pos,arm)]['structured']['history_categories'])]
  for target,mode,arm in ((64000,'manual',uncut),(1200000,'auto_plugin','auto_plugin')) for pos in positions
 ])+f"\n\nDifferenze fra token nativi osservati e conteggio locale calibrato (locale meno uno): **{len(v['structured_native_differences'])}**. Nessun conteggio nativo viene inventato per le richieste rifiutate. Le dimensioni64k/1,2M descrivono la cronologia baseline originale: il deposito completo è più grande perché contiene anche tutte le rappresentazioni derivate, i metadati e i log.")
 for pos in positions:
  group=[cells[('manual',pos,arm)] for arm in arms]
  sections.append(f"## Tutte le condizioni a64k: fatti {labels[pos].lower()}\n\n"+table(['Politica baseline','B: categorie memoria','S: categorie memoria','Differenza(pp)','B: campi memoria','S: campi memoria','Profili S migliori / pari / peggiori'],[
   [names[c['baseline_arm']],m(c['baseline']['history_categories']),m(c['structured']['history_categories']),n(c['history_difference_pp']),m(c['baseline']['history_fields']),m(c['structured']['history_fields']),f"{c['profile_wins']} / {c['profile_ties']} / {c['profile_losses']}"] for c in group
  ])+'\n\nLe sette righe condividono le medesime risposte strutturate dei cinque profili. Lo strutturato conserva e invia l’archivio intero; i tagli riguardano il prompt della baseline.')
 sections.append('## Confronto con il plugin baseline a1,2M\n\n'+table(['Fatti','Risposte B / S','B: categorie memoria','S: categorie memoria','Differenza(pp)','B: campi memoria','S: campi memoria'],[
  [labels[p],f"{cells[('auto_plugin',p,'auto_plugin')]['baseline_completed']}/5 / {cells[('auto_plugin',p,'auto_plugin')]['structured_completed']}/5",m(cells[('auto_plugin',p,'auto_plugin')]['baseline']['history_categories']),m(cells[('auto_plugin',p,'auto_plugin')]['structured']['history_categories']),n(cells[('auto_plugin',p,'auto_plugin')]['history_difference_pp']),m(cells[('auto_plugin',p,'auto_plugin')]['baseline']['history_fields']),m(cells[('auto_plugin',p,'auto_plugin')]['structured']['history_fields'])] for p in positions
 ])+'\n\nN/V significa assenza di una risposta valutabile. Non è0% di accuratezza. La baseline attiva il plugin; lo strutturato lo disattiva per rispettare la richiesta di invio senza tagli. Questi esiti non isolano un effetto della sola architettura.')
 sections.append('## Token per tutte le24celle\n\n'+table(['Scenario baseline','Fatti','Token B medi','Token S medi','Variazione S rispetto a B(%)','Coppie valutabili'],[
  [('64k / ' if mode=='manual' else '1,2M / ')+names[arm],labels[pos],n(cells[(mode,pos,arm)]['mean_baseline_native_prompt_tokens']),n(cells[(mode,pos,arm)]['mean_structured_native_prompt_tokens']),n(-100*cells[(mode,pos,arm)]['mean_paired_native_input_reduction'],2) if cells[(mode,pos,arm)]['mean_paired_native_input_reduction'] is not None else 'N/V',f"{cells[(mode,pos,arm)]['paired_profiles']}/5"]
  for mode,arm in [('manual',a) for a in arms]+[('auto_plugin','auto_plugin')] for pos in positions
 ])+'\n\nVariazione positiva indica più token nello strutturato. È la media dei rapporti entro profilo, non il rapporto delle medie.')
 t=r['unique_semantic_totals']
 sections.append(f'''## Valutazione e calcoli

Richiamo positivo: quattro categorie e nove campi per risposta. Identità e cognome mai comunicato sono controlli separati. Una categoria è corretta soltanto quando tutti i valori e le relazioni richieste sono corretti. L’astensione su un fatto della storia integrale è mancato richiamo, anche quando appropriata rispetto al contesto rimasto.

Sulle sole{len(success)}risposte distinte valutabili: **{m(t['history_categories'])} categorie di memoria**, **{m(t['history_fields'])} campi di memoria**; includendo i controlli, {m(t['categories'])} categorie e {m(t['fields'])} campi. Questi totali non duplicano i controlli condivisi e non vanno confrontati direttamente con una media dei120esiti baseline.

Due valutatori automatici in contesti nuovi ricevono soltanto schede randomizzate, domande, gold e risposte. Modello richiesto `gpt-6-astra`, effort `xhigh`, identità effettiva non esposta. Disaccordi iniziali: {r['disagreement_categories']} categorie. La terza valutazione, se necessaria, viene usata soltanto sulle categorie discordanti. Sono valutazioni automatiche, non giudizi clinici umani; l’efficacia del mascheramento non è misurata. Nessuna rigenerazione per accuratezza.

Differenza abbinata in punti percentuali = media entro profilo di `(categorie corrette S − B)/4 ×100`; per i campi il divisore è9. Solo coppie complete, con denominatori dichiarati. Vittorie/parità/sconfitte usano le quattro categorie. Risposte mancanti e rifiuti sono esiti di disponibilità, non zeri semantici.
''')
 sections.append(f'''## Esecuzione, errore iniziale e correzione

Modello attestato nelle risposte: `{', '.join(r['observed_models'])}`; provider: {', '.join(r['observed_providers'])}. Temperatura0,7, top-p0,95, output massimo4096, ragionamento1024, stop `\\nTherapist:` e `Therapist:`, nessun seed API, top-k omesso e nessun fallback. Plugin esplicitamente disattivato. Ordine seed2026100103, esportazione seed2026100104.

Prima richiesta: HTTP400, messaggio nativo “The total text input size exceeds8MB”. Il controllo iniziale riconosceva limiti di token ma non di byte, quindi si è fermato. La copia corretta registra questo come rifiuto di capacità e conserva quel primo esito **senza ripetere la richiesta**. Prosegue soltanto sui29job non ancora tentati. Tutti gli input e parametri restano identici. Codice iniziale, log e STOP restano inalterati; vedere `AMENDMENT-01.md` e `manifest-amendment-01.json`.

Stato finale: {r['status']}. **{r['http_requests']} richieste HTTP**, {r['http_responses']} risposte native riuscite, {r['http_errors']} errori API archiviati. Job con ritentativi: {len(v['retried_jobs'])}; recuperi per limite di output: {len(v['output_recovery_jobs'])}. Il job004 ha restituito un errore upstream429 dentro una risposta HTTP 200: il controllo ha atteso60secondi e il secondo tentativo è riuscito con lo stesso payload. I 15rifiuti per8MB non sono stati ripetuti. Costo nativo osservato delle chiamate strutturate: **{n(r['observed_new_cost_usd'],6)} USD**. Errori con costo esposto: {v['native_error_records_with_cost']}; senza costo esposto: {v['native_error_records_without_cost']}. Un costo assente non è una dichiarazione del provider di costo zero. Costo della valutazione non incluso. Baseline storica: {n(r['baseline_historical_observed_cost_usd'],6)} USD, senza nuove chiamate.

Ultimo segmento di raccolta UTC: {state['started_at']} → {state.get('completed_at',state.get('stopped_at'))}. La prima richiesta e il fermo sono documentati nel runtime iniziale. Verificati{v['frozen_files_verified']}file congelati, {v['sources_verified']}sorgenti, i payload nativi completi e l’archivio della correzione. Nessun limite di dimensione è aggirato e nessun contenuto è eliminato per ottenere una risposta.
''')
 sections.append('''## Interpretazione e limiti

Questo test risponde alla richiesta di inviare tutto ciò che è salvato: la misura comprende anche dati grezzi, metadati, log e versioni storiche. Non è il normale prompt compatto dell’applicazione. Il richiamo completo nei15casi valutabili mostra che l'informazione è recuperabile quando tutto il deposito è disponibile. Il confronto con il recupero limitato a otto evidenze modifica sia la quantità sia la rappresentazione del contenuto e non isola quale componente produca la differenza. Le condizioni baseline integre e quelle favorevoli alla compressione sono tutte mantenute.

Un rifiuto per8MB è un limite dell’API sul testo, non una misura diretta della capacità contestuale o del ragionamento del modello. La disponibilità della baseline compressa non implica che conservi tutti i fatti: i suoi punteggi restano distinti per posizione. Il confronto non stabilisce superiorità generale dell’architettura strutturata o di quella narrativa.

Cinque profili, un campione per contesto, riempimento sintetico e raccolte separate consentono descrizioni di questi casi. Le posizioni, le domande e i120collegamenti condivisi sono dipendenti. Nessun intervallo binomiale indipendente o p-value. Le informazioni dopo i tagli differiscono tra le politiche; la perdita prima dell’acquisizione nel deposito non è testata. Le prime9sessioni e i loro ricordi sono reali esiti simulati archiviati; l’aggiunta regionale non equivale a nuove sessioni eseguite dall’applicazione.

## Controllo statistico: 11/11

| Rischio | Verifica e limite |
|---|---|
| Simpson | Tutte le24celle restano separate per posizione e politica, con gli stessi profili; nessuna sola media comparativa aggregata. |
| Fallacia ecologica | Nessuna generalizzazione dai profili simulati a pazienti reali. |
| Berkson | Casi e perturbazioni intenzionali; nessuna esclusione secondo l’esito. |
| Collider | Nessun aggiustamento per variabili prodotte dalle risposte; le coppie complete sono esplicite. |
| Tasso di base | Le proporzioni artificiali dei tagli non stimano la frequenza degli errori nell’uso reale. |
| Regressione verso la media | Si mantengono controlli baseline riusciti e tutte le posizioni; una generazione non misura la varianza delle repliche. |
| Sopravvivenza | Si riportano tutti30gli esiti, inclusi input rifiutati; accuratezza condizionata alla disponibilità dichiarata. |
| Confronti multipli | Tutte le24celle visibili, nessun p-value o selezione delle sole differenze favorevoli. |
| Percorsi analitici | Input e rubrica congelati prima delle chiamate; correzione del classificatore di capacità separata e senza ripetere il primo esito. |
| Causalità | Politiche, volume, rappresentazione e plugin differiscono; non si isola l’architettura né si stima un effetto clinico. |
| Causalità inversa | Risposte e punteggi non cambiano input o numero di tentativi. |

## Materiali

`outputs/full-saved-memory-comparison-2026-10-01/`: `PROTOCOL.md`, `preparation.json`, `contexts.json`, `schedule.json`, `manifest.json`, `manifest-amendment-01.json`, `inputs/`, `runtime/`, `runtime-02/`, `review/ratings/`, `analysis/results.json`, `analysis/runtime-verification.json` e `final-manifest.json`.

`inputs/<profilo>/length_<n>/<posizione>/full_saved_memory.txt.gz` conserva il prompt integrale; `completeness.json` contiene conteggi e hash del testo decompresso. I log nativi sono `runtime/001/openrouter-api-records.jsonl.gz` e `runtime-02/<id>/openrouter-api-records.jsonl.gz`. `runtime-02/answers.jsonl` raccoglie tutti gli esiti, incluso il primo rifiuto ereditato. Gzip è solo una codifica senza perdita dell’archivio su disco.

`audit/saved-memory-inventory.json` documenta il prefisso prima dei test; `audit/full-payload-completeness-review.json` verifica tutti30i payload. `figures/full-saved-memory-recall.png` e `.svg` mostrano le24celle. I percorsi sono nella copia locale, senza pubblicazione remota. L’esportazione TeX/PDF precedente è conservata con hash in `previous-review-response/`.
''')
 text='\n\n'.join(sections)+'\n'
 # Only format prose; preserve code spans, filenames and model identifiers.
 import re
 pieces=re.split(r'(`[^`]*`)',text)
 for i in range(0,len(pieces),2):
  pieces[i]=pieces[i].replace('HTTP400','HTTP 400').replace('8MB','8 MB').replace('1,2M','1,2M')
  pieces[i]=re.sub(r'(?<=[a-zàèéìòù])(?=\d)|(?<=\d)(?=[a-zàèéìòù])',' ',pieces[i])
  pieces[i]=pieces[i].replace('tutti 30 gli','tutti i 30').replace('tutti 30 i','tutti i 30').replace('tutte 24 le','tutte le 24')
 text=''.join(pieces)
 (ROOT/'REPORT.md').write_text(text)
 print('Full saved-memory report written.')
if __name__=='__main__':main()
