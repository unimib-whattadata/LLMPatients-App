# LLMPatients runtime smoke audit — 27 September 2026

This audit exercised the local application, database, and real patient agent. It is an engineering smoke test, not a validation of clinical profile coherence, accuracy of the misstep detector, or continuity across the 11-session pathway.

## Source and environment

- Agent checkout: `/Users/marco/Sites/LLMPatients-Agent`, commit `abb6cfe118b4528a8142eb750db1cf8cb1d5f6cc`.
- Application checkout: `/Users/marco/Sites/LLMPatients-App`, commit `edde4b8ae92638d866662a055de7ca031a8bc3db`.
- Host: macOS 27.0, arm64. Bundled Python 3.12.14 and Node 24.19.0.
- The existing agent virtual environment links its interpreter to `/opt/homebrew/opt/python@3.12/bin/python3.12`, which is unavailable on this host. Its Python packages were read using the bundled Python interpreter and `PYTHONPATH`; the virtual environment was not changed.
- The pinned SciPy 1.15.3 could not load `_spropack.cpython-312-darwin.so`: `section '__DATA/__thread_bss' has a zero-fill section type, but offset field is not zero`. Reinstalling the identical wheel into a temporary overlay reproduced this failure. A temporary SciPy **1.16.3** overlay imported successfully and allowed the real graph, SentenceTransformer `all-MiniLM-L6-v2`, and FastAPI service to start.
- The temporary SciPy version is an explicit environment deviation. These results do not establish that the checked-in requirements start unchanged on this host.
- No source files, permanent configuration, original evaluation results, or original agent memory/logs were changed by this smoke audit. The application test used its own disposable PostgreSQL database and removed it afterward.

## Checks and outcomes

| Check | Observed result |
| --- | --- |
| Existing application container, `GET http://127.0.0.1:8080/` | HTTP 200 |
| Existing PostgreSQL container | Running and healthy on port 5432 |
| Real agent startup with temporary overlay | Uvicorn started, graph compiled, SentenceTransformer loaded, port 8000 |
| Agent `GET /openapi.json` | HTTP 200; `/chat-response`, `/session-end`, `/patient`, `/export-logs` exposed |
| Application-container request to `http://host.docker.internal:8000/openapi.json` | HTTP 200, proving container-to-agent connectivity |
| `POST /patient` for existing `daniel_isherwood_001` | HTTP 200, `PATIENT_EXISTS`; profile was not overwritten |
| `POST /patients` and `POST /initialise-patient` | HTTP 404 for both |
| One real `POST /chat-response` | HTTP 200 in 15.392 seconds, actual Gemini response as Daniel |
| Corresponding `POST /session-end` | HTTP 200, `finalized`, in 11.232 seconds |
| Offline readback of persisted state | One session, one turn, two structured messages, reflection and summary reloaded |
| Application backend scenario with `.env`, `API=local` | Failed: fixed 5-second wait expired while awaiting the misstep evaluation |
| One instrumented replay of the original reflection | HTTP 429; no model response metadata was available |

The real agent request used `therapist_id=audit_runtime_20260927` and `session_id=audit-runtime-20260927`, a synthetic patient profile, and the therapist message `Hi, how are you?`. It returned a nonempty response referring to Daniel's weekend with Erik and concern about the coming week. Logs confirm response generation succeeded on the first attempt; this was not the agent's fallback reply. Agent configuration was Vertex AI `gemini-2.5-pro`, `us-central1`, temperature 0.7, default max output 4096 tokens, top-p 0.95, top-k 40. The smoke process set `VERTEX_MAX_ATTEMPTS=1` to keep quota use bounded. Session reflection and long-term summary calls retain the original code's smaller budgets of 320 and 512 tokens respectively.

## Concrete memory limitation

The persistence mechanism worked, but the contents saved during this actual run were interrupted mid-sentence:

- Reflection (57 characters): `I started by saying the weekend with Erik was good, which`
- Long-term summary (96 characters): `Even though I started the session by saying the weekend with Erik was good, it seems that wasn't`

Both are present in `/tmp/llmpatient-reviewer-audit/runtime/memory/audit_runtime_20260927__daniel_isherwood_001.jsonl`. The session snapshot can restore them together with the one-turn history. This proves storage and readback, but it does not demonstrate useful multi-session continuity.

The relevant code is `agent/core/langgraph_builder.py` (reflection at `_generate_session_reflection`, summary at `_update_long_term_summary_from_reflection`) and `agent/core/llm_provider_vertex.py:265`. The provider returns `response.text` immediately when present; it only inspects finish reasons when text extraction raises an error. Consequently, a nonempty but incomplete response is not rejected by this path.

The original three successful smoke calls did not retain raw API finish reasons. A single follow-up call replayed the exact reflection function and saved history with an observation wrapper, preserving temperature, token budget, prompt, and safety settings. That call received HTTP 429 before a generation response. Therefore **MAX_TOKENS is not established as the cause of the observed truncation**. The confirmed evidence is the truncated stored text and the provider's handling of nonempty text.

A read-only inspection of the first ten completed PHQ `api_records.json` files available during this task found 100 candidates with finish reason `STOP` and zero `MAX_TOKENS`. These were the first two completed runs for each of five patients, not the final full PHQ campaign. For example, one Daniel response had one visible digit and 208 thought tokens. The initial `live_phq9_smoke.json` does not contain finish-reason metadata. This observation must not be generalized to later runs without inspecting their records.

## Configuration differences and application backend failure

The effective running application container was correctly configured with `API=remote`, base URL `http://host.docker.internal:8000`, and paths `/patient`, `/chat-response`, `/session-end`. Its selected model was `gemini-2.5-pro` in `us-central1`.

There are nevertheless conflicting launch settings in the source tree:

- The `docker-compose.yml` default for initialization is `/patients`, which the agent does not expose.
- The host application's `.env` selects `initialise-patient`, which the agent also does not expose.
- The application's source fallback in `src/server/services/patient-response-generator/utils.ts` is `/patient`, which is correct.

Thus the 404 issue depends on which configuration is used; it was **not** present in the already-running container. Requests to both mismatched paths reproduced HTTP 404 without modifying data.

The application backend test was executed once with its `.env` loaded and `API=local`. Patient replies and session finalization were mocked; this is distinct from the separate real agent smoke. The selected evaluator model from that `.env` was `gemini-3.1-pro-preview` in `global`. `GOOGLE_APPLICATION_CREDENTIALS` was not set by the application's `.env`, so that test depended on Google's default credential discovery; no successful evaluator response was observed. The test passed its preceding assertions for authentication/account handling, database behavior, mocked chat, and session completion, then failed at `scripts/backend-scenario.ts:696` because `waitForStepEvaluation` only waits 5000 ms. The error does not by itself identify whether latency, credentials, or the external evaluator prevented completion. No evaluation accuracy claim follows from this failed scenario.

Setting `MISSTEP_ANALYSIS_MODE=heuristic` does not bypass Vertex in the current source. `src/server/services/misstep-evaluator.ts:1376` always calls `judgeWithVertex`. The test was not repeated. Its disposable database was confirmed absent after cleanup.

LangSmith tracing emitted HTTP 403 warnings during the real agent smoke; these did not prevent the patient response, memory finalization, or local persistence. The unrelated `vibevoice-api` container was already repeatedly restarting and was not changed or evaluated. Audio playback was not tested.

## Reproducible commands

The following installs only the temporary compatible SciPy overlay:

```sh
/Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m pip install --no-deps --only-binary=:all: --target /tmp/llmpatient-reviewer-audit/runtime-overlay-scipy116 scipy==1.16.3
```

The launcher `/tmp/llmpatient-reviewer-audit/runtime_server.py` changes the working directory before imports and redirects the process's memory store and run logger to `/tmp/llmpatient-reviewer-audit/runtime`. It uses the original agent code and patient profiles:

```sh
PYTHONPATH=/tmp/llmpatient-reviewer-audit/runtime-overlay-scipy116:/Users/marco/Sites/LLMPatients-Agent:/Users/marco/Sites/LLMPatients-Agent/.venv/lib/python3.12/site-packages /Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 /tmp/llmpatient-reviewer-audit/runtime_server.py
```

Minimal request script (includes one real chat plus session finalization):

```sh
/Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 /tmp/llmpatient-reviewer-audit/runtime_smoke.py
```

Backend scenario, run from the application checkout:

```sh
API=local MISSTEP_ANALYSIS_MODE=heuristic /Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --env-file=.env --import tsx scripts/test-backend.ts
```

The diagnostic replay script is `/tmp/llmpatient-reviewer-audit/runtime_reflection_observed.py`; its one failed API call, exact prompt and generation configuration are preserved in `runtime-reflection-observed.json`. It was not retried.

## Evidence and process cleanup

All evidence below is under `/tmp/llmpatient-reviewer-audit`:

- `runtime-install.log`, `runtime-import.log`: SciPy 1.15.3 reproduction of the loader failure.
- `runtime-install-scipy116.log`, `runtime-import-scipy116.log`: compatible temporary overlay.
- `runtime-server.log`, `agent-openapi.json`, `app-agent-connectivity.json`.
- `runtime_wrong_patient_plural.json`, `runtime_wrong_initialise_patient.json`, `runtime_existing_patient.json`.
- `runtime_chat.json`, `runtime_session_end.json`, `runtime-memory-readback.json`.
- `runtime/runs/audit_runtime_20260927.json` and `runtime/memory/audit_runtime_20260927__daniel_isherwood_001.jsonl`.
- `runtime-reflection-observed.json`, `runtime-reflection-observed.log`.
- `backend-test.log`.

The temporary agent was PID 19293 on port 8000. It is stopped after evidence collection so the ordinary application cannot accidentally keep using audit-only memory. The pre-existing Docker application on port 8080 and PostgreSQL on port 5432 are left running. The overlay contains binaries and need not be included when archiving the audit evidence.
