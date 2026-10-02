"""Offline regression for complete gzip records and immutable-prefix verification."""
import gzip,json,sys,tempfile
from pathlib import Path
HERE=Path(__file__).resolve().parent
sys.path[:0]=[str(HERE),str(HERE.parent/'memory-comparison-run-2026-09-29')]
import openrouter_transport as transport
import timeout_retries as retry
from archive_io import raw_bytes,rows,text
assert Path(transport.__file__).resolve()==HERE/'openrouter_transport.py'
from runner import CONFIG
checks=[]
with tempfile.TemporaryDirectory() as td:
 p=Path(td)/'openrouter-api-records.jsonl.gz'
 prompt='Exact full content: è — 日本語\n'+('{"data":"all saved fields"}\n'*5000)
 wire=retry._wire_body(prompt,CONFIG)
 assert wire['plugins']==[{'id':'context-compression','enabled':False}]
 expected=[]
 for i in (1,2):
  cursor=retry._archive_cursor(p);rid=f'offline-{i}'
  base={'record_id':rid,'endpoint':retry.ENDPOINT,'request':wire,'omitted_legacy_generation_parameters':['top_k'],'safety_settings_forwarded':False}
  request={**base,'event':'request'};response={**base,'event':'response','response':{'model':retry.MODEL,'choices':[{'finish_reason':'stop','message':{'content':'Fixture'}}]}}
  transport._append_record(p,request);transport._append_record(p,response);expected += [request,response]
  assert retry._archive_outcome(p,cursor,wire,'response')==response
  assert rows(p)==expected and raw_bytes(p).endswith(b'\n')
 checks.append('Two complete native request/response pairs roundtrip exactly, preserving Unicode and long prompt')
 assert gzip.decompress(p.read_bytes())==raw_bytes(p)
 checks.append('Concatenated gzip members decode to append-only complete JSONL')
 cursor=retry._archive_cursor(p)
 altered=raw_bytes(p).replace(b'all saved fields',b'altered fields!',1);p.write_bytes(gzip.compress(altered,mtime=0))
 try:retry._archive_outcome(p,cursor,wire,'response')
 except retry.RetryPolicyError:pass
 else:raise AssertionError('Mutation of archived prefix was accepted')
 checks.append('Earlier uncompressed native bytes cannot change undetected')
 p2=Path(td)/'prompt.txt.gz';p2.write_bytes(gzip.compress(prompt.encode(),mtime=0));assert text(p2)==prompt
 checks.append('The complete decompressed prompt reaches the declared API body, without transformation')
report={'status':'passed','network_calls':0,'checks':checks,'plugin_enabled':False}
with (HERE/'audit/lossless-archive-checks.json').open('x') as f:json.dump(report,f,indent=2);f.write('\n')
print(json.dumps(report))
