"""Replay the previously truncated memory with frozen code and API metadata."""
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parent
ROOT = Path('/Users/marco/Sites/LLMPatients-Agent')
from dotenv import load_dotenv
load_dotenv(ROOT / 'config/.env')
cred = Path(os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', 'config/vertex-ai-api-key.json'))
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = str(cred if cred.is_absolute() else ROOT / cred)
os.environ['VERTEX_MAX_ATTEMPTS'] = '4'
os.environ['VERTEX_MIN_REQUEST_INTERVAL_SECONDS'] = '3'
os.environ['LANGCHAIN_TRACING_V2'] = 'false'
os.environ['LANGSMITH_TRACING'] = 'false'
sys.path.insert(0, str(OUT / 'source_before'))
from agent.core import langgraph_builder as builder
from agent.core.memory_store import JsonlMemoryStore

builder.MEMORY_STORE = JsonlMemoryStore(OUT / 'diagnostic-original-memory')
records = []
class ObservedModel:
    def __init__(self, inner):
        self.inner = inner
    def generate_content(self, *args, **kwargs):
        start = time.monotonic()
        event = {'timestamp': datetime.now(timezone.utc).isoformat(),
                 'prompt': args[0] if args else kwargs.get('contents'),
                 'generation_config': kwargs.get('generation_config'),
                 'safety_settings': {str(k): str(v) for k, v in kwargs.get('safety_settings', {}).items()}}
        try:
            response = self.inner.generate_content(*args, **kwargs)
            event['response'] = response.to_dict()
            return response
        except Exception as exc:
            event['error_type'] = type(exc).__name__
            event['error'] = str(exc)
            raise
        finally:
            event['elapsed_seconds'] = round(time.monotonic() - start, 3)
            records.append(event)
            (OUT / 'original_memory_api_records.json').write_text(json.dumps(records, indent=2, default=str))

builder.llm_runner.model = ObservedModel(builder.llm_runner.model)
history = json.loads((OUT / 'original_smoke_session.json').read_text())['sessions'][0]['final_state']['history']
reflection = builder._generate_session_reflection([], history)
# The original saved reflection is used if quota prevented this diagnostic call.
source_reflection = reflection or 'I started by saying the weekend with Erik was good, which'
summary = builder._update_long_term_summary_from_reflection('daniel_isherwood_001', 'audit_original', source_reflection)
result = {'model': builder.llm_runner.model_id, 'temperature': builder.llm_runner.temperature,
          'reflection': reflection, 'summary': summary,
          'budgets': {'reflection': builder.SESSION_REFLECTION_MAX_TOKENS, 'summary': builder.LONG_TERM_SUMMARY_MAX_TOKENS},
          'calls': len(records),
          'finish_reasons': [c.get('finish_reason') for r in records for c in r.get('response', {}).get('candidates', [])]}
(OUT / 'original_memory_diagnostic.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2), flush=True)
