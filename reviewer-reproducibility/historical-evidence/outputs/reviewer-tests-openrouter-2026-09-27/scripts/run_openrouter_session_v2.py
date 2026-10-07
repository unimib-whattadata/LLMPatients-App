"""Fresh-process session entry point for the declared service-error extension."""
import sys
from openrouter_error_runtime import dispatch


if __name__ == "__main__":
    raise SystemExit(dispatch("run_openrouter_session.py", sys.argv[1:]))
