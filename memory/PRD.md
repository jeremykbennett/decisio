# Decisio — Campaign Decision Management System (PRD)

## Problem / Goal
Role-based tool to manage clients, run **global** marketing campaigns, and record each
client's Opt-in/Opt-out decision per campaign, with a full audit trail.

## Tech Stack
React (CRA/craco) + FastAPI + MongoDB. JWT Bearer auth (passlib bcrypt). Frontend derives
the backend base URL from `window.location.origin` (immune to `.env` reverts).

## Roles
- **Superuser / Administrator** — full control: create/edit/delete clients & campaigns,
  assign managers, set any client's election, manage settings & users (superuser).
- **Client Manager** (`client_manager`) — assigned to clients (client.client_managers).
  Default view = assigned clients with My/All toggle. Sets Opt-in/Opt-out on assigned
  clients' detail pages; read-only on non-assigned. No Campaigns nav.
- **Campaign Manager** (`marketer`) — assigned to campaigns (campaign.marketing_contacts).
  Sees only Campaigns (My/All toggle); view-only everywhere; lands on /campaigns.

## Core Model (current)
- **Campaigns are global** (no owning client). Fields: name, election dates, channel,
  products, Campaign Managers (marketing_contacts), article url.
- **Elections**: one decision per client × campaign — `not_elected` (default) | `opt_in` |
  `opt_out`, stored in `elections` collection; every change audit-logged on the client.
- Client detail shows an Opt-in/Opt-out list across all campaigns; campaign detail shows a
  read-only client-uptake summary.

## Implemented (history)
- Sept 2026: Imported repo, fixed env/setup, seeded users.
- Design refresh (login, dashboard, layout, settings, client/campaign pages) — Decisio brand.
- Dashboard link → placeholder home; Clients screen at /clients.
- Permanent login fix (origin-based backend URL).
- Bulk User Invites (superuser) with temp passwords.
- Force Password Reset on first login for invited users.
- **Global Campaigns + per-client Opt-in/Opt-out + role remap** (this iteration) — verified
  16/16 backend + full frontend E2E.

## Key Endpoints
- Campaigns: `POST/GET/PUT/DELETE /api/campaigns` (`scope=mine|all`), `GET /api/campaigns/:id/uptake`
- Elections: `GET /api/clients/:id/elections`, `PUT /api/clients/:id/campaigns/:campaignId/election`
- Clients: `GET /api/clients` (`scope`), `GET /api/clients/:id/activity`
- Auth: login, me, change-password; Users: bulk-invite, CRUD (superuser)

## Test Accounts
super@test.com/newpass123 · admin@test.com/admin123 · manager@test.com/manager123 ·
marketer@test.com/marketer123

## Backlog / Next
- P1: Reporting/rollup dashboard of election decisions across campaigns.
- P2: Split server.py into routers; a11y on 3-way election control; election index.
- P2: Real dashboard analytics; dark mode; resend invite.

## Update (June 2026)
- Renamed the client management page and left-nav item to "Client Manager".
- Removed the "Status" and "Account Type" columns from the Client Manager table (getStatusColor helper dropped).

## Update (June 2026) — layout standardization
- Campaign Manager page now mirrors Client Manager structure: two stat cards (grid-cols-2 gap-4 max-w-xl), search bar in same position/width, identical table padding & typography.
- Primary action "New Campaign" moved into the Layout page header (matches "Add Client"); header title renamed "Campaign Management" -> "Campaign Manager".
- New backend endpoint GET /api/campaigns/election-summary (per-campaign opt_in/opt_out/pending + global totals), declared before /campaigns/{id}.
- Clicking a campaign row selects it and recalculates the opt-in/opt-out stat cards; "Show all campaigns" clears selection.
