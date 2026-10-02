"""Bootstrap the unchanged longitudinal session runner with audited pacing."""
import json
from pathlib import Path
import runpy
import sys

OUT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(OUT / "longitudinal-source"))
from agent.core.llm_provider_vertex import VertexLLMRunner
from campaign_rate_limit import CampaignCapacityPause, install_rate_limit_overlay


def main():
    install_rate_limit_overlay(VertexLLMRunner, OUT)
    script = Path(__file__).with_name("run_longitudinal_session.py")
    sys.argv[0] = str(script)
    try:
        runpy.run_path(str(script), run_name="__main__")
    except CampaignCapacityPause as exc:
        print("CAMPAIGN_CAPACITY_PAUSE", json.dumps({"reason": exc.reason,
              "retry_after_seconds": exc.retry_after_seconds}), flush=True)
        return 75
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
