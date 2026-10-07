"""Resume only the six recall questions, reusing saved successful memory work.

The original live outputs and their validated derivatives remain read-only.
Completed answers are checkpointed, including incorrect answers. Provider
availability failures end this invocation without a retry.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time

from live_memory_smoke import HERE, ROOT, PROBES, setup


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, data):
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2, default=str) + '\n')
    temporary.replace(path)


def source_hashes():
    names = ['agent/core/factual_memory.py', 'agent/core/langgraph_builder.py',
             'agent/core/prompt_builder.py', 'agent/core/memory_store.py',
             'agent/core/llm_provider_vertex.py', 'agent/core/vertex_rate_limit.py']
    return {name: digest(ROOT / name) for name in names}


def prepare(output):
    original = HERE / 'live-v3'
    validated = HERE / 'saved-extractions-validation'
    validation = json.loads((validated / 'validation.json').read_text())
    if validation['implementation_sha256'] != digest(ROOT / 'agent/core/factual_memory.py'):
        raise RuntimeError('Validated memory does not match the runtime source')
    source_file = original / 'memory/memory-test__synthetic-memory-smoke.jsonl'
    validated_file = validated / 'memory/memory-test__synthetic-memory-smoke.jsonl'
    old = [json.loads(line) for line in source_file.read_text().splitlines()]
    records = [json.loads(line) for line in validated_file.read_text().splitlines()]
    old_turns = {r['id']: r for r in old if r['type'] == 'conversation_turn'}
    turns = [r for r in records if r['type'] == 'conversation_turn']
    assert len(turns) == len(old_turns) == 6
    for turn in turns:
        for key in ('patient_id', 'therapist_id', 'session_id', 'turn_index',
                    'session_order', 'therapist_text', 'patient_text', 'usable'):
            assert turn[key] == old_turns[turn['id']][key], key
    narratives = [r for r in old if r['type'] in {'session_reflection', 'long_term_summary'}]
    assert len(narratives) == 4
    output.mkdir(parents=True, exist_ok=False)
    (output / 'memory').mkdir()
    memory = output / 'memory' / source_file.name
    memory.write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in records + narratives))
    manifest = dict(
        created_at=datetime.now(timezone.utc).isoformat(), mode='resume final recall questions only',
        model='google/gemini-2.5-pro', provider='OpenRouter', temperature_response=0.7,
        top_p=0.95, provider_seed=None, max_tokens_initial=4096, max_tokens_recovery=8192,
        thinking_budget_response=None, minimum_interval_seconds=5, no_provider_retry=True,
        fixture_source=str(original / 'manifest.json'), probes=PROBES,
        memory_preparation='Validated saved factual records plus unchanged saved narrative artifacts; no new extraction or dialogue generation',
        source_sha256=source_hashes(), memory_sha256=digest(memory),
        input_sha256={str(p): digest(p) for p in (source_file, validated_file, validated / 'validation.json')},
        harness_sha256=digest(Path(__file__)), shared_harness_sha256=digest(HERE / 'live_memory_smoke.py'),
        transport_sha256=digest(HERE / 'scripts/openrouter_transport.py'),
    )
    write(output / 'manifest.json', manifest)
    for name in manifest['source_sha256']:
        target = output / 'source' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / name, target)


def worker(output):
    manifest = json.loads((output / 'manifest.json').read_text())
    if source_hashes() != manifest['source_sha256']:
        raise RuntimeError('Runtime changed since preparation; use a separate run')
    from agent.core.factual_memory import render_evidence
    builder, runner, profile = setup(output)
    results_path = output / 'probe.json'
    results = json.loads(results_path.read_text())['results'] if results_path.exists() else []
    expected_order = [p[0] for p in PROBES]
    assert [r['label'] for r in results] == expected_order[:len(results)]
    for label, question, expected in PROBES[len(results):]:
        state = builder.State(patient_id='synthetic-memory-smoke', therapist_id='memory-test',
                              session_id='probe', patient_profile=profile, user_input=question,
                              intent_topic={'top': 'unknown', 'sub': 'unknown'})
        state.summary = builder.load_long_term_summary(state.patient_id, state.therapist_id)
        state.session_reflection = builder.load_latest_session_reflection(state.patient_id, state.therapist_id)
        for key, value in builder.hydrate_long_term_context(state).items():
            setattr(state, key, value)
        prompt = builder.build_prompt(state)['prompt']
        evidence = render_evidence(state.evidence_context)
        write(output / ('pending-' + label + '.json'), dict(label=label, query=question,
              prompt=prompt, evidence=evidence, pid=__import__('os').getpid()))
        print(json.dumps({'event': 'probe_start', 'label': label, 'completed': len(results)}), flush=True)
        response = runner.generate(prompt)
        match = all(value.casefold() in response.casefold() for value in expected)
        if label == 'attendance':
            match = any(term in response.casefold() for term in ['unconfirmed', "haven't agreed", 'not agreed', "haven’t agreed", "haven't committed", 'not committed'])
        results.append(dict(label=label, query=question, expected_values=expected,
                            correct=match, response=response, prompt=prompt, evidence=evidence))
        write(results_path, dict(phase='probe', status='running', results=results))
        print(json.dumps({'event': 'probe_complete', 'label': label, 'correct': match}), flush=True)
    assert source_hashes() == manifest['source_sha256']
    assert digest(next((output / 'memory').glob('*.jsonl'))) == manifest['memory_sha256']
    write(results_path, dict(phase='probe', status='complete', passed=sum(r['correct'] for r in results),
                             total=len(results), results=results))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--worker', action='store_true')
    args = parser.parse_args()
    if args.worker:
        try:
            worker(args.output)
        except Exception as exc:
            write(args.output / 'failure.json', dict(status='stopped', error_type=type(exc).__name__, error=str(exc),
                  timestamp=datetime.now(timezone.utc).isoformat()))
            raise
        return
    if not (args.output / 'manifest.json').exists():
        prepare(args.output)
    started = time.monotonic()
    write(args.output / 'status.json', dict(status='running', started_at=datetime.now(timezone.utc).isoformat()))
    try:
        result = subprocess.run([sys.executable, str(Path(__file__)), '--worker', '--output', str(args.output)], timeout=900)
        code = result.returncode
    except subprocess.TimeoutExpired:
        code = 124
    report_path = args.output / 'probe.json'
    report = json.loads(report_path.read_text()) if report_path.exists() else {'results': []}
    status = dict(status='complete' if code == 0 else 'stopped', returncode=code,
                  elapsed_seconds=time.monotonic()-started, completed=len(report['results']), planned=len(PROBES))
    if code == 0:
        status['passed'] = report['passed']
    write(args.output / 'status.json', status)
    print(json.dumps(status), flush=True)
    raise SystemExit(code)


if __name__ == '__main__':
    main()
