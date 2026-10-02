"""Append the verified regional experiment, preserving the preceding response."""
import json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
REPO=ROOT.parents[1]
POSITIONS=('start','middle','end');IT={'start':'Inizio','middle':'Centro','end':'Fine'}
def fmt(x,n=1):return f'{x:,.{n}f}'.replace(',','X').replace('.',',').replace('X','.')
def main():
 r=json.loads((ROOT/'analysis/results.json').read_text());assert r['completed']==r['planned']==120
 verification=json.loads((ROOT/'analysis/runtime-verification.json').read_text())
 assert not verification['manual_native_differences']
 cells={(c['mode'],c['fact_position'],c['arm']):c for c in r['cells']}
 path=REPO/'response_to_reviewer_comment_1.tex'
 original=(ROOT/'previous-review-response/response_to_reviewer_comment_1.tex').read_text()
 assert path.read_text()==original,'Current response changed since archived checkpoint'
 assert '\\end{longtable}\n\\end{document}' in original
 def matrix(frac):
  lines=[r'{\small\setlength{\tabcolsep}{5pt}',r'\begin{tabular}{@{}lrrr@{}}',r'\toprule',r'\textbf{Fatti} & \multicolumn{3}{c}{\textbf{Regione eliminata}} \\',r'& \textbf{Inizio} & \textbf{Centro} & \textbf{Fine} \\',r'\midrule']
  for p in POSITIONS:
   vals=[cells[('manual',p,f'drop_{q}_{frac}')]['history_categories'] for q in POSITIONS]
   assert all(v['total']==20 for v in vals)
   lines.append(IT[p]+' & '+' & '.join(f"{fmt(v['percent'],0)}\\%" for v in vals)+r' \\')
  return '\n'.join(lines+[r'\bottomrule',r'\end{tabular}}'])
 controls=', '.join(f"{IT[p].lower()}: {cells[('manual',p,'full')]['history_categories']['correct']}/20" for p in POSITIONS)
 auto=[]
 for p in POSITIONS:
  c=cells[('auto_plugin',p,'auto_plugin')];v=c['history_categories']
  auto.append(f"{IT[p]} & {v['correct']}/{v['total']} ({fmt(v['percent'],0)}\\%) & {fmt(c['mean_native_prompt_tokens'],1)}"+r' \\')
 reductions=[100*cells[('auto_plugin',p,'auto_plugin')]['mean_estimated_plugin_input_reduction'] for p in POSITIONS]
 addition=r'''
\midrule
\textit{(Continuazione del commento precedente: posizione dei fatti e rimozione di parti della memoria.)}
&
\selectlanguage{italian}
\textbf{Prova controllata della posizione e della perdita di informazioni.}
\par
Abbiamo eseguito 120 condizioni sui cinque profili. In 105 condizioni, il medesimo blocco di 45 scambi delle prime nove sessioni viene collocato all'inizio, al centro o alla fine della cronologia, con input integrali di circa 64 mila token. Per ogni posizione confrontiamo la cronologia integrale con l'eliminazione del 50\% o del 75\% dei token della cronologia, nella parte iniziale, centrale o finale. Rimuoviamo scambi interi e misuriamo la riduzione effettiva; profilo, istruzioni e domanda sono protetti dal taglio locale.
\par
In altre 15 condizioni inviamo circa 1,2 milioni di token con le stesse tre posizioni del blocco, lasciando la riduzione al plugin \texttt{context-compression} di OpenRouter. I tagli locali non sono opzioni selezionabili del plugin e non costituiscono riassunti semantici. Si tratta di due esperimenti distinti.
\par
Le impostazioni sono \texttt{google/gemini-2.5-pro}, temperatura $0{,}7$, top-p $0{,}95$, output massimo 4.096 e ragionamento richiesto 1.024 token, senza seed API o fallback. Una generazione per condizione, con input e rubrica fissati prima della raccolta; i ritentativi sono ammessi solo per errori tecnici previsti.
\par
Misuriamo separatamente il \textbf{richiamo dei fatti della conversazione}: quattro categorie e nove campi per risposta, quindi 20 categorie e 45 campi per cella. Identità e astensione sul cognome mai comunicato sono controlli separati. Un'astensione dopo la rimozione della fonte conta come mancato richiamo, pur potendo essere appropriata rispetto al testo rimasto; non equivale a un'affermazione falsa.
\\

\midrule
\textit{(Continuazione del commento precedente.)}
&
\selectlanguage{italian}
\textbf{Accuratezza con tagli locali.}
\par
Le tabelle riportano la percentuale di categorie di richiamo interamente corrette su 20 per cella. Le righe indicano dove si trovavano i fatti; le colonne quale regione è stata eliminata. I controlli senza taglio ottengono CONTROLVALUES.
\par
\textbf{Eliminazione del 50\% della cronologia}
\par
MATRIX50
\par
\textbf{Eliminazione del 75\% della cronologia}
\par
MATRIX75
\par
I token nativi dei 105 input manuali coincidono con il conteggio locale calibrato: il plugin, pur attivo, non aggiunge una riduzione misurabile. La riduzione della sola cronologia è circa il 50\% o il 75\%; quella dell'intero input è minore perché include il profilo e la domanda protetti.
\par
Aggregando i tagli locali e i controlli, sono corretti \textbf{542/542 campi con fonte canonica sufficiente conservata} e 1/403 con fonte rimossa. Nel solo caso riuscito con fonte rimossa resta un'eco del titolo nella risposta del paziente: l'assenza della fonte canonica non esclude ogni indizio residuo. Il rapporto documenta anche la differenza abbinata dal controllo per ogni profilo. Questi conteggi descrittivi riguardano campi ripetuti e correlati; la rimozione della fonte non prova un errore di ragionamento.
\\

\midrule
\textit{(Continuazione del commento precedente.)}
&
\selectlanguage{italian}
\textbf{Compressione automatica e posizione dei fatti.}
\par
Tutte le 15 richieste da circa 1,2 milioni di token producono una risposta completa. La tabella riporta il richiamo positivo e il numero medio di token nativi dopo la trasformazione.
\par
{\small\setlength{\tabcolsep}{3pt}
\begin{tabular}{@{}lrr@{}}
\toprule
\textbf{Fatti} & \textbf{Categorie corrette} & \textbf{Token nativi} \\
\midrule
AUTOROWS
\bottomrule
\end{tabular}}
\par
La riduzione stimata dell'input è REDUCTIONRANGE. Il denominatore usa i token locali meno un token, relazione verificata sui 105 input manuali. Il testo trasformato non è restituito: non possiamo ricostruire direttamente quali fonti il plugin abbia eliminato.
\par
Due valutazioni automatiche separate, senza etichette di posizione, taglio o copertura delle fonti, hanno prodotto DISAGREEMENTS disaccordi iniziali su 720 categorie; gli eventuali disaccordi sono risolti in un terzo contesto. Modello richiesto \texttt{gpt-6-astra}, effort \texttt{xhigh}; identità servita non esposta. La raccolta comprende 120 risposte e REQUESTS richieste HTTP; errori API archiviati: ERRORS. Costo nativo osservato: COST USD, esclusa la valutazione automatizzata.
\par
La prova descrive la vulnerabilità alla perdita di informazioni per queste politiche e posizioni. Non rivaluta il sistema strutturato e non ne dimostra la superiorità. Cinque profili, una generazione per cella e dialoghi sintetici di riempimento limitano la generalizzabilità.
\par
Dati e calcoli sono in \path{outputs/regional-memory-compression-2026-09-30/}: \path{REPORT.md}, \path{analysis/results.json}, \path{analysis/runtime-verification.json}, \path{inputs/}, \path{runtime/} e \path{review/ratings/}. Protocollo, ordine e hash sono in \path{PROTOCOL.md}, \path{schedule.json}, \path{manifest.json} e \path{final-manifest.json}; il grafico è in \path{figures/regional-memory-recall.svg}.
\\

'''
 for before,after in {
  'CONTROLVALUES':controls,'MATRIX50':matrix(50),'MATRIX75':matrix(75),'AUTOROWS':'\n'.join(auto),
  'REDUCTIONRANGE':f"{fmt(min(reductions),2)}--{fmt(max(reductions),2)}\\%",
  'DISAGREEMENTS':str(r['disagreement_categories']),'REQUESTS':str(r['http_requests']),
  'ERRORS':str(r['http_errors']),'COST':fmt(r['observed_cost_usd'],6)
 }.items():addition=addition.replace(before,after)
 if r['disagreement_categories']==0:
  addition=addition.replace('hanno prodotto 0 disaccordi iniziali su 720 categorie; gli eventuali disaccordi sono risolti in un terzo contesto','concordano su tutte le 720 categorie e sui 1.440 campi')
 updated=original.replace('\\end{longtable}\n\\end{document}',addition+'\\end{longtable}\n\\end{document}')
 updated=updated.replace('% Automatic compression:', '% Regional removal: outputs/regional-memory-compression-2026-09-30/REPORT.md\n% Automatic compression:',1)
 path.write_text(updated)
 print('Appended three regional-experiment rows; prior content preserved')

if __name__=='__main__':main()
