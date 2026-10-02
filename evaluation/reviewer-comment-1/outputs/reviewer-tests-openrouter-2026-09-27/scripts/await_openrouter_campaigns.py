"""Wait for the existing campaigns, then run strict analyses without model calls.

This observer does not restart inference or change campaign inputs. A stopped or
incomplete campaign requires manual diagnosis. Its report still needs review.
"""
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import subprocess
import time

OUT = Path(__file__).resolve().parents[1]
PYTHON = Path("/Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3")
PACKAGES = "/Users/marco/Sites/LLMPatients-Agent/.venv/lib/python3.12/site-packages"
STATE_PATH = OUT / "completion-observer.json"


def now():
    return datetime.now(timezone.utc).isoformat()


def save(state):
    state["updated_at"] = now()
    temporary = STATE_PATH.with_suffix(".tmp")
    temporary.write_text(json.dumps(state, indent=2) + "\n")
    temporary.replace(STATE_PATH)


def process_alive(pid, expected_script):
    result = subprocess.run(
        ["ps", "-p", str(pid), "-o", "command="], capture_output=True, text=True
    )
    return result.returncode == 0 and expected_script in result.stdout


def analyze(name, state):
    env = os.environ.copy()
    env["PYTHONPATH"] = PACKAGES
    command = [str(PYTHON), str(OUT / "scripts" / name)]
    log = OUT / "analysis" / f"{Path(name).stem}-strict.log"
    started = now()
    with log.open("w") as handle:
        result = subprocess.run(command, env=env, stdout=handle, stderr=subprocess.STDOUT)
    evidence = {"command": command, "started_at": started, "finished_at": now(),
                "exit_code": result.returncode, "log": str(log.relative_to(OUT))}
    state["commands"].append(evidence)
    save(state)
    if result.returncode:
        raise RuntimeError(f"{name} failed; inspect {log}")


def main():
    state = {"status": "waiting", "pid": os.getpid(), "started_at": now(),
             "commands": [], "campaigns": {}, "report_review_required": True}
    done = set()
    campaigns = {
        "phq": ("phq-campaign-status.json", "complete_phq9_openrouter.py", "analyze_phq9.py"),
        "longitudinal": ("longitudinal/status.json", "run_longitudinal_openrouter.py", "analyze_longitudinal.py"),
    }
    save(state)
    try:
        while len(done) < len(campaigns):
            for key, (status_file, runner, analyzer) in campaigns.items():
                if key in done:
                    continue
                campaign = json.loads((OUT / status_file).read_text())
                alive = process_alive(campaign["pid"], runner)
                state["campaigns"][key] = {"status": campaign["status"],
                                            "pid": campaign["pid"], "process_alive": alive,
                                            "checked_at": now()}
                save(state)
                if campaign["status"] == "completed":
                    state["status"] = f"analyzing_{key}"
                    save(state)
                    analyze(analyzer, state)
                    done.add(key)
                    print(f"{now()} {key}: strict analysis passed", flush=True)
                elif campaign["status"] != "running" or not alive:
                    raise RuntimeError(f"{key}: campaign is {campaign['status']}, process_alive={alive}")
            if len(done) < len(campaigns):
                state["status"] = "waiting"
                save(state)
                time.sleep(30)
        state["status"] = "generating_report"
        save(state)
        analyze("build_final_report.py", state)
        state["status"] = "report_ready_for_review"
        state["finished_at"] = now()
        save(state)
        print(f"{now()} Both strict analyses passed; REPORT.md awaits review", flush=True)
    except Exception as exc:
        state.update(status="needs_attention", error=str(exc), stopped_at=now())
        save(state)
        raise


if __name__ == "__main__":
    main()
