"""One diagnostic replay of the exact original reflection function and history."""
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

OUT = Path('/tmp/llmpatient-reviewer-audit')
os.environ['VERTEX_MAX_ATTEMPTS'] = '1'
import agent.core.langgraph_builder as builder

records = []
class ObservedModel:
    def __init__(self, inner):
        self.inner = inner
    def generate_content(self, *args, **kwargs):
        started = time.monotonic()
        event = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'model': builder.llm_runner.model_id,
            'prompt': args[0] if args else kwargs.get('contents'),
            'generation_config': kwargs.get('generation_config'),
            'safety_settings': {str(k): str(v) for k, v in kwargs.get('safety_settings', {}).items()}
        }
        try:
            response = self.inner.generate_content(*args, **kwargs)
            event['response'] = response.to_dict()
            return response
        except Exception as exc:
            event['error_type'] = type(exc).__name__
            event['error'] = str(exc)
            raise
        finally:
            event['elapsed_seconds'] = round(time.monotonic() - started, 3)
            records.append(event)

builder.llm_runner.model = ObservedModel(builder.llm_runner.model)
run = json.loads((OUT / 'runtime/runs/audit_runtime_20260927.json').read_text())
history = run['sessions'][0]['final_state']['history']
result = builder._generate_session_reflection([], history)
output = {'task': 'one exact reflection replay', 'visible_text': result, 'api_calls': records}
(OUT / 'runtime-reflection-observed.json').write_text(json.dumps(output, indent=2, default=str))
print(json.dumps({'visible_text': result, 'calls': len(records), 'finish_reasons': [c.get('finish_reason') for r in records for c in r.get('response', {}).get('candidates', [])], 'usage_metadata': [r.get('response', {}).get('usage_metadata') for r in records]}, indent=2))
