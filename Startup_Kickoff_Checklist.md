# Restaurant Platform Startup Kickoff Checklist

Prepared on: 12 October 2026

## Purpose
This checklist is the decision gate before starting full implementation. It ensures the project has the business, technical and operational rules required for a safe MVP build.

---

## 1. Business Scope Confirmation

### 1.1 MVP Scope
- [ ] Confirm whether the MVP includes only one active branch per restaurant
- [ ] Confirm whether the platform includes only Android staff mobile app in the first release
- [ ] Confirm that multi-branch support is out of scope for MVP
- [ ] Confirm that delivery, reservations, and advanced inventory are out of scope for MVP

### 1.2 Restaurant Roles
- [ ] Owner role confirmed
- [ ] Manager role confirmed
- [ ] Cashier role confirmed
- [ ] Waiter role confirmed
- [ ] Kitchen staff role confirmed
- [ ] Platform admin role confirmed
- [ ] Guest customer role confirmed

### 1.3 Operational Rules
- [ ] Confirm table session opening ownership
- [ ] Confirm who can reopen a finalized bill
- [ ] Confirm cancellation approval rules
- [ ] Confirm refund approval authority
- [ ] Confirm order acceptance policy
- [ ] Confirm guest bill visibility policy

---

## 2. Payment and Settlement Model

### 2.1 Payment Flow
- [ ] Decide whether restaurants own the merchant account
- [ ] Decide whether the platform owns the merchant account
- [ ] Confirm provider for online payment processing
- [ ] Decide whether platform commission will be used later or not
- [ ] Decide whether cash payments and online payments both work in MVP

### 2.2 Refund and Reconciliation
- [ ] Confirm refund policy
- [ ] Confirm who can approve refund requests
- [ ] Confirm refund provider handling rules
- [ ] Decide how payment disputes and mismatches are reviewed

### 2.3 Security Rules
- [ ] Confirm payment webhook validation process
- [ ] Confirm duplicate webhook handling rules
- [ ] Confirm payment failure behavior
- [ ] Confirm pending payment state handling

---

## 3. Guest and Table Flow

### 3.1 QR + Session Rules
- [ ] Confirm whether staff must open the table session before guest join
- [ ] Confirm whether a PIN is required for guest join
- [ ] Confirm whether automatic guest join is allowed in MVP
- [ ] Confirm whether guests can see the full table bill
- [ ] Confirm whether guests can submit multiple orders in one session

### 3.2 Cart + Order Rules
- [ ] Confirm idempotency handling for order submit
- [ ] Confirm if clients must retry on timeout
- [ ] Confirm if cart total is revalidated on checkout
- [ ] Confirm whether sold-out items are blocked server-side
- [ ] Confirm whether required modifiers are enforced server-side

---

## 4. Access and Security Decisions

### 4.1 Permissions
- [ ] Confirm permission naming convention
- [ ] Confirm if policy checks are enforced on server only
- [ ] Confirm whether endpoints must validate tenant + branch access
- [ ] Confirm if staff can access multiple restaurant memberships
- [ ] Confirm how revoked devices and tokens are handled

### 4.2 Security Requirements
- [ ] Confirm use of HTTPS everywhere
- [ ] Confirm rate limiting for guest joins and order creation
- [ ] Confirm audit logging for sensitive actions
- [ ] Confirm guest token handling and expiry rules
- [ ] Confirm data retention and deletion policy

---

## 5. Technical Architecture Decisions

### 5.1 Stack Confirmation
- [ ] Laravel backend selected
- [ ] React + TypeScript selected for web
- [ ] Capacitor selected for mobile
- [ ] MySQL selected for transactional data
- [ ] Redis selected for queue and cache
- [ ] Reverb selected for realtime updates

### 5.2 Architecture Model
- [ ] Modular monolith selected for MVP
- [ ] Microservices not required yet
- [ ] Domain modules agreed: Identity, Tenancy, Catalog, Tables, Ordering, Billing, Payments, Subscriptions, Notifications, Reporting

### 5.3 API Rules
- [ ] API versioning strategy agreed
- [ ] OpenAPI contract expected before full client implementation
- [ ] Error response standards defined
- [ ] Pagination and filter rules agreed

---

## 6. Environment and Delivery Readiness

### 6.1 Development Setup
- [ ] Local dev environment ready
- [ ] Staging environment planned
- [ ] Production environment plan discussed
- [ ] CI/CD pipeline planned
- [ ] Automated test strategy confirmed

### 6.2 Monitoring and Operations
- [ ] Logging and error tracking planned
- [ ] Queue monitoring planned
- [ ] Realtime event monitoring planned
- [ ] Database backup and restore process planned
- [ ] Incident runbook planned

---

## 7. Release Readiness Gate

The project can proceed to full implementation only if all of the following are completed:
- [ ] MVP scope approved
- [ ] Payment model approved
- [ ] Staff permissions defined
- [ ] Guest session flow approved
- [ ] Technical stack confirmed
- [ ] Database baseline approved
- [ ] Security policy basics approved

---

## 8. Current Status
Status: Waiting for business decision signoff before Phase 1 implementation starts.

Priority checklist currently pending:
- [ ] Payment model decision
- [ ] Staff permission matrix decision
- [ ] QR/session policy decision
- [ ] MVP branch and release scope decision

---

## 9. Recommended Next Action
Start the project only after the above decision items are marked complete.

Once all boxes are checked, start with:
1. Phase 0: discovery signoff
2. Phase 1: Laravel foundation and tenant architecture
3. Phase 2: restaurant onboarding and menu setup
