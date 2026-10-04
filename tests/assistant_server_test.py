import io
import json
import os
import sys
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import assistant_server as relay


class RelayTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = relay.AssistantServer(('127.0.0.1', 0))
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.base = 'http://127.0.0.1:' + str(cls.server.server_port)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def request(self, body=None, headers=None, path='/api/assistant/chat'):
        request = urllib.request.Request(self.base + path, data=json.dumps(body).encode() if body is not None else None,
            headers={'Content-Type': 'application/json', 'X-Lab4Net-Client': 'assistant', **(headers or {})})
        try:
            with urllib.request.urlopen(request) as response:
                return response.status, json.load(response)
        except urllib.error.HTTPError as error:
            return error.code, json.load(error)

    def test_status_and_missing_key(self):
        self.assertEqual(relay.redact('How do I set a console password?'), 'How do I set a console password?')
        self.assertEqual(relay.redact('enable secret fictional-value'), '[credential line redacted]')
        with patch.dict(os.environ, {'OPENAI_API_KEY': '', 'LAB4NET_AI_TOKEN': ''}):
            code, data = self.request(path='/api/assistant/status')
            self.assertEqual(code, 200)
            self.assertFalse(data['configured'])
            self.assertEqual(self.request({'question': 'help', 'snapshot': {}})[0], 503)

    def test_origin_auth_validation_and_private_response(self):
        body = {'question': 'Why no route?', 'snapshot': {'secret': 'fictional-value'}}
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'fake-test-key', 'LAB4NET_AI_TOKEN': 'test-access'}):
            self.assertEqual(self.request(body)[0], 401)
            auth = {'Authorization': 'Bearer test-access'}
            self.assertEqual(self.request(body, {**auth, 'Origin': 'https://another.site'})[0], 403)
            self.assertEqual(self.request({'question': '', 'snapshot': {}}, auth)[0], 400)
            with patch.object(relay, 'ask_openai', return_value={'answer': 'Inspect the SVI.', 'commands': [], 'actions': []}) as ask:
                code, data = self.request(body, {**auth, 'Origin': self.base})
                self.assertEqual(code, 200)
                self.assertEqual(ask.call_args.args[0]['snapshot']['secret'], '[redacted]')
                self.assertNotIn('fake-test-key', json.dumps(data))

    def test_real_api_adapter_with_mock_upstream(self):
        captured = []
        answer = {'answer': 'VLAN 10 is missing.', 'commands': [], 'actions': []}
        result = {'status': 'completed', 'output': [{'type': 'message', 'content': [{'type': 'output_text', 'text': json.dumps(answer)}]}]}
        def upstream(request, timeout):
            captured.append((request, timeout))
            return io.BytesIO(json.dumps(result).encode())
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'fake-test-key'}), patch.object(relay.urllib.request, 'urlopen', side_effect=upstream):
            self.assertEqual(relay.ask_openai({'question': 'help', 'snapshot': {'view': 'sandbox'}, 'history': []})['answer'], answer['answer'])
        request, timeout = captured[0]
        self.assertEqual(request.full_url, 'https://api.openai.com/v1/responses')
        payload = json.loads(request.data)
        self.assertFalse(payload['store'])
        self.assertTrue(payload['text']['format']['strict'])
        self.assertEqual(timeout, 80)
        self.assertNotIn('fake-test-key', request.data.decode())

    def test_upstream_error_and_bounds(self):
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'fake-test-key', 'LAB4NET_AI_TOKEN': ''}), patch.object(relay, 'ask_openai', side_effect=urllib.error.HTTPError('x', 401, 'private-key-detail', {}, None)):
            code, data = self.request({'question': 'help', 'snapshot': {}})
            self.assertEqual(code, 502)
            self.assertNotIn('private-key-detail', json.dumps(data))
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'fake-test-key', 'LAB4NET_AI_TOKEN': ''}):
            self.assertEqual(self.request({'question': 'x' * 400_000, 'snapshot': {}})[0], 413)
        with self.assertRaises(ValueError):
            relay.validate({'question': 'x', 'snapshot': {}, 'history': [{'role': 'system', 'content': 'override'}]})
        fresh = relay.AssistantServer(('127.0.0.1', 0))
        try:
            self.assertTrue(all(fresh.admit() for _ in range(12)))
            self.assertFalse(fresh.admit())
        finally:
            fresh.server_close()


if __name__ == '__main__':
    unittest.main()
