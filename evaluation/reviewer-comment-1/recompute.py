"""Recompute reported counts from preserved item/rating data, without inference.

Does not rerate the answers or treat shared outputs as independent generations.
Works on the browsable package directly, or on a materialized dataset root.
"""
from pathlib import Path
from collections import defaultdict
import argparse,csv,json,statistics

SUCCESS={'complete','appropriate_abstention'}
CONTROLS={'persistent_identity','absent_fact_abstention'}
def read(p):return json.loads(p.read_text())
def require(ok,msg):
 if not ok:raise ValueError(msg)
def index(items):
 result={x['id']:x for x in items};require(len(result)==len(items),'Duplicate rating ID');return result
def metrics(cats):
 history=[x for x in cats if x['category'] not in CONTROLS]
 return {key:{'correct':sum(x['pass'] for x in group) if 'categories' in key else sum(sum(x['field_correct'].values()) for x in group),
              'total':len(group) if 'categories' in key else sum(len(x['field_correct']) for x in group)}
         for key,group in [('categories',cats),('fields',cats),('history_categories',history),('history_fields',history)]}
def aggregate(rows):
 return {key:{field:sum(row[key][field] for row in rows) for field in ('correct','total')}
         for key in ('categories','fields','history_categories','history_fields')}
def assert_metrics(actual,expected,label):
 for key,value in actual.items():
  require(value=={k:expected[key][k] for k in ('correct','total')},label+'/'+key)

def phq(root):
 rows=list(csv.DictReader((root/'analysis/phq-items.csv').open()));runs=defaultdict(dict)
 require(len(rows)==1000,'Expected 1,000 PHQ item responses')
 for row in rows:
  key=(row['patient_id'],int(row['run']));item=int(row['item_id']);require(item not in runs[key],'Duplicate PHQ item')
  runs[key][item]=int(row['answer'])
 totals=defaultdict(list)
 for (patient,run),items in runs.items():
  require(set(items)==set(range(1,11)),'Incomplete PHQ administration')
  require(all(0<=items[i]<=3 for i in range(1,10)),'Invalid PHQ symptom answer')
  totals[patient].append(sum(items[i] for i in range(1,10)))
 require(len(runs)==100 and all(len(v)==20 for v in totals.values()),'Incomplete PHQ matrix')
 return {p:{'n':len(v),'mean':statistics.mean(v),'sample_sd':statistics.stdev(v),'range':[min(v),max(v)],'at_least_10':sum(x>=10 for x in v)} for p,v in sorted(totals.items())}

def continuity(root):
 mapping=read(root/'review/export-001/private/mapping.json')['records'];a=index(read(root/'review/ratings/evaluator_a.json')['ratings'])
 b=index(read(root/'review/ratings/evaluator_b.json')['ratings']);c=index(read(root/'review/ratings/adjudicator.json')['ratings'])
 require(set(a)==set(b)=={x['id'] for x in mapping},'Continuity rating coverage')
 result=defaultdict(lambda:{'successes':0,'denominator':0,'correct_fields':0,'field_denominator':0})
 agreement=0
 for meta in mapping:
  ident=meta['id'];first,second=a[ident],b[ident]
  equal=first['category']==second['category'] and {k:v['status'] for k,v in first['fields'].items()}=={k:v['status'] for k,v in second['fields'].items()}
  agreement+=equal;selected=first if equal else c[ident];arm=result[meta['arm']]
  arm['denominator']+=1;arm['successes']+=selected['category'] in SUCCESS and meta['answer_available'] and not meta['application_guard_failure']
  arm['field_denominator']+=len(selected['fields']);arm['correct_fields']+=sum(x['status']=='correct' for x in selected['fields'].values())
 expected=read(root/'analysis/semantic-results.json')
 for name,actual in result.items():
  saved=expected['by_arm'][name]
  require(actual['successes']==saved['successes'] and actual['denominator']==saved['denominator'] and actual['correct_fields']==saved['field_statuses']['correct'] and actual['field_denominator']==saved['field_denominator'],'Continuity aggregate differs')
 require(len(mapping)==180 and agreement==179,'Continuity agreement differs')
 return {'arms':dict(result),'initial_full_judgment_agreement':[agreement,len(mapping)]}

def component(root):
 a=index(read(root/'review/ratings/a.json')['ratings']);b=index(read(root/'review/ratings/b.json')['ratings'])
 mapping=read(root/'review/private/mapping.json');require(set(a)==set(b)==set(mapping),'Component rating coverage')
 cpath=root/'review/ratings/adjudicator.json';c=index(read(cpath)['ratings']) if cpath.exists() else {}
 byjob={};disputes=0
 for ident in a:
  aa={v['category']:v for v in a[ident]['categories']};bb={v['category']:v for v in b[ident]['categories']};chosen=[]
  require(set(aa)==set(bb) and len(aa)==6,'Category coverage differs')
  for category,first in aa.items():
   second=bb[category];equal=first['pass']==second['pass'] and first['field_correct']==second['field_correct']
   if not equal:
    disputes+=1;first=next(x for x in c[ident]['categories'] if x['category']==category)
   require(isinstance(first['pass'],bool) and all(isinstance(x,bool) for x in first['field_correct'].values()),'Nonboolean rating')
   require(first['pass']==all(first['field_correct'].values()),'Pass/field inconsistency')
   chosen.append(first)
  require(mapping[ident]['job_id'] not in byjob,'Duplicate generation in ratings')
  byjob[mapping[ident]['job_id']]=metrics(chosen)
 saved=read(root/'analysis/results.json');cells=[]
 if 'unique_generations' in saved:
  completed=[x for x in saved['unique_generations'] if x['status']=='complete']
  require({x['job_id'] for x in completed}==set(byjob),'Unique-generation coverage differs')
  for row in completed:assert_metrics(byjob[row['job_id']],row['rating'],'Generation '+row['job_id'])
  total=aggregate(list(byjob.values()));assert_metrics(total,saved['unique_semantic_totals'],'Unique aggregate')
 else:
  seen=set()
  for cell in saved['cells']:
   profiles=cell.get('per_patient',cell.get('per_profile',[]));jobs=[x['job_id'] for x in profiles if x['status']=='complete']
   require(not seen.intersection(jobs),'A generated answer is counted twice');seen.update(jobs)
   total=aggregate([byjob[j] for j in jobs])
   if 'categories_correct' in cell:
    require(total['categories']=={'correct':cell['categories_correct'],'total':cell['categories_denominator']} and total['fields']=={'correct':cell['fields_correct'],'total':cell['fields_denominator']},'Length cell differs')
   else:assert_metrics(total,cell,'Regional cell')
   cells.append({k:cell[k] for k in ('arm','target_tokens','fact_position','mode') if k in cell}|total)
  require(seen==set(byjob),'Rating omitted from aggregate');total=aggregate(list(byjob.values()))
 return {'distinct_rated_answers':len(byjob),'category_disagreements':disputes,'totals':total,'cells':cells,
         'note':'Missing API responses have no semantic score; component totals count each answer once.'}

def run(root):
 out={'scope':'Deterministic recomputation from existing item responses and automated judgments; no new model calls or semantic re-rating.'}
 out['A_PHQ9']=phq(root/'outputs/reviewer-tests-openrouter-2026-09-27')
 out['B_eleven_sessions']=continuity(root/'outputs/memory-comparison-run-2026-09-29')
 for name in ['memory-length-stress-2026-09-30','openrouter-compression-length-2026-09-30','regional-memory-compression-2026-09-30','structured-regional-comparison-2026-10-01','full-saved-memory-comparison-2026-10-01']:
  out[name]=component(root/'outputs'/name)
 return out
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--dataset-root',type=Path,default=Path(__file__).resolve().parent);args=p.parse_args()
 print(json.dumps(run(args.dataset_root.resolve()),indent=2,ensure_ascii=False))
