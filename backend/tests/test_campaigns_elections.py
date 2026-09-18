"""
Backend regression tests for the Campaigns/Elections refactor:
- Global campaigns (no client_id)
- Client x Campaign elections (not_elected|opt_in|opt_out)
- Campaign uptake summary
- Role-based scoping: marketer (Campaign Manager) & client_manager
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or \
           "https://choice-maker-43.preview.emergentagent.com"
API = f"{BASE_URL}/api"

CREDS = {
    "super":   ("super@test.com",    "newpass123"),
    "admin":   ("admin@test.com",    "admin123"),
    "manager": ("manager@test.com",  "manager123"),
    "marketer":("marketer@test.com", "marketer123"),
}


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"login {email} failed: {r.status_code} {r.text}"
    body = r.json()
    return body["access_token"], body["user"]


def _hdr(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def tokens():
    out = {}
    for k, (e, p) in CREDS.items():
        tok, user = _login(e, p)
        out[k] = {"token": tok, "user": user}
    return out


@pytest.fixture(scope="module")
def seed_ids(tokens):
    # Fetch existing seed clients & campaigns using super
    t = tokens["super"]["token"]
    clients = requests.get(f"{API}/clients", headers=_hdr(t)).json()
    campaigns = requests.get(f"{API}/campaigns?scope=all", headers=_hdr(t)).json()
    assert len(clients) >= 1
    assert len(campaigns) >= 1
    return {"clients": clients, "campaigns": campaigns}


# ---------- Global Campaigns (no client_id) ----------
class TestGlobalCampaigns:
    def test_admin_creates_global_campaign_no_client_id(self, tokens):
        t = tokens["admin"]["token"]
        payload = {
            "campaign_name": f"TEST_GLOBAL_{uuid.uuid4().hex[:8]}",
            "election_start_date": "2026-01-01",
            "election_end_date": "2026-12-31",
            "channel": "Email",
            "marketing_contacts": [],
            "campaign_products": ["Product A"],
            "article_url": "https://example.com/x"
        }
        r = requests.post(f"{API}/campaigns", json=payload, headers=_hdr(t))
        assert r.status_code == 200, r.text
        c = r.json()
        assert c["campaign_name"] == payload["campaign_name"]
        # client_id should be optional/None
        assert c.get("client_id") in (None, "", "null")
        # cleanup
        requests.delete(f"{API}/campaigns/{c['id']}", headers=_hdr(t))

    def test_marketer_cannot_create_campaign(self, tokens):
        t = tokens["marketer"]["token"]
        payload = {
            "campaign_name": "TEST_should_fail",
            "election_start_date": "2026-01-01",
            "election_end_date": "2026-12-31",
            "channel": "Email",
            "marketing_contacts": [],
            "campaign_products": [],
        }
        r = requests.post(f"{API}/campaigns", json=payload, headers=_hdr(t))
        assert r.status_code == 403

    def test_new_campaign_appears_in_all_clients_elections(self, tokens, seed_ids):
        t = tokens["super"]["token"]
        payload = {
            "campaign_name": f"TEST_AUTO_{uuid.uuid4().hex[:8]}",
            "election_start_date": "2026-01-01",
            "election_end_date": "2026-12-31",
            "channel": "Email",
            "marketing_contacts": [],
            "campaign_products": [],
        }
        cr = requests.post(f"{API}/campaigns", json=payload, headers=_hdr(t))
        assert cr.status_code == 200
        camp = cr.json()
        try:
            for client in seed_ids["clients"]:
                r = requests.get(f"{API}/clients/{client['id']}/elections", headers=_hdr(t))
                assert r.status_code == 200
                data = r.json()
                assert "can_edit" in data and "elections" in data
                camp_ids = [e["campaign_id"] for e in data["elections"]]
                assert camp["id"] in camp_ids
                # default decision must be not_elected
                mine = next(e for e in data["elections"] if e["campaign_id"] == camp["id"])
                assert mine["decision"] == "not_elected"
        finally:
            requests.delete(f"{API}/campaigns/{camp['id']}", headers=_hdr(t))


# ---------- Elections CRUD + Audit ----------
class TestElections:
    def test_admin_sets_and_persists_election(self, tokens, seed_ids):
        t = tokens["admin"]["token"]
        client_id = seed_ids["clients"][0]["id"]
        camp_id = seed_ids["campaigns"][0]["id"]

        for decision in ["opt_in", "opt_out", "not_elected"]:
            r = requests.put(
                f"{API}/clients/{client_id}/campaigns/{camp_id}/election",
                json={"decision": decision}, headers=_hdr(t))
            assert r.status_code == 200, r.text
            assert r.json()["decision"] == decision
            # verify persistence
            g = requests.get(f"{API}/clients/{client_id}/elections", headers=_hdr(t))
            elm = next(e for e in g.json()["elections"] if e["campaign_id"] == camp_id)
            assert elm["decision"] == decision

    def test_invalid_decision_rejected(self, tokens, seed_ids):
        t = tokens["admin"]["token"]
        client_id = seed_ids["clients"][0]["id"]
        camp_id = seed_ids["campaigns"][0]["id"]
        r = requests.put(f"{API}/clients/{client_id}/campaigns/{camp_id}/election",
                         json={"decision": "banana"}, headers=_hdr(t))
        assert r.status_code == 400

    def test_election_change_appears_in_activity_timeline(self, tokens, seed_ids):
        t = tokens["admin"]["token"]
        client_id = seed_ids["clients"][0]["id"]
        camp_id = seed_ids["campaigns"][0]["id"]
        # Change to opt_in
        requests.put(f"{API}/clients/{client_id}/campaigns/{camp_id}/election",
                     json={"decision": "opt_in"}, headers=_hdr(t))
        r = requests.get(f"{API}/clients/{client_id}/activity", headers=_hdr(t))
        assert r.status_code == 200
        acts = r.json()
        election_acts = [a for a in acts if a.get("entity_type") == "election"]
        assert len(election_acts) > 0, "No election activity entries found"

    def test_marketer_cannot_set_election(self, tokens, seed_ids):
        t = tokens["marketer"]["token"]
        client_id = seed_ids["clients"][0]["id"]
        camp_id = seed_ids["campaigns"][0]["id"]
        r = requests.put(f"{API}/clients/{client_id}/campaigns/{camp_id}/election",
                         json={"decision": "opt_in"}, headers=_hdr(t))
        assert r.status_code == 403

    def test_client_manager_not_assigned_cannot_set_election(self, tokens, seed_ids):
        # Ensure manager is not assigned to any of these clients before test
        super_t = tokens["super"]["token"]
        manager_id = tokens["manager"]["user"]["id"]
        # Un-assign manager from all clients for a clean slate
        for c in seed_ids["clients"]:
            cms = [x for x in c.get("client_managers", []) if x != manager_id]
            if cms != c.get("client_managers", []):
                requests.put(f"{API}/clients/{c['id']}",
                             json={"client_managers": cms}, headers=_hdr(super_t))
        # Now try as manager
        mt = tokens["manager"]["token"]
        client_id = seed_ids["clients"][0]["id"]
        camp_id = seed_ids["campaigns"][0]["id"]
        r = requests.put(f"{API}/clients/{client_id}/campaigns/{camp_id}/election",
                         json={"decision": "opt_in"}, headers=_hdr(mt))
        assert r.status_code == 403
        # And GET elections shows can_edit=False
        g = requests.get(f"{API}/clients/{client_id}/elections", headers=_hdr(mt))
        # If manager can view all clients endpoint - fetch may 200 or 403 - both ok
        # But if 200, can_edit must be False
        if g.status_code == 200:
            assert g.json()["can_edit"] is False

    def test_client_manager_assigned_can_set_election(self, tokens, seed_ids):
        super_t = tokens["super"]["token"]
        manager_id = tokens["manager"]["user"]["id"]
        client = seed_ids["clients"][0]
        # Assign manager
        cms = list(set((client.get("client_managers") or []) + [manager_id]))
        r0 = requests.put(f"{API}/clients/{client['id']}",
                          json={"client_managers": cms}, headers=_hdr(super_t))
        assert r0.status_code == 200
        try:
            mt = tokens["manager"]["token"]
            camp_id = seed_ids["campaigns"][0]["id"]
            r = requests.put(f"{API}/clients/{client['id']}/campaigns/{camp_id}/election",
                             json={"decision": "opt_out"}, headers=_hdr(mt))
            assert r.status_code == 200, r.text
            g = requests.get(f"{API}/clients/{client['id']}/elections", headers=_hdr(mt))
            assert g.status_code == 200
            assert g.json()["can_edit"] is True
        finally:
            # Un-assign to leave seed clean
            cms2 = [x for x in cms if x != manager_id]
            requests.put(f"{API}/clients/{client['id']}",
                         json={"client_managers": cms2}, headers=_hdr(super_t))


# ---------- Uptake summary ----------
class TestUptake:
    def test_uptake_counts_reflect_elections(self, tokens, seed_ids):
        t = tokens["admin"]["token"]
        camp_id = seed_ids["campaigns"][0]["id"]
        clients = seed_ids["clients"]
        # Set decisions for each client
        decisions = ["opt_in", "opt_out", "not_elected"]
        applied = {}
        for i, c in enumerate(clients[:3]):
            d = decisions[i % 3]
            applied[c["id"]] = d
            requests.put(f"{API}/clients/{c['id']}/campaigns/{camp_id}/election",
                         json={"decision": d}, headers=_hdr(t))
        r = requests.get(f"{API}/campaigns/{camp_id}/uptake", headers=_hdr(t))
        assert r.status_code == 200, r.text
        data = r.json()
        for key in ["opt_in", "opt_out", "not_elected", "total_clients"]:
            assert key in data, f"missing {key} in {data}"
        expected_in = sum(1 for v in applied.values() if v == "opt_in")
        expected_out = sum(1 for v in applied.values() if v == "opt_out")
        assert data["opt_in"] >= expected_in
        assert data["opt_out"] >= expected_out
        assert data["total_clients"] >= len(clients)


# ---------- Role-based scoping ----------
class TestRoleScoping:
    def test_marketer_cannot_list_clients(self, tokens):
        t = tokens["marketer"]["token"]
        r = requests.get(f"{API}/clients", headers=_hdr(t))
        assert r.status_code == 403

    def test_marketer_cannot_get_client(self, tokens, seed_ids):
        t = tokens["marketer"]["token"]
        r = requests.get(f"{API}/clients/{seed_ids['clients'][0]['id']}", headers=_hdr(t))
        assert r.status_code == 403

    def test_marketer_can_list_campaigns(self, tokens):
        t = tokens["marketer"]["token"]
        r = requests.get(f"{API}/campaigns", headers=_hdr(t))
        assert r.status_code == 200
        # default scope=mine -> only campaigns where marketer is in marketing_contacts
        marketer_id = tokens["marketer"]["user"]["id"]
        for c in r.json():
            assert marketer_id in (c.get("marketing_contacts") or []), \
                f"campaign {c['id']} returned in scope=mine but marketer not in contacts"

    def test_marketer_scope_all_returns_more(self, tokens):
        t = tokens["marketer"]["token"]
        mine = requests.get(f"{API}/campaigns?scope=mine", headers=_hdr(t)).json()
        allc = requests.get(f"{API}/campaigns?scope=all", headers=_hdr(t)).json()
        assert len(allc) >= len(mine)

    def test_marketer_assigned_scope_mine_returns_it(self, tokens, seed_ids):
        super_t = tokens["super"]["token"]
        marketer_id = tokens["marketer"]["user"]["id"]
        camp = seed_ids["campaigns"][0]
        # Assign marketer to campaign
        contacts = list(set((camp.get("marketing_contacts") or []) + [marketer_id]))
        r0 = requests.put(f"{API}/campaigns/{camp['id']}",
                          json={"marketing_contacts": contacts}, headers=_hdr(super_t))
        assert r0.status_code == 200
        try:
            mt = tokens["marketer"]["token"]
            r = requests.get(f"{API}/campaigns?scope=mine", headers=_hdr(mt))
            assert r.status_code == 200
            ids = [c["id"] for c in r.json()]
            assert camp["id"] in ids
        finally:
            contacts2 = [x for x in contacts if x != marketer_id]
            requests.put(f"{API}/campaigns/{camp['id']}",
                         json={"marketing_contacts": contacts2}, headers=_hdr(super_t))

    def test_client_manager_scope_mine_filters(self, tokens, seed_ids):
        super_t = tokens["super"]["token"]
        manager_id = tokens["manager"]["user"]["id"]
        client = seed_ids["clients"][0]
        # Assign
        cms = list(set((client.get("client_managers") or []) + [manager_id]))
        requests.put(f"{API}/clients/{client['id']}",
                     json={"client_managers": cms}, headers=_hdr(super_t))
        try:
            mt = tokens["manager"]["token"]
            mine = requests.get(f"{API}/clients?scope=mine", headers=_hdr(mt))
            assert mine.status_code == 200
            mine_ids = [c["id"] for c in mine.json()]
            assert client["id"] in mine_ids
            allc = requests.get(f"{API}/clients?scope=all", headers=_hdr(mt))
            assert allc.status_code == 200
            assert len(allc.json()) >= len(mine.json())
        finally:
            cms2 = [x for x in cms if x != manager_id]
            requests.put(f"{API}/clients/{client['id']}",
                         json={"client_managers": cms2}, headers=_hdr(super_t))
