"""Tests for GET /api/clients/election-summary and Clients page requirements."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')

CREDS = {
    "superuser": ("super@test.com", "newpass123"),
    "admin": ("admin@test.com", "admin123"),
    "client_manager": ("manager@test.com", "manager123"),
    "marketer": ("marketer@test.com", "marketer123"),
}


def _login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"login failed {email}: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def tokens():
    return {k: _login(*v) for k, v in CREDS.items()}


def _hdr(t):
    return {"Authorization": f"Bearer {t}"}


class TestElectionSummary:
    def test_admin_returns_shape(self, tokens):
        r = requests.get(f"{BASE_URL}/api/clients/election-summary", headers=_hdr(tokens["admin"]))
        assert r.status_code == 200
        data = r.json()
        assert "total_campaigns" in data and "summaries" in data
        assert isinstance(data["total_campaigns"], int)
        assert isinstance(data["summaries"], dict)

    def test_superuser_ok(self, tokens):
        r = requests.get(f"{BASE_URL}/api/clients/election-summary", headers=_hdr(tokens["superuser"]))
        assert r.status_code == 200

    def test_client_manager_ok(self, tokens):
        r = requests.get(f"{BASE_URL}/api/clients/election-summary", headers=_hdr(tokens["client_manager"]))
        assert r.status_code == 200

    def test_marketer_forbidden(self, tokens):
        r = requests.get(f"{BASE_URL}/api/clients/election-summary", headers=_hdr(tokens["marketer"]))
        assert r.status_code == 403

    def test_no_auth(self):
        r = requests.get(f"{BASE_URL}/api/clients/election-summary")
        assert r.status_code in (401, 403)

    def test_route_order_not_shadowed_by_client_id(self, tokens):
        # If /clients/{id} came before, GET /clients/election-summary would 404
        r = requests.get(f"{BASE_URL}/api/clients/election-summary", headers=_hdr(tokens["admin"]))
        assert r.status_code == 200, "election-summary route seems shadowed by /clients/{client_id}"

    def test_counts_match_seed(self, tokens):
        # Seed: Global Winter Push -> Meridian opt_in, Surest opt_out
        clients_r = requests.get(f"{BASE_URL}/api/clients", headers=_hdr(tokens["admin"]), params={"scope": "all"})
        assert clients_r.status_code == 200
        clients = clients_r.json()
        by_name = {c["client_name"]: c["id"] for c in clients}
        assert "Meridian Benefits" in by_name and "Surest Insurance Group" in by_name

        summ = requests.get(f"{BASE_URL}/api/clients/election-summary", headers=_hdr(tokens["admin"])).json()
        total = summ["total_campaigns"]
        s = summ["summaries"]

        meridian = s.get(by_name["Meridian Benefits"], {})
        surest = s.get(by_name["Surest Insurance Group"], {})

        # Meridian has at least 1 opt_in (from Global Winter Push)
        assert meridian.get("opt_in", 0) >= 1
        # Surest has at least 1 opt_out
        assert surest.get("opt_out", 0) >= 1

        # pending = total - opt_in - opt_out (clamped)
        for cid, entry in s.items():
            expected = max(total - entry["opt_in"] - entry["opt_out"], 0)
            assert entry["pending"] == expected, f"pending mismatch for {cid}"


class TestElectionUpdateReflectsInSummary:
    def test_set_election_updates_counts(self, tokens):
        # Find UHC client (assumed 0 in / 0 out per E1 context)
        clients = requests.get(f"{BASE_URL}/api/clients", headers=_hdr(tokens["admin"]), params={"scope": "all"}).json()
        campaigns = requests.get(f"{BASE_URL}/api/campaigns", headers=_hdr(tokens["admin"]), params={"scope": "all"}).json()
        target_client = next((c for c in clients if "UHC" in c["client_name"] or "United" in c["client_name"]), clients[-1])
        target_campaign = campaigns[0]

        # Snapshot
        before = requests.get(f"{BASE_URL}/api/clients/election-summary", headers=_hdr(tokens["admin"])).json()
        b = before["summaries"].get(target_client["id"], {"opt_in": 0, "opt_out": 0, "pending": before["total_campaigns"]})

        # Read current decision so we can restore later
        elections = requests.get(f"{BASE_URL}/api/clients/{target_client['id']}/elections", headers=_hdr(tokens["admin"])).json()
        current = next((e for e in elections["elections"] if e["campaign_id"] == target_campaign["id"]), None)
        original_decision = current["decision"] if current else "not_elected"

        try:
            # Set to opt_in
            r = requests.put(
                f"{BASE_URL}/api/clients/{target_client['id']}/campaigns/{target_campaign['id']}/election",
                headers=_hdr(tokens["admin"]),
                json={"decision": "opt_in"},
            )
            assert r.status_code == 200

            after = requests.get(f"{BASE_URL}/api/clients/election-summary", headers=_hdr(tokens["admin"])).json()
            a = after["summaries"].get(target_client["id"])
            assert a is not None
            # Difference depends on original decision; verify accounting invariant
            assert a["opt_in"] + a["opt_out"] + a["pending"] == after["total_campaigns"]
            if original_decision != "opt_in":
                assert a["opt_in"] == b.get("opt_in", 0) + 1
        finally:
            # Restore
            requests.put(
                f"{BASE_URL}/api/clients/{target_client['id']}/campaigns/{target_campaign['id']}/election",
                headers=_hdr(tokens["admin"]),
                json={"decision": original_decision},
            )
