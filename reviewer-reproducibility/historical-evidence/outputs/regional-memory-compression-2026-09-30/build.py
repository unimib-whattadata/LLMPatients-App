"""Offline corpus construction and source-support audit; no model transport."""
from __future__ import annotations
import ast,bisect,hashlib,json,random,sys
from pathlib import Path
from datetime import datetime,timezone

HERE=Path(__file__).resolve().parent
PRIOR=HERE.parent/'memory-length-stress-2026-09-30'
MAIN=HERE.parent/'memory-comparison-run-2026-09-29'
AUTO=HERE.parent/'openrouter-compression-length-2026-09-30'
sys.path.insert(0,str(MAIN))
from prompt_contract import render_prompt
PATIENTS=('alex_carter_001','crystal_smith_001','daniel_isherwood_001','jason_smith_001','juanita_delgado_001')
POSITIONS=('start','middle','end')
HEADER='Available prior conversation in chronological order.\n'
SUPPORT={
 'distant_stable_fact/notebook_title':['s01t01'],
 'correction_and_proposal/partner':['s02t01','s06t01'],
 'correction_and_proposal/current':['s06t01'],
 'correction_and_proposal/former':['s06t01'],
 'correction_and_proposal/proposal_only':['s06t02'],
 'explicit_replacement/current_venue':['s07t01'],
 'explicit_replacement/former_venue':['s07t01'],
 'completed_versus_planned/completed':['s04t02'],
 'completed_versus_planned/planned_not_completed':['s08t01']}

def read(p):return json.loads(Path(p).read_text())
def rows(p):return [json.loads(s) for s in Path(p).read_text().splitlines() if s.strip()]
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def write(p,v):
 p=Path(p);p.parent.mkdir(parents=True,exist_ok=True)
 with p.open('x') as f:json.dump(v,f,ensure_ascii=False,indent=2);f.write('\n')
def textfile(p,s):
 p=Path(p);p.parent.mkdir(parents=True,exist_ok=True)
 with p.open('x') as f:f.write(s)
def line(r):return json.dumps(r['display'],ensure_ascii=False,separators=(',',':'))+'\n'
def context(records):return HEADER+''.join(line(r) for r in records)
def source_support(records):
 ids={r['origin_turn_id'] for r in records if r['origin_turn_id']}
 return {'canonical_source_retained':{k:bool(ids.intersection(v)) for k,v in SUPPORT.items()},
         'retained_original_turn_ids':sorted(ids),
         'stale_appointment_source_only':'s02t01' in ids and 's06t01' not in ids,
         'stale_venue_source_only':'s03t01' in ids and 's07t01' not in ids}

def place(original,filler,position):
 cut={'start':0,'middle':len(filler)//2,'end':len(filler)}[position]
 mixed=filler[:cut]+original+filler[cut:]
 return [{'origin_turn_id':r['origin_turn_id'],'origin_id':r['origin_id'],
          'display':{'session':i//5+1,'turn':i+1,'therapist':r['therapist'],'patient':r['patient']}}
         for i,r in enumerate(mixed)]

def deletion_bounds(weights,fraction,region):
 cumulative=[0]
 for w in weights:cumulative.append(cumulative[-1]+w)
 total=cumulative[-1];amount=total*fraction
 def nearest(x):
  i=bisect.bisect_left(cumulative,x)
  return min({max(0,i-1),min(len(weights),i)},key=lambda j:(abs(cumulative[j]-x),j))
 if region=='start':return 0,nearest(amount)
 if region=='end':return nearest(total-amount),len(weights)
 return nearest((total-amount)/2),nearest((total+amount)/2)

def prepare():
 from google.genai import local_tokenizer
 tok=local_tokenizer.LocalTokenizer(model_name='gemini-2.5-pro')
 count=lambda s:tok.count_tokens(s).total_tokens
 old_code=(PRIOR/'experiment.py').read_text()
 node=next(n for n in ast.parse(old_code).body if isinstance(n,ast.FunctionDef) and n.name=='filler')
 namespace={'random':random};exec(compile(ast.Module(body=[node],type_ignores=[]),str(PRIOR/'experiment.py'),'exec'),namespace)
 make_filler=namespace['filler']
 jobs=[];corpora=[];sources={};max_filler=0
 assert not (HERE/'schedule.json').exists()
 for patient in PATIENTS:
  source=PRIOR/'inputs'/patient;directory=HERE/'inputs'/patient
  for name in ('case.txt','question.txt','gold.json','original-prefix.jsonl'):
   p=source/name;sources[str(p)]=sha(p);textfile(directory/name,p.read_text())
  case=(source/'case.txt').read_text();query=(source/'question.txt').read_text()
  original=[]
  for r in rows(source/'original-prefix.jsonl'):
   origin=f"s{r['session_order']+1:02d}t{(r['turn_index']-1)%5+1:02d}"
   original.append({'origin_turn_id':origin,'origin_id':r['id'],'therapist':r['therapist_text'],'patient':r['patient_text']})
  assert len(original)==45 and original[5]['origin_turn_id']=='s02t01'
  filler=[]
  def prompt(rs):return render_prompt(case_block=case,arm_context=context(rs),latest_question=query)
  for target in (64000,1200000):
   size=count(prompt(place(original,filler,'start')))
   while size<target:
    for _ in range(max(1,min(1500,(target-size)//230))):
     i=len(filler)+1;t,p=make_filler(i)
     filler.append({'origin_turn_id':None,'origin_id':f'filler-{i:06d}','therapist':t,'patient':p})
    size=count(prompt(place(original,filler,'start')))
   max_filler=max(max_filler,len(filler))
   for position in POSITIONS:
    records=place(original,filler,position);d=directory/f'length_{target}'/position
    textfile(d/'records.jsonl',''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in records))
    complete=prompt(records);full_tokens=count(complete);history_tokens=count(context(records))
    begin=next(i for i,r in enumerate(records) if r['origin_turn_id']);end=begin+45
    block_start=count(HEADER+''.join(line(r) for r in records[:begin]))
    block_end=count(HEADER+''.join(line(r) for r in records[:end]))
    corpora.append({'patient_id':patient,'target_tokens':target,'fact_position':position,
        'records_path':str(d/'records.jsonl'),'record_count':len(records),'full_prompt_local_tokens':full_tokens,
        'full_history_local_tokens':history_tokens,'block_start_history_token':block_start,
        'block_end_history_token':block_end,'block_relative_midpoint':(block_start+block_end)/2/history_tokens})
    conditions=[('none',0)] if target==1200000 else [('none',0)]+[(region,frac) for frac in (.5,.75) for region in POSITIONS]
    weights=[count(line(r)) for r in records] if target==64000 else None
    for region,frac in conditions:
     lo,hi=(0,0) if not frac else deletion_bounds(weights,frac,region)
     retained=records[:lo]+records[hi:];wire=prompt(retained)
     mode='auto_plugin' if target==1200000 else 'manual'
     arm='auto_plugin' if mode=='auto_plugin' else ('full' if not frac else f'drop_{region}_{int(frac*100)}')
     path=d/(arm+'.txt');textfile(path,wire)
     remaining_history=count(context(retained))
     info={'patient_id':patient,'target_tokens':target,'fact_position':position,'mode':mode,'arm':arm,
         'removal_region':region,'nominal_removed_fraction':frac,'deleted_index_start':lo,'deleted_index_end':hi,
         'original_turns':len(records),'remaining_turns':len(retained),'records_path':str(d/'records.jsonl'),
         'prompt_path':str(path),'prompt_sha256':sha(path),'local_prompt_tokens':count(wire),
         'full_prompt_local_tokens':full_tokens,'full_history_local_tokens':history_tokens,
         'retained_history_local_tokens':remaining_history,
         'achieved_local_history_reduction':1-remaining_history/history_tokens,
         'achieved_local_whole_prompt_reduction':1-count(wire)/full_tokens,
         'source_coverage':source_support(retained) if mode=='manual' else None}
     jobs.append(info)
    print(json.dumps({'prepared':patient,'size':target,'position':position,'full_tokens':full_tokens}),flush=True)
 rng=random.Random(2026093003)
 manual=[j for j in jobs if j['mode']=='manual'];auto=[j for j in jobs if j['mode']=='auto_plugin']
 rng.shuffle(manual);rng.shuffle(auto);jobs=manual+auto
 for i,j in enumerate(jobs,1):j['job_id']=f'{i:03d}'
 assert len(manual)==105 and len(auto)==15
 for base,rels in [(PRIOR,['experiment.py','final-manifest.json']),
                   (MAIN,['prompt_contract.py','runtime_adapter.py','openrouter_inband_errors.py']),
                   (AUTO,['openrouter_transport.py','timeout_retries.py','RUBRIC.txt','final-manifest.json'])]:
  for rel in rels:p=base/rel;sources[str(p)]=sha(p)
 write(HERE/'source-hashes.json',sources)
 write(HERE/'corpus.json',{'created_at':datetime.now(timezone.utc).isoformat(),'max_filler':max_filler,'corpora':corpora})
 write(HERE/'source-support-definition.json',SUPPORT)
 write(HERE/'schedule.json',{'order_seed':2026093003,'api_seed':None,'jobs':jobs})
 print(json.dumps({'prepared_jobs':len(jobs),'corpora':len(corpora)}),flush=True)

def audit_inputs():
 jobs=read(HERE/'schedule.json')['jobs'];checked=[];cache={}
 assert len(jobs)==120 and len({(j['patient_id'],j['target_tokens'],j['fact_position'],j['arm']) for j in jobs})==120
 for job in jobs:
  p=job['patient_id'];d=HERE/'inputs'/p
  key=job['records_path']
  if key not in cache:
   rs=rows(key);cache[key]=rs
   assert [r['display']['turn'] for r in rs]==list(range(1,len(rs)+1))
   originals=[r for r in rs if r['origin_turn_id']]
   source=rows(d/'original-prefix.jsonl')
   assert len(originals)==45
   for r,o in zip(originals,source):
    assert r['display']['therapist']==o['therapist_text'] and r['display']['patient']==o['patient_text']
    assert r['origin_turn_id']==f"s{o['session_order']+1:02d}t{(o['turn_index']-1)%5+1:02d}"
  records=cache[key];lo,hi=job['deleted_index_start'],job['deleted_index_end'];retained=records[:lo]+records[hi:]
  expected=render_prompt(case_block=(d/'case.txt').read_text(),arm_context=context(retained),latest_question=(d/'question.txt').read_text())
  assert Path(job['prompt_path']).read_text()==expected and sha(job['prompt_path'])==job['prompt_sha256']
  if job['mode']=='manual':assert source_support(retained)==job['source_coverage']
  else:assert lo==hi==0 and job['source_coverage'] is None
  assert 'canonical_source_retained' not in expected and 'source_coverage' not in expected
  checked.append({'job_id':job['job_id'],'prompt_and_source_mapping':'verified'})
 # Filler identity across placements, without asking a model anything.
 for p in PATIENTS:
  for length in (64000,1200000):
   sequences=[]
   for position in POSITIONS:
    rs=cache[str(HERE/'inputs'/p/f'length_{length}'/position/'records.jsonl')]
    sequences.append([(r['origin_id'],r['display']['therapist'],r['display']['patient']) for r in rs if not r['origin_turn_id']])
   assert sequences[0]==sequences[1]==sequences[2]
 return checked

if __name__=='__main__':prepare()
