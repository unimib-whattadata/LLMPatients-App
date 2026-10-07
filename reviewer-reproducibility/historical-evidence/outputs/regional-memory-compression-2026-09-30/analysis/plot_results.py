"""Publication-style descriptive panels; no interpolation or inferential CIs."""
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
POSITIONS=('start','middle','end');LABELS=('Inizio','Centro','Fine')

def main():
 result=json.loads((ROOT/'analysis/results.json').read_text());cells=result['cells']
 lookup={(c['mode'],c['fact_position'],c['arm']):c for c in cells}
 plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.titleweight':'bold','axes.spines.top':False,'axes.spines.right':False})
 fig,axes=plt.subplots(1,3,figsize=(13.8,4.7),gridspec_kw={'width_ratios':[1,1,1.15]})
 for ax,percent in zip(axes[:2],(50,75)):
  matrix=np.array([[lookup[('manual',position,f'drop_{region}_{percent}')]['history_categories']['percent']
                    for region in POSITIONS] for position in POSITIONS],dtype=float)
  im=ax.imshow(matrix,vmin=0,vmax=100,cmap='cividis',aspect='equal')
  ax.set_xticks(range(3),LABELS);ax.set_yticks(range(3),LABELS)
  ax.set_xlabel('Parte della cronologia eliminata');ax.set_ylabel('Posizione dei fatti')
  ax.set_title(f'Taglio locale del {percent}%\nInput integrale: circa 64 mila token',fontsize=11,pad=14)
  for i in range(3):
   for j in range(3):
    c=lookup[('manual',POSITIONS[i],f'drop_{POSITIONS[j]}_{percent}')]['history_categories']
    label='N/V' if c['percent'] is None else f"{c['percent']:.0f}%\n{c['correct']}/{c['total']}"
    ax.text(j,i,label,ha='center',va='center',fontsize=11,color='white' if np.isnan(matrix[i,j]) or matrix[i,j]<55 else '#15212b')
  ax.set_xticks(np.arange(-.5,3,1),minor=True);ax.set_yticks(np.arange(-.5,3,1),minor=True)
  ax.grid(which='minor',color='white',linewidth=2);ax.tick_params(which='minor',bottom=False,left=False)
 values=[lookup[('auto_plugin',p,'auto_plugin')]['history_categories']['percent'] for p in POSITIONS]
 bars=axes[2].bar(LABELS,[v if v is not None else 0 for v in values],color=['#447b9c','#bb7950','#5e977a'],width=.65)
 axes[2].set_ylim(0,116);axes[2].set_yticks([0,25,50,75,100],['0%','25%','50%','75%','100%'])
 axes[2].set_ylabel('Categorie di memoria corrette');axes[2].set_xlabel('Posizione dei fatti prima della compressione')
 axes[2].set_title('Compressione automatica OpenRouter\nInput inviato: circa 1,2 milioni di token',fontsize=11,pad=14)
 axes[2].grid(axis='y',alpha=.2);axes[2].set_axisbelow(True)
 for p,bar in zip(POSITIONS,bars):
  c=lookup[('auto_plugin',p,'auto_plugin')]['history_categories']
  label='N/V' if c['percent'] is None else f"{c['correct']}/{c['total']}\n{c['percent']:.0f}%"
  axes[2].text(bar.get_x()+bar.get_width()/2,bar.get_height()+3,label,ha='center',va='bottom',fontsize=10)
 fig.suptitle('Ricordo dei fatti della conversazione dopo la riduzione del contesto',fontsize=15,fontweight='bold',y=.995)
 fig.text(.5,.025,'5 profili per cella × 4 categorie di memoria. Identità e cognome mai comunicato esclusi da questo indicatore.\nTagli locali e plugin sono esperimenti distinti. Una risposta per condizione; risultati descrittivi.',ha='center',fontsize=9,color='#444444')
 fig.tight_layout(rect=(0,.105,1,.95),w_pad=2.1)
 out=ROOT/'figures';out.mkdir(exist_ok=True)
 for suffix in ('png','svg'):fig.savefig(out/f'regional-memory-recall.{suffix}',dpi=200,bbox_inches='tight',facecolor='white')
 (out/'metadata.json').write_text(json.dumps({'matplotlib_version':matplotlib.__version__,'source':'analysis/results.json','endpoint':'four positive-history categories per profile; descriptive'},indent=2)+'\n')

if __name__=='__main__':main()
