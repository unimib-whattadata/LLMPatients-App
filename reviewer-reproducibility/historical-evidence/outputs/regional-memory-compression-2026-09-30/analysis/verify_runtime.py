"""Offline native-request, retry, output, frozen-input and export verification."""
import hashlib,json,math
from pathlib import Path
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[1]
def read(p):return json.loads(Path(p).read_text())
def rows(p):return [json.loads(s) for s in Path(p).read_text().splitlines() if s.strip()]
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def digest(v):return hashlib.sha256(json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest()

def main():
 manifest=read(ROOT/'manifest.json')
 for rel,h in manifest['files'].items():assert sha(ROOT/rel)==h,rel
 for path,h in manifest['source_files'].items():assert sha(path)==h,path
 export=read(ROOT/'review/export-manifest.json')
 for rel,h in export['files'].items():assert sha(ROOT/'review'/rel)==h,rel
 assert sha(ROOT/'runtime/answers.jsonl')==export['source_answers_sha256']
 jobs=read(ROOT/'schedule.json')['jobs'];answers={r['job_id']:r for r in rows(ROOT/'runtime/answers.jsonl')}
 requests=responses=errors=0;cost=0.;error_cost=0.;priced_errors=0;input_tokens=0;retries=[];recoveries=[];details=[]
 for job in jobs:
  d=ROOT/'runtime'/job['job_id'];prompt=Path(job['prompt_path']).read_text()
  assert hashlib.sha256(prompt.encode()).hexdigest()==job['prompt_sha256']
  if not (d/'openrouter-api-records.jsonl').exists():continue
  native=rows(d/'openrouter-api-records.jsonl');sent={};outcomes={}
  for r in native:
   wire=r['request']
   expected={'model':'google/gemini-2.5-pro','messages':[{'role':'user','content':prompt}],
     'provider':{'require_parameters':True,'allow_fallbacks':False},'plugins':[{'id':'context-compression'}],
     'temperature':.7,'top_p':.95,'max_tokens':wire['max_tokens'],
     'stop':['\nTherapist:','Therapist:'],'reasoning':{'max_tokens':1024}}
   assert wire==expected and wire['max_tokens'] in (4096,8192)
   rid=r['record_id']
   if r['event']=='request':assert rid not in sent;sent[rid]=r;requests+=1
   else:
    assert rid in sent and rid not in outcomes;outcomes[rid]=r
    if r['event']=='response':
     responses+=1;raw=r['response'];assert raw['model']=='google/gemini-2.5-pro'
     charge=raw['usage']['cost'];assert type(charge) in (float,int) and math.isfinite(charge) and charge>=0
     cost+=charge;input_tokens+=raw['usage']['prompt_tokens']
    else:
     assert r['event']=='error';errors+=1
     charge=(r.get('response') or {}).get('usage',{}).get('cost')
     if charge is not None:
      assert type(charge) in (int,float) and math.isfinite(charge) and charge>=0
      error_cost+=charge;priced_errors+=1
  assert set(sent)==set(outcomes)
  journal=rows(d/'timeout-retries.jsonl')
  terminals=[r for r in journal if r['event'] in ('attempt_response','attempt_error')]
  assert {r['native_record_id'] for r in terminals}==set(outcomes) and len(terminals)==len(outcomes)
  for gid in {r['group_id'] for r in journal}:
   group=[r for r in journal if r['group_id']==gid]
   starts=[r for r in group if r['event']=='attempt_start']
   ends=[r for r in group if r['event'] in ('attempt_response','attempt_error')]
   assert len([r for r in group if r['event']=='group_start'])==len([r for r in group if r['event']=='group_finished'])==1
   assert 1<=len(starts)<=3 and [r['attempt'] for r in starts]==list(range(1,len(starts)+1))
   assert [r['attempt'] for r in ends]==[r['attempt'] for r in starts]
   bodies=[sent[r['native_record_id']]['request'] for r in ends]
   assert all(b==bodies[0] for b in bodies) and all(r['request_sha256']==digest(bodies[0]) for r in group)
   if len(starts)>1:
    assert all(r['event']=='attempt_error' and r['will_retry'] is True for r in ends[:-1]);retries.append(job['job_id'])
  recover=[r for r in sent.values() if r['request']['max_tokens']==8192]
  if recover:
   first=[outcomes[rid] for rid,r in sent.items() if r['request']['max_tokens']==4096 and outcomes[rid]['event']=='response']
   assert len(first)==1 and [c['finish_reason'] for c in first[0]['response']['choices']]==['length']
   assert all(r['timestamp']>first[0]['timestamp'] for r in recover);recoveries.append(job['job_id'])
  result=answers.get(job['job_id']);native_tokens=None
  if result and result['status']=='complete':
   final=outcomes[result['native_record_id']]['response'];assert final['usage']==result['usage']
   assert [c['finish_reason'] for c in final['choices']]==['stop']
   assert final['choices'][0]['message']['content'].strip()==result['answer'];native_tokens=final['usage']['prompt_tokens']
  details.append({'job_id':job['job_id'],'mode':job['mode'],'fact_position':job['fact_position'],'arm':job['arm'],
    'local_tokens':job['local_prompt_tokens'],'native_tokens':native_tokens,
    'native_delta_from_local_minus_one':native_tokens-job['local_prompt_tokens']+1 if native_tokens is not None else None,
    'attempts':len(sent)})
 state=read(ROOT/'runtime/state.json');assert math.isclose(cost,state['observed_cost_usd'],abs_tol=1e-8)
 result={'created_at':datetime.now(timezone.utc).isoformat(),'status':state['status'],
   'frozen_files_verified':len(manifest['files']),'sources_verified':len(manifest['source_files']),
   'review_export_hashes_verified':len(export['files']),'requests':requests,'responses':responses,'errors':errors,
   'observed_cost_usd':cost+error_cost,'native_response_cost_usd':cost,'native_error_cost_usd':error_cost,
   'native_error_records_with_cost':priced_errors,'native_error_records_without_cost':errors-priced_errors,
   'native_input_tokens':input_tokens,'retried_jobs':sorted(set(retries)),
   'output_recovery_jobs':recoveries,'manual_native_differences':[r for r in details if r['mode']=='manual' and r['native_delta_from_local_minus_one']!=0],
   'details':details,'transformed_plugin_text_available':False,'script_sha256':sha(__file__)}
 (ROOT/'analysis/runtime-verification.json').write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps({k:result[k] for k in ('status','requests','responses','errors','observed_cost_usd','retried_jobs','output_recovery_jobs')}))

if __name__=='__main__':main()
