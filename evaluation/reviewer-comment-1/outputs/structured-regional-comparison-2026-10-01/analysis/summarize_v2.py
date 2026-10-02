"""Score unique structured generations and map shared comparisons explicitly."""
import argparse,json,math,statistics
from pathlib import Path
from datetime import datetime,timezone
import review_utils as u
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT.parent/'regional-memory-compression-2026-09-30'
HISTORY=tuple(k for k in u.FIELDS if k not in ('persistent_identity','absent_fact_abstention'))

def mean(xs):return statistics.mean(xs) if xs else None
def fraction(n,d):return {'correct':n,'total':d,'percent':100*n/d if d else None}
def metrics(cats):
 history=[c for c in cats if c['category'] in HISTORY]
 return {'categories':fraction(sum(c['pass'] for c in cats),len(cats)),
  'fields':fraction(sum(sum(c['field_correct'].values()) for c in cats),sum(len(c['field_correct']) for c in cats)),
  'history_categories':fraction(sum(c['pass'] for c in history),len(history)),
  'history_fields':fraction(sum(sum(c['field_correct'].values()) for c in history),sum(len(c['field_correct']) for c in history))}
def aggregate(items):
 return {k:fraction(sum(i[k]['correct'] for i in items),sum(i[k]['total'] for i in items))
  for k in ('categories','fields','history_categories','history_fields')}

def score(root):
 state=u.read(root/'runtime/state.json');assert state['status'] in ('completed','stopped')
 cards,a,b,disputes,models=u.comparison(root);disputed={(r['id'],r['category']) for r in disputes}
 adjud={};adjud_model=None
 if disputed:adjud,adjud_model=u.validate_ratings(root/'review/ratings/adjudicator.json',{i:cards[i] for i,c in disputed})
 jobs=u.index_unique(u.read(root/'schedule.json')['jobs'],'job_id','jobs')
 contexts=u.index_unique(u.read(root/'contexts.json'),'context_id','contexts');assert len(contexts)==30 and 0<len(jobs)<=30
 answers=u.index_unique(u.rows(root/'runtime/answers.jsonl'),'job_id','answers');assert set(answers)<=set(jobs)
 assert state['completed']==len(answers) and state['planned']==len(jobs)
 mapping=u.read(root/'review/private/mapping.json');assert set(mapping)==set(cards)
 complete={i for i,r in answers.items() if r['status']=='complete'}
 assert len(mapping)==len(complete), 'Each complete job must have exactly one blinded card'
 assert {m['job_id'] for m in mapping.values()}==complete
 export=u.read(root/'review/export-manifest.json');assert u.sha(root/'runtime/answers.jsonl')==export['source_answers_sha256']
 for rel,h in export['files'].items():assert u.sha(root/'review'/rel)==h
 baseline_result=u.read(BASE/'analysis/results.json')
 baseline={r['job_id']:r for c in baseline_result['cells'] for r in c['per_profile']};assert len(baseline)==120
 baseline_answers=u.index_unique(u.rows(BASE/'runtime/answers.jsonl'),'job_id','baseline answers')
 baseline_cards=u.load_cards(BASE);baseline_a,_=u.validate_ratings(BASE/'review/ratings/a.json',baseline_cards)
 baseline_b,_=u.validate_ratings(BASE/'review/ratings/b.json',baseline_cards)
 baseline_map=u.read(BASE/'review/private/mapping.json')
 for ident,meta in baseline_map.items():
  saved=baseline[meta['job_id']]
  assert baseline_cards[ident]['answer']==baseline_answers[meta['job_id']]['answer']
  assert baseline_cards[ident]['gold']==u.read(root/'inputs'/saved['patient_id']/'gold.json')['probes']
  assert baseline_cards[ident]['question']==(root/'inputs'/saved['patient_id']/'question.txt').read_text()
  assert all(u.judgment(baseline_a[ident][cat])==u.judgment(baseline_b[ident][cat]) for cat in u.FIELDS)
  assert saved['categories']==[baseline_a[ident][cat] for cat in u.FIELDS]
 ratings={}
 for ident,meta in mapping.items():
  job=jobs[meta['job_id']];ans=answers[job['job_id']]
  assert all(meta[k]==job[k] for k in ('job_id','patient_id','arm','target_tokens'))
  assert cards[ident]['answer']==ans['answer'] and cards[ident]['gold']==u.read(root/'inputs'/job['patient_id']/'gold.json')['probes']
  assert cards[ident]['question']==(root/'inputs'/job['patient_id']/'question.txt').read_text()
  cats=[(adjud if (ident,cat) in disputed else a)[ident][cat] for cat in u.FIELDS]
  ratings[job['job_id']]={'card_id':ident,'categories':cats,**metrics(cats)}
 native=u.native_archive(root,jobs,[root/'runtime']);unique=[]
 for ident,job in jobs.items():
  archive=native[ident];answer=answers.get(ident);rated=ratings.get(ident)
  status=answer['status'] if answer else ('other_missing' if archive['requests'] else 'unattempted')
  assert status in ('complete','context_rejected','other_missing','unattempted')
  if answer:
   assert all(answer[k]==job[k] for k in ('job_id','patient_id','arm','target_tokens','fact_position','context_ids','paired_baseline_job_ids'))
   outcome=archive['outcomes'][answer['native_record_id']]
   if status=='complete':
    raw=outcome['response'];assert outcome['event']=='response' and raw['model']=='google/gemini-2.5-pro'
    assert raw['usage']==answer['usage'] and [c['finish_reason'] for c in raw['choices']]==['stop']
    assert raw['choices'][0]['message']['content'].strip()==answer['answer']
   else:assert outcome['event']=='error' and answer['semantic_evaluable'] is False
  usage=u.usage_summary(list(archive['outcomes'].values()))
  unique.append({**job,'status':status,'rating':rated,'native_prompt_tokens':answer['usage']['prompt_tokens'] if status=='complete' else None,
   'observed_cost_usd':usage['cost']['sum_observed'],'http_requests':len(archive['requests']),'http_errors':len(archive['errors']),
   'unresolved_request_ids':archive['unresolved_request_ids']})
 by_unique={j['job_id']:j for j in unique};pairs=[];seen=[]
 for cid,c in contexts.items():
  s=by_unique[c['generation_job_id']];assert c['prompt_sha256']==s['prompt_sha256'] and cid in s['context_ids']
  for bid in c['paired_baseline_job_ids']:
   b=baseline[bid];seen.append(bid)
   assert all(b[k]==c[k] for k in ('patient_id','target_tokens','fact_position')) and bid in s['paired_baseline_job_ids']
   bm=metrics(b['categories']);sm={k:s['rating'][k] for k in bm} if s['rating'] else None
   good=sm is not None and b['status']=='complete'
   pairs.append({'baseline_job_id':bid,'structured_job_id':s['job_id'],'context_id':cid,
    'patient_id':c['patient_id'],'mode':b['mode'],'fact_position':c['fact_position'],'baseline_arm':b['arm'],
    'baseline_status':b['status'],'structured_status':s['status'],'baseline':bm,'structured':sm,
    'paired_history_category_delta':sm['history_categories']['correct']-bm['history_categories']['correct'] if good else None,
    'paired_history_field_delta':sm['history_fields']['correct']-bm['history_fields']['correct'] if good else None,
    'baseline_native_prompt_tokens':b['native_prompt_tokens'],'structured_native_prompt_tokens':s['native_prompt_tokens'],
    'native_input_reduction':1-s['native_prompt_tokens']/b['native_prompt_tokens'] if good else None})
 assert len(seen)==len(set(seen))==120
 cells=[]
 for mode,pos,arm in sorted({(p['mode'],p['fact_position'],p['baseline_arm']) for p in pairs}):
  group=[p for p in pairs if (p['mode'],p['fact_position'],p['baseline_arm'])==(mode,pos,arm)];assert len(group)==5
  both=[p for p in group if p['paired_history_category_delta'] is not None];deltas=[p['paired_history_category_delta'] for p in both]
  fields=[p['paired_history_field_delta'] for p in both]
  cells.append({'mode':mode,'fact_position':pos,'baseline_arm':arm,'planned_profiles':5,
   'baseline_completed':sum(p['baseline_status']=='complete' for p in group),'structured_completed':sum(p['structured_status']=='complete' for p in group),
   'paired_profiles':len(both),'unique_structured_jobs':sorted({p['structured_job_id'] for p in group}),
   'baseline':aggregate([p['baseline'] for p in group]),'structured':aggregate([p['structured'] for p in group if p['structured']]),
   'baseline_on_complete_pairs':aggregate([p['baseline'] for p in both]),
   'history_difference_pp':25*mean(deltas) if deltas else None,'history_field_difference_pp':100/9*mean(fields) if fields else None,
   'profile_wins':sum(d>0 for d in deltas),'profile_ties':sum(d==0 for d in deltas),'profile_losses':sum(d<0 for d in deltas),
   'mean_baseline_native_prompt_tokens':mean([p['baseline_native_prompt_tokens'] for p in group if p['baseline_status']=='complete']),
   'mean_structured_native_prompt_tokens':mean([p['structured_native_prompt_tokens'] for p in group if p['structured_status']=='complete']),
   'mean_paired_native_input_reduction':mean([p['native_input_reduction'] for p in both]),'pairs':group})
 responses=[r for archive in native.values() for r in archive['responses']];errors=[r for archive in native.values() for r in archive['errors']]
 usage=u.usage_summary(responses+errors);response_usage=u.usage_summary(responses)
 assert math.isclose(response_usage['cost']['sum_observed'],state['observed_cost_usd'],abs_tol=1e-8)
 result={'created_at':datetime.now(timezone.utc).isoformat(),'status':state['status'],'planned_unique_generations':len(jobs),
  'complete_unique_generations':len(complete),'source_contexts':30,'mapped_comparisons':120,'comparison_cells':24,
  'unique_semantic_totals':aggregate([j['rating'] for j in unique if j['rating']]),
  'http_requests':sum(j['http_requests'] for j in unique),'http_responses':len(responses),'http_errors':len(errors),
  'native_usage_unique_calls':usage,'observed_new_cost_usd':usage['cost']['sum_observed'],'native_error_cost_usd':u.usage_summary(errors)['cost']['sum_observed'],
  'baseline_historical_observed_cost_usd':baseline_result['observed_cost_usd'],'baseline_new_generation_calls':0,
  'observed_models':sorted({r['response']['model'] for r in responses}),
  'observed_providers':sorted({r['response'].get('provider') or 'not_reported' for r in responses}),
  'raters':models,'adjudicator':adjud_model,'disagreement_categories':len(disputes),
  'unique_generations':unique,'cells':cells,'analysis_script_sha256':u.sha(__file__),
  'shared_comparison_warning':'64k structured outputs are shared across seven baseline conditions; do not sum mapped scores/tokens/cost as independent structured observations.'}
 assert len(cells)==24 and result['unique_semantic_totals']['categories']['total']==6*len(complete)
 assert result['unique_semantic_totals']['fields']['total']==12*len(complete)
 u.write(root/'analysis/results.json',result)
 return {k:result[k] for k in ('status','planned_unique_generations','complete_unique_generations','mapped_comparisons','http_requests','http_errors','observed_new_cost_usd','disagreement_categories')}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('command',choices=['compare','score']);arg=p.parse_args()
 print(json.dumps((u.compare if arg.command=='compare' else score)(ROOT),indent=2))
