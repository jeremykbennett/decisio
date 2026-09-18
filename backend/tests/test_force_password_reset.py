"""Backend tests for Force Password Reset (bulk-invited users)."""
import os
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to frontend/.env if not exported in test env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass

SUPER = {"email": "super@test.com", "password": "newpass123"}
ADMIN = {"email": "admin@test.com", "password": "admin123"}
MARKETER = {"email": "marketer@test.com", "password": "marketer123"}


def _login(creds):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def super_token():
    return _login(SUPER)["access_token"]


@pytest.fixture(scope="module")
def invited_user(super_token):
    """Bulk-invite a fresh user and return {email, temp_password, id}."""
    email = f"test_fpr_{uuid.uuid4().hex[:8]}@example.com"
    payload = {"emails": [email], "role": "marketer"}
    r = requests.post(
        f"{BASE_URL}/api/users/bulk-invite",
        json=payload,
        headers=_auth_headers(super_token),
        timeout=30,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    results = data.get("results") or []
    invited = [r for r in results if r.get("status") == "invited"]
    assert len(invited) == 1, f"expected 1 invited, got {data}"
    user = invited[0]
    assert user.get("temp_password"), "temp_password missing in response"

    # Fetch id via list users
    lr = requests.get(f"{BASE_URL}/api/users", headers=_auth_headers(super_token), timeout=30)
    assert lr.status_code == 200
    user_id = next((u["id"] for u in lr.json() if u["email"] == email), None)
    assert user_id, "invited user not found in list"

    ctx = {"email": email, "temp_password": user["temp_password"], "id": user_id}
    yield ctx

    # cleanup
    requests.delete(
        f"{BASE_URL}/api/users/{user_id}",
        headers=_auth_headers(super_token),
        timeout=30,
    )


# ---------- Login response includes must_change_password ----------
def test_invited_login_returns_must_change_true(invited_user):
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": invited_user["email"], "password": invited_user["temp_password"]},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["must_change_password"] is True
    invited_user["token"] = data["access_token"]


def test_me_returns_must_change_true(invited_user):
    r = requests.get(
        f"{BASE_URL}/api/auth/me",
        headers=_auth_headers(invited_user["token"]),
        timeout=30,
    )
    assert r.status_code == 200
    assert r.json()["must_change_password"] is True


# ---------- change-password validation ----------
def test_change_password_requires_auth():
    r = requests.post(
        f"{BASE_URL}/api/auth/change-password",
        json={"current_password": "x", "new_password": "yyyyyyyy"},
        timeout=30,
    )
    assert r.status_code in (401, 403)


def test_change_password_wrong_current(invited_user):
    r = requests.post(
        f"{BASE_URL}/api/auth/change-password",
        headers=_auth_headers(invited_user["token"]),
        json={"current_password": "WRONG_CURRENT", "new_password": "newvalidpass1"},
        timeout=30,
    )
    assert r.status_code == 400
    assert "current password" in r.json()["detail"].lower()


def test_change_password_too_short(invited_user):
    r = requests.post(
        f"{BASE_URL}/api/auth/change-password",
        headers=_auth_headers(invited_user["token"]),
        json={"current_password": invited_user["temp_password"], "new_password": "short1"},
        timeout=30,
    )
    assert r.status_code == 400
    assert "8 characters" in r.json()["detail"]


def test_change_password_same_as_current(invited_user):
    r = requests.post(
        f"{BASE_URL}/api/auth/change-password",
        headers=_auth_headers(invited_user["token"]),
        json={
            "current_password": invited_user["temp_password"],
            "new_password": invited_user["temp_password"],
        },
        timeout=30,
    )
    assert r.status_code == 400
    assert "different" in r.json()["detail"].lower()


# ---------- successful change + subsequent behavior ----------
def test_change_password_success_and_flag_cleared(invited_user):
    new_pw = "NewSecurePass!23"
    r = requests.post(
        f"{BASE_URL}/api/auth/change-password",
        headers=_auth_headers(invited_user["token"]),
        json={"current_password": invited_user["temp_password"], "new_password": new_pw},
        timeout=30,
    )
    assert r.status_code == 200, r.text

    # /me should now show flag cleared
    me = requests.get(
        f"{BASE_URL}/api/auth/me",
        headers=_auth_headers(invited_user["token"]),
        timeout=30,
    )
    assert me.status_code == 200
    assert me.json()["must_change_password"] is False

    invited_user["new_password"] = new_pw


def test_old_temp_password_rejected(invited_user):
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": invited_user["email"], "password": invited_user["temp_password"]},
        timeout=30,
    )
    assert r.status_code == 401


def test_new_password_login_not_gated(invited_user):
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": invited_user["email"], "password": invited_user["new_password"]},
        timeout=30,
    )
    assert r.status_code == 200
    assert r.json()["user"]["must_change_password"] is False


# ---------- seed users are not gated ----------
@pytest.mark.parametrize("creds", [SUPER, ADMIN, MARKETER])
def test_seed_users_not_gated(creds):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, r.text
    assert r.json()["user"]["must_change_password"] is False
