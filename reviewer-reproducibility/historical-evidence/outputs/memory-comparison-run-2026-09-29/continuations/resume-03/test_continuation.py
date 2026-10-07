"""Offline checks for recovery ownership, STOP resolution and schedule handoff."""
import json
from pathlib import Path
import socket
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

import continue_run as c


class ContinuationTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.original = Path(temporary.name)
        self.here = self.original / 'continuations/resume-03'
        self.runtime = self.original / 'runtime'
        self.here.mkdir(parents=True)
        self.runtime.mkdir()
        for obj, name, value in [(c,'HERE',self.here),(c,'ORIGINAL',self.original),
                (c,'PLIST',self.here/'launchd.plist')]:
            p=patch.object(obj,name,value);p.start();self.addCleanup(p.stop)
        for obj,name in [(socket.socket,'connect'),(socket,'create_connection'),(c.subprocess,'Popen'),(c.subprocess,'run'),(c.os,'killpg')]:
            p=patch.object(obj,name,side_effect=AssertionError('External operation forbidden in offline tests'))
            p.start();self.addCleanup(p.stop)
        self.write(self.runtime/'STOP',{'kind':'provider_error','upstream_code':504,'native_record_id':'OFFLINE_FAILED'})
        self.write(self.runtime/'request-gate.json',{'last_started':123.5,'in_flight':{'gate_request_id':'OFFLINE_GATE'}})
        self.stop=(self.runtime/'STOP').read_bytes()
        self.gate=(self.runtime/'request-gate.json').read_bytes()
        self.audit={'runtime_file_sha256':{name:c.original.digest(self.runtime/name) for name in ('STOP','request-gate.json')},
            'archived_error':{'record_id':'OFFLINE_FAILED','upstream_code':504}}

    def write(self,path,value):
        c.original.write_json(path,value)

    def test_resolution_preserves_original_stop_and_pacing_and_is_exclusive(self):
        c.resolve_known_error(self.audit)
        self.assertFalse((self.runtime/'STOP').exists())
        self.assertEqual(self.stop,(self.here/'resolved-stop.json').read_bytes())
        self.assertEqual({'last_started':123.5,'in_flight':None},c.original.read_json(self.runtime/'request-gate.json'))
        with self.assertRaises((OSError,RuntimeError)):
            c.resolve_known_error(self.audit)

    def test_changed_gate_is_not_cleared(self):
        self.write(self.runtime/'request-gate.json',{'last_started':123.5,'in_flight':{'gate_request_id':'FOREIGN'}})
        changed=(self.runtime/'request-gate.json').read_bytes()
        with self.assertRaises(RuntimeError):c.resolve_known_error(self.audit)
        self.assertEqual(changed,(self.runtime/'request-gate.json').read_bytes())
        self.assertEqual(self.stop,(self.runtime/'STOP').read_bytes())
        self.assertFalse((self.here/'resolved-stop.json').exists())

    def test_archive_failure_does_not_clear_stop_or_gate(self):
        (self.here/'resolved-stop.json').write_text('Existing receipt')
        with self.assertRaises(FileExistsError):c.resolve_known_error(self.audit)
        self.assertEqual(self.stop,(self.runtime/'STOP').read_bytes())
        self.assertEqual(self.gate,(self.runtime/'request-gate.json').read_bytes())

    def test_changed_stop_is_not_cleared(self):
        self.write(self.runtime/'STOP',{'kind':'a_new_failure'})
        with self.assertRaises(RuntimeError):c.resolve_known_error(self.audit)
        self.assertEqual({'kind':'a_new_failure'},c.original.read_json(self.runtime/'STOP'))

    def schedule(self, first_code=0):
        (self.runtime/'STOP').unlink()
        items=[{'execution_order':9,'run_id':c.RUN_ID,'session_index':1,'arm':'structured_common_profile'},
               {'execution_order':10,'run_id':'OFFLINE_flat','session_index':1,'arm':'flat_full_history'}]
        path=self.runtime/c.RUN_ID/'sessions/session_01/session.json'
        self.write(path,{'status':'stopped','turns':[{'saved':i} for i in range(4)]})
        self.commands=[]
        def popen(command,**kwargs):
            item=items[len(self.commands)]
            self.commands.append(command)
            code=first_code if item['execution_order']==9 else 0
            if not code:
                self.write(self.runtime/item['run_id']/'sessions/session_01/session.json',{
                    'status':'completed','inference_mode':'live_openrouter','run_id':item['run_id'],
                    'session_index':1,'arm':item['arm'],'execution_manifest_sha256':'OFFLINE_HASH',
                    'turns':[{'saved':i} for i in range(5)]})
            return SimpleNamespace(pid=12345,returncode=code,poll=lambda:code)
        with patch.object(c,'verify'),patch.object(c,'verify_preserved_prefix'), \
                patch.object(c.original,'worker_environment',return_value={'OFFLINE':'1'}), \
                patch.object(c.original,'summarize',return_value={'status':'offline_fixture'}), \
                patch.object(c.subprocess,'Popen',side_effect=popen):
            return c.run_schedule(items,{'launch_id':'ORIGINAL_ID','execution_manifest_sha256':'OFFLINE_HASH'})

    def test_recovery_worker_then_original_worker_at_order_ten(self):
        self.schedule()
        self.assertEqual(self.commands[0],[str(c.original.BUNDLED_PYTHON),str(self.here/'resume_session.py'),'run'])
        self.assertEqual(self.commands[1],[str(c.original.BUNDLED_PYTHON),str(self.original/'paired_runner.py'),
            '_worker','--execution-order','10','--launch-id','ORIGINAL_ID'])
        self.assertTrue((self.runtime/c.RUN_ID/'sessions/session_01/worker-resume03.log').exists())

    def test_recovery_error_stops_before_any_order_ten_worker(self):
        with self.assertRaises(RuntimeError):self.schedule(first_code=1)
        self.assertEqual(len(self.commands),1)
        self.assertTrue((self.runtime/'STOP').exists())

    def test_failed_launch_attempt_is_never_repeated(self):
        with patch.object(c,'verify'),patch.object(c,'no_other_workers'), \
                patch.object(c.subprocess,'run',return_value=SimpleNamespace(returncode=1,stdout='',stderr='offline')) as call:
            with self.assertRaises(RuntimeError):c.launch()
            with self.assertRaises(RuntimeError):c.launch()
            self.assertEqual(call.call_count,1)

    def test_own_caffeinate_allowed_foreign_recovery_worker_rejected(self):
        own='200 1 /offline/python '+str(self.here/'continue_run.py')+' run\n201 200 /usr/bin/caffeinate -i '+str(self.here/'continue_run.py')+' run'
        with patch.object(c.os,'getpid',return_value=200),patch.object(c.os,'getppid',return_value=1), \
                patch.object(c.subprocess,'run',return_value=SimpleNamespace(stdout=own)) as ps:
            c.no_other_workers()
            ps.return_value.stdout += '\n300 1 /offline/python '+str(self.here/'resume_session.py')+' run'
            with self.assertRaises(RuntimeError):c.no_other_workers()


if __name__=='__main__':unittest.main()
