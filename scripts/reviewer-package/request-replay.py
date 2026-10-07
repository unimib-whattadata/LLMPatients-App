#!/usr/bin/env python3
"""Explicitly replay ONE retained OpenRouter request; new output, no auto retry."""
import argparse
import gzip
import hashlib
import json
import os
import ssl
import urllib.error
import urllib.request
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--request', required=True, type=Path)
    parser.add_argument('--key-file', type=Path)
    parser.add_argument('--ca-file', type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    if args.output.exists() or args.output.is_symlink():
        raise SystemExit('Choose a new output file; archived/new responses are never overwritten')
    raw = args.request.read_bytes()
    if args.request.suffix == '.gz':
        raw = gzip.decompress(raw)
    payload = json.loads(raw)
    if not isinstance(payload, dict) or not isinstance(payload.get('messages'), list) or not payload.get('model'):
        raise SystemExit('Expected a retained JSON chat-completions request body')
    if any(name.lower() in {'authorization', 'api_key', 'apikey', 'headers'} for name in payload):
        raise SystemExit('Credential fields are not accepted in a scientific request body')
    key = args.key_file.read_text().strip() if args.key_file else os.environ.get('OPENROUTER_API_KEY', '').strip()
    if not key:
        raise SystemExit('Set OPENROUTER_API_KEY or provide --key-file')
    result = {'request_sha256': hashlib.sha256(raw).hexdigest(), 'requested_model': payload['model'],
              'scope': 'New stochastic provider response to one preserved exact request; does not replace original evidence.'}
    request = urllib.request.Request('https://openrouter.ai/api/v1/chat/completions', data=raw,
                                     headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
    context = ssl.create_default_context(cafile=str(args.ca_file) if args.ca_file else None)
    try:
        with urllib.request.urlopen(request, timeout=300, context=context) as response:
            native = json.load(response)
            choices = native.get('choices') if isinstance(native, dict) else None
            choice = choices[0] if isinstance(choices, list) and len(choices) == 1 and isinstance(choices[0], dict) else {}
            message = choice.get('message')
            content = message.get('content') if isinstance(message, dict) else None
            valid = (isinstance(native, dict) and not native.get('error') and not choice.get('error')
                     and isinstance(content, str) and bool(content.strip())
                     and choice.get('finish_reason') == 'stop' and native.get('model') == payload['model'])
            result.update(http_status=response.status, status='RETURNED' if valid else 'UNEXPECTED_RESPONSE', response=native)
    except urllib.error.HTTPError as error:
        result.update(http_status=error.code, status='PROVIDER_ERROR')
        try:
            result['response'] = json.loads(error.read())
        except ValueError:
            result['response'] = {'error': 'Provider rejected request; non-JSON content withheld'}
    except urllib.error.URLError as error:
        result.update(status='TRANSPORT_ERROR', error_type=type(error.reason).__name__)
    except (TimeoutError, ssl.SSLError) as error:
        result.update(status='TRANSPORT_ERROR', error_type=type(error).__name__)
    except (ValueError, TypeError, AttributeError):
        result.update(status='UNEXPECTED_RESPONSE', error_type='invalid_response_payload')
    encoded = json.dumps(result, indent=2).replace(key, '[REDACTED]') + '\n'
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('x') as output:
        output.write(encoded)
    print(json.dumps({'status': result['status'], 'output': str(args.output)}, indent=2))
    raise SystemExit(0 if result['status'] == 'RETURNED' else 1)


if __name__ == '__main__':
    main()
