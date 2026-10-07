"""Append paired component results to preserved reviewer response; no old text rewriting."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1];REPO=ROOT.parents[1]
def read(p):return json.loads(Path(p).read_text())
def n(x,d=1):return f'{x:,.{d}f}'.replace(',','@').replace('.',',').replace('@','.')
def row(title,body):return '\n\\midrule\n\\textit{(Continuazione del commento precedente: confronto con memoria persistente.)}\n&\n\\selectlanguage{italian}\n\\textbf{'+title+'}\n\\par\n'+body+'\n\\\\\n'
def main():
 r=read(ROOT/'analysis/results.json');v=read(ROOT/'analysis/runtime-verification.json');c={(x['mode'],x['fact_position'],x['baseline_arm']):x for x in r['cells']}
 uncut=next(x['baseline_arm'] for x in r['cells'] if x['mode']=='manual' and not x['baseline_arm'].startswith('drop_'))
 positions=('start','middle','end');labels=('Inizio','Centro','Fine')
 native=[j['native_prompt_tokens'] for j in r['unique_generations'] if j['status']=='complete']
 assert len(native)==30,'This completed-run TeX rendering requires all30 answers'
 sections=[]
 sections.append(row('Confronto sugli stessi archivi con memoria strutturata persistente.',r'''Abbiamo confrontato i 120 esiti della baseline con il componente nativo \texttt{EvidenceMemory}, usando gli stessi cinque profili, gli stessi 30 archivi integrali, le stesse posizioni dei fatti e le stesse sei domande. Il componente cerca nell'archivio persistente prima del taglio del prompt; consegna al modello al massimo otto evidenze, con budget di 1.800 token stimati. Il testo eliminato dal prompt della baseline rimane quindi disponibile nel suo archivio persistente: misuriamo due politiche di memoria, senza assumere parità delle informazioni dopo il taglio.
\par
La prova usa fatti validati e scambi testuali, con codice di recupero e budget invariati. Il riempimento è ricercabile come testo grezzo, senza nuovo consolidamento in fatti. Non vengono aggiunti sommari, riflessioni, memoria recente o episodica, né stato dinamico: \textbf{si valuta il componente di recupero, non l'intero grafo applicativo}. La prova longitudinale sulle undici sessioni mantiene i propri risultati separati.
\par
Sono state generate \textbf{30 risposte strutturate distinte}: cinque profili per tre posizioni e due lunghezze. A 64 mila token, una stessa risposta strutturata per profilo e posizione viene confrontata con tutte le sette politiche della baseline. I 120 confronti abbinati non rappresentano 120 generazioni strutturate indipendenti. La baseline non viene rigenerata; le raccolte avvengono separatamente nel tempo.
\par
Il modello è \texttt{google/gemini-2.5-pro}, provider Google; temperatura $0{,}7$, top-p $0{,}95$, output massimo 4.096 e ragionamento richiesto 1.024 token, senza seed API o fallback. Il plugin di compressione è attivo anche per gli input strutturati. Protocollo, rubrica e input sono fissati prima delle chiamate; i sei quesiti rimangono accorpati. L'embedding MiniLM della domanda supera il massimo dell'encoder (272 contro 256 token) e viene troncato come nella prova di lunghezza; la ricerca lessicale usa la domanda intera.'''))
 intro=r'''Le tabelle riportano le categorie di richiamo positivo interamente corrette, su 20 per cella (cinque profili per quattro categorie). Identità e cognome mai comunicato sono esclusi da questo indicatore. Una categoria passa solo se tutti i campi e i rapporti richiesti sono corretti.
\par
\textbf{Cronologia integrale da circa 64 mila token}
\par
{\small\setlength{\tabcolsep}{4pt}
\begin{tabular}{@{}lrrr@{}}
\toprule
\textbf{Fatti} & \textbf{Baseline} & \textbf{Strutturato} & $\boldsymbol{\Delta}$ \textbf{(pp)} \\
\midrule
'''.replace('$\\boldsymbol{\\Delta}$', '$\\Delta$')
 for pos,label in zip(positions,labels):
  cell=c[('manual',pos,uncut)];intro+=f"{label} & {cell['baseline']['history_categories']['correct']}/20 & {cell['structured']['history_categories']['correct']}/20 & {n(cell['history_difference_pp'])} \\\\\n"
 intro+=r'''\bottomrule
\end{tabular}}
\par
\textbf{Compressione automatica: archivio da circa 1,2 milioni di token}
\par
{\small\setlength{\tabcolsep}{4pt}
\begin{tabular}{@{}lrrr@{}}
\toprule
\textbf{Fatti} & \textbf{Baseline} & \textbf{Strutturato} & $\Delta$ \textbf{(pp)} \\
\midrule
'''
 for pos,label in zip(positions,labels):
  cell=c[('auto_plugin',pos,'auto_plugin')];intro+=f"{label} & {cell['baseline']['history_categories']['correct']}/20 & {cell['structured']['history_categories']['correct']}/20 & {n(cell['history_difference_pp'])} \\\\\n"
 intro+=r'''\bottomrule
\end{tabular}}
\par
La differenza è calcolata entro profilo e poi mediata; una generazione per contesto e cinque profili consentono risultati descrittivi. Il testo trasformato dal plugin non è restituito, quindi la posizione dei fatti e le risposte non permettono di ricostruire direttamente tutte le fonti eliminate.'''
 sections.append(row('Risultati nei controlli integrali e con il plugin.',intro))
 matrices=r'''Ogni cella mostra \textbf{baseline / strutturato}, in percentuale di categorie di richiamo corrette. Le righe indicano la posizione dei fatti; le colonne la regione eliminata dal prompt della baseline. L'archivio persistente dello strutturato rimane integro.
\par
'''
 for percent in (50,75):
  matrices+=f'\\textbf{{Eliminazione del {percent}\\% della cronologia}}\n\\par\n'
  matrices+=r'''{\small\setlength{\tabcolsep}{5pt}
\begin{tabular}{@{}lrrr@{}}
\toprule
\textbf{Fatti} & \textbf{Inizio} & \textbf{Centro} & \textbf{Fine} \\
\midrule
'''
  for pos,label in zip(positions,labels):
   values=[]
   for region in positions:
    cell=c[('manual',pos,f'drop_{region}_{percent}')]
    values.append(f"{n(cell['baseline']['history_categories']['percent'],0)} / {n(cell['structured']['history_categories']['percent'],0)}")
   matrices+=label+' & '+' & '.join(values)+' \\\\\n'
  matrices+=r'''\bottomrule
\end{tabular}}
\par
'''
 matrices+=r'''Per ogni riga, le tre percentuali strutturate derivano dalle medesime cinque risposte, condivise anche con l'altro livello di taglio e con il controllo integrale. Non si sommano tali ripetizioni come osservazioni indipendenti. Il rapporto nel repository include tutti i punteggi sui nove campi, i valori individuali, le differenze abbinate e i profili migliori, pari o peggiori in ogni cella.'''
 sections.append(row('Risultati con tagli locali della baseline.',matrices))
 tokens=r'''La tabella riporta i token nativi medi registrati dal provider per la cronologia integrale a 64k e per il plugin a 1,2M.
\par
{\small\setlength{\tabcolsep}{3pt}
\begin{tabular}{@{}llrr@{}}
\toprule
\textbf{Archivio} & \textbf{Fatti} & \textbf{Baseline} & \textbf{Strutturato} \\
\midrule
'''
 for size,mode,arm in [('64k','manual',uncut),('1,2M','auto_plugin','auto_plugin')]:
  for pos,label in zip(positions,labels):
   cell=c[(mode,pos,arm)];tokens+=f"{size} & {label} & {n(cell['mean_baseline_native_prompt_tokens'])} & {n(cell['mean_structured_native_prompt_tokens'])} \\\\\n"
 tokens+=r'''\bottomrule
\end{tabular}}
\par
'''
 tokens+=f"Gli input strutturati completi variano fra {n(min(native),0)} e {n(max(native),0)} token nativi. In tutti i 30 casi coincidono con il conteggio locale meno un token, senza riduzione ulteriore misurabile. Tutte le 30 risposte sono complete, con {r['http_errors']} errori API, {len(v['retried_jobs'])} job ritentati e {len(v['output_recovery_jobs'])} recuperi di output. Il costo delle sole chiamate strutturate è {n(r['observed_new_cost_usd'],6)} USD, esclusa la valutazione automatizzata.\n\\par\n"
 tokens+=f"Due valutatori automatici in contesti nuovi ricevono soltanto domande, risposte attese e risposte del modello; etichette sperimentali, prompt e selezioni sono esclusi. Modello richiesto \\texttt{{gpt-6-astra}}, effort \\texttt{{xhigh}}, identità effettiva non esposta. I due valutatori concordano su tutte le 180 categorie e sui 360 campi. Non è necessaria una terza valutazione.\n\\par\n"
 tokens+=r'''La memoria persistente può recuperare alcuni fatti quando la baseline li perde dal prompt; con la selezione attuale rimangono errori di richiamo anche con archivio integro. I confronti con la cronologia integrale e con le posizioni favorevoli al plugin devono quindi essere mantenuti. Questi risultati non dimostrano superiorità generale del sistema completo, né attribuiscono l'effetto alla sola rappresentazione strutturata dei fatti.'''
 sections.append(row('Token, esecuzione e interpretazione.',tokens))
 sections.append(row('Materiali e limiti del confronto.',r'''Il confronto rimane esplorativo: gli scenari sono selezionati intenzionalmente, cinque profili e riempimento sintetico non rappresentano una popolazione clinica, e i bracci sono raccolti in momenti distinti. Non si calcolano intervalli o test assumendo indipendenza delle domande o dei controlli condivisi. Una perdita prima dell'acquisizione nell'archivio strutturato non è stata testata.
\par
I materiali sono nella copia di lavoro del repository in \path{outputs/structured-regional-comparison-2026-10-01/}. \path{REPORT.md} e \path{analysis/results.json} riportano tutte le 24 celle comparative, con denominatori, campi, differenze e token.
\par
\path{contexts.json} e \path{schedule.json} collegano i 30 prompt distinti ai 120 esiti della baseline. \path{inputs/} conserva prompt, evidenze effettivamente consegnate e metadati di provenienza; gli archivi integrali sono referenziati senza duplicazione. \path{runtime/} contiene richieste e risposte native; \path{review/ratings/} i giudizi automatici.
\par
\path{PROTOCOL.md}, \path{manifest.json}, \path{analysis/runtime-verification.json} e \path{final-manifest.json} documentano impostazioni, congelamento e verifiche. \path{audit/ANALYSIS-AMENDMENT-01.md} registra una correzione del controllo di corrispondenza delle schede, senza modificare generazione, rubrica o formule. Il grafico completo è \path{figures/paired-regional-recall.svg}. L'esportazione TeX/PDF precedente è conservata con hash in \path{previous-review-response/}.'''))
 original=(ROOT/'previous-review-response/response_to_reviewer_comment_1.tex').read_text()
 end='\\end{longtable}\n\\end{document}'
 assert original.count(end)==1
 (REPO/'response_to_reviewer_comment_1.tex').write_text(original.replace(end,''.join(sections)+'\n'+end))
 print('Reviewer TeX appended with five comparison rows.')
if __name__=='__main__':main()
