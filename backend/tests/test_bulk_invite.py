"""Backend tests for Bulk User Invites feature and permissions."""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://c3ed9c44-c8d7-4d2c-8dad-f2af3c2143c4.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

SUPER = {"email": "super@test.com", "password": "newpass123"}
ADMIN = {"email": "admin@test.com", "password": "admin123"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, f"Login failed for {creds['email']}: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def super_token():
    return _login(SUPER)


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN)


@pytest.fixture(scope="module")
def created_ids():
    ids = []
    yield ids
    # Cleanup: delete any users we created
    try:
        tok = _login(SUPER)
        headers = {"Authorization": f"Bearer {tok}"}
        for uid in ids:
            requests.delete(f"{API}/users/{uid}", headers=headers, timeout=15)
    except Exception as e:
        print(f"Cleanup error: {e}")


# --- Permissions ---
def test_bulk_invite_forbidden_for_admin(admin_token):
    r = requests.post(
        f"{API}/users/bulk-invite",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"emails": ["test_forbidden@test.com"], "role": "marketer"},
        timeout=20,
    )
    assert r.status_code == 403, f"Expected 403 got {r.status_code}: {r.text}"


def test_bulk_invite_requires_auth():
    r = requests.post(f"{API}/users/bulk-invite", json={"emails": [], "role": "marketer"}, timeout=20)
    assert r.status_code in (401, 403)


# --- Core feature ---
def test_bulk_invite_mixed_input(super_token, created_ids):
    ts = int(time.time())
    new1 = f"test_bi_{ts}_a@test.com"
    new2 = f"test_bi_{ts}_b@test.com"
    payload = {
        "emails": [new1, new2, new1, "admin@test.com", "not-an-email"],
        "role": "client_manager",
    }
    r = requests.post(
        f"{API}/users/bulk-invite",
        headers={"Authorization": f"Bearer {super_token}"},
        json=payload,
        timeout=30,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["role"] == "client_manager"
    # First occurrence of new1 should be invited, second should be duplicate
    new1_entries = [row for row in data["results"] if row["email"] == new1]
    assert len(new1_entries) == 2
    assert new1_entries[0]["status"] == "invited"
    assert new1_entries[0]["temp_password"] and len(new1_entries[0]["temp_password"]) > 6
    assert new1_entries[1]["status"] == "duplicate"
    new2_entries = [row for row in data["results"] if row["email"] == new2]
    assert new2_entries[0]["status"] == "invited"
    admin_entries = [row for row in data["results"] if row["email"] == "admin@test.com"]
    assert admin_entries[0]["status"] == "skipped"
    invalid_entries = [row for row in data["results"] if row["email"] == "not-an-email"]
    assert invalid_entries[0]["status"] == "invalid"

    # Summary counts
    s = data["summary"]
    assert s["invited"] == 2
    assert s["skipped"] == 1
    assert s["invalid"] == 1
    assert s["duplicate"] == 1

    # Persist ids for cleanup + login test
    headers = {"Authorization": f"Bearer {super_token}"}
    users = requests.get(f"{API}/users", headers=headers, timeout=20).json()
    for u in users:
        if u["email"] in (new1, new2):
            created_ids.append(u["id"])
    assert len(created_ids) >= 2

    # Save temp password for login test
    pytest.temp_pass_new1 = new1_entries[0]["temp_password"]
    pytest.temp_email_new1 = new1
    pytest.expected_role = "client_manager"


def test_invited_user_can_login_and_role_applied(super_token):
    email = getattr(pytest, "temp_email_new1", None)
    pw = getattr(pytest, "temp_pass_new1", None)
    assert email and pw, "Prior test did not populate credentials"
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=20)
    assert r.status_code == 200, f"Invited user login failed: {r.status_code} {r.text}"
    body = r.json()
    assert "access_token" in body
    # verify role via /auth/me
    me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"}, timeout=20)
    assert me.status_code == 200
    assert me.json().get("role") == pytest.expected_role
