"""Isolated storage and raw generation evidence for real-agent validation."""
import json
import os
import shutil
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path('/Users/marco/Sites/LLMPatients-Agent')
OUT = Path(__file__).resolve().parent

def configure(directory_name):
    directory = OUT / directory_name
    directory.mkdir(parents=True, exist_ok=True)
    os.chdir(directory)
    sys.path.insert(0, str(ROOT))
    os.environ.setdefault('VERTEX_MAX_ATTEMPTS', '8')
    os.environ.setdefault('VERTEX_MIN_REQUEST_INTERVAL_SECONDS', '3')
    os.environ['LANGCHAIN_TRACING_V2'] = 'false'
    os.environ['LANGSMITH_TRACING'] = 'false'
    from agent.core import langgraph_builder as builder
    from agent.api import app as api
    from agent.utils import run_logger
    from agent.core.memory_store import JsonlMemoryStore

    shutil.copytree(ROOT / 'data/patients', directory / 'data/patients', dirs_exist_ok=True)
    builder.ROOT_DIR = directory
    builder.MEMORY_DIR = directory / 'memory'
    builder.MEMORY_STORE = JsonlMemoryStore(builder.MEMORY_DIR)
    api.ROOT_DIR = directory
    api.PATIENTS_DIR = directory / 'data/patients'
    api.MEMORY_DIR = builder.MEMORY_DIR
    run_logger.RUNS_BASE_DIR = directory / 'runs'
    api.RUNS_DIR = run_logger.RUNS_BASE_DIR

    record_lock = threading.Lock()
    class ObservedModel:
        def __init__(self, inner):
            self.inner = inner
        def generate_content(self, *args, **kwargs):
            prompt = args[0] if args else kwargs.get('contents')
            purpose = 'chat_or_classification'
            if prompt.startswith('You are producing a session reflection'):
                purpose = 'session_reflection'
            elif prompt.startswith('You maintain a long-term therapy memory'):
                purpose = 'long_term_summary'
            start = time.monotonic()
            event = {'timestamp': datetime.now(timezone.utc).isoformat(), 'pid': os.getpid(),
                     'purpose': purpose, 'model': builder.llm_runner.model_id,
                     'prompt': prompt, 'generation_config': kwargs.get('generation_config'),
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
                with record_lock:
                    with (directory / 'api_records.jsonl').open('a') as stream:
                        stream.write(json.dumps(event, default=str) + '\n')

    builder.llm_runner.model = ObservedModel(builder.llm_runner.model)
    (directory / 'configuration.json').write_text(json.dumps({
        'model': builder.llm_runner.model_id, 'temperature': builder.llm_runner.temperature,
        'region': os.getenv('GCP_LOCATION', 'us-central1'), 'max_tokens': builder.llm_runner.max_tokens,
        'max_recovery_tokens': builder.llm_runner.max_recovery_tokens,
        'max_attempts': builder.llm_runner.max_attempts,
        'internal_budgets': {name: getattr(builder, name) for name in (
            'JOINT_CLASSIFICATION_MAX_TOKENS', 'EPISODE_SUMMARY_MAX_TOKENS',
            'SESSION_REFLECTION_MAX_TOKENS', 'LONG_TERM_SUMMARY_MAX_TOKENS')},
    }, indent=2))
    return directory, api, builder, run_logger
