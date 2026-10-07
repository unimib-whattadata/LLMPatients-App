"""Offline regional-deletion scoring with fixed source-aware denominators."""
import argparse,hashlib,json,math,statistics
from pathlib import Path
from datetime import datetime,timezone
import review_utils as u
ROOT=Path(__file__).resolve().parents[1]
HISTORY=tuple(k for k in u.FIELDS if k not in ('persistent_identity','absent_fact_abstention'))

def write(path,value):u.write(path,value)
def mean(xs):return statistics.mean(xs) if xs else None
def percentage(a,b):return 100*a/b if b else None
def count_fields(categories):return sum(sum(c['field_correct'].values()) for c in categories)

def score(root):
 state=u.read(root/'runtime/state.json');assert state['status'] in ('completed','stopped')
 cards,a,b,disputes,models=u.comparison(root)
 disputed={(r['id'],r['category']) for r in disputes};disputed_ids={i for i,c in disputed}
 adjudicator={};adjudicator_model=None
 if disputed_ids:adjudicator,adjudicator_model=u.validate_ratings(root/'review/ratings/adjudicator.json',{i:cards[i] for i in disputed_ids})
 jobs=u.index_unique(u.read(root/'schedule.json')['jobs'],'job_id','schedule')
 assert len(jobs)==120
 assert sum(j['mode']=='manual' for j in jobs.values())==105
 mapping=u.read(root/'review/private/mapping.json');assert set(mapping)==set(cards)
 answers=u.index_unique(u.rows(root/'runtime/answers.jsonl'),'job_id','answers')
 assert set(answers)<=set(jobs),'Unscheduled committed outcome'
 assert state['completed']==len(answers) and state['planned']==len(jobs),'Runtime committed-count mismatch'
 complete={i for i,r in answers.items() if r['status']=='complete'}
 assert {v['job_id'] for v in mapping.values()}==complete and len(mapping)==len(complete)
 export=u.read(root/'review/export-manifest.json')
 assert u.sha(root/'runtime/answers.jsonl')==export['source_answers_sha256']
 for rel,h in export['files'].items():assert u.sha(root/'review'/rel)==h,rel
 rating_by_job={}
 for ident,meta in mapping.items():
  job=jobs[meta['job_id']];answer=answers[job['job_id']]
  assert all(meta[k]==job[k] for k in ('patient_id','job_id','arm','target_tokens'))
  assert cards[ident]['answer']==answer['answer']
  assert cards[ident]['gold']==u.read(root/'inputs'/job['patient_id']/'gold.json')['probes']
  assert cards[ident]['question']==(root/'inputs'/job['patient_id']/'question.txt').read_text()
  rating_by_job[job['job_id']]={'card_id':ident,'categories':[(adjudicator if (ident,category) in disputed else a)[ident][category] for category in u.FIELDS]}
 native=u.native_archive(root,jobs,[root/'runtime']);details=[]
 for ident,job in jobs.items():
  archive=native[ident];answer=answers.get(ident);chosen=rating_by_job.get(ident)
  status=answer['status'] if answer else ('other_missing' if archive['requests'] else 'unattempted')
  assert status in ('complete','context_rejected','other_missing','unattempted')
  if answer:
   assert all(answer[k]==job[k] for k in ('job_id','patient_id','arm','target_tokens','fact_position'))
   outcome=archive['outcomes'][answer['native_record_id']]
   if status=='complete':
    raw=outcome['response'];assert outcome['event']=='response' and raw['model']=='google/gemini-2.5-pro'
    assert answer['usage']==raw['usage'] and [c['finish_reason'] for c in raw['choices']]==['stop']
    assert raw['choices'][0]['message']['content'].strip()==answer['answer']
   else:assert outcome['event']=='error' and answer['semantic_evaluable'] is False
  cats=chosen['categories'] if chosen else [];historical=[c for c in cats if c['category'] in HISTORY]
  fields={f"{c['category']}/{k}":v for c in historical for k,v in c['field_correct'].items()}
  support=job['source_coverage']['canonical_source_retained'] if job['source_coverage'] is not None else None
  supported=[fields[k] for k,v in support.items() if v] if fields and support is not None else []
  removed=[fields[k] for k,v in support.items() if not v] if fields and support is not None else []
  usage=u.usage_summary(list(archive['outcomes'].values()))
  detail={**job,'status':status,'card_id':chosen['card_id'] if chosen else None,
    'categories':cats,'categories_correct':sum(c['pass'] for c in cats),'categories_total':len(cats),
    'fields_correct':count_fields(cats),'fields_total':sum(len(c['field_correct']) for c in cats),
    'history_categories_correct':sum(c['pass'] for c in historical),'history_categories_total':len(historical),
    'history_fields_correct':sum(fields.values()),'history_fields_total':len(fields),
    'supported_history_fields_correct':sum(supported),'supported_history_fields_total':len(supported),
    'removed_source_fields_correct':sum(removed),'removed_source_fields_total':len(removed),
    'identity_correct':next((c['pass'] for c in cats if c['category']=='persistent_identity'),None),
    'absent_surname_correct':next((c['pass'] for c in cats if c['category']=='absent_fact_abstention'),None),
    'native_prompt_tokens':answer['usage']['prompt_tokens'] if status=='complete' else None,
    'http_requests':len(archive['requests']),'http_errors':len(archive['errors']),
    'observed_cost_usd':usage['cost']['sum_observed'],'native_usage':usage,
    'unresolved_request_ids':archive['unresolved_request_ids']}
  details.append(detail)
  detail['native_token_delta_from_local_calibration']=(detail['native_prompt_tokens']-(job['local_prompt_tokens']-1)) if status=='complete' else None
  detail['estimated_plugin_input_reduction']=(1-detail['native_prompt_tokens']/(job['local_prompt_tokens']-1)) if status=='complete' else None
  detail['estimated_total_input_reduction_from_full']=(1-detail['native_prompt_tokens']/(job['full_prompt_local_tokens']-1)) if status=='complete' else None
 controls={(r['patient_id'],r['fact_position']):r for r in details if r['mode']=='manual' and r['arm']=='full'}
 for r in details:
  r['paired_history_category_difference']=None
  if r['mode']=='manual' and r['status']=='complete':
   control=controls[(r['patient_id'],r['fact_position'])]
   if control['status']=='complete':r['paired_history_category_difference']=r['history_categories_correct']-control['history_categories_correct']
 cells=[]
 groups=sorted({(r['mode'],r['fact_position'],r['arm']) for r in details})
 totals=('categories','fields','history_categories','history_fields','supported_history_fields','removed_source_fields')
 for mode,position,arm in groups:
  subset=[r for r in details if (r['mode'],r['fact_position'],r['arm'])==(mode,position,arm)]
  assert len(subset)==5
  good=[r for r in subset if r['status']=='complete'];deltas=[r['paired_history_category_difference'] for r in good if r['paired_history_category_difference'] is not None]
  cell={'mode':mode,'fact_position':position,'arm':arm,'planned':5,'completed':len(good),
    'statuses':{status:sum(r['status']==status for r in subset) for status in ('complete','context_rejected','other_missing','unattempted')},
    'mean_native_prompt_tokens':mean([r['native_prompt_tokens'] for r in good]),
    'mean_estimated_plugin_input_reduction':mean([r['estimated_plugin_input_reduction'] for r in good]),
    'mean_estimated_total_input_reduction_from_full':mean([r['estimated_total_input_reduction_from_full'] for r in good]),
    'manual_cells_with_additional_native_token_reduction':sum(r['mode']=='manual' and r['native_token_delta_from_local_calibration']<0 for r in good),
    'mean_local_prompt_tokens':mean([r['local_prompt_tokens'] for r in subset]),
    'mean_full_prompt_local_tokens':mean([r['full_prompt_local_tokens'] for r in subset]),
    'mean_achieved_history_reduction':mean([r['achieved_local_history_reduction'] for r in subset]),
    'mean_achieved_whole_prompt_reduction':mean([r['achieved_local_whole_prompt_reduction'] for r in subset]),
    'paired_history_category_difference_sum':sum(deltas),'paired_history_category_pairs':len(deltas),
    'paired_history_category_difference_pp':25*mean(deltas) if deltas else None,
    'profiles_with_history_decline':sum(v<0 for v in deltas),'profiles_with_history_improvement':sum(v>0 for v in deltas),
    'stale_appointment_only_profiles':sum(bool(r['source_coverage'] and r['source_coverage']['stale_appointment_source_only']) for r in subset),
    'stale_venue_only_profiles':sum(bool(r['source_coverage'] and r['source_coverage']['stale_venue_source_only']) for r in subset),
    'observed_cost_usd':sum(r['observed_cost_usd'] for r in subset),'per_profile':subset}
  for key in totals:
   numerator=sum(r[key+'_correct'] for r in good);denominator=sum(r[key+'_total'] for r in good)
   cell[key]={'correct':numerator,'total':denominator,'percent':percentage(numerator,denominator)}
  if mode=='manual':
   cell['canonical_source_coverage']={'retained':sum(sum(r['source_coverage']['canonical_source_retained'].values()) for r in subset),'total':45}
  else:cell['canonical_source_coverage']=None
  cells.append(cell)
 responses=[r for archive in native.values() for r in archive['responses']];errors=[r for archive in native.values() for r in archive['errors']]
 usage=u.usage_summary(responses+errors)
 result={'created_at':datetime.now(timezone.utc).isoformat(),'status':state['status'],'planned':120,
   'completed':len(complete),'committed_outcomes':len(answers),'http_requests':sum(len(v['requests']) for v in native.values()),
   'http_responses':len(responses),'http_errors':len(errors),'observed_cost_usd':usage['cost']['sum_observed'],
   'unknown_charge_reserve_usd':state.get('unknown_charge_reserve_usd'),'native_usage':usage,
   'observed_models':sorted({r['response']['model'] for r in responses}),
   'observed_providers':sorted({r['response'].get('provider') or 'not_reported' for r in responses}),
   'native_response_cost_usd':u.usage_summary(responses)['cost']['sum_observed'],
   'native_error_cost_usd':u.usage_summary(errors)['cost']['sum_observed'],
   'native_error_usage':u.usage_summary(errors),
   'runtime_success_cost_usd':state['observed_cost_usd'],
   'raters':models,'adjudicator':adjudicator_model,'disagreement_categories':len(disputes),
   'cells':cells,'analysis_script_sha256':u.sha(__file__)}
 assert sum(c['categories']['total'] for c in cells)==6*len(cards)
 assert sum(c['fields']['total'] for c in cells)==12*len(cards)
 assert sum(c['history_fields']['total'] for c in cells)==9*len(cards)
 assert math.isclose(result['native_response_cost_usd'],state['observed_cost_usd'],abs_tol=1e-8)
 write(root/'analysis/results.json',result)
 return {k:result[k] for k in ('status','planned','completed','http_requests','http_errors','observed_cost_usd','disagreement_categories')}

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('command',choices=['compare','score']);arg=p.parse_args()
 print(json.dumps((u.compare if arg.command=='compare' else score)(ROOT),indent=2))
