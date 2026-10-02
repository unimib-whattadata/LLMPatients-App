"""Offline validation of archived, completed extractions against final code.

No network or language-model calls. Reusing the archived extractor text here
tests the validator and versioning only; it is not another live-model result.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path('/Users/marco/Sites/LLMPatients-Agent')
sys.path.insert(0, str(ROOT))
from agent.core.factual_memory import EvidenceMemory
from agent.core.memory_store import JsonlMemoryStore


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Use a fresh output directory')
    args.output.mkdir(parents=True)
    turns = []
    for path in (args.archive / 'memory').glob('*.jsonl'):
        turns.extend(record for line in path.read_text().splitlines()
                     if (record := json.loads(line))['type'] == 'conversation_turn')
    responses = []
    for line in (args.archive / 'api-records.jsonl').read_text().splitlines():
        record = json.loads(line)
        if record['event'] != 'response':
            continue
        if not record['request']['messages'][0]['content'].startswith('Extract explicit facts'):
            continue
        choices = record['response']['choices']
        assert len(choices) == 1 and choices[0]['finish_reason'] == 'stop'
        responses.append(choices[0]['message']['content'])
    sessions = list(dict.fromkeys(turn['session_id'] for turn in turns))
    assert len(responses) == len(sessions) == 2
    memory = EvidenceMemory(JsonlMemoryStore(args.output / 'memory'))
    patient, therapist = turns[0]['patient_id'], turns[0]['therapist_id']
    for session, response in zip(sessions, responses):
        for turn in turns:
            if turn['session_id'] == session:
                memory.record_turn(**{key: turn[key] for key in (
                    'patient_id', 'therapist_id', 'session_id', 'turn_index',
                    'therapist_text', 'patient_text', 'topic', 'usable')})
        memory.consolidate_session(patient_id=patient, therapist_id=therapist,
                                   session_id=session, generate=lambda _: response)
    facts = memory.current_facts(patient, therapist)
    name = [f for f in facts if f['entity'] == 'practice journal' and f['attribute'] == 'name']
    schedule = [f for f in facts if f['entity'] == 'check-in' and f['attribute'] == 'schedule' and f['status'] == 'proposed']
    attendance = {f['value'] for f in facts if f['entity'] == 'check-in' and f['attribute'] == 'attendance' and f['status'] == 'reported'}
    checks = {
        'explicit_rename_reuses_prior_key': len(name) == 1 and name[0]['value'] == 'Dawn Register' and name[0]['previous_value'] == 'Harbor Atlas',
        'schedule_update_preserves_previous_value': len(schedule) == 1 and schedule[0]['value'] == 'Friday at 09:40' and schedule[0]['previous_value'] == 'Wednesday at 14:25',
        'simultaneous_qualifiers_both_current': attendance == {'optional', 'unconfirmed'},
    }
    report = dict(mode='offline validation of saved outputs; no new inference',
                  implementation_sha256=hashlib.sha256((ROOT / 'agent/core/factual_memory.py').read_bytes()).hexdigest(),
                  source=str(args.archive), completed_extractions=len(responses), original_turns=len(turns),
                  checks=checks, current_facts=facts)
    (args.output / 'validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(checks))
    return 0 if all(checks.values()) else 1


if __name__ == '__main__':
    raise SystemExit(main())
