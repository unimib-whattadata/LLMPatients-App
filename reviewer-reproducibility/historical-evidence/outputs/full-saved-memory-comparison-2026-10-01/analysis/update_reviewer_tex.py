"""Append full saved-memory policy; preserve preceding reviewer response."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1];REPO=ROOT.parents[1]
def read(p):return json.loads(Path(p).read_text())
def n(x,d=1):return 'N/V' if x is None else f'{x:,.{d}f}'.replace(',','@').replace('.',',').replace('@','.')
def f(x):return f"{x['correct']}/{x['total']}" if x['total'] else 'N/V'
def row(title,body):return '\n\\midrule\n\\textit{(Continuazione: invio integrale della memoria salvata.)}\n&\n\\selectlanguage{italian}\n\\textbf{'+title+'}\n\\par\n'+body+'\n\\\\\n'
def main():
 r=read(ROOT/'analysis/results.json');v=read(ROOT/'analysis/runtime-verification.json');c={(x['mode'],x['fact_position'],x['baseline_arm']):x for x in r['cells']};positions=('start','middle','end');labels=('Inizio','Centro','Fine')
 uncut=next(x['baseline_arm'] for x in r['cells'] if x['mode']=='manual' and not x['baseline_arm'].startswith('drop_'))
 complete=[j for j in r['unique_generations'] if j['status']=='complete'];rejected=[j for j in r['unique_generations'] if j['status']=='context_rejected']
 sections=[row('Confronto con tutta la memoria salvata, senza selezione.',r'''Abbiamo valutato anche una politica che invia \textbf{tutti i record della memoria persistente}, senza scegliere otto evidenze e senza troncare riepiloghi o scambi. Per ciascuno dei cinque profili, il prefisso disponibile prima delle domande di verifica contiene 81 record: 45 scambi, nove blocchi di fatti, nove riepiloghi episodici, nove riflessioni e nove versioni del riepilogo a lungo termine. Il suo hash coincide con quello registrato alla chiusura della nona sessione. Le risposte successive ai test restano escluse.
\par
Conserviamo ogni campo e versione storica, inclusi i log di estrazione e le proposte rifiutate, che mantengono la propria etichetta di quarantena. Includiamo tutti gli scambi aggiunti nei medesimi 30 archivi regionali, mantenendo posizione, profilo, istruzioni e sei domande. Nessuna selezione guidata dalla domanda o dalle risposte attese.
\par
La compressione di OpenRouter è esplicitamente disattivata per lo strutturato con \texttt{enabled:false}. I file su disco usano gzip senza perdita, ma l'API riceve il testo integrale decompresso. Nessun contenuto viene eliminato per rientrare nei limiti. I 120 esiti baseline sono riutilizzati; una risposta strutturata a 64k è condivisa fra sette condizioni baseline, senza contarla sette volte nei totali o nei costi.
\par
Il riempimento è conservato come testo grezzo: non sono stati generati riepiloghi o fatti aggiuntivi per quei dialoghi. La prova riguarda l'invio dell'intero deposito salvato, \textbf{non una riesecuzione del grafo applicativo su tutte le conversazioni aggiunte}. Lo stato e le cache esterne al deposito non sono memoria aggiuntiva; il profilo comune resta identico.''')]
 b=r'''La tabella riporta le categorie di richiamo corrette: quattro per profilo, quindi 20 per cella quando tutte le risposte sono disponibili. Le dimensioni 64k e 1,2M si riferiscono alla cronologia baseline integrale, non alla dimensione della memoria completa serializzata.
\par
{\small\setlength{\tabcolsep}{3pt}
\begin{tabular}{@{}llrrr@{}}
\toprule
\textbf{Archivio} & \textbf{Fatti} & \textbf{B} & \textbf{S} & \textbf{Risposte S} \\
\midrule
'''
 for size,mode,arm in [('64k','manual',uncut),('1,2M','auto_plugin','auto_plugin')]:
  for pos,label in zip(positions,labels):
   cell=c[(mode,pos,arm)];b+=f"{size} & {label} & {f(cell['baseline']['history_categories'])} & {f(cell['structured']['history_categories'])} & {cell['structured_completed']}/5 \\\\\n"
 b+=r'''\bottomrule
\end{tabular}}
\par
B indica la baseline (cronologia integra a 64k; plugin attivo a 1,2M), S l'intera memoria salvata senza compressione. \textbf{N/V indica una richiesta rifiutata, non accuratezza zero}. Le differenze di richiamo si calcolano soltanto sulle coppie con risposta disponibile.
\par
'''
 for percent in (50,75):
  b+=f'\\textbf{{Taglio baseline del {percent}\\%: percentuali B / S}}\n\\par\n'
  b+=r'''{\small\setlength{\tabcolsep}{5pt}
\begin{tabular}{@{}lrrr@{}}
\toprule
\textbf{Fatti} & \textbf{Taglio inizio} & \textbf{Taglio centro} & \textbf{Taglio fine} \\
\midrule
'''
  for pos,label in zip(positions,labels):
   values=[]
   for region in positions:
    cell=c[('manual',pos,f'drop_{region}_{percent}')];values.append(f"{n(cell['baseline']['history_categories']['percent'],0)} / {n(cell['structured']['history_categories']['percent'],0)}")
   b+=label+' & '+' & '.join(values)+' \\\\\n'
  b+=r'''\bottomrule
\end{tabular}}
\par
'''
 b+=r'''Le percentuali strutturate di una stessa riga riutilizzano le medesime cinque risposte in entrambi i livelli di taglio e nel controllo senza taglio. Tutte le 24 celle, i nove campi di richiamo e i punteggi per profilo sono conservati nel rapporto.'''
 sections.append(row('Risultati di richiamo e disponibilità.',b))
 t=r['unique_semantic_totals'];contexts=read(ROOT/'contexts.json');sm=[x['local_prompt_tokens'] for x in contexts if x['target_tokens']==64000];lg=[x['local_prompt_tokens'] for x in contexts if x['target_tokens']==1200000]
 b=f"La serializzazione integrale produce {n(min(sm),0)}--{n(max(sm),0)} token locali negli scenari da 64k e {n(min(lg),0)}--{n(max(lg),0)} in quelli da 1,2M. Include testi originali, tutte le rappresentazioni derivate, versioni storiche e metadati; non è il normale prompt compatto dell'applicazione.\n\\par\n"
 b+=f"Sono disponibili {len(complete)}/30 risposte; {len(rejected)} input sono rifiutati per capacità. La prima richiesta restituisce HTTP 400: ``The total text input size exceeds 8 MB''. Il controllo riconosceva soltanto i limiti di token e si è fermato. Abbiamo conservato quel primo esito e corretto il riconoscimento dei limiti in byte, proseguendo sui 29 casi non ancora tentati senza ripetere il primo né modificare gli input. Questo limite del testo dell'API non è una misura della capacità di ragionamento del modello.\n\\par\n"
 b+=f"Sulle sole risposte distinte valutabili sono corrette \\textbf{{{f(t['history_categories'])} categorie di memoria}} e \\textbf{{{f(t['history_fields'])} campi}}. Includendo identità e cognome mai stabilito, i totali sono {f(t['categories'])} categorie e {f(t['fields'])} campi. Una categoria passa soltanto con tutti i valori e rapporti corretti.\n\\par\n"
 b+=f"Due valutatori automatici in contesti nuovi ricevono soltanto schede randomizzate con domanda, gold e risposta. Modello richiesto \\texttt{{gpt-6-astra}}, effort \\texttt{{xhigh}}; identità effettiva non esposta. Disaccordi iniziali: {r['disagreement_categories']} categorie. Nessuna risposta è rigenerata per migliorarne il punteggio.\n\\par\n"
 b+=f"Modello di generazione \\texttt{{google/gemini-2.5-pro}}, temperatura $0{{,}}7$, top-p $0{{,}}95$, output massimo 4.096 e ragionamento 1.024 token, senza seed API o fallback. Richieste HTTP: {r['http_requests']}; costo nativo osservato: {n(r['observed_new_cost_usd'],6)} USD, esclusa la valutazione. I record di errore senza costo esposto sono {v['native_error_records_without_cost']}; un costo assente non attesta costo zero."
 sections.append(row('Dimensioni, esecuzione e valutazione.',b))
 sections.append(row('Interpretazione e materiali dell’invio integrale.',r'''Nei 15 casi valutabili, il richiamo con tutta la memoria è completo: 60/60 categorie e 135/135 campi. Anche la baseline integra raggiunge il 100\%; dopo i tagli, il suo richiamo varia dallo 0 al 100\% fra le celle. Lo strutturato mantiene tutti i contenuti in queste condizioni. Nei 15 casi più grandi, il limite di 8 MB impedisce invece la risposta strutturata: non si assegna un punteggio di accuratezza.
\par
Il confronto distingue il recupero limitato a otto evidenze dall'invio dell'intero deposito. La seconda politica mette a disposizione più contenuto e richiede molti più token. I risultati non isolano l'effetto della sola struttura: quantità e rappresentazione delle informazioni, plugin e date di raccolta differiscono. I controlli baseline integri e quelli favorevoli alla compressione sono inclusi.
\par
Cinque profili, un campione per contesto e condizioni correlate consentono conclusioni descrittive. Non vengono calcolati p-value o intervalli assumendo indipendenza dei 120 collegamenti. Un rifiuto dell'API resta una misura di disponibilità; non viene trasformato in un errore di memoria. La prova non modifica i risultati separati sulle undici sessioni dell'applicazione completa.
\par
Dati e calcoli sono in \path{outputs/full-saved-memory-comparison-2026-10-01/}: \path{REPORT.md}, \path{analysis/results.json}, \path{analysis/runtime-verification.json}, \path{contexts.json} e \path{schedule.json}. Ogni prompt integrale è in \path{inputs/<profilo>/length_<n>/<posizione>/full_saved_memory.txt.gz}, con conteggi e hash in \path{completeness.json}.
\par
\path{audit/saved-memory-inventory.json} documenta i prefissi prima dei test; \path{audit/full-payload-completeness-review.json} verifica tutti i record. Il primo esito nativo è in \path{runtime/001/}; gli altri sono in \path{runtime-02/}, dove \path{answers.jsonl} raccoglie tutti gli esiti senza duplicazioni. I giudizi sono in \path{review/ratings/}.
\par
Protocollo, codice e hash sono conservati in \path{PROTOCOL.md}, \path{manifest.json}, \path{AMENDMENT-01.md}, \path{manifest-amendment-01.json} e \path{final-manifest.json}. Il grafico completo è \path{figures/full-saved-memory-recall.svg}.'''))
 original=(ROOT/'previous-review-response/response_to_reviewer_comment_1.tex').read_text();end='\\end{longtable}\n\\end{document}';assert original.count(end)==1
 (REPO/'response_to_reviewer_comment_1.tex').write_text(original.replace(end,''.join(sections)+'\n'+end))
 print('Reviewer response appended with complete saved-memory comparison.')
if __name__=='__main__':main()
