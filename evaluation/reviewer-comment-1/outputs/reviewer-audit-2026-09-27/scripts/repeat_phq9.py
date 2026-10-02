"""Run the existing PHQ-9 runner with isolated results and observable API records."""
import argparse,hashlib,json,os,platform,statistics,subprocess,sys,threading,time
from concurrent.futures import ThreadPoolExecutor,as_completed
from datetime import datetime,timezone
from pathlib import Path

ROOT=Path('/Users/marco/Sites/LLMPatients-Agent')
OUT=Path('/tmp/llmpatient-reviewer-audit')
sys.path.insert(0,str(ROOT))
# Only a scheduling override: preserve original prompts and generation settings.
os.environ['QUESTIONNAIRE_INTER_BATCH_DELAY_SECONDS']='0'
from agent.core import questionnaire_runner as qr
from agent.core.llm_provider_base import STOP_SEQUENCES
qr.RESULTS_DIR=OUT/'new_results'
PATS=['alex_carter_001','crystal_smith_001','daniel_isherwood_001','jason_smith_001','juanita_delgado_001']
lock=threading.Lock()

def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()

class ObservedModel:
 def __init__(self,inner,records):self.inner,self.records=inner,records
 def generate_content(self,*args,**kwargs):
  t=time.monotonic()
  event={'timestamp':datetime.now(timezone.utc).isoformat(),'prompt':args[0] if args else kwargs.get('contents'),'generation_config':kwargs.get('generation_config'),'safety_settings':{str(k):str(v) for k,v in kwargs.get('safety_settings',{}).items()}}
  try:
   response=self.inner.generate_content(*args,**kwargs)
   event['response']=response.to_dict()
   return response
  except Exception as e:
   event['error_type']=type(e).__name__;event['error']=str(e);raise
  finally:
   event['elapsed_seconds']=time.monotonic()-t;self.records.append(event)


def patient_runs(patient,n):
 results=[]
 for idx in range(1,n+1):
  records=[]
  r=qr.QuestionnaireRunner('phq9',patient,force=True)
  run_dir=OUT/'new_results'/patient/f'run_{idx:02d}'
  run_dir.mkdir(parents=True,exist_ok=False)
  r.result_path=run_dir/'phq9.json';r.partial_path=run_dir/'phq9.partial.json'
  r.llm.model=ObservedModel(r.llm.model,records)
  meta={'patient_id':patient,'run':idx,'model_id':r.llm.model_id,'provider':type(r.llm).__name__,'seed':'not set by original runner','temperature':0.1,'max_tokens_initial':220,'top_p':0.95,'top_k':40,'stop_sequences':STOP_SEQUENCES,'history':'none; each item independent','profile_sha256':digest(ROOT/'data/patients'/f'{patient}.yaml'),'questionnaire_sha256':digest(ROOT/'data/questionnaires/phq9.yaml'),'started_at':datetime.now(timezone.utc).isoformat()}
  try:
   result=r.run();meta['status']='completed';meta['total']=result['scores']['total'];meta['answers']=result['answers'];results.append(result['scores']['total'])
  except Exception as exc:
   meta['status']='failed';meta['error_type']=type(exc).__name__;meta['error']=str(exc)
  finally:
   meta['finished_at']=datetime.now(timezone.utc).isoformat();meta['api_calls']=len(records)
   (run_dir/'api_records.json').write_text(json.dumps(records,indent=2,ensure_ascii=False,default=str))
   (run_dir/'metadata.json').write_text(json.dumps(meta,indent=2,ensure_ascii=False))
  with lock:print('AUDIT_RESULT',json.dumps(meta),flush=True)
  if meta['status']!='completed':break
 return patient,results

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--runs',type=int,default=20);a=parser.parse_args()
 manifest={'started_at':datetime.now(timezone.utc).isoformat(),'python':sys.version,'platform':platform.platform(),'agent_commit':subprocess.check_output(['git','-C',str(ROOT),'rev-parse','HEAD'],text=True).strip(),'runs_per_patient_requested':a.runs,'patients':PATS,'concurrent_patients':5,'inter_batch_delay_seconds':0,'original_files_overwritten':False,'runner_sha256':digest(ROOT/'agent/core/questionnaire_runner.py')}
 (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
 all_results={}
 with ThreadPoolExecutor(max_workers=5) as pool:
  for task in as_completed([pool.submit(patient_runs,p,a.runs) for p in PATS]):
   p,vals=task.result();all_results[p]={'n':len(vals),'scores':vals,'mean':statistics.mean(vals) if vals else None,'sd':statistics.stdev(vals) if len(vals)>1 else None,'min':min(vals) if vals else None,'max':max(vals) if vals else None,'n_ge_10':sum(x>=10 for x in vals)}
   (OUT/'summary.json').write_text(json.dumps(all_results,indent=2))
 print('FINAL_SUMMARY',json.dumps(all_results),flush=True)
