"""All saved memory, no filtering or truncation; no model calls in preparation."""
from pathlib import Path
import gzip,hashlib,json,sys,random,importlib.util,importlib.metadata
from datetime import datetime,timezone
from collections import Counter
HERE=Path(__file__).resolve().parent;REPO=HERE.parents[1]
REG=HERE.parent/'regional-memory-compression-2026-09-30';PREV=HERE.parent/'structured-regional-comparison-2026-10-01';MAIN=HERE.parent/'memory-comparison-run-2026-09-29'
sys.path[:0]=[str(MAIN),str(MAIN/'source')]
from prompt_contract import render_prompt
spec=importlib.util.spec_from_file_location('previous_structured_builder',PREV/'build.py');prior=importlib.util.module_from_spec(spec);spec.loader.exec_module(prior)
def now():return datetime.now(timezone.utc).isoformat()
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def digest(b):return hashlib.sha256(b).hexdigest()
def read(p):return json.loads(Path(p).read_text())
def serial(v):return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False)
def put(p,v):
 p=Path(p);p.parent.mkdir(parents=True,exist_ok=True)
 with p.open('x') as f:json.dump(v,f,ensure_ascii=False,indent=2,allow_nan=False);f.write('\n')
def read_prompt(p):return gzip.decompress(Path(p).read_bytes()).decode('utf8')
def prefix(profile):
 m=profile['complete_preprobe_memory'];path=REPO/m['path'];assert sha(path)==m['sha256']
 data=b''.join(path.read_bytes().splitlines(keepends=True)[:m['take_first_lines']]);assert digest(data)==m['prefix_sha256'] and len(data)==m['prefix_bytes']
 witness=REPO/m['hash_witness']['path'];assert sha(witness)==m['hash_witness']['sha256']
 rel='memory/'+path.name;assert read(witness)['state_files_at_close'][rel]==digest(data)
 records=[json.loads(s) for s in data.splitlines() if s.strip()]
 assert len(records)==81 and dict(Counter(x['type'] for x in records))==m['record_counts']
 return records

def full_records(corpus,profile):
 saved=prefix(profile);raw_and_batches,_=prior.derive(corpus)
 raw={r['id']:r for r in raw_and_batches if r['type']=='conversation_turn'}
 original={};after={};anchor=None
 for i,r in enumerate(saved,1):
  if r['type']=='conversation_turn':anchor=r['id'];original[anchor]=(i,r)
  else:assert anchor is not None;after.setdefault(anchor,[]).append((i,r))
 regional=prior.rows(corpus['records_path']);out=[];seen=[]
 for r in regional:
  ident=r['origin_id'];display=r['display'];placement={'session':display['session'],'turn':display['turn']}
  if ident in original:
   i,record=original[ident];seen.append(i)
  else:i,record=None,raw[ident]
  out.append({'saved_record':record,'original_memory_record_index':i,'regional_conversation_position':placement})
  for ix,record in after.get(ident,[]):
   out.append({'saved_record':record,'original_memory_record_index':ix,'regional_after_conversation_position':placement});seen.append(ix)
 assert sorted(seen)==list(range(1,82)) and len(out)==corpus['record_count']+36
 assert [r['saved_record'] for r in out if r['original_memory_record_index'] is not None]==saved
 conversations=[r for r in out if r['saved_record']['type']=='conversation_turn'];assert len(conversations)==len(regional)
 for x,r in zip(conversations,regional):
  assert x['saved_record']['therapist_text']==r['display']['therapist'] and x['saved_record']['patient_text']==r['display']['patient']
 return out

def context_text(records):
 metadata={'representation':'complete saved-memory stream, including every field and historical version',
 'order':'regional placement; native saved_record fields retain original source chronology',
 'fact_batch_field_roles':{'facts':'validated extractions','rejected_facts':'quarantined unaccepted proposals','extraction_response':'archived extraction output, not a separately validated assertion'},
 'narrative_scope':'original nine-session prefix only; regional filler has raw conversation records only'}
 return 'Complete saved memory archive (all records; no retrieval selection):\n'+serial(metadata)+'\n'+'\n'.join(serial(r) for r in records)+'\n'

def prepare():
 from google.genai import local_tokenizer
 assert not (HERE/'schedule.json').exists()
 inventory=read(HERE/'audit/saved-memory-inventory.json');profiles={p['patient_id']:p for p in inventory['profiles']}
 token=local_tokenizer.LocalTokenizer(model_name='gemini-2.5-pro');count=lambda s:token.count_tokens(s).total_tokens
 sources={str(HERE/'audit/saved-memory-inventory.json'):sha(HERE/'audit/saved-memory-inventory.json')}
 for base in (REG,PREV):
  m=read(base/'final-manifest.json')
  for rel,h in m['files'].items():assert sha(base/rel)==h,(base.name,rel)
  sources[str(base/'final-manifest.json')]=sha(base/'final-manifest.json')
 for base,names in ((REG,['corpus.json','schedule.json','analysis/results.json','runtime/answers.jsonl','review/ratings/a.json','review/ratings/b.json']),
  (MAIN,['prompt_contract.py','runtime_adapter.py','openrouter_inband_errors.py','source/agent/core/factual_memory.py','source/agent/core/memory_store.py']),
  (PREV,['build.py','runner.py','openrouter_transport.py','timeout_retries.py','analysis/summarize_v2.py','analysis/review_utils.py'])):
  for name in names:sources[str(base/name)]=sha(base/name)
 for patient,profile in profiles.items():
  d=HERE/'inputs'/patient;d.mkdir(parents=True)
  for filename in ('case.txt','question.txt','gold.json'):
   p=REG/'inputs'/patient/filename;sources[str(p)]=sha(p);(d/filename).write_bytes(p.read_bytes())
  m=profile['complete_preprobe_memory']
  for rel in (m['path'],m['hash_witness']['path']):sources[str(REPO/rel)]=sha(REPO/rel)
  for filename in ('original-prefix.jsonl','original-batches.jsonl'):
   p=prior.PRIOR/'inputs'/patient/filename;sources[str(p)]=sha(p)
 calibrations=[]
 for j in read(REG/'schedule.json')['jobs']:
  if j['arm']=='full' and j['fact_position']=='start':
   actual=count(Path(j['prompt_path']).read_text());assert actual==j['local_prompt_tokens'];calibrations.append({'job_id':j['job_id'],'tokens':actual})
 contexts=[];grouped={};baseline=read(REG/'schedule.json')['jobs']
 for corpus in read(REG/'corpus.json')['corpora']:
  patient=corpus['patient_id'];records=full_records(corpus,profiles[patient]);d=HERE/'inputs'/patient/f"length_{corpus['target_tokens']}"/corpus['fact_position'];d.mkdir(parents=True)
  case=(HERE/'inputs'/patient/'case.txt').read_text();query=(HERE/'inputs'/patient/'question.txt').read_text()
  context=context_text(records);prompt=render_prompt(case_block=case,arm_context=context,latest_question=query)
  encoded=prompt.encode();h=digest(encoded);path=d/'full_saved_memory.txt.gz';packed=gzip.compress(encoded,mtime=0)
  with path.open('xb') as f:f.write(packed)
  assert gzip.decompress(packed)==encoded
  links=[j['job_id'] for j in baseline if all(j[k]==corpus[k] for k in ('patient_id','target_tokens','fact_position'))]
  counts=dict(Counter(x['saved_record']['type'] for x in records));cid=f"{patient}__{corpus['target_tokens']}__{corpus['fact_position']}"
  ctx={**corpus,'context_id':cid,'prompt_path':str(path),'prompt_sha256':h,'prompt_file_sha256':sha(path),'local_prompt_tokens':count(prompt),
   'uncompressed_prompt_bytes':len(encoded),'compressed_prompt_bytes':len(packed),'complete_saved_original_records':81,'record_counts':counts,
   'all_record_fields_preserved':True,'memory_record_stream_sha256':digest(('\n'.join(serial(x) for x in records)+'\n').encode()),
   'paired_baseline_job_ids':links,'selection_limit':None,'truncation_applied':False,'plugin_enabled':False}
  put(d/'completeness.json',ctx);sources[corpus['records_path']]=sha(corpus['records_path']);contexts.append(ctx)
  grouped.setdefault(h,[]).append(ctx)
  print(json.dumps({'prepared':len(contexts),'context':cid,'tokens':ctx['local_prompt_tokens'],'records':counts,'disk_bytes':len(packed)}),flush=True)
 jobs=[]
 for h,group in grouped.items():
  c=group[0];assert len({x['patient_id'] for x in group})==1
  jobs.append({k:c[k] for k in ('patient_id','target_tokens','fact_position','prompt_path','prompt_sha256','local_prompt_tokens')}|{
   'mode':'full_saved_memory','arm':'full_saved_memory','context_ids':[x['context_id'] for x in group],
   'paired_baseline_job_ids':[j for x in group for j in x['paired_baseline_job_ids']]})
 random.Random(2026100103).shuffle(jobs)
 for i,j in enumerate(jobs,1):
  j['job_id']=f'{i:03d}'
  for c in contexts:
   if c['context_id'] in j['context_ids']:c['generation_job_id']=j['job_id']
 put(HERE/'contexts.json',contexts);put(HERE/'schedule.json',{'created_at':now(),'seed':2026100103,'jobs':jobs});put(HERE/'source-hashes.json',sources)
 put(HERE/'preparation.json',{'created_at':now(),'contexts':len(contexts),'unique_prompts':len(jobs),'baseline_links':sum(len(c['paired_baseline_job_ids']) for c in contexts),
  'google_genai_version':importlib.metadata.version('google-genai'),'tokenizer_calibration':calibrations,'gold_used_to_construct_prompts':False,
  'all_memory_records':True,'selection_or_truncation':False,'file_gzip_is_lossless_only':True,'max_uncompressed_prompt_bytes':max(c['uncompressed_prompt_bytes'] for c in contexts)})

def audit_inputs():
 contexts=read(HERE/'contexts.json');profiles={p['patient_id']:p for p in read(HERE/'audit/saved-memory-inventory.json')['profiles']};seen=[];checks=[]
 jobs=read(HERE/'schedule.json')['jobs'];by_job={j['job_id']:j for j in jobs}
 for c in contexts:
  records=full_records(c,profiles[c['patient_id']]);d=HERE/'inputs'/c['patient_id'];prompt=render_prompt(case_block=(d/'case.txt').read_text(),arm_context=context_text(records),latest_question=(d/'question.txt').read_text())
  assert read_prompt(c['prompt_path'])==prompt and digest(prompt.encode())==c['prompt_sha256'] and sha(c['prompt_path'])==c['prompt_file_sha256']
  assert dict(Counter(x['saved_record']['type'] for x in records))==c['record_counts'] and c['complete_saved_original_records']==81
  assert digest(('\n'.join(serial(x) for x in records)+'\n').encode())==c['memory_record_stream_sha256']
  job=by_job[c['generation_job_id']];assert c['context_id'] in job['context_ids'] and job['prompt_sha256']==c['prompt_sha256']
  seen+=c['paired_baseline_job_ids'];checks.append({'context_id':c['context_id'],'original_records_verified':81,'records':len(records),'prompt_sha256':c['prompt_sha256']})
 assert len(contexts)==30 and len(seen)==len(set(seen))==120 and len({j['prompt_sha256'] for j in jobs})==len(jobs)
 assert set(seen)=={j['job_id'] for j in read(REG/'schedule.json')['jobs']}
 return checks
if __name__=='__main__':prepare()
