"""Bounded real-model memory integration probe, synthetic fixture only.

Each session and the probe run in separate processes. No completed inference is
replayed; any availability error stops the whole controller. This is not the
11-session clinical-profile comparison.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
from unittest.mock import patch

ROOT = Path('/Users/marco/Sites/LLMPatients-Agent')
ARCHIVE = Path('/Users/marco/Sites/LLMPatient---APPLICATION/outputs/reviewer-tests-openrouter-2026-09-27')
HERE = Path(__file__).resolve().parent
sys.path[:0] = [str(ROOT), str(HERE / 'scripts')]

os.environ.update(HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1', PYTHONDONTWRITEBYTECODE='1',
                  LANGCHAIN_TRACING_V2='false', LANGSMITH_TRACING='false')

FIXTURE = {
    'one': [
        ('In our shared materials the practice journal is named "Harbor Atlas". This is a label, not an obligation to keep a journal. How does that sound?', 'The name sounds fine. I have not decided whether to use it.'),
        ('The separate reflection card has the title "Copper Sparrow". It is a different object from the journal.', 'I understand they are two different things.'),
        ('The optional check-in slot in our plan is Wednesday at 14:25. This is a proposal, not an agreement that you will attend.', 'I will think about whether that works for me.'),
    ],
    'two': [
        ('I am renaming the same practice journal. Its title is now "Dawn Register", replacing its earlier title.', 'I understand the journal has been renamed.'),
        ('I am changing the optional check-in slot in the plan to Friday at 09:40. The earlier slot is cancelled. Attendance remains optional and unconfirmed.', 'I understand the time in the plan changed. I have not committed to attending.'),
        ('What has been on your mind about learning these skills?', 'I would like to try at my own pace. I appreciate having room to decide.'),
    ],
}
PROBES = [
    ('current_title', 'What is the current title of the practice journal? Give only its title.', ['Dawn Register']),
    ('original_title', 'What was the original title of the practice journal before it was renamed? Give only its title.', ['Harbor Atlas']),
    ('card', 'What is the title of the separate reflection card? Give only its title.', ['Copper Sparrow']),
    ('slot', 'Which day and exact time are now written in the plan for the optional check-in? Give only the day and time in 24-hour form.', ['Friday', '09:40']),
    ('attendance', 'Have you agreed to attend the optional check-in, or is attendance still unconfirmed?', []),
    ('unknown', 'What color is the cover of the practice journal? If it was never specified, say "not specified".', ['not specified']),
]


def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, default=str) + '\n')


def setup(output):
    from agent.core.llm_provider_vertex import VertexLLMRunner
    from agent.core.vertex_rate_limit import VertexRateLimiter
    from openrouter_transport import OpenRouterModel
    from openrouter_inband_errors import install_inband_error_handling
    install_inband_error_handling()

    class ProbeRunner(VertexLLMRunner):
        def __init__(self):
            self.model_id, self.temperature, self.max_tokens = 'gemini-2.5-pro', 0.7, 4096
            self.model = OpenRouterModel(self.model_id, timeout_seconds=120,
                                         records_path=output / 'api-records.jsonl')
            self.guard = VertexRateLimiter(output / 'rate-control.sqlite3', 'openrouter-gemini-2.5-pro',
                                           interval_seconds=5, cooldown_seconds=20, max_backoff_seconds=60,
                                           failure_threshold=1, circuit_seconds=300, max_wait_seconds=60,
                                           probe_seconds=300)

        def generate(self, prompt, temperature=None, max_tokens=None, *, thinking_budget=None):
            budget = max_tokens or self.max_tokens
            for attempt in range(2):
                generation = self.guard.acquire()
                config = {
                    'temperature': self.temperature if temperature is None else temperature,
                    'max_output_tokens': budget, 'top_p': 0.95,
                    'stop_sequences': ['\nTherapist:', 'Therapist:'],
                }
                if thinking_budget is not None:
                    config['thinking_config'] = {'thinking_budget': thinking_budget}
                response = self.model.generate_content(prompt, generation_config=config)
                self.guard.record_success(generation)
                reasons = self._candidate_finish_reasons(response)
                if 'MAX_TOKENS' in reasons and attempt == 0 and budget < 8192:
                    budget = 8192
                    continue
                if reasons != ['STOP'] or not response.text.strip():
                    raise RuntimeError('Model did not provide a complete STOP response')
                print(json.dumps({'event': 'generation_complete', 'finish': reasons,
                                  'prompt_chars': len(prompt), 'output_chars': len(response.text)}), flush=True)
                return response.text.strip()
            raise RuntimeError('Exhausted output completion budget')

    runner = ProbeRunner()
    with patch('agent.core.llm_runner.create_llm_runner', return_value=runner):
        from agent.core import langgraph_builder as builder
    from agent.core.memory_store import JsonlMemoryStore
    builder.MEMORY_STORE = JsonlMemoryStore(output / 'memory')
    builder.MEMORY_CACHE_LOADED.clear()
    builder.LATEST_SUMMARY_CACHE.clear()
    builder.LATEST_REFLECTION_CACHE.clear()
    builder.logger.setLevel('WARNING')
    from agent.core.patient_profile import PatientProfile
    profile = PatientProfile.from_file(str(ARCHIVE / 'longitudinal-source/data/patients/alex_carter_001.yaml'))
    return builder, runner, profile


def child(phase, output):
    builder, runner, profile = setup(output)
    from agent.core.factual_memory import EvidenceMemory, render_evidence
    if phase in FIXTURE:
        state = builder.State(patient_id='synthetic-memory-smoke', therapist_id='memory-test',
                              session_id=phase, patient_profile=profile)
        for therapist, patient in FIXTURE[phase]:
            state.user_input, state.response = therapist, patient
            builder.update_memory(state)
        result = builder.finalize_session_memory(state.model_dump())
        facts = EvidenceMemory(builder.MEMORY_STORE).current_facts('synthetic-memory-smoke', 'memory-test', include_history=True)
        write(output / (phase + '.json'), dict(phase=phase, pid=os.getpid(), status='complete',
                                              reflection=result['session_reflection'], summary=result['summary'], facts=facts))
        return
    results = []
    for label, question, expected in PROBES:
        state = builder.State(patient_id='synthetic-memory-smoke', therapist_id='memory-test',
                              session_id='probe', patient_profile=profile, user_input=question,
                              intent_topic={'top': 'unknown', 'sub': 'unknown'})
        # Exercise persisted reload, global retrieval and the production prompt.
        state.summary = builder.load_long_term_summary(state.patient_id, state.therapist_id)
        state.session_reflection = builder.load_latest_session_reflection(state.patient_id, state.therapist_id)
        retrieved = builder.hydrate_long_term_context(state)
        for key, value in retrieved.items():
            setattr(state, key, value)
        prompt = builder.build_prompt(state)['prompt']
        response = runner.generate(prompt)
        match = all(value.casefold() in response.casefold() for value in expected)
        if label == 'attendance':
            match = any(term in response.casefold() for term in ['unconfirmed', "haven't agreed", 'not agreed', "haven’t agreed", "haven't committed", 'not committed'])
        results.append(dict(label=label, query=question, expected_values=expected, correct=match,
                            response=response, prompt=prompt, evidence=render_evidence(state.evidence_context)))
        write(output / 'probe.json', dict(phase=phase, pid=os.getpid(), status='running', results=results))
    write(output / 'probe.json', dict(phase=phase, pid=os.getpid(), status='complete',
                                     passed=sum(r['correct'] for r in results), total=len(results), results=results))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--phase', choices=['one', 'two', 'probe'])
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    if args.phase:
        try:
            child(args.phase, args.output)
        except Exception as exc:
            # Exceptions do not include credentials; native records redact them.
            write(args.output / (args.phase + '-failure.json'), dict(phase=args.phase,
                  status='stopped', error_type=type(exc).__name__, error=str(exc)))
            raise
        return
    if (args.output / 'manifest.json').exists():
        parser.error('Use a fresh output directory; completed inference is not replayed')
    files = ['agent/core/factual_memory.py', 'agent/core/langgraph_builder.py', 'agent/core/prompt_builder.py', 'agent/core/memory_store.py', 'agent/core/llm_provider_vertex.py']
    write(args.output / 'manifest.json', dict(model='google/gemini-2.5-pro', provider='OpenRouter',
          temperature_response=0.7, temperature_facts=0.2, provider_seed=None, top_p=0.95,
          max_tokens_initial=4096, max_tokens_recovery=8192, minimum_interval_seconds=5,
          max_tokens_fact_extraction=8192,
          thinking_budget_fact_extraction=1024,
          no_provider_retry=True, fixture=FIXTURE, probes=PROBES,
          harness_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
          transport_sha256=hashlib.sha256((HERE / 'scripts/openrouter_transport.py').read_bytes()).hexdigest(),
          source_sha256={f: hashlib.sha256((ROOT / f).read_bytes()).hexdigest() for f in files}))
    started = time.monotonic()
    for phase in ['one', 'two', 'probe']:
        print('Starting fresh process: ' + phase, flush=True)
        result = subprocess.run([sys.executable, str(Path(__file__)), '--output', str(args.output), '--phase', phase], timeout=900)
        if result.returncode:
            write(args.output / 'status.json', dict(status='stopped', phase=phase, returncode=result.returncode,
                                                   elapsed_seconds=time.monotonic()-started))
            raise SystemExit(result.returncode)
    report = json.loads((args.output / 'probe.json').read_text())
    write(args.output / 'status.json', dict(status='complete', passed=report['passed'], total=report['total'],
                                           elapsed_seconds=time.monotonic()-started))
    print(json.dumps({'status': 'complete', 'passed': report['passed'], 'total': report['total']}), flush=True)


if __name__ == '__main__':
    main()
