"""All24 descriptive cells; one panel per baseline policy, shared controls disclosed."""
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
def main():
 r=json.loads((ROOT/'analysis/results.json').read_text());c={(x['mode'],x['fact_position'],x['baseline_arm']):x for x in r['cells']}
 uncut=next(x['baseline_arm'] for x in r['cells'] if x['mode']=='manual' and not x['baseline_arm'].startswith('drop_'))
 panels=[('manual',uncut,'Cronologia integrale (64k)'),('manual','drop_start_50','Taglio iniziale 50% (64k)'),('manual','drop_middle_50','Taglio centrale 50% (64k)'),('manual','drop_end_50','Taglio finale 50% (64k)'),('auto_plugin','auto_plugin','Plugin automatico (1,2M)'),('manual','drop_start_75','Taglio iniziale 75% (64k)'),('manual','drop_middle_75','Taglio centrale 75% (64k)'),('manual','drop_end_75','Taglio finale 75% (64k)')]
 plt.rcParams.update({'font.family':'DejaVu Sans','font.size':9,'axes.titleweight':'bold','axes.spines.top':False,'axes.spines.right':False})
 fig,axes=plt.subplots(2,4,figsize=(13.5,7.0),sharey=True)
 positions=('start','middle','end');x=np.arange(3);width=.34
 for ax,(mode,arm,title) in zip(axes.flat,panels):
  for policy,offset,color,label in [('baseline',-width/2,'#456A91','Baseline'),('structured',width/2,'#CD873B','Memoria completa')]:
   values=[c[(mode,p,arm)][policy]['history_categories'] for p in positions]
   bars=ax.bar(x+offset,[m['percent'] or 0 for m in values],width,color=color,label=label)
   for bar,m in zip(bars,values):
    ax.text(bar.get_x()+bar.get_width()/2,bar.get_height()+2.2,f"{m['correct']}/{m['total']}" if m['total'] else 'N/V',ha='center',va='bottom',fontsize=7.5,rotation=0)
  ax.set_xticks(x,['Inizio','Centro','Fine']);ax.set_ylim(0,119);ax.set_yticks([0,25,50,75,100],['0%','25%','50%','75%','100%']);ax.grid(axis='y',alpha=.18);ax.set_axisbelow(True);ax.set_title(title,fontsize=10,pad=10)
  ax.set_xlabel('Posizione dei fatti')
 for ax in axes[:,0]:ax.set_ylabel('Categorie di richiamo corrette')
 handles,labels=axes[0,0].get_legend_handles_labels();fig.legend(handles,labels,loc='upper center',bbox_to_anchor=(.5,.95),ncol=2,frameon=False)
 fig.suptitle('Tutta la memoria salvata, senza selezione: stessi scenari e domande',fontsize=14,fontweight='bold',y=.99)
 fig.text(.5,.02,'5 profili × 4 categorie per cella. Le risposte a 64k sono condivise tra le sette politiche baseline.\nN/V: input rifiutato, senza punteggio di accuratezza. 30 richieste pianificate, 120 confronti mappati; archivio completo e plugin disattivato.',ha='center',fontsize=9,color='#444444')
 fig.tight_layout(rect=(0,.085,1,.90),w_pad=1.6,h_pad=1.7)
 out=ROOT/'figures';out.mkdir(exist_ok=True)
 for ext in ('png','svg'):fig.savefig(out/f'full-saved-memory-recall.{ext}',dpi=190,bbox_inches='tight',facecolor='white')
 (out/'metadata.json').write_text(json.dumps({'matplotlib_version':matplotlib.__version__,'cells':24,'complete_structured_responses':r['complete_unique_generations'],'planned_unique_requests':r['planned_unique_generations'],'mapped_pairs':120,'source':'analysis/results.json','endpoint':'positive-history categories, 4 per profile; shared control bars repeated intentionally'},indent=2)+'\n')
 print('All24 cells plotted.')
if __name__=='__main__':main()
