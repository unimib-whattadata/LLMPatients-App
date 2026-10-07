"""One actual session per process, testing disk restore in a fresh process."""
import asyncio
import json
import os
import sys
from runtime_support import configure

phase = int(sys.argv[1])
directory, api, builder, run_logger = configure('memory-reopen')
therapist = 'audit_memory_reopen_20260927'
patient = 'daniel_isherwood_001'
session = f'audit-memory-session-{phase}'
restored = run_logger.RunLogger(therapist).restore_state(patient)
before = {key: restored.get(key) for key in ('summary', 'session_reflection', 'total_turns', 'history')}
if phase == 2:
    assert before['summary'], 'Session 1 summary was not restored from disk'
    assert before['total_turns'] == 1, 'Session 1 turn was not restored'
message = (
    "Before we finish, let's agree on a ten-minute walk at Cedar Park on Tuesday. How do you feel about trying that?"
    if phase == 1 else
    'Last time we agreed on a small activity. What was it, where, and when?'
)

async def main():
    response = await api.send_message(api.MessageRequest(
        external_patient_id=patient, therapist_id=therapist, session_id=session,
        step_id=phase, user_message=message,
    ))
    assert response.message != "I'm trying to stay with what I'm feeling right now. Could we keep talking about that?", 'Fallback response'
    ended = await api.end_session(api.SessionEndRequest(
        external_patient_id=patient, therapist_id=therapist, session_id=session,
    ))
    assert ended.status == 'finalized'
    after = run_logger.RunLogger(therapist).restore_state(patient)
    record = {'phase': phase, 'pid': os.getpid(), 'restored_before': before,
              'request': message, 'response': response.model_dump(), 'session_end': ended.model_dump(),
              'restored_after': {key: after.get(key) for key in ('summary', 'session_reflection', 'total_turns', 'history')},
              'probe_recall': None if phase == 1 else {
                  'activity': 'walk' in response.message.lower(),
                  'place': 'cedar park' in response.message.lower(),
                  'day': 'tuesday' in response.message.lower(),
              }}
    (directory / f'phase_{phase}.json').write_text(json.dumps(record, indent=2, default=str))
    print(json.dumps(record, indent=2, default=str), flush=True)

asyncio.run(main())
