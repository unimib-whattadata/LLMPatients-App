"""Runtime audit launcher. Changes storage paths in this process only."""
import os
from pathlib import Path

AUDIT_DIR = Path("/tmp/llmpatient-reviewer-audit/runtime")
AUDIT_DIR.mkdir(parents=True, exist_ok=True)
os.chdir(AUDIT_DIR)
# Keep this smoke test bounded while the separate PHQ replication runs.
os.environ["VERTEX_MAX_ATTEMPTS"] = "1"

import agent.core.langgraph_builder as builder
import agent.utils.run_logger as run_logger
import agent.api.app as api_module
from agent.core.memory_store import JsonlMemoryStore

builder.MEMORY_DIR = AUDIT_DIR / "memory"
builder.MEMORY_STORE = JsonlMemoryStore(builder.MEMORY_DIR)
run_logger.RUNS_BASE_DIR = AUDIT_DIR / "runs"
api_module.RUNS_DIR = run_logger.RUNS_BASE_DIR
api_module.MEMORY_DIR = builder.MEMORY_DIR

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(api_module.app, host="0.0.0.0", port=8000)
