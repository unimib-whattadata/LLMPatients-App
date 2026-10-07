"""Offline wire verification and input-size comparison, without model calls."""
import hashlib
import json
import math
from pathlib import Path
import statistics
from datetime import datetime,timezone

ROOT=Path(__file__).resolve().parents[1]
PRIOR=ROOT.parent/'memory-length-stress-2026-09-30'
def read(p):return json.loads(Path(p).read_text())
def rows(p):return [json.loads(s) for s in Path(p).read_text().splitlines() if s.strip()]
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def stats(xs):return {'n':len(xs),'min':min(xs) if xs else None,'max':max(xs) if xs else None,'mean':statistics.mean(xs) if xs else None}

def main():
    manifest=read(ROOT/'manifest.json')
    for rel,h in manifest['files'].items():assert sha(ROOT/rel)==h,rel
    for path,h in manifest['source_files'].items():assert sha(path)==h,path
    review_manifest=read(ROOT/'review/export-manifest.json')
    for rel,h in review_manifest['files'].items():assert sha(ROOT/'review'/rel)==h,rel
    assert sha(ROOT/'runtime/answers.jsonl')==review_manifest['source_answers_sha256']
    answers=rows(ROOT/'runtime/answers.jsonl');jobs=read(ROOT/'schedule.json')['jobs']
    assert len({r['job_id'] for r in answers})==len(answers)
    answers={r['job_id']:r for r in answers}
    old_answers={(r['patient_id'],r['target_tokens']):r for r in rows(PRIOR/'runtime-02/answers.jsonl') if r['arm']=='flat_full_history'}
    calibration=[r for r in rows(PRIOR/'runtime-02/answers.jsonl') if r['status']=='complete']
    assert len(calibration)==40
    assert all(r['usage']['prompt_tokens']==r['local_prompt_tokens']-1 for r in calibration)
    details=[];requests=0;responses=0;errors=0;cost=0.;token_total=0;providers=set();models=set();outcome_ids=set()
    recovered_jobs=[];retried_jobs=[]
    for job in jobs:
        result=answers.get(job['job_id']);d=ROOT/'runtime'/job['job_id']
        archive=rows(d/'openrouter-api-records.jsonl') if (d/'openrouter-api-records.jsonl').exists() else []
        old_request=next(r['request'] for r in rows(job['source_native_archive']) if r['event']=='request')
        sent={};outcomes={}
        for r in archive:
            assert r['request']['plugins']==[{'id':'context-compression'}]
            assert r['request']['max_tokens'] in (4096,8192)
            expected={**old_request,'plugins':[{'id':'context-compression'}],'max_tokens':r['request']['max_tokens']}
            assert r['request']==expected,(job['job_id'],'wire changed')
            rid=r['record_id']
            if r['event']=='request':
                assert rid not in sent;sent[rid]=r;requests+=1
            else:
                assert rid in sent and rid not in outcomes and rid not in outcome_ids
                outcomes[rid]=r;outcome_ids.add(rid)
                if r['event']=='response':
                    responses+=1;raw=r['response'];models.add(raw['model']);providers.add(raw.get('provider'))
                    assert raw['model']=='google/gemini-2.5-pro'
                    charge=raw['usage']['cost'];assert type(charge) in (int,float) and math.isfinite(charge) and charge>=0
                    cost+=charge;token_total+=raw['usage']['prompt_tokens']
                else:assert r['event']=='error';errors+=1
        assert set(sent)==set(outcomes),job['job_id']
        journal=rows(d/'timeout-retries.jsonl') if (d/'timeout-retries.jsonl').exists() else []
        terminals=[r for r in journal if r['event'] in ('attempt_response','attempt_error')]
        assert {r['native_record_id'] for r in terminals}==set(outcomes)
        assert len(terminals)==len(outcomes)
        group_ids={r['group_id'] for r in journal}
        for gid in group_ids:
            group=[r for r in journal if r['group_id']==gid]
            starts=[r for r in group if r['event']=='group_start']
            finishes=[r for r in group if r['event']=='group_finished']
            attempts=[r for r in group if r['event']=='attempt_start']
            terminal=[r for r in group if r['event'] in ('attempt_response','attempt_error')]
            assert len(starts)==len(finishes)==1
            assert [r['attempt'] for r in attempts]==list(range(1,len(attempts)+1))
            assert 1<=len(attempts)<=3 and len(terminal)==len(attempts)
            assert [r['attempt'] for r in terminal]==[r['attempt'] for r in attempts]
            bodies=[sent[r['native_record_id']]['request'] for r in terminal]
            assert all(b==bodies[0] for b in bodies)
            body_hash=hashlib.sha256(json.dumps(bodies[0],ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest()
            assert all(r['request_sha256']==body_hash for r in group)
            if len(attempts)>1:
                assert all(r['event']=='attempt_error' and r['will_retry'] is True for r in terminal[:-1])
                retried_jobs.append(job['job_id'])
        recovery=[r for r in sent.values() if r['request']['max_tokens']==8192]
        if recovery:
            originals=[outcomes[rid] for rid,r in sent.items() if r['request']['max_tokens']==4096 and outcomes[rid]['event']=='response']
            assert len(originals)==1 and [c['finish_reason'] for c in originals[0]['response']['choices']]==['length']
            assert all(r['timestamp']>originals[0]['timestamp'] for r in recovery)
            assert len(group_ids)==2
            recovered_jobs.append(job['job_id'])
        old=old_answers[(job['patient_id'],job['target_tokens'])]
        native=None;old_native=None
        if result and result['status']=='complete':
            final=outcomes[result['native_record_id']]
            assert final['event']=='response' and final['response']['usage']==result['usage']
            assert [c['finish_reason'] for c in final['response']['choices']]==['stop']
            raw_text=final['response']['choices'][0]['message']['content']
            assert isinstance(raw_text,str) and raw_text.strip()==result['answer']
            native=result['usage']['prompt_tokens']
        if old['status']=='complete':old_native=old['usage']['prompt_tokens']
        estimate=job['local_prompt_tokens']-1
        details.append({'job_id':job['job_id'],'patient_id':job['patient_id'],'target_tokens':job['target_tokens'],
            'status':result['status'] if result else 'uncommitted','source_prompt_sha256':job['prompt_sha256'],
            'local_uncompressed_prompt_tokens':job['local_prompt_tokens'],
            'native_compressed_prompt_tokens':native,'native_prior_uncompressed_prompt_tokens':old_native,
            'prior_uncompressed_status':old['status'],
            'native_difference_from_accepted_control':native-old_native if native is not None and old_native is not None else None,
            'estimated_uncompressed_native_equivalent':estimate,
            'estimated_input_reduction_percent':100*(estimate-native)/estimate if native is not None else None,
            'http_attempts':len(sent),'native_record_id':result.get('native_record_id') if result else None})
    cells=[]
    for level in (0,64000,256000,900000,1200000):
        items=[r for r in details if r['target_tokens']==level];available=[r for r in items if r['status']=='complete']
        cells.append({'target_tokens':level,'complete':len(available),'planned':5,
            'local_uncompressed_prompt_tokens':stats([r['local_uncompressed_prompt_tokens'] for r in items]),
            'native_compressed_prompt_tokens':stats([r['native_compressed_prompt_tokens'] for r in available]),
            'native_difference_from_accepted_control':stats([r['native_difference_from_accepted_control'] for r in available if r['native_difference_from_accepted_control'] is not None]),
            'estimated_input_reduction_percent':stats([r['estimated_input_reduction_percent'] for r in available])})
    state=read(ROOT/'runtime/state.json')
    assert math.isclose(cost,state['observed_cost_usd'],abs_tol=1e-9)
    result={'created_at':datetime.now(timezone.utc).isoformat(),'status':state['status'],
        'frozen_local_files_verified':len(manifest['files']),'source_files_verified':len(manifest['source_files']),
        'review_export_files_verified':len(review_manifest['files']),
        'retry_journals_verified':True,'retried_job_ids':sorted(set(retried_jobs)),
        'output_recovery_job_ids':recovered_jobs,
        'only_wire_change':'plugins:[{id:context-compression}]; output recovery if explicitly declared',
        'http_requests':requests,'http_responses':responses,'http_errors':errors,
        'observed_model_ids':sorted(models),'observed_providers':sorted(providers),
        'observed_response_cost_usd':cost,'unknown_charge_reserve_usd':state.get('unknown_charge_reserve_usd'),
        'native_input_tokens_all_responses':token_total,'calibration_accepted_requests':40,
        'calibration_rule':'old native prompt_tokens = local prompt_tokens - 1',
        'transformed_prompt_text_available':False,
        'caveat':'Above 256k there is no accepted uncompressed native control; reductions use calibrated local counts, not inspected transformed text.',
        'cells':cells,'per_patient':details,'analysis_script_sha256':sha(__file__)}
    (ROOT/'analysis/token-analysis.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:result[k] for k in ('status','http_requests','http_responses','http_errors','observed_response_cost_usd')},indent=2))

if __name__=='__main__':main()
