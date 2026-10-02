"""Frozen-prefix, nested-history retrieval stress test. See PROTOCOL.md."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import random
import re
import shutil
import sys
import time
from datetime import datetime, timezone

HERE = Path(__file__).resolve().parent
MAIN = HERE.parent / 'memory-comparison-run-2026-09-29'
DESIGN = HERE.parent / 'memory-comparison-plan-2026-09-28/design'
RUNTIME = HERE / 'runtime'
PATIENTS = ('alex_carter_001', 'crystal_smith_001', 'daniel_isherwood_001',
            'jason_smith_001', 'juanita_delgado_001')
LEVELS = (0, 64000, 256000, 900000, 1200000)
ARMS = ('flat_full_history', 'structured_evidence')
CONFIG = {'temperature': .7, 'max_output_tokens': 4096, 'top_p': .95, 'top_k': 40,
          'stop_sequences': ['\nTherapist:', 'Therapist:'],
          'thinking_config': {'thinking_budget': 1024}}
ENCODER = Path('/Users/marco/.cache/huggingface/hub/models--sentence-transformers--all-MiniLM-L6-v2/snapshots/1110a243fdf4706b3f48f1d95db1a4f5529b4d41')
sys.path[:0] = [str(MAIN), str(MAIN/'source'), str(MAIN/'continuations/resume-07')]

def now(): return datetime.now(timezone.utc).isoformat()
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def digest(s): return hashlib.sha256(s.encode()).hexdigest()
def read(p): return json.loads(Path(p).read_text())
def rows(p): return [json.loads(s) for s in Path(p).read_text().splitlines() if s.strip()]
def put(p, v):
    p = Path(p); p.parent.mkdir(parents=True, exist_ok=True)
    with p.open('x', encoding='utf8') as f:
        json.dump(v, f, ensure_ascii=False, indent=2); f.write('\n')
def put_text(p, s):
    p = Path(p); p.parent.mkdir(parents=True, exist_ok=True)
    with p.open('x', encoding='utf8') as f: f.write(s)
def jsonlines(rs): return ''.join(json.dumps(r, ensure_ascii=False)+'\n' for r in rs)

def flat_context(records):
    return 'Complete prior conversation in chronological order.\n' + ''.join(
        json.dumps({'session': r['session_id'], 'turn': r['turn_index'],
                    'therapist': r['therapist_text'], 'patient': r['patient_text']},
                   ensure_ascii=False, separators=(',', ':'))+'\n' for r in records)

def filler(i):
    """Deterministic conversational distractors; no target-specific vocabulary."""
    rng = random.Random(20260930+i)
    scenes = ['a quiet kitchen', 'a sunny courtyard', 'a narrow footpath', 'a sheltered porch',
              'a busy grocery aisle', 'a small garden', 'a familiar hallway', 'a public park',
              'a shaded balcony', 'a railway platform', 'a neighbourhood bakery', 'a coastal path']
    objects = ['a ceramic cup', 'a striped scarf', 'a wooden tray', 'a paper bag', 'a loose button',
               'a blue umbrella', 'a canvas jacket', 'a potted plant', 'a woven basket', 'a wool blanket',
               'a stack of plates', 'a bicycle wheel', 'a shopping list', 'a pair of gloves']
    sounds = ['a low hum', 'a soft rustle', 'a distant engine', 'a brief laugh', 'a door closing',
              'a bird calling', 'a few footsteps', 'water running', 'a chair scraping', 'a gentle breeze']
    topics = ['preparing a simple meal', 'walking slowly after a busy morning', 'tidying a shelf',
              'choosing ingredients', 'noticing a change in the weather', 'repairing a loose handle',
              'watering a seedling', 'carrying groceries', 'folding clean laundry', 'sharing an observation']
    skills = ['pausing before replying', 'checking the meaning of a sentence', 'allowing a silence',
              'noticing the other person\'s pace', 'asking an open question', 'reflecting one detail',
              'avoiding an immediate interpretation', 'letting a speaker finish their thought']
    scene, obj, sound, topic, skill = map(rng.choice, (scenes, objects, sounds, topics, skills))
    t = (f'For reflection example {i}, imagine an ordinary exchange in {scene}. '
         f'A person notices {obj} while {topic}; there is {sound} nearby. '
         f'We are practising {skill}. How could you attend to the account and respond '
         'with a short, open observation, leaving room for the person to clarify their meaning?')
    p = (f'I would start with the description of {topic} and acknowledge the detail about {obj}. '
         f'The setting in {scene} gives me something concrete to notice without deciding how '
         f'the person must feel. I could acknowledge {sound} and then leave a pause. '
         f'Practising {skill} would help me stay with what was actually said. '
         'I would allow a correction and avoid supplying a personal interpretation before hearing more.')
    return t, p

def prepare():
    from google.genai import local_tokenizer
    from prompt_contract import render_prompt
    from agent.core.factual_memory import _validate_fact
    import importlib.metadata
    assert not (HERE/'corpus.json').exists(), 'Completed preparation exists; never overwrite'
    tokenizer = local_tokenizer.LocalTokenizer(model_name='gemini-2.5-pro')
    count = lambda s: tokenizer.count_tokens(s).total_tokens
    source_hashes = {}; cells = []
    for patient in PATIENTS:
        run_id = f'{patient}__r01__structured_common_profile'
        run = MAIN/'runtime'/run_id
        memory_paths=list((run/'memory').glob('*.jsonl'))
        assert len(memory_paths)==1, (patient, memory_paths)
        memory_path=memory_paths[0]
        turns_path = run/'accepted-turns.jsonl'
        case_path = DESIGN/'profiles'/patient/'case-narrative.txt'
        gold_path = DESIGN/'gold'/f'{patient}.json'
        for p in (memory_path, turns_path, case_path, gold_path): source_hashes[str(p)] = sha(p)
        memory = rows(memory_path)
        original = [r for r in memory if r.get('type') == 'conversation_turn' and r['session_order'] < 9]
        assert len(original) == 45
        allowed = {r['id']: r for r in original}
        batches = [r for r in memory if r.get('type') == 'fact_batch' and
                   r['source_ids'] and set(r['source_ids']) <= allowed.keys()]
        for batch in batches:
            for f in batch['facts']: _validate_fact(f, allowed)
        source_turns = rows(turns_path)
        for i, r in enumerate(original):
            assert source_turns[i]['therapist_text'] == r['therapist_text']
            assert source_turns[i]['patient_text'] == r['patient_text']
        gold = read(gold_path)
        questions = [next(r['therapist_text'] for r in source_turns if r['turn_id']==p['turn_id'])
                     for p in gold['probes']]
        query = ('Please answer all six questions below in six numbered sections. '
                 'This is a complex question; use enough words to answer every requested field.\n' +
                 '\n'.join(f'{i}. {q}' for i, q in enumerate(questions, 1)))
        case = case_path.read_text()
        directory = HERE/'inputs'/patient
        if directory.exists():
            # Reuse a complete locally prepared profile after an input-path
            # error, validating every retained input. No live run is resumed.
            assert read(directory/'gold.json')==gold
            assert (directory/'case.txt').read_text()==case
            assert (directory/'question.txt').read_text()==query
            assert rows(directory/'original-prefix.jsonl')==original
            assert rows(directory/'original-batches.jsonl')==batches
            for target in LEVELS:
                prefix=directory/f'length_{target}'
                history=rows(prefix/'history.jsonl')
                assert history[:45]==original
                for n,row in enumerate(history[45:],1):
                    t,p=filler(n)
                    assert row['therapist_text']==t and row['patient_text']==p
                assert rows(prefix/'memory.jsonl')==original+batches+history[45:]
                prompt=render_prompt(case_block=case,arm_context=flat_context(history),latest_question=query)
                assert (prefix/'flat_full_history.txt').read_text()==prompt
                cells.append({'patient_id':patient,'target_tokens':target,'full_history_local_tokens':count(prompt),
                              'original_turns':45,'added_turns':len(history)-45,'fact_batches':len(batches),
                              'validated_facts':sum(len(b['facts']) for b in batches),
                              'directory':str(prefix.relative_to(HERE)),'source_run':run_id})
            print(json.dumps({'stage':'reused_verified_local_corpus','patient_id':patient}),flush=True)
            continue
        put(directory/'gold.json', gold)
        put_text(directory/'question.txt', query)
        put_text(directory/'case.txt', case)
        put_text(directory/'original-prefix.jsonl', jsonlines(original))
        put_text(directory/'original-batches.jsonl', jsonlines(batches))
        history = list(original)
        history_lines = [flat_context(original)]
        full_prompt = lambda: render_prompt(case_block=case, arm_context=''.join(history_lines), latest_question=query)
        token_count = count(full_prompt())
        i = 0
        for target in LEVELS:
            # Append complete turns; never cut an utterance to force an exact count.
            while token_count < target:
                needed = max(1, min(1000, (target-token_count)//240))
                for _ in range(needed):
                    i += 1; t, p = filler(i)
                    row = {'id': f'stress-{patient}-{i:06d}', 'type': 'conversation_turn',
                           'patient_id': original[0]['patient_id'], 'therapist_id': original[0]['therapist_id'],
                           'session_id': f'distractor_s{(i-1)//5+10:05d}', 'session_order': (i-1)//5+9,
                           'turn_index': (i-1)%5+1, 'therapist_text': t, 'patient_text': p,
                           'usable': True, 'topic': {}, 'created_at': '2026-09-30T00:00:00+00:00',
                           'schema_version': 1, 'synthetic_stress_filler': True}
                    history.append(row)
                    history_lines.append(flat_context([row]).split('\n',1)[1])
                token_count = count(full_prompt())
            prefix = directory/f'length_{target}'
            put_text(prefix/'history.jsonl', jsonlines(history))
            put_text(prefix/'flat_full_history.txt', full_prompt())
            put_text(prefix/'memory.jsonl', jsonlines(original + batches + history[45:]))
            filler_text = '\n'.join(r['therapist_text']+'\n'+r['patient_text'] for r in history[45:])
            assert all(name.casefold() not in filler_text.casefold() for name in gold['novel_named_targets'])
            assert not re.search(r'\b(?:surname|appointment|booked|reserved|Friday|Saturday|Wednesday)\b|\d\d:\d\d', filler_text, re.I)
            cell = {'patient_id': patient, 'target_tokens': target, 'full_history_local_tokens': token_count,
                    'original_turns': 45, 'added_turns': i, 'fact_batches': len(batches),
                    'validated_facts': sum(len(b['facts']) for b in batches),
                    'directory': str(prefix.relative_to(HERE)), 'source_run': run_id}
            cells.append(cell)
            print(json.dumps({'stage':'prepared_corpus', **cell}), flush=True)
    put(HERE/'corpus.json', {'created_at':now(), 'tokenizer_package':importlib.metadata.version('google-genai'),
                            'tokenizer':'experimental local Gemini2.5Pro text tokenizer',
                            'cells':cells, 'source_hashes':source_hashes})

def retrieve():
    from sentence_transformers import SentenceTransformer
    from agent.core.factual_memory import EvidenceMemory, render_evidence
    from agent.core.memory_store import JsonlMemoryStore
    from prompt_contract import render_prompt
    import numpy as np
    model = SentenceTransformer(str(ENCODER), device='cpu', local_files_only=True)
    cache = {}; stats = []
    def embed(texts):
        missing = list(dict.fromkeys(s for s in texts if s not in cache))
        if missing:
            vectors = model.encode(missing, convert_to_tensor=False, batch_size=64, show_progress_bar=False)
            cache.update(zip(missing, vectors))
        return [cache[s] for s in texts]
    for cell in read(HERE/'corpus.json')['cells']:
        directory = HERE/cell['directory']; parent = directory.parent
        rs = rows(directory/'memory.jsonl')
        # The adapter only provides the immutable file; native eligibility,
        # ranking, current-fact calculation and rendering remain unchanged.
        class PrefixStore:
            def iter_records(self, patient_id, therapist_id): return iter(rs)
        memory = EvidenceMemory(PrefixStore())
        query = (parent/'question.txt').read_text()
        tokenizer_ids = model.tokenizer(query, truncation=False)['input_ids']
        selected = memory.retrieve(patient_id=rs[0]['patient_id'], therapist_id=rs[0]['therapist_id'],
                                   query=query, limit=8, token_budget=1800, embed=embed)
        evidence = render_evidence(selected, token_budget=1800)
        context = 'Source-grounded conversation memory:\n'+evidence+'\n'
        prompt = render_prompt(case_block=(parent/'case.txt').read_text(), arm_context=context, latest_question=query)
        put_text(directory/'structured_evidence.txt', prompt)
        put(directory/'selected-evidence.json', selected)
        stats.append({**cell, 'selected_items': len(selected), 'evidence_utf8_bytes':len(evidence.encode()),
                      'query_encoder_tokens_without_truncation':len(tokenizer_ids),
                      'encoder_max_seq_length':model.max_seq_length,
                      'encoder_query_truncated':len(tokenizer_ids)>model.max_seq_length,
                      'structured_prompt_utf8_bytes':len(prompt.encode())})
        print(json.dumps({'stage':'retrieved', 'patient':cell['patient_id'], 'length':cell['target_tokens'],
                          'items':len(selected)}), flush=True)
    # Attest the embedding outputs used; large arrays need not enter prompts.
    ordered = sorted(cache)
    arr = np.stack([cache[s] for s in ordered])
    np.save(HERE/'embeddings.npy', arr)
    put(HERE/'embedding-texts.json', ordered)
    put(HERE/'retrieval.json', {'cells':stats, 'encoder_path':str(ENCODER),
                              'embedding_vectors_sha256':sha(HERE/'embeddings.npy')})

def freeze():
    from google.genai import local_tokenizer
    tokenizer = local_tokenizer.LocalTokenizer(model_name='gemini-2.5-pro')
    rng = random.Random(20260930)
    jobs = []
    for level in LEVELS:
        patients = list(PATIENTS); rng.shuffle(patients)
        for patient in patients:
            arms = list(ARMS); rng.shuffle(arms)
            for arm in arms:
                path = HERE/'inputs'/patient/f'length_{level}'/f'{arm}.txt'
                jobs.append({'job_id': f'{len(jobs)+1:02d}', 'patient_id':patient,
                             'target_tokens':level, 'arm':arm,
                             'prompt_path':str(path.relative_to(HERE)), 'prompt_sha256':sha(path),
                             'local_prompt_tokens':tokenizer.count_tokens(path.read_text()).total_tokens})
    put(HERE/'schedule.json', {'order_seed':20260930,'api_seed':None,'jobs':jobs})
    corpus = read(HERE/'corpus.json')
    sources = dict(corpus['source_hashes'])
    for rel in ['prompt_contract.py','runtime_adapter.py','openrouter_transport.py','openrouter_inband_errors.py',
                'continuations/resume-07/timeout_retries.py','source/agent/core/factual_memory.py']:
        sources[str(MAIN/rel)] = sha(MAIN/rel)
    files = {str(p.relative_to(HERE)):sha(p) for p in sorted(HERE.rglob('*')) if p.is_file() and p.name!='manifest.json'}
    put(HERE/'manifest.json', {'frozen_at':now(), 'status':'frozen_before_live_calls', 'planned_calls':50,
                              'files':files,'source_files':sources, 'model':'google/gemini-2.5-pro',
                              'generation_config':CONFIG, 'local_budget_usd':40})
    print(json.dumps({'status':'frozen','planned_calls':len(jobs),'files':len(files)}), flush=True)

def verify():
    manifest = read(HERE/'manifest.json')
    for name, expected in manifest['files'].items(): assert sha(HERE/name)==expected, name
    for name, expected in manifest['source_files'].items(): assert sha(name)==expected, name
    return manifest

def is_context_rejection(exc, directory, job):
    if job['arm'] != 'flat_full_history' or job['local_prompt_tokens'] <= 1048576: return None
    matches = [r for r in rows(directory/'openrouter-api-records.jsonl')
               if r.get('event')=='error' and r.get('record_id')==getattr(exc,'record_id',None)]
    if len(matches)!=1: return None
    payload = matches[0].get('response') or matches[0].get('error_response') or matches[0].get('raw_response')
    api_codes=[]
    if isinstance(payload,dict):
        api_errors=[payload.get('error')]+[c.get('error') for c in payload.get('choices',[]) if isinstance(c,dict)]
        api_codes=[str(e.get('code')) for e in api_errors if isinstance(e,dict)]
    if (getattr(exc,'status_code',None)!=400 and getattr(exc,'upstream_code',None)!=400
            and '400' not in api_codes): return None
    message = json.dumps(payload, ensure_ascii=False).lower()
    if re.search(r'(maximum context|context length|input token|too many tokens|token count)', message) and re.search(r'(exceed|maximum|long|limit|too many)', message):
        return {'native_record_id':matches[0]['record_id'], 'provider_error':payload}
    return None

def live():
    verify()
    assert not RUNTIME.exists(), 'No automatic restart or overwrite'
    RUNTIME.mkdir()
    from runtime_adapter import SerialGate, append_jsonl, write_json, _visible_text
    from openrouter_inband_errors import install_inband_error_handling
    from timeout_retries import install_retry_policy
    install_inband_error_handling(); model_class=install_retry_policy(RUNTIME)
    gate = SerialGate(RUNTIME/'request-gate.json')
    started=now(); cost=0.0; unknown_charge_reserve=0.0; completed=0
    reserved_error_ids=set()
    jobs=read(HERE/'schedule.json')['jobs']
    def check():
        if (RUNTIME/'STOP').exists(): raise RuntimeError('Global STOP')
    try:
        for job in jobs:
            check(); prompt=(HERE/job['prompt_path']).read_text()
            assert digest(prompt)==job['prompt_sha256']
            assert len(prompt.encode())<16_000_000
            attempt_reserve=1.1*(job['local_prompt_tokens']*4.5e-6+8192*27e-6)
            if cost+unknown_charge_reserve+3*attempt_reserve>40:
                raise RuntimeError('Prespecified conservative budget gate')
            directory=RUNTIME/job['job_id']; directory.mkdir()
            model=model_class('gemini-2.5-pro',timeout_seconds=300,
                              records_path=directory/'openrouter-api-records.jsonl')
            write_json(RUNTIME/'state.json', {'status':'running','pid':os.getpid(),'started_at':started,
                       'heartbeat':now(),'completed':completed,'planned':len(jobs),'current_job':job,
                       'observed_cost_usd':cost,'unknown_charge_reserve_usd':unknown_charge_reserve})
            result=None
            for output_budget in (4096,8192):
                if cost+unknown_charge_reserve+3*attempt_reserve>40:
                    raise RuntimeError('Prespecified conservative budget gate before output recovery')
                config={**CONFIG,'max_output_tokens':output_budget}
                with gate.request(check):
                    start=time.monotonic()
                    append_jsonl(directory/'events.jsonl', {'event':'request','timestamp':now(),**job,
                                                           'generation_config':config})
                    try:
                        response=model.generate_content(prompt,generation_config=config,safety_settings={})
                    except BaseException as exc:
                        overflow=is_context_rejection(exc,directory,job)
                        if overflow:
                            result={**job,'status':'context_rejected','semantic_evaluable':False,
                                    'timestamp':now(),'elapsed_seconds':time.monotonic()-start,**overflow}
                            append_jsonl(directory/'events.jsonl',result)
                            # A failed retry chain does not execute the wrapper's
                            # success pacing hold. Pace from this final outcome.
                            deadline=time.monotonic()+5
                            while time.monotonic()<deadline:
                                check(); time.sleep(min(.25,max(0,deadline-time.monotonic())))
                        else:
                            write_json(RUNTIME/'STOP', {'timestamp':now(),'job':job,'error_type':type(exc).__name__,
                                                       'status_code':getattr(exc,'status_code',None)})
                            raise
                    else:
                        normalized=response.to_dict(); native=normalized['_openrouter']['response']
                        assert native['model']=='google/gemini-2.5-pro'
                        usage=native.get('usage') or {}; value=usage.get('cost')
                        if not isinstance(value,(int,float)): raise RuntimeError('Missing provider charge')
                        cost+=value
                        visible=_visible_text(normalized)
                        finishes=[c['finish_reason'] for c in native['choices']]
                        result={**job,'status':'complete' if finishes==['stop'] and visible else 'incomplete',
                                'semantic_evaluable':finishes==['stop'] and bool(visible),'answer':visible,
                                'timestamp':now(),'elapsed_seconds':time.monotonic()-start,
                                'native_record_id':normalized['_openrouter']['archive_record_id'],
                                'provider':native.get('provider'),'model':native['model'],'usage':usage,
                                'finish_reasons':finishes,'generation_config':config}
                        append_jsonl(directory/'events.jsonl',result)
                        if result['status']=='incomplete' and not (finishes==['length'] and output_budget==4096):
                            raise RuntimeError('Incomplete generation; stop without outcome-driven retry')
                    # Account conservatively for any timeout that might have incurred a charge.
                    failed=[r for r in rows(directory/'openrouter-api-records.jsonl') if r.get('event')=='error']
                    for failed_attempt in failed:
                        record_id=failed_attempt['record_id']
                        if record_id not in reserved_error_ids:
                            if failed_attempt.get('http_status') not in (400,429):
                                unknown_charge_reserve+=attempt_reserve
                            reserved_error_ids.add(record_id)
                if result['status'] in ('complete','context_rejected'): break
            put(directory/'answer.json',result); append_jsonl(RUNTIME/'answers.jsonl',result)
            completed+=1
            print(json.dumps({'completed':completed,'planned':len(jobs),'status':result['status'],
                              'patient':job['patient_id'],'arm':job['arm'],'length':job['target_tokens'],
                              'cost_usd':round(cost,6)}),flush=True)
        verify()
        write_json(RUNTIME/'state.json', {'status':'completed','started_at':started,'completed_at':now(),
                   'completed':completed,'planned':len(jobs),'observed_cost_usd':cost,
                   'unknown_charge_reserve_usd':unknown_charge_reserve,'original_files_unchanged':True})
    except BaseException as exc:
        write_json(RUNTIME/'STOP', {'timestamp':now(),'error_type':type(exc).__name__})
        write_json(RUNTIME/'state.json', {'status':'stopped','started_at':started,'stopped_at':now(),
                   'completed':completed,'planned':len(jobs),'observed_cost_usd':cost,
                   'error_type':type(exc).__name__,'reason':str(exc)})
        raise

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command',choices=['prepare','retrieve','freeze','verify','live'])
    command=parser.parse_args().command
    if command=='verify': print(json.dumps({'verified':verify()['planned_calls']}))
    else: globals()[command]()
