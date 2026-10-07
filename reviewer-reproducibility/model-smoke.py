#!/usr/bin/env python3
"""One explicit live smoke request with a public synthetic prompt; no study data."""
import argparse
import json
import os
import ssl
import urllib.error
import urllib.request
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--key-file', type=Path, help='Alternatively set OPENROUTER_API_KEY')
    parser.add_argument('--model', default='google/gemini-2.5-pro')
    parser.add_argument('--ca-file', type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    if args.output.exists() or args.output.is_symlink():
        raise SystemExit('Choose a new output file; existing evidence is never overwritten')
    key = args.key_file.read_text().strip() if args.key_file else os.environ.get('OPENROUTER_API_KEY', '').strip()
    if not key:
        raise SystemExit('Provide a credential via environment or local file; values are never logged')
    body = {'model': args.model, 'messages': [{'role': 'user', 'content': 'Reply with the single word READY.'}],
            'temperature': 0, 'top_p': 0.95, 'max_tokens': 2048, 'reasoning': {'max_tokens': 1024},
            'provider': {'require_parameters': True, 'allow_fallbacks': False},
            'plugins': [{'id': 'context-compression', 'enabled': False}]}
    request = urllib.request.Request('https://openrouter.ai/api/v1/chat/completions',
                                     data=json.dumps(body).encode(),
                                     headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
    result = {'date': '2026-10-07', 'requested_model': args.model, 'request': body,
              'scope': 'Single synthetic provider smoke; no clinical/profile/corpus content; no retries.'}
    context = ssl.create_default_context(cafile=str(args.ca_file) if args.ca_file else None)
    try:
        with urllib.request.urlopen(request, timeout=60, context=context) as response:
            payload = json.load(response)
            choices = payload.get('choices')
            choice = choices[0] if isinstance(choices, list) and len(choices) == 1 and isinstance(choices[0], dict) else {}
            message = choice.get('message')
            content = message.get('content') if isinstance(message, dict) else None
            text = content.strip() if isinstance(content, str) else ''
            error = payload.get('error')
            passed = (text == 'READY' and not error and not choice.get('error')
                      and choice.get('finish_reason') == 'stop'
                      and payload.get('model') == args.model)
            result.update(status='PASS' if passed else 'UNEXPECTED_RESPONSE',
                          http_status=response.status, served_model=payload.get('model'),
                          generation_id=payload.get('id'), answer=text, usage=payload.get('usage'),
                          finish_reason=choice.get('finish_reason'),
                          error_code=error.get('code') if isinstance(error, dict) else None)
    except urllib.error.HTTPError as error:
        result.update(status='PROVIDER_ERROR', http_status=error.code)
        try:
            payload = json.loads(error.read()); info = payload.get('error', {})
            result['error_code'] = info.get('code')
            result['error_message'] = str(info.get('message', ''))[:400].replace(key, '[REDACTED]')
        except (ValueError, AttributeError):
            result['error_message'] = 'Provider rejected the request; response not recorded'
    except urllib.error.URLError as error:
        result.update(status='TRANSPORT_ERROR', error_type=type(error.reason).__name__)
    except (ValueError, TypeError, AttributeError):
        result.update(status='UNEXPECTED_RESPONSE', error_type='invalid_response_payload')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    encoded = json.dumps(result, indent=2).replace(key, '[REDACTED]') + '\n'
    with args.output.open('x') as output:
        output.write(encoded)
    safe_result = json.loads(encoded)
    print(json.dumps({k: v for k, v in safe_result.items() if k != 'request'}, indent=2))
    raise SystemExit(0 if result['status'] == 'PASS' else 1)


if __name__ == '__main__':
    main()
