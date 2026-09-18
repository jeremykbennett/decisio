# Decisio — Global Campaigns + per‑client Opt‑in/Opt‑out, with role behavior

## Core model change
- **Campaigns are global.** A campaign no longer belongs to one client — every campaign
  automatically applies to **all** clients.
- Campaign creation captures only campaign details (name, election dates, channel,
  products, assigned Campaign Managers, article link). **No client is selected**, and the
  old "add a campaign under a specific client" flow is removed. Campaigns are created/managed
  from the Campaigns section (Administrators/Superusers).
- The only per‑client data for a campaign is that client's **Opt‑in / Opt‑out** decision.

## The Opt‑in/Opt‑out election (per client, per campaign)
- For every client × campaign pair there is one client‑level decision:
  **Not elected** (default), **Opt‑in**, or **Opt‑out**.
- Existing campaigns become global; their old single‑client link is ignored and every client
  starts at **Not elected**.
- Every change is recorded in the activity/audit history (who set which client's decision on
  which campaign).

## Role mapping
- **Client Manager** (`client_manager`) — assigned to **clients**.
- **Campaign Manager** (the app's `marketer` role) — assigned to **campaigns**.
- **Administrator / Superuser** — full control.

## Client Manager
- Assigned to clients via the client's existing "client managers" list.
- **Default view = assigned clients**, with a **My clients / All clients** toggle (all
  clients viewable; read‑only when not assigned).
- On an **assigned** client's detail page: a list of **all campaigns**, each with an
  **Opt‑in / Opt‑out** control for that client — this is where they set the decision. For
  clients they aren't assigned to, the same list is **read‑only**.
- No other edit powers (cannot create/edit/delete clients or campaigns, or change other
  fields).
- Works from the **Clients** section; does not create or edit campaigns. *(Assumption: no
  separate Campaigns nav for this role.)*

## Campaign Manager (Marketer)
- Assigned to campaigns via the campaign's existing "marketing contacts" list.
- **Default view = assigned campaigns**, with a toggle to **view all campaigns**.
- **View‑only everywhere** — cannot create/edit/delete anything and cannot set elections.
- **Sees only the Campaigns section**; the Clients section and the Dashboard placeholder are
  hidden, and they land on Campaigns after login.
- On a campaign they can see a **read‑only summary** of client uptake (how many clients are
  Opted‑in / Opted‑out / Not elected). *(Assumption — include this summary.)*

## Administrator / Superuser
- Create, edit, delete campaigns (now global) and clients.
- Assign Client Managers to clients and Campaign Managers to campaigns via the existing
  forms ("client managers" / "marketing contacts" — labels may be clarified in the UI).
- Can set any client's Opt‑in/Opt‑out on any campaign.

## What visibly changes in the UI
- **Campaign create/edit**: client picker removed; campaign fields only.
- **Client detail**: the old "campaigns belonging to this client" section becomes an
  "Opt‑in/Opt‑out per campaign" list spanning all campaigns.
- **Campaign detail**: gains a read‑only client‑uptake summary; no single owning client.
- **Navigation/landing**: Campaign Managers see only Campaigns; Client Managers default to
  their assigned clients; both lists get a My/All toggle.

## Decisions to confirm or challenge
1. **Client Manager campaigns access**: they set elections only from the client detail page,
   with no separate Campaigns section (assumed). Confirm, or also give them a read‑only
   Campaigns list.
2. **Campaign detail uptake summary** for Campaign Managers/Admins (assumed included).
3. **Hiding the Dashboard placeholder** for Campaign Managers (assumed hidden; they land on
   Campaigns).
4. **Label clarification** of assignment fields to "Client Managers" / "Campaign Managers"
   on the forms (assumed yes; underlying roles not renamed).

## Out of scope
- Reporting/rollup dashboards of election decisions (possible later enhancement).
- Renaming the underlying role keys.
- Changes to Administrator/Superuser scope beyond the above.
