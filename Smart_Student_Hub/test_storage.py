import tempfile
import unittest
from pathlib import Path
from run import init_db, read_workspace, write_workspace, valid_packet


class WorkspaceTests(unittest.TestCase):
    def test_reload_and_concurrent_edits(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "test.sqlite3"
            init_db(path)
            self.assertEqual(read_workspace(path), {"revision": 0, "state": None})
            state = {"profile": {"name": "Student"}, "items": [], "goals": [], "notices": [], "dismissed": {}}
            self.assertTrue(valid_packet({"revision": 0, "state": state}))
            self.assertEqual(write_workspace(path, 0, state), 1)
            state["items"].append({"id": "demo", "title": "Lab record"})
            self.assertEqual(write_workspace(path, 1, state), 2)
            self.assertIsNone(write_workspace(path, 1, {}))
            self.assertIsNone(write_workspace(path, 0, {}))
            self.assertEqual(read_workspace(path), {"revision": 2, "state": state})
            state["items"].clear()
            self.assertEqual(write_workspace(path, 2, state), 3)
            self.assertEqual(read_workspace(path)["state"]["items"], [])

    def test_invalid_payloads(self):
        for packet in (None, [], {}, {"revision": -1, "state": {}}, {"revision": True, "state": {"profile": []}}):
            self.assertFalse(valid_packet(packet))


if __name__ == "__main__":
    unittest.main()
