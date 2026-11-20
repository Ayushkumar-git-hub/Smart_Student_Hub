import tempfile
import unittest
from pathlib import Path
from run import (
    create_account,
    init_db,
    make_invite,
    read_user_workspace,
    read_workspace,
    valid_packet,
    write_user_workspace,
    write_workspace,
)


class WorkspaceTests(unittest.TestCase):
    def test_existing_workspace_moves_to_first_admin(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "test.sqlite3"
            init_db(path)
            state = {"profile": {"name": "Existing"}, "items": [], "goals": [], "notices": [], "dismissed": {}}
            write_workspace(path, 0, state)
            self.assertIsNone(create_account(path, "member", "member-password-123"))
            admin = create_account(path, "admin", "a-secure-password", is_admin=True)
            self.assertEqual(read_user_workspace(path, admin), {"revision": 1, "state": state})
            public = create_account(path, "newstudent", "new-student-password")
            self.assertEqual(read_user_workspace(path, public), {"revision": 0, "state": None})

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

    def test_invites_create_separate_workspaces_and_are_single_use(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "test.sqlite3"
            init_db(path)
            admin = create_account(path, "Admin", "a-secure-password", is_admin=True)
            self.assertIsNotNone(admin)
            self.assertIsNone(create_account(path, "second-admin", "another-secure-password", is_admin=True))
            self.assertIsNotNone(create_account(path, "OpenSignup", "open-signup-password"))
            self.assertIsNone(create_account(path, "opensignup", "another-password"))

            invite = make_invite(path, admin)
            student = create_account(path, "StudentOne", "student-password-123", invite=invite)
            self.assertIsNotNone(student)
            self.assertIsNone(create_account(path, "StudentTwo", "student-password-456", invite=invite))

            first = {"profile": {"name": "First"}, "items": [], "goals": [], "notices": [], "dismissed": {}}
            second = {"profile": {"name": "Second"}, "items": [], "goals": [], "notices": [], "dismissed": {}}
            self.assertEqual(read_user_workspace(path, student), {"revision": 0, "state": None})
            self.assertEqual(write_user_workspace(path, admin, 0, first), 1)
            self.assertEqual(write_user_workspace(path, student, 0, second), 1)
            self.assertEqual(read_user_workspace(path, admin)["state"], first)
            self.assertEqual(read_user_workspace(path, student)["state"], second)
            self.assertIsNone(write_user_workspace(path, student, 0, first))


if __name__ == "__main__":
    unittest.main()
