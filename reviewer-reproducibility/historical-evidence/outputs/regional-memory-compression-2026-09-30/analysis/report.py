"""Render all planned regional cells and source-conditioned calculations."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
POS=('start','middle','end');IT={'start':'Inizio','middle':'Centro','end':'Fine'}
def fmt(v,n=1):return 'N/V' if v is None else f'{v:,.{n}f}'.replace(',','X').replace('.',',').replace('X','.')
def score(v):return 'N/V' if not v['total'] else f"{v['correct']}/{v['total']} ({fmt(v['percent'])}%)"

def main():
 a=json.loads((ROOT/'analysis/results.json').read_text());r=json.loads((ROOT/'analysis/runtime-verification.json').read_text())
 cells=a['cells'];lookup={(c['mode'],c['fact_position'],c['arm']):c for c in cells}
 state=json.loads((ROOT/'runtime/state.json').read_text())
 manual=[c for c in cells if c['mode']=='manual']
 def pooled(key):
  yes=sum(c[key]['correct'] for c in manual);total=sum(c[key]['total'] for c in manual)
  return {'correct':yes,'total':total,'percent':100*yes/total if total else None}
 controls=[lookup[('manual',p,'full')] for p in POS]
 control_yes=sum(c['history_categories']['correct'] for c in controls)
 control_n=sum(c['history_categories']['total'] for c in controls)
 automatic='; '.join(f"{IT[p].lower()}: **{score(lookup[('auto_plugin',p,'auto_plugin')]['history_categories'])}**" for p in POS)
 out=['# Posizione dei fatti e riduzione del contesto','',
 '## Risultati principali','',
 f"- **{a['completed']}/{a['planned']} risposte complete**, con tutte le condizioni pianificate riportate.",
 f"- Nei controlli integrali da circa 64k token: **{control_yes}/{control_n} categorie di richiamo corrette** nelle tre posizioni complessivamente.",
 f"- Con compressione automatica di circa 1,2M token, il richiamo per posizione è {automatic}.",
 f"- Nei tagli locali, aggregando anche i controlli: **{score(pooled('supported_history_fields'))}** campi corretti quando resta una fonte canonica sufficiente; **{score(pooled('removed_source_fields'))}** quando tutte le fonti canoniche sufficienti sono rimosse. Sono misure descrittive di campi ripetuti, non osservazioni indipendenti.",
 '- Le matrici sotto mostrano anche i tagli che conservano i fatti. La conclusione riguarda la conservazione delle informazioni nelle condizioni testate; il sistema strutturato non viene rivalutato.','',
  '## Material Passport','',
 'Esperimento autorizzato su cinque pazienti simulati; valutazione descrittiva di richiamo, senza partecipanti umani. '
 '105 condizioni con tagli locali e 15 con compressione automatica OpenRouter. Il disegno è esplorativo e gli input sono fissati prima delle chiamate.','',
 '## Misure','',
 '**Richiamo positivo:** quattro categorie che interrogano nove campi introdotti nella conversazione '
 '(taccuino, appuntamenti e proposta, sedi, attività completata/pianificata). Ogni cella ha cinque profili, '
 'quindi 20 categorie e 45 campi quando tutte le risposte sono disponibili. Una categoria è corretta solo '
 'se tutti i suoi campi e rapporti sono corretti.','',
 'L’accuratezza complessiva comprende anche nome/età e astensione sul cognome mai stabilito: '
 'sei categorie e dodici campi per risposta. Se tutti i fatti della conversazione sono persi, il punteggio '
  'complessivo può ancora essere 2/6 categorie grazie a questi controlli. Non chiamiamo quel 33,3% ricordo della conversazione.','',
  'L’astensione su un fatto presente nella storia integrale conta come insuccesso di richiamo, anche '
  'quando è appropriata rispetto al contesto rimasto dopo il taglio. Questo punteggio non coincide '
  'quindi con il tasso di affermazioni false o inventate.','',
 '## Controlli senza taglio locale: circa 64 mila token','',
 '| Posizione dei fatti | Richiamo: categorie | Richiamo: campi | Accuratezza complessiva | Token nativi medi |',
  '|---|---:|---:|---:|---:|']
 for p in POS:
  c=lookup[('manual',p,'full')];out.append(f"| {IT[p]} | {score(c['history_categories'])} | {score(c['history_fields'])} | {score(c['categories'])} | {fmt(c['mean_native_prompt_tokens'])} |")
 for percent in (50,75):
  out+=['',f'## Taglio locale del {percent}% della cronologia','',
        'Righe: posizione iniziale del blocco di fatti. Colonne: regione eliminata. '
        'Valori: categorie di richiamo positivo interamente corrette.','',
        '| Posizione dei fatti | Taglio iniziale | Taglio centrale | Taglio finale |','|---|---:|---:|---:|']
  for p in POS:
   out.append('| '+IT[p]+' | '+' | '.join(score(lookup[('manual',p,f'drop_{q}_{percent}')]['history_categories']) for q in POS)+' |')
  out+=['','### Campi, fonti e differenza dal controllo integrale','',
    '| Fatti | Taglio | Campi di richiamo corretti | Fonti canoniche rimaste | Corretti con fonte rimasta | Corretti con fonte rimossa | Variazione categorie dal controllo | Categorie complessive |',
    '|---|---|---:|---:|---:|---:|---:|---:|']
  for p in POS:
   for q in POS:
    c=lookup[('manual',p,f'drop_{q}_{percent}')];coverage=c['canonical_source_coverage']
    out.append(f"| {IT[p]} | {IT[q]} | {score(c['history_fields'])} | {coverage['retained']}/{coverage['total']} | {score(c['supported_history_fields'])} | {score(c['removed_source_fields'])} | {fmt(c['paired_history_category_difference_pp'])} pp | {score(c['categories'])} |")
  out+=['','### Token e intensità effettiva','',
    '| Fatti | Taglio | Riduzione dei token della cronologia | Riduzione dell’intero input | Token nativi medi | Risposte complete |',
    '|---|---|---:|---:|---:|---:|']
  for p in POS:
   for q in POS:
    c=lookup[('manual',p,f'drop_{q}_{percent}')]
    out.append(f"| {IT[p]} | {IT[q]} | {fmt(100*c['mean_achieved_history_reduction'],2)}% | {fmt(100*c['mean_achieved_whole_prompt_reduction'],2)}% | {fmt(c['mean_native_prompt_tokens'])} | {c['completed']}/5 |")
 stale=[c for c in cells if c['mode']=='manual' and (c['stale_appointment_only_profiles'] or c['stale_venue_only_profiles'])]
 out+=['','## Fonti precedenti rimaste senza aggiornamento','',
  'Questi conteggi descrivono l’input: la fonte dell’accordo precedente è rimasta, mentre quella '
  'dell’aggiornamento è stata rimossa. Non sono automaticamente conteggi di risposte errate né provano '
  'che il modello abbia usato la fonte precedente. Sono elencate tutte le celle con almeno un caso; '
  'le altre celle manuali hanno zero casi di questa esposizione.','',
  '| Posizione dei fatti | Condizione | Solo appuntamento precedente | Solo sede precedente |',
  '|---|---|---:|---:|']
 for c in stale:
  out.append(f"| {IT[c['fact_position']]} | `{c['arm']}` | {c['stale_appointment_only_profiles']}/5 | {c['stale_venue_only_profiles']}/5 |")
 if not stale:out.append('| Nessun caso | - | 0 | 0 |')
 out+=['','## Compressione automatica OpenRouter: circa 1,2 milioni di token','',
  'Questo è un esperimento distinto dai tagli locali: si sposta lo stesso blocco di fatti in una cronologia '
  'più lunga e si lascia operare il plugin `context-compression`. Il testo successivo alla trasformazione '
  'non è restituito; la copertura delle fonti dopo il plugin è quindi sconosciuta.','',
  '| Posizione dei fatti | Richiamo: categorie | Richiamo: campi | Accuratezza complessiva | Token nativi medi | Riduzione stimata dell’input | Risposte |',
  '|---|---:|---:|---:|---:|---:|---:|']
 for p in POS:
  c=lookup[('auto_plugin',p,'auto_plugin')]
  reduction=100*c['mean_estimated_plugin_input_reduction'] if c['mean_estimated_plugin_input_reduction'] is not None else None
  out.append(f"| {IT[p]} | {score(c['history_categories'])} | {score(c['history_fields'])} | {score(c['categories'])} | {fmt(c['mean_native_prompt_tokens'])} | {fmt(reduction,2)}% | {c['completed']}/5 |")
 out+=['','## Esempi verificabili e ambiguità','',
  'Per Daniel, con il plugin, i job `109` (inizio) e `115` (fine) recuperano “Tern Window”. '
  'Il job `108` (centro) risponde invece “The exact title for the reflection notebook was not established”. '
  'Per l’attività completata riporta “Reflection example 1”, mentre il valore atteso è “Folded Map”. '
  'Le tre risposte integrali sono raccolte in `analysis/illustrative-position-example.json`. '
  'L’esempio serve a illustrare le tabelle complete, non a selezionare quali esiti contare.','',
  'Nel job `085`, Crystal con fatti alla fine e taglio centrale del 75% recupera il titolo del quaderno '
  'pur avendo perso la fonte canonica iniziale. Il prompt conserva una successiva eco del paziente: '
  '“you giving the notebook a name, "Tern Window,"”. Questo mostra perché fonte canonica rimossa '
  'non significhi necessariamente assenza di ogni indizio. Non attribuiamo con certezza la risposta '
  'a uno specifico passaggio interno del modello.','',
  'I due valutatori segnalano la stessa ambiguità in `C060` (job `040`): la risposta lascia incerto '
  'se il cognome sia mai stato registrato, anziché negarlo chiaramente. Manteniamo il giudizio '
  'conservativo di insuccesso. Accettare quel campo modificherebbe i totali complessivi da '
  '512/720 a 513/720 categorie e da 992/1.440 a 993/1.440 campi; **nessun punteggio di richiamo '
  'positivo riportato nelle matrici cambierebbe**.','',
  '## Calcoli e fonti','',
  '- Accuratezza di richiamo per cella = categorie interamente corrette / (5 profili × 4 categorie) × 100. '
  'Per i campi il denominatore è 5 × 9 = 45. Le unità indipendenti restano i cinque profili, non i 20 o 45 quesiti.',
  '- Riduzione della cronologia = 1 − token locali della cronologia mantenuta / token locali della cronologia integrale. '
  'Profilo, istruzioni e domanda sono esclusi da questo denominatore e protetti dal taglio locale.',
  '- Riduzione dell’intero input = 1 − token locali del prompt mantenuto / token locali del prompt integrale.',
  '- Riduzione stimata dal plugin = 1 − token nativi / (token locali inviati − 1). La calibrazione locale/nativa '
  'è verificata sui prompt accettati; manca un conteggio nativo della versione integrale sopra il limite. '
  'Non è una misura diretta dei caratteri rimossi.',
  '- Variazione abbinata = media, sui profili disponibili della stessa posizione, della differenza fra '
  'categorie corrette nella condizione e nel controllo integrale, divisa per quattro e moltiplicata per cento.',
  '- Fonti canoniche: dichiarazioni autorevoli sufficienti per valore **e stato**; un vecchio appuntamento '
  'non stabilisce da solo che quel valore sia ora precedente. Le associazioni sono congelate in '
  '`source-support-definition.json`. Un campo può essere corretto anche senza quella fonte grazie a indizi '
  'residui; la categoria “fonte rimossa” non equivale a prova di assenza di qualsiasi indizio.',
  '- Un denominatore nullo è N/V; una richiesta rifiutata non diventa uno zero semantico. I conteggi delle '
  'fonti descrivono gli input locali, non un’ipotetica visibilità del testo trasformato dal plugin.','',
  '## Esecuzione e verifiche','',
  f"Stato: **{a['status']}**. {a['completed']}/{a['planned']} risposte complete; {a['http_requests']} richieste HTTP, "
  f"errori HTTP/API: {a['http_errors']}. Costo nativo osservato: **{fmt(a['observed_cost_usd'],6)} USD**. "
  'Il costo della valutazione automatizzata non è incluso. L’unico errore è un 429 a monte, contenuto '
  'in una risposta HTTP 200; il controllo lo ha riconosciuto e ha ripetuto lo stesso payload dopo 60 secondi. '
  'Il record nativo dell’errore riporta un costo pari a zero.',
  '',f"Modelli attestati: `{', '.join(a['observed_models'])}`; provider: {', '.join(a['observed_providers'])}. "
  'Temperatura 0,7; top-p 0,95; output massimo 4096 e ragionamento richiesto 1024; due sequenze di stop: '
  'una nuova riga seguita da `Therapist:`, e `Therapist:`. Nessun seed API, top-k non inoltrato e nessun fallback. '
  'Un solo messaggio utente per richiesta.',
  '',f"Raccolta UTC: {state['started_at']} → {state.get('completed_at',state.get('stopped_at'))}. "
  f"Verificati {r['frozen_files_verified']} file congelati e {r['sources_verified']} sorgenti; "
  f"Richieste con ritentativi tecnici: {len(r['retried_jobs'])}; con recupero per limite di output: {len(r['output_recovery_jobs'])}. "
  f"Prompt manuali con differenza dal conteggio locale calibrato: {len(r['manual_native_differences'])}.",
  '',f"Due valutazioni automatiche cieche rispetto alle etichette di condizione, posizione e copertura delle fonti. "
  f"Disaccordi iniziali: {a['disagreement_categories']} categorie. "
  + ('Non è necessaria una terza valutazione. ' if not a['disagreement_categories'] else 'I disaccordi sono risolti con una terza valutazione. ')
  + 'Nessuna risposta è rigenerata per migliorarne il contenuto. Vedere `review/EXECUTION.md` per modelli e modalità.',
  '', 'La preparazione degli input è terminata prima della raccolta. Un problema di spazio durante '
  'l’installazione del programma per i grafici è stato risolto rimuovendo soltanto due directory temporanee '
  'di dipendenze ormai inutilizzate; dati e ambiente del processo di raccolta sono rimasti invariati. '
  'Vedere `audit/temp-space-recovery.json`. Tre casi limite dell’analisi sono corretti in una copia '
  'separata del programma; endpoint e file congelati restano invariati (`audit/ANALYSIS-AMENDMENT-01.md`).',
  '', '## Limiti dell’interpretazione','',
  'Le cinque storie sono le unità di caso; posizioni, tagli e domande sono perturbazioni correlate. '
  'Una generazione per cella, cinque profili e dialoghi di riempimento sintetici non stimano una prestazione '
  'clinica di popolazione. Il blocco mantiene la propria cronologia interna, ma il suo spostamento è una '
  'manipolazione sperimentale della posizione del contesto. Non si tratta di nuove sessioni cliniche.',
  '', 'La perdita dopo eliminazione della fonte dimostra il limite di quella politica di gestione del '
  'contesto. Non dimostra da sola inferiore capacità di ragionamento o superiorità di una memoria strutturata. '
  '**Il sistema strutturato non è rivalutato in questo esperimento.** I risultati longitudinali e del '
  'componente di recupero restano negli archivi separati.','',
  '## Controllo dell’interpretazione statistica: 11/11 verifiche','',
  '| Rischio | Verifica e limite |','|---|---|',
  '| Paradosso di Simpson | Le celle mantengono gli stessi cinque profili; sono conservati i punteggi individuali e le differenze abbinate. Posizione, regione e intensità non sono fuse in un unico effetto. |',
  '| Fallacia ecologica | Le medie descrivono questi cinque profili simulati; non diventano prestazioni di pazienti reali o di una popolazione di dialoghi. |',
  '| Selezione di Berkson | Il corpus è intenzionale e deriva da storie già disponibili. Nessuna cella viene scelta o esclusa sulla base del punteggio, ma la selezione dei profili limita la generalizzabilità. |',
  '| Collider | Non si aggiustano gli effetti per variabili prodotte dalla risposta. Il richiamo condizionato alla fonte usa una proprietà dell’input fissata prima della generazione; non sostituisce il risultato complessivo. |',
  '| Trascuratezza del tasso di base | Questo non è un test diagnostico o di rilevamento degli errori del terapeuta. Le quote artificiali di tagli e posizioni non stimano la frequenza dei guasti in uso reale. |',
  '| Regressione verso la media | Si includono tutti i cinque profili e i rispettivi controlli senza taglio. Una sola generazione per cella non stima la variabilità fra ripetizioni; non si selezionano soltanto risposte inizialmente errate. |',
  f"| Sopravvivenza | Sono riportate tutte le {a['planned']} condizioni pianificate e le {a['completed']} risposte complete. Gli errori tecnici sono archiviati; eventuali risposte mancanti restano esiti di disponibilità. |",
  '| Confronti multipli | Sono mostrate tutte le 24 celle e tutti i denominatori. Nessun p-value o selezione di sole differenze favorevoli. |',
  '| Percorsi analitici alternativi | Disegno, input, rubrica e copertura delle fonti sono congelati prima della raccolta; la prova resta esplorativa, motivata dai risultati precedenti. L’emendamento del codice corregge tre casi limite e conserva la versione iniziale. |',
  '| Correlazione e causalità | I tagli sono manipolazioni controllate, ma un solo campione stocastico per cella limita la precisione dell’effetto. Tagli a 64k e plugin a 1,2M sono esperimenti distinti; non stimano un effetto isolato del plugin né un vantaggio dello strutturato. |',
  '| Causalità inversa | Posizione e tagli sono stabiliti prima delle risposte; i punteggi non modificano gli input o il numero di tentativi. Nessuna inferenza clinica direzionale. |','',
  '## Materiali','',
  'Directory nella copia di lavoro: `outputs/regional-memory-compression-2026-09-30/`. '
  '`inputs/`, `schedule.json`, `manifest.json`, `runtime/`, `review/ratings/`, '
  '`analysis/results.json` e `analysis/runtime-verification.json` permettono di controllare ogni cella. '
  '`figures/regional-memory-recall.png` e `.svg` mostrano il richiamo positivo; `final-manifest.json` '
  'registra gli hash finali. Questi percorsi non implicano pubblicazione remota.','']
 (ROOT/'REPORT.md').write_text('\n'.join(out))
 print('Report written with all24 cells and paired/source-conditioned calculations')

if __name__=='__main__':main()
