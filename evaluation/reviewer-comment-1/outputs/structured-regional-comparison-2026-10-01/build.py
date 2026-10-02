"""Prepare derived persistent archive views; native retrieval is unchanged."""
from __future__ import annotations
import copy,hashlib,json,random,sys,importlib.metadata
from pathlib import Path
from datetime import datetime,timezone
HERE=Path(__file__).resolve().parent
REG=HERE.parent/'regional-memory-compression-2026-09-30'
PRIOR=HERE.parent/'memory-length-stress-2026-09-30'
MAIN=HERE.parent/'memory-comparison-run-2026-09-29'
ENCODER=Path('/Users/marco/.cache/huggingface/hub/models--sentence-transformers--all-MiniLM-L6-v2/snapshots/1110a243fdf4706b3f48f1d95db1a4f5529b4d41')
sys.path[:0]=[str(MAIN),str(MAIN/'source')]
from prompt_contract import render_prompt
from agent.core.factual_memory import EvidenceMemory,render_evidence,_validate_fact,estimated_tokens,_render_item

def read(p):return json.loads(Path(p).read_text())
def rows(p):return [json.loads(l) for l in Path(p).read_text().splitlines() if l.strip()]
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def serialized(v):return json.dumps(v,sort_keys=True,ensure_ascii=False,separators=(',',':'))
def digest_records(rs):
 h=hashlib.sha256()
 for r in rs:h.update((serialized(r)+'\n').encode())
 return h.hexdigest()
def put(p,v):
 p=Path(p);p.parent.mkdir(parents=True,exist_ok=True)
 with p.open('x') as f:json.dump(v,f,ensure_ascii=False,indent=2);f.write('\n')
def text(p,s):
 p=Path(p);p.parent.mkdir(parents=True,exist_ok=True)
 with p.open('x') as f:f.write(s)

def derive(corpus):
 patient=corpus['patient_id'];source=PRIOR/'inputs'/patient
 original=rows(source/'original-prefix.jsonl');original_by_id={r['id']:r for r in original}
 batches=rows(source/'original-batches.jsonl');regional=rows(corpus['records_path'])
 for b in batches:
  assert set(b['source_ids'])<=set(original_by_id)
  for f in b['facts']:_validate_fact(f,original_by_id)
 raw=[];mapping=[]
 for row in regional:
  display=row['display'];ident=row['origin_id']
  if row['origin_turn_id']:
   native=copy.deepcopy(original_by_id[ident])
   assert native['therapist_text']==display['therapist'] and native['patient_text']==display['patient']
  else:
   native={'id':ident,'type':'conversation_turn','patient_id':original[0]['patient_id'],
     'therapist_id':original[0]['therapist_id'],'therapist_text':display['therapist'],'patient_text':display['patient'],
     'usable':True,'topic':{},'created_at':'2026-09-30T00:00:00+00:00','synthetic_stress_filler':True}
  native.update(session_id=str(display['session']),session_order=display['session']-1,turn_index=display['turn'])
  raw.append(native)
  if row['origin_turn_id']:mapping.append({'origin_id':ident,'origin_turn_id':row['origin_turn_id'],
   'session_id':native['session_id'],'session_order':native['session_order'],'turn_index':native['turn_index']})
 assert len(mapping)==45 and len(raw)==corpus['record_count']
 by_id={r['id']:r for r in raw};assert len(by_id)==len(raw)
 for batch in batches:
  for fact in batch['facts']:
   src=by_id[fact['source_id']]
   for k in ('session_id','session_order','turn_index'):fact[k]=src[k]
   assert fact['source_created_at']==src['created_at']
   _validate_fact(fact,by_id)
 # Batch-level metadata retains extraction provenance; fact/source chronology is derived.
 return raw+batches,mapping

def prepare():
 import numpy as np
 from google.genai import local_tokenizer
 from sentence_transformers import SentenceTransformer
 from transformers import AutoTokenizer
 assert not (HERE/'contexts.json').exists()
 token=local_tokenizer.LocalTokenizer(model_name='gemini-2.5-pro')
 count=lambda s:token.count_tokens(s).total_tokens
 reg_manifest=read(REG/'final-manifest.json');prior_manifest=read(PRIOR/'final-manifest.json')
 for base,m in ((REG,reg_manifest),(PRIOR,prior_manifest)):
  for rel,h in m['files'].items():assert sha(base/rel)==h,(base.name,rel)
 sources={};corpora=read(REG/'corpus.json')['corpora'];baseline=read(REG/'schedule.json')['jobs']
 for base,rels in ((REG,['final-manifest.json','corpus.json','schedule.json','analysis/results.json','runtime/answers.jsonl','review/ratings/a.json','review/ratings/b.json','RUBRIC.txt','openrouter_transport.py','timeout_retries.py']),
                   (PRIOR,['final-manifest.json','embedding-texts.json','embeddings.npy','retrieval.json']),
                   (MAIN,['prompt_contract.py','source/agent/core/factual_memory.py','source/agent/core/memory_store.py','runtime_adapter.py','openrouter_inband_errors.py'])):
  for rel in rels:sources[str(base/rel)]=sha(base/rel)
 for patient in sorted({c['patient_id'] for c in corpora}):
  d=HERE/'inputs'/patient
  for name in ('case.txt','question.txt','gold.json'):
   src=REG/'inputs'/patient/name;sources[str(src)]=sha(src);text(d/name,src.read_text())
  for name in ('original-prefix.jsonl','original-batches.jsonl'):
   src=PRIOR/'inputs'/patient/name;sources[str(src)]=sha(src)
 tokenizer_checks=[]
 for j in [j for j in baseline if j['arm']=='full' and j['fact_position']=='start']:
  n=count(Path(j['prompt_path']).read_text());assert n==j['local_prompt_tokens']
  tokenizer_checks.append({'path':j['prompt_path'],'tokens':n})
 old_texts=read(PRIOR/'embedding-texts.json');old_vectors=np.load(PRIOR/'embeddings.npy',mmap_mode='r')
 assert len(old_texts)==len(old_vectors) and sha(PRIOR/'embeddings.npy')==read(PRIOR/'retrieval.json')['embedding_vectors_sha256']
 old_index={t:i for i,t in enumerate(old_texts)};assert len(old_index)==len(old_texts)
 added={};encoder=None;encoder_match=None;embed_requests=0
 tokenizer=AutoTokenizer.from_pretrained(str(ENCODER),local_files_only=True)
 def embed(texts):
  nonlocal encoder,encoder_match,embed_requests
  embed_requests+=1
  missing=list(dict.fromkeys(t for t in texts if t not in old_index and t not in added))
  if missing:
   if encoder is None:
    encoder=SentenceTransformer(str(ENCODER),device='cpu',local_files_only=True)
    assert encoder.max_seq_length==256
    probe=old_texts[0];fresh=encoder.encode([probe],convert_to_tensor=False,show_progress_bar=False)[0]
    delta=float(np.max(np.abs(fresh-old_vectors[0])))
    assert np.allclose(fresh,old_vectors[0],atol=1e-6,rtol=1e-5),(delta,'encoder calibration mismatch')
    encoder_match={'existing_text_sha256':hashlib.sha256(probe.encode()).hexdigest(),'max_absolute_difference':delta}
   vs=encoder.encode(missing,convert_to_tensor=False,batch_size=64,show_progress_bar=False)
   added.update(zip(missing,vs))
  return [old_vectors[old_index[t]] if t in old_index else added[t] for t in texts]
 contexts=[];unique={};jobs=[]
 for i,corpus in enumerate(corpora,1):
  patient=corpus['patient_id'];records_path=Path(corpus['records_path']);sources[str(records_path)]=sha(records_path)
  rs,mapping=derive(corpus);raw=[r for r in rs if r['type']=='conversation_turn'];facts=[f for b in rs if b['type']=='fact_batch' for f in b['facts']]
  class View:
   def iter_records(self,patient_id,therapist_id):return iter(rs)
  memory=EvidenceMemory(View());d=HERE/'inputs'/patient/f"length_{corpus['target_tokens']}"/corpus['fact_position']
  query=(HERE/'inputs'/patient/'question.txt').read_text();calls_before=embed_requests
  selected=memory.retrieve(patient_id=raw[0]['patient_id'],therapist_id=raw[0]['therapist_id'],query=query,limit=8,token_budget=1800,embed=embed)
  assert embed_requests==calls_before+1 and len(selected)<=8
  evidence=render_evidence(selected,token_budget=1800)
  assert sum(estimated_tokens(_render_item(item)) for item in selected)<=1800
  context='Source-grounded conversation memory:\n'+evidence+'\n'
  prompt=render_prompt(case_block=(HERE/'inputs'/patient/'case.txt').read_text(),arm_context=context,latest_question=query)
  path=d/'structured_evidence.txt';text(path,prompt);put(d/'selected-evidence.json',selected)
  context_id=f"{patient}__{corpus['target_tokens']}__{corpus['fact_position']}"
  job_matches=[b['job_id'] for b in baseline if all(b[k]==corpus[k] for k in ('patient_id','target_tokens','fact_position'))]
  assert len(job_matches)==(7 if corpus['target_tokens']==64000 else 1)
  view={**corpus,'context_id':context_id,'native_archive_view_sha256':digest_records(rs),'raw_turns':len(raw),'validated_facts':len(facts),
   'original_fact_batches':sum(r['type']=='fact_batch' for r in rs),'raw_metadata_overlay':mapping,
   'batch_provenance_policy':'Batch-level extraction metadata unchanged; raw source and fact chronology mapped to regional display.',
   'selected_items':len(selected),'selected_facts':sum(r['kind']=='fact' for r in selected),
   'selected_utterances':sum(r['kind']=='utterance' for r in selected),'rendered_evidence_estimated_tokens':estimated_tokens(evidence),
   'query_encoder_tokens_without_truncation':len(tokenizer(query,truncation=False)['input_ids']),
   'encoder_max_seq_length':256,'prompt_path':str(path),'prompt_sha256':sha(path),'local_prompt_tokens':count(prompt),
   'paired_baseline_job_ids':job_matches}
  assert view['query_encoder_tokens_without_truncation']==272
  put(d/'archive-view.json',view);contexts.append(view)
  h=view['prompt_sha256']
  if h not in unique:
   job={'patient_id':patient,'target_tokens':corpus['target_tokens'],'fact_position':corpus['fact_position'],
    'mode':'structured_component','arm':'persistent_evidence','prompt_path':str(path),'prompt_sha256':h,
    'local_prompt_tokens':view['local_prompt_tokens'],'context_ids':[context_id],'paired_baseline_job_ids':list(job_matches)}
   unique[h]=job;jobs.append(job)
  else:
   job=unique[h];assert job['patient_id']==patient
   job['context_ids'].append(context_id);job['paired_baseline_job_ids'].extend(job_matches)
  print(json.dumps({'prepared':i,'contexts':30,'patient':patient,'length':corpus['target_tokens'],'position':corpus['fact_position'],
    'items':len(selected),'native_local_prompt_tokens':view['local_prompt_tokens']}),flush=True)
 rng=random.Random(2026100101);rng.shuffle(jobs)
 for i,j in enumerate(jobs,1):j['job_id']=f'{i:03d}'
 unique_by_hash={j['prompt_sha256']:j['job_id'] for j in jobs}
 for c in contexts:c['generation_job_id']=unique_by_hash[c['prompt_sha256']]
 assert len(contexts)==30 and sum(len(c['paired_baseline_job_ids']) for c in contexts)==120
 texts=sorted(added)
 if texts:np.save(HERE/'additional-embeddings.npy',np.stack([added[t] for t in texts]));put(HERE/'additional-embedding-texts.json',texts)
 versions={name:importlib.metadata.version(name) for name in ('google-genai','sentencepiece','sentence-transformers','transformers','numpy','torch','scipy')}
 put(HERE/'preparation.json',{'created_at':datetime.now(timezone.utc).isoformat(),'versions':versions,'tokenizer_calibration':tokenizer_checks,
  'encoder_path':str(ENCODER),'cached_embedding_texts':len(old_texts),'additional_embedding_texts':len(texts),
  'encoder_calibration':encoder_match,'contexts':30,'unique_prompts':len(jobs),'memory_budget':1800,'item_limit':8,
  'gold_used_to_construct_prompts':False,'prior_archives_verified':{'regional_files':len(reg_manifest['files']),'length_files':len(prior_manifest['files'])}})
 put(HERE/'source-hashes.json',sources);put(HERE/'contexts.json',contexts)
 put(HERE/'schedule.json',{'order_seed':2026100101,'api_seed':None,'jobs':jobs})
 print(json.dumps({'prepared_unique_jobs':len(jobs),'contexts':30,'mapped_comparisons':120}),flush=True)

def audit_inputs():
 contexts=read(HERE/'contexts.json');jobs=read(HERE/'schedule.json')['jobs'];by_job={j['job_id']:j for j in jobs}
 baseline={j['job_id']:j for j in read(REG/'schedule.json')['jobs']};all_ids=[];checked=[]
 for c in contexts:
  assert sha(c['prompt_path'])==c['prompt_sha256'];rs,mapping=derive(c)
  assert digest_records(rs)==c['native_archive_view_sha256'] and mapping==c['raw_metadata_overlay']
  selected=read(Path(c['prompt_path']).parent/'selected-evidence.json');by_source={r['id']:r for r in rs if r['type']=='conversation_turn'}
  facts={f['id']:f for b in rs if b['type']=='fact_batch' for f in b['facts']}
  for item in selected:
   source=by_source[item['source_id']]
   assert item['quote'] in source[item['speaker']+'_text']
   assert all(item[k]==source[k] for k in ('session_id','session_order','turn_index'))
   if item['kind']=='fact':assert all(item[k]==facts[item['id']][k] for k in facts[item['id']])
  prompt=render_prompt(case_block=(HERE/'inputs'/c['patient_id']/'case.txt').read_text(),
   arm_context='Source-grounded conversation memory:\n'+render_evidence(selected,token_budget=1800)+'\n',
   latest_question=(HERE/'inputs'/c['patient_id']/'question.txt').read_text())
  assert prompt==Path(c['prompt_path']).read_text()
  job=by_job[c['generation_job_id']];assert job['prompt_sha256']==c['prompt_sha256'] and c['context_id'] in job['context_ids']
  for ident in c['paired_baseline_job_ids']:
   b=baseline[ident];assert all(b[k]==c[k] for k in ('patient_id','target_tokens','fact_position'))
   assert ident in job['paired_baseline_job_ids'];all_ids.append(ident)
  checked.append({'context_id':c['context_id'],'generation_job_id':c['generation_job_id'],'archive_and_prompt_verified':True})
 assert len(contexts)==30 and len(all_ids)==len(set(all_ids))==120
 assert len(jobs)==len({j['prompt_sha256'] for j in jobs})
 return checked

if __name__=='__main__':prepare()
