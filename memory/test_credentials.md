# Test Credentials - Campaign Decision Tracking Tool

## ✅ WORKING TEST ACCOUNTS

### 1. Superuser (Full System Access)
- **Email:** super@test.com
- **Password:** newpass123
- **Permissions:** Full system access - manage users, clients, campaigns, and all settings
- **Note:** Password was recently reset using the password reset feature

### 2. Administrator (Admin Access)
- **Email:** admin@test.com
- **Password:** admin123
- **Permissions:** Create/edit/delete clients and campaigns, manage settings (cannot manage users)

### 3. Client Manager (Client Focus)
- **Email:** manager@test.com
- **Password:** manager123
- **Permissions:** View and edit assigned clients, view campaigns, limited settings access

### 4. Marketer (Campaign Focus)
- **Email:** marketer@test.com
- **Password:** marketer123
- **Permissions:** View assigned clients and campaigns, create/edit campaigns for assigned clients

---

## Test Application URL

**Live Application:** https://campaign-decisions.preview.emergentagent.com

- Login Page: https://campaign-decisions.preview.emergentagent.com/login
- Dashboard: https://campaign-decisions.preview.emergentagent.com/dashboard

---

## Test Clients Available

### Client 1 - UHC Healthcare Corp
- **ID:** e6c8674f-6fc9-4b8a-92ba-89ddb8125043
- **Policy ID:** POL-12345
- **Plan:** UHC (displays with **BLUE** badge)
- **Status:** Active
- **Platform:** Web Portal
- **Account Type:** Enterprise

### Client 2 - Surest Insurance Group
- **ID:** 30a1459d-8d11-426e-9948-662b969f311d
- **Policy ID:** POL-67890
- **Plan:** Surest (displays with **PURPLE** badge)
- **Status:** Inactive
- **Platform:** Mobile App
- **Account Type:** Standard

---

## Quick Test Guide

1. **Login:** Go to https://campaign-decisions.preview.emergentagent.com/login
2. **Use Superuser account** for full access: super@test.com / super123
3. **View Client Details:** Click on any client to see the redesigned layout with:
   - 4-box first row (Client Info, Account Details, Email Status, Direct Mail)
   - Field names and values on the same line
   - Conditional badge colors (UHC = blue, Surest = purple)
   - Second row with Engagement Solutions and Client Managers
4. **Test RBAC:** Try logging in with different roles to see permission differences
