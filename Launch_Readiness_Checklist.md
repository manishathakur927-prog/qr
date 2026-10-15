# Launch Readiness Checklist

## Goal
Move the restaurant QR ordering product from MVP prototype to pilot-ready SaaS for a real restaurant rollout.

## Status
Current state: core guest, kitchen, billing, and owner dashboard flows are implemented. The remaining work is real production readiness and operational hardening.

## Must-have before launch

### 1. Authentication and access control
- [ ] Owner login and staff login flow implemented in web app
- [ ] Session-based auth integrated with Laravel Breeze / Sanctum
- [ ] Restaurant branch ownership checks enforced on all protected screens
- [ ] Role-based access for owner, manager, cashier, kitchen, waiter
- [ ] Secure logout and session expiry handling

### 2. Live operational data
- [ ] Orders loaded from authenticated backend APIs
- [ ] Bills loaded from authenticated backend APIs
- [ ] KDS and billing screens refresh after status changes
- [ ] Dashboard metrics derived from actual database values
- [ ] Error states and empty states handled cleanly

### 3. Payments and settlement
- [ ] Real payment gateway integration selected and configured
- [ ] Cash / UPI / card settlement logic mapped to production flow
- [ ] Refund and partial-payment handling defined
- [ ] Payment log and audit trail implemented
- [ ] Payment reconciliation with bills added

### 4. Security and reliability
- [ ] CSRF protection validated for authenticated routes
- [ ] API rate limiting and abuse protection configured
- [ ] Input validation hardened across all endpoints
- [ ] Data ownership checks covered on every admin action
- [ ] Error monitoring and logging enabled
- [ ] DB backup strategy and restore plan documented

### 5. Deployment and environment setup
- [ ] Production environment variables created
- [ ] Laravel APP_ENV / APP_KEY / DB config validated
- [ ] HTTPS and domain setup confirmed
- [ ] Frontend build pipeline configured for production
- [ ] CI/CD pipeline added with automated tests
- [ ] Staging environment created for UAT

### 6. QA and pilot
- [ ] Guest ordering flow tested end-to-end
- [ ] Table join + bill settlement tested end-to-end
- [ ] Kitchen workflow tested with real data
- [ ] Staff permissions tested by role
- [ ] Load testing for peak dinner usage completed
- [ ] Pilot restaurant checklist signed off

## Phase prioritization

### Phase A: Must finish first
1. real auth and protected staff routes
2. live operational data sync
3. payment gateway integration
4. role permission hardening

### Phase B: Pilot readiness
1. QA and regression suite
2. UAT on staging
3. deployment pipeline
4. pilot restaurant onboarding checklist

### Phase C: Post-pilot growth
1. analytics and reports
2. subscriptions and billing plans
3. mobile app support
4. multi-restaurant admin analytics

## Recommended next milestone
Complete authentication, real API integration, and payment pipeline before launching to a live restaurant pilot.
