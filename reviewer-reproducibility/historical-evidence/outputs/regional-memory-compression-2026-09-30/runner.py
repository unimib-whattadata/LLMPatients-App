"""Position and regional-deletion experiment; see PROTOCOL.md."""
from __future__ import annotations
import argparse
import ast
import hashlib
import json
import math
import os
from pathlib import Path
import random
import re
import sys
import tempfile
import time
from datetime import datetime, timezone

HERE=Path(__file__).resolve().parent
PRIOR=HERE.parent/'memory-length-stress-2026-09-30'
MAIN=HERE.parent/'memory-comparison-run-2026-09-29'
RUNTIME=HERE/'runtime'
CONFIG={'temperature':.7,'max_output_tokens':4096,'top_p':.95,'top_k':40,
        'stop_sequences':['\nTherapist:','Therapist:'],
        'thinking_config':{'thinking_budget':1024}}
BUDGET=60
sys.path[:0]=[str(HERE),str(MAIN),str(MAIN/'source')]

def now(): return datetime.now(timezone.utc).isoformat()
def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def digest(s): return hashlib.sha256(s.encode()).hexdigest()
def read(path): return json.loads(Path(path).read_text())
def rows(path):
    p=Path(path)
    return [json.loads(s) for s in p.read_text().splitlines() if s.strip()] if p.exists() else []
def put(path,value):
    p=Path(path);p.parent.mkdir(parents=True,exist_ok=True)
    with p.open('x',encoding='utf8') as f:
        json.dump(value,f,ensure_ascii=False,indent=2,allow_nan=False);f.write('\n')
def put_text(path,value):
    p=Path(path);p.parent.mkdir(parents=True,exist_ok=True)
    with p.open('x',encoding='utf8') as f:f.write(value)

def preflight():
    """Real transport construction, fake network, plus all source payload checks."""
    import openrouter_transport as transport
    from timeout_retries import _wire_body,RetryPolicyError
    assert Path(transport.__file__).resolve()==HERE/'openrouter_transport.py'
    from build import audit_inputs
    checked=audit_inputs()
    captured=[]
    class FakeResponse:
        status=200
        def getheader(self,key):return None
        def read(self):
            return json.dumps({'id':'offline-fixture','model':'google/gemini-2.5-pro',
                 'choices':[{'finish_reason':'stop','message':{'content':'Fixture answer.'}}],
                 'usage':{'prompt_tokens':10,'completion_tokens':4,'total_tokens':14,'cost':0}}).encode()
    class FakeConnection:
        def __init__(self,*args,**kwargs):pass
        def request(self,method,path,body,headers):captured.append(json.loads(body))
        def getresponse(self):return FakeResponse()
        def close(self):pass
    connection=transport.http.client.HTTPSConnection
    previous=os.environ.get('OPENROUTER_API_KEY_FILE')
    try:
        with tempfile.TemporaryDirectory() as td:
            p=Path(td);(p/'dummy').write_text('offline-fixture-credential')
            os.environ['OPENROUTER_API_KEY_FILE']=str(p/'dummy')
            transport.http.client.HTTPSConnection=FakeConnection
            result=transport.OpenRouterModel('gemini-2.5-pro',records_path=p/'openrouter-api-records.jsonl').generate_content(
                'Offline fixture',generation_config=CONFIG,safety_settings={})
            assert captured==[_wire_body('Offline fixture',CONFIG)]
            assert result.to_dict()['_openrouter']['response']['id']=='offline-fixture'
            archived=p/'openrouter-api-records.jsonl'
            fixtures=[]
            for label,exc,payload,wanted in (
                ('capacity',transport.OpenRouterHTTPError('fixture',status_code=400,record_id='fixture'),
                 {'error':{'code':400,'message':'Maximum context length exceeded'}},True),
                ('protocol_mismatch',RetryPolicyError('fixture',record_id='fixture'),
                 {'error':{'code':400,'message':'Maximum context length exceeded'}},False),
                ('unavailable',transport.OpenRouterHTTPError('fixture',status_code=503,record_id='fixture'),
                 {'error':{'code':503,'message':'Service unavailable'}},False),
                ('invalid_plugin',transport.OpenRouterHTTPError('fixture',status_code=400,record_id='fixture'),
                 {'error':{'code':400,'message':'Unsupported context-compression plugin; maximum context length configuration is invalid'}},False)):
                archived.write_text(json.dumps({'event':'error','record_id':'fixture','response':payload})+'\n')
                assert bool(context_rejection(exc,p))==wanted,label
                fixtures.append({'fixture':label,'expected_context_rejection':wanted})
    finally:
        transport.http.client.HTTPSConnection=connection
        if previous is None:os.environ.pop('OPENROUTER_API_KEY_FILE',None)
        else:os.environ['OPENROUTER_API_KEY_FILE']=previous
    put(HERE/'preflight.json',{'timestamp':now(),'network_calls':0,'status':'passed',
                             'transport_matches_retry_verifier':True,'jobs':checked,
                             'context_error_fixtures':fixtures})
    print(json.dumps({'preflight':'passed','matching_requests':len(checked),'network_calls':0}))

def freeze():
    assert read(HERE/'preflight.json')['status']=='passed'
    files={str(p.relative_to(HERE)):sha(p) for p in sorted(HERE.rglob('*'))
           if p.is_file() and '__pycache__' not in p.parts and p.name!='manifest.json'}
    put(HERE/'manifest.json',{'frozen_at':now(),'status':'frozen_before_live_calls',
        'planned_calls':120,'files':files,'source_files':read(HERE/'source-hashes.json'),
        'generation_config':CONFIG,'plugin':[{'id':'context-compression'}],
        'local_budget_usd':BUDGET})
    print(json.dumps({'frozen_files':len(files),'planned_calls':120}))

def verify():
    manifest=read(HERE/'manifest.json')
    for name,expected in manifest['files'].items():assert sha(HERE/name)==expected,name
    for name,expected in manifest['source_files'].items():assert sha(name)==expected,name
    return manifest

def context_rejection(exc,directory):
    from openrouter_transport import OpenRouterError
    # Integrity/archival/gate exceptions must never become capacity outcomes.
    if not isinstance(exc,OpenRouterError):return None
    matches=[r for r in rows(directory/'openrouter-api-records.jsonl')
             if r.get('event')=='error' and r.get('record_id')==getattr(exc,'record_id',None)]
    if len(matches)!=1:return None
    payload=matches[0].get('response') or {}
    errors=[payload.get('error')]+[c.get('error') for c in payload.get('choices',[]) if isinstance(c,dict)]
    codes=[str(e.get('code')) for e in errors if isinstance(e,dict)]
    if getattr(exc,'status_code',None)!=400 and getattr(exc,'upstream_code',None)!=400 and '400' not in codes:return None
    message=json.dumps(payload,ensure_ascii=False).lower()
    if re.search(r'(invalid|unknown|unsupported)[^.;]{0,60}\b(plugin|parameter|option|configuration)\b',message):return None
    if re.search(r'(maximum context|context length|input token|too many tokens|token count)',message) and re.search(r'(exceed|maximum|long|limit|too many)',message):
        return {'native_record_id':matches[0]['record_id'],'provider_error':payload}
    return None

def live():
    verify();assert not RUNTIME.exists(),'No automatic restart or overwrite'
    from runtime_adapter import SerialGate,append_jsonl,write_json,_visible_text
    from openrouter_inband_errors import install_inband_error_handling
    from timeout_retries import install_retry_policy
    import openrouter_transport
    assert Path(openrouter_transport.__file__).resolve()==HERE/'openrouter_transport.py'
    RUNTIME.mkdir();install_inband_error_handling();model_class=install_retry_policy(RUNTIME)
    gate=SerialGate(RUNTIME/'request-gate.json')
    started=now();cost=0.;unknown=0.;completed=0;reserved=set()
    jobs=read(HERE/'schedule.json')['jobs']
    def check():
        if (RUNTIME/'STOP').exists():raise RuntimeError('Global STOP')
    try:
        for job in jobs:
            check();prompt=Path(job['prompt_path']).read_text()
            assert digest(prompt)==job['prompt_sha256'] and len(prompt.encode())<16_000_000
            reserve=1.1*(job['local_prompt_tokens']*1.35*4.5e-6+8192*27e-6)
            directory=RUNTIME/job['job_id'];directory.mkdir()
            model=model_class('gemini-2.5-pro',timeout_seconds=300,records_path=directory/'openrouter-api-records.jsonl')
            write_json(RUNTIME/'state.json',{'status':'running','pid':os.getpid(),'started_at':started,
                       'heartbeat':now(),'completed':completed,'planned':len(jobs),'current_job':job,
                       'observed_cost_usd':cost,'unknown_charge_reserve_usd':unknown})
            for output_budget in (4096,8192):
                if cost+unknown+3*reserve>BUDGET:raise RuntimeError('Prespecified conservative budget gate')
                config={**CONFIG,'max_output_tokens':output_budget}
                with gate.request(check):
                    start=time.monotonic()
                    append_jsonl(directory/'events.jsonl',{'event':'request','timestamp':now(),**job,'generation_config':config})
                    try:
                        response=model.generate_content(prompt,generation_config=config,safety_settings={})
                    except BaseException as exc:
                        overflow=context_rejection(exc,directory)
                        if not overflow:
                            write_json(RUNTIME/'STOP',{'timestamp':now(),'job':job,'error_type':type(exc).__name__,
                                                     'status_code':getattr(exc,'status_code',None)})
                            raise
                        result={**job,'status':'context_rejected','semantic_evaluable':False,'timestamp':now(),
                                'elapsed_seconds':time.monotonic()-start,**overflow}
                        append_jsonl(directory/'events.jsonl',result)
                        deadline=time.monotonic()+5
                        while time.monotonic()<deadline:
                            check();time.sleep(min(.25,max(0,deadline-time.monotonic())))
                    else:
                        normalized=response.to_dict();native=normalized['_openrouter']['response']
                        assert native['model']=='google/gemini-2.5-pro'
                        usage=native.get('usage') or {};value=usage.get('cost')
                        if type(value) not in (int,float) or not math.isfinite(value) or value<0:
                            raise RuntimeError('Missing or invalid provider charge')
                        cost+=value;visible=_visible_text(normalized)
                        finishes=[c['finish_reason'] for c in native['choices']]
                        complete=finishes==['stop'] and bool(visible)
                        result={**job,'status':'complete' if complete else 'incomplete','semantic_evaluable':complete,
                            'answer':visible,'timestamp':now(),'elapsed_seconds':time.monotonic()-start,
                            'native_record_id':normalized['_openrouter']['archive_record_id'],
                            'provider':native.get('provider'),'model':native['model'],'usage':usage,
                            'finish_reasons':finishes,'generation_config':config}
                        append_jsonl(directory/'events.jsonl',result)
                        if not complete and not (finishes==['length'] and output_budget==4096):
                            raise RuntimeError('Incomplete generation; no semantic-quality retry')
                    finally:
                        for failed in rows(directory/'openrouter-api-records.jsonl'):
                            rid=failed['record_id']
                            if failed['event']=='error' and rid not in reserved:
                                if failed.get('http_status') not in (400,429):unknown+=reserve
                                reserved.add(rid)
                if result['status'] in ('complete','context_rejected'):break
            if result['status']=='incomplete':raise RuntimeError('Output recovery exhausted')
            put(directory/'answer.json',result);append_jsonl(RUNTIME/'answers.jsonl',result);completed+=1
            print(json.dumps({'completed':completed,'planned':len(jobs),'status':result['status'],
                'patient':job['patient_id'],'length':job['target_tokens'],'cost_usd':round(cost,6),
                'native_prompt_tokens':result.get('usage',{}).get('prompt_tokens')}),flush=True)
        verify()
        write_json(RUNTIME/'state.json',{'status':'completed','started_at':started,'completed_at':now(),
            'completed':completed,'planned':len(jobs),'observed_cost_usd':cost,
            'unknown_charge_reserve_usd':unknown,'source_files_unchanged':True})
    except BaseException as exc:
        write_json(RUNTIME/'STOP',{'timestamp':now(),'error_type':type(exc).__name__})
        write_json(RUNTIME/'state.json',{'status':'stopped','started_at':started,'stopped_at':now(),
            'completed':completed,'planned':len(jobs),'observed_cost_usd':cost,
            'unknown_charge_reserve_usd':unknown,'error_type':type(exc).__name__,'reason':str(exc)})
        raise

def export():
    assert read(RUNTIME/'state.json')['status'] in ('completed','stopped')
    complete=[r for r in rows(RUNTIME/'answers.jsonl') if r['status']=='complete']
    random.Random(2026093002).shuffle(complete)
    cards=[];mapping={}
    for i,result in enumerate(complete,1):
        ident=f'C{i:03d}';source=PRIOR/'inputs'/result['patient_id']
        cards.append({'id':ident,'question':(source/'question.txt').read_text(),
                      'gold':read(source/'gold.json')['probes'],'answer':result['answer']})
        mapping[ident]={k:result[k] for k in ('job_id','patient_id','arm','target_tokens')}
    for rater in ('a','b'):
        put(HERE/'review'/rater/'cards.json',cards)
        put_text(HERE/'review'/rater/'RUBRIC.txt',(HERE/'RUBRIC.txt').read_text())
    put(HERE/'review/private/mapping.json',mapping)
    put(HERE/'review/export-manifest.json',{'created_at':now(),'cards':len(cards),
        'source_answers_sha256':sha(RUNTIME/'answers.jsonl'),
        'files':{str(p.relative_to(HERE/'review')):sha(p) for p in sorted((HERE/'review').rglob('*')) if p.is_file()}})
    print(json.dumps({'exported_cards':len(cards),'categories':6*len(cards)}))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('command',choices=['preflight','freeze','verify','live','export'])
    command=p.parse_args().command
    if command=='verify':print(json.dumps({'verified':verify()['planned_calls']}))
    else:globals()[command]()
