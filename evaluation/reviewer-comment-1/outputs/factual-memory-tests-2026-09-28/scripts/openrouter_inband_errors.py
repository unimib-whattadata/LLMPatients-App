"""Operational amendment: reject native choice errors inside HTTP 200 responses.

The frozen transport remains unchanged. Its handler still archives the original
response, assigns the record UUID, exposes Retry-After, and reports the actual
HTTP status. The frozen provider owns all bounded retry decisions.
"""
from functools import wraps

import openrouter_transport as transport


class OpenRouterInBandError(transport.OpenRouterError):
    """An upstream generation error, not a synthetic HTTP gateway failure."""
    def __init__(self, upstream_code=None):
        self.upstream_code = upstream_code
        if upstream_code is None:
            message = "OpenRouter upstream service unavailable: in-band generation error without a numeric code."
        else:
            message = f"OpenRouter upstream error code {upstream_code}: in-band generation failure."
        # Do not confuse an upstream code with the actual HTTP status (200).
        # The original transport's except handler fills that status and UUID.
        super().__init__(message, status_code=None)


def _upstream_code(error):
    code = error.get("code") if isinstance(error, dict) else None
    if isinstance(code, int) and not isinstance(code, bool):
        return code
    if isinstance(code, str) and code.isascii() and code.isdecimal():
        return int(code)
    return None


def install_inband_error_handling():
    """Idempotently wrap only openrouter_transport._normalized_response."""
    original = transport._normalized_response
    if getattr(original, "_openrouter_inband_errors_installed", False) is True:
        return original

    @wraps(original)
    def normalized_response(raw):
        choices = raw.get("choices") if isinstance(raw, dict) else None
        if isinstance(choices, list):
            # Inspect every choice before allowing the original parser to
            # extract any visible or partial text from any candidate.
            for choice in choices:
                if not isinstance(choice, dict):
                    continue
                native_error = choice.get("error")
                if native_error is not None or choice.get("finish_reason") == "error":
                    # Never include native error messages, reasoning or partial
                    # content in the exception or a chained exception.
                    raise OpenRouterInBandError(_upstream_code(native_error)) from None
        return original(raw)

    normalized_response._openrouter_inband_errors_installed = True
    transport._normalized_response = normalized_response
    return normalized_response
