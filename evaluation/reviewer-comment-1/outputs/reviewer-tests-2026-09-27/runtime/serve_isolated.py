"""Serve the corrected agent with copied profiles and isolated audit memory."""
from runtime_support import configure
import uvicorn

directory, api, builder, run_logger = configure('http-isolated')
uvicorn.run(api.app, host='127.0.0.1', port=18001)
