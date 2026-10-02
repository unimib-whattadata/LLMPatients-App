"""Offline integration: actual frozen HTTP transport + adapter + new retry policy.

Only the HTTPS connection, credential fixture and wait clock are replaced.
No real request, real key or patient prompt is used.
"""
import json
import os
from pathlib import Path
import socket
import sys
import tempfile
from types import SimpleNamespace
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
ORIGINAL = HERE.parents[1]
sys.path[:0] = [str(ORIGINAL), str(ORIGINAL / 'source')]


def main():
    def deny(*args, **kwargs):
        raise AssertionError('Network is forbidden in the native retry integration test')
    socket.socket.connect = socket.socket.connect_ex = socket.create_connection = deny
    import openrouter_transport as transport
    from openrouter_inband_errors import install_inband_error_handling
    import runtime_adapter
    import timeout_retries
    from prepare_execution import digest
    install_inband_error_handling()
    elapsed = [0.0]
    sent = []
    clock = SimpleNamespace(monotonic=lambda:elapsed[0], sleep=lambda seconds:elapsed.__setitem__(0,elapsed[0]+seconds))

    class Connection:
        def __init__(self,*args,**kwargs):pass
        def request(self,method,path,body,headers):
            assert method == 'POST' and path == '/api/v1/chat/completions'
            sent.append({'request':json.loads(body),'clock':elapsed[0]})
        def getresponse(self):
            first=len(sent)==1
            choice={'index':0,'finish_reason':'error' if first else 'stop',
                'message':{'role':'assistant','content':None if first else 'Offline integration response.'}}
            if first:choice['error']={'code':504,'message':'Upstream idle timeout exceeded','metadata':{'error_type':'timeout'}}
            raw={'id':f'OFFLINE-{len(sent)}','model':'google/gemini-2.5-pro','provider':'Google',
                'choices':[choice],'usage':{'prompt_tokens':10,'completion_tokens':5,'total_tokens':15,'cost':0}}
            return SimpleNamespace(status=200,getheader=lambda name:None,read=lambda:json.dumps(raw).encode())
        def close(self):pass

    with tempfile.TemporaryDirectory(prefix='native-timeout-retry-check-') as temporary:
        runtime=Path(temporary);session=runtime/'OFFLINE/sessions/session_01';session.mkdir(parents=True)
        fixture=runtime/'fake-key.txt';fixture.write_text('offline-fixture-key')
        base_model=transport.OpenRouterModel
        with patch.dict(os.environ,{'OPENROUTER_API_KEY_FILE':str(fixture)}), \
                patch.object(transport.http.client,'HTTPSConnection',Connection), \
                patch.object(timeout_retries,'time',clock):
            try:
                model_class=timeout_retries.install_retry_policy(runtime)
                model=model_class('gemini-2.5-pro',records_path=session/'openrouter-api-records.jsonl')
                gate=runtime_adapter.SerialGate(runtime/'request-gate.json',clock=lambda:1000+elapsed[0],sleep=clock.sleep)
                runner=runtime_adapter.create_runner(model=model,events_path=session/'generation-events.jsonl',
                    gate=gate,context={'arm':'flat_full_history','session_index':1,'turn_id':'s01t01'},stop_path=runtime/'STOP')
                def generate_response():
                    return runner.generate('This is an offline fixture prompt.')
                assert generate_response()=='Offline integration response.'
                assert generate_response()=='Offline integration response.'
            finally:
                transport.OpenRouterModel=base_model
        assert len(sent)==3 and sent[0]['request']==sent[1]['request']==sent[2]['request']
        assert [row['clock'] for row in sent]==[0.0,30.0,35.0]
        assert not (runtime/'STOP').exists() and runner.fatal is None
        gate_state=json.loads((runtime/'request-gate.json').read_text());assert gate_state['in_flight'] is None
        events=[json.loads(s) for s in (session/'generation-events.jsonl').read_text().splitlines()]
        wire=[json.loads(s) for s in (session/'openrouter-api-records.jsonl').read_text().splitlines()]
        assert [r['event'] for r in events]==['request','outcome','request','outcome']
        assert sum(r['event']=='error' for r in wire)==1
        assert sum(r['event']=='response' for r in wire)==2
        output={'status':'passed','live_requests':0,'scenario':'Frozen transport504 then success; next generation starts after minimum spacing',
            'mock_http_requests':3,'recovered_mock_timeouts':1,'logical_generations_completed':2,
            'mock_request_start_seconds':[r['clock'] for r in sent],'stop_absent':True,'gate_cleared':True,
            'source_sha256':{name:digest(HERE/name) for name in ['native_retry_check.py','timeout_retries.py']}}
        (HERE/'native-retry-results.json').write_text(json.dumps(output,indent=2)+'\n')
        print(json.dumps(output,indent=2))


if __name__=='__main__':main()
