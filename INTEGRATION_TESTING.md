# H Factor - Complete Customer Journey Integration Testing Guide

## 🎯 Overview

This guide will help you test the complete customer journey from marketing website to automated account creation.

## ✅ Complete Customer Journey

```
1. Customer visits h-factor.co.uk
   ↓
2. Navigates to pricing calculator
   ↓
3. Enters: Company type, Employees, Entities (if holding), Email
   ↓
4. Clicks "Calculate My Pricing"
   ↓
5. Reviews plan and toggles HR/Payroll options
   ↓
6. Clicks "Start Free Trial"
   ↓
7. Marketing website calls: POST https://api.h-factor.co.uk/api/stripe/create-checkout
   ↓
8. Backend creates Stripe checkout session with metadata
   ↓
9. Customer redirected to Stripe checkout page
   ↓
10. Customer enters payment details and confirms
    ↓
11. Stripe processes payment successfully
    ↓
12. Stripe sends webhook: checkout.session.completed → https://api.h-factor.co.uk/api/stripe/webhook
    ↓
13. Backend webhook handler:
    - Creates user account with temporary password
    - Creates holding company and company profile
    - Links user to company
    - Updates Stripe subscription metadata
    ↓
14. Backend sends welcome email with:
    - Login URL: https://app.h-factor.co.uk
    - Email address
    - Temporary password
    - Instructions to change password on first login
    ↓
15. Customer redirected to: https://h-factor.co.uk/success.html
    ↓
16. Customer receives email (within 30 seconds)
    ↓
17. Customer logs in at https://app.h-factor.co.uk
    ↓
18. ✅ SUCCESS - Zero manual intervention!
```

## 🔧 Prerequisites

### 1. Stripe Configuration

- [ ] 24 Products created in Stripe with correct metadata
- [ ] Webhook endpoint configured: `https://api.h-factor.co.uk/api/stripe/webhook`
- [ ] Webhook events selected:
  - checkout.session.completed
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.payment_succeeded
  - invoice.payment_failed
- [ ] Webhook signing secret copied

### 2. Backend Configuration (Azure)

Environment variables set:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx (or sk_test_xxxxx for testing)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@h-factor.co.uk
SMTP_PASS=<app-password>

# URLs
APP_URL=https://app.h-factor.co.uk
MARKETING_URL=https://h-factor.co.uk

# Database
DB_SERVER=your-server.database.windows.net
DB_NAME=your-database
DB_USER=your-user
DB_PASSWORD=your-password
```

### 3. Marketing Website (Cloudflare Pages)

- [ ] Deployed to https://h-factor.co.uk
- [ ] Environment variable set: `STRIPE_SECRET_KEY` (for stripe-products function)
- [ ] Latest code deployed with email field

## 🧪 Test Scenarios

### Test 1: Single Company Checkout (Success)

**Steps:**
1. Go to https://h-factor.co.uk
2. Navigate to pricing section (#pricing)
3. Fill in calculator:
   - Company Type: Single Company
   - Number of Employees: 25
   - Email: your-test-email@gmail.com
4. Click "Calculate My Pricing"
5. Verify plan appears (should show "Growth Plan" for 25 employees)
6. Toggle to "HR + Payroll" option
7. Click "Start Free Trial"
8. Enter Stripe test card: `4242 4242 4242 4242`
9. Expiry: Any future date (12/34)
10. CVC: Any 3 digits (123)
11. ZIP: Any 5 digits (12345)
12. Click "Subscribe"

**Expected Results:**
- ✅ Redirected to https://h-factor.co.uk/success.html
- ✅ Welcome email received within 30 seconds
- ✅ Email contains temporary password
- ✅ Can log in at https://app.h-factor.co.uk
- ✅ Account shows correct plan and company details

**Debug Checklist if Failed:**
- [ ] Check browser console for API errors
- [ ] Check Stripe Dashboard → Webhooks → Events (should show 200 status)
- [ ] Check Azure App Service logs for webhook processing
- [ ] Check email spam folder
- [ ] Verify backend environment variables are set

### Test 2: Holding Company Checkout (Success)

**Steps:**
1. Go to https://h-factor.co.uk/#pricing
2. Fill in calculator:
   - Company Type: Holding Company
   - Number of Entities: 5
   - Number of Employees: 100
   - Email: another-test-email@gmail.com
3. Click "Calculate My Pricing"
4. Verify plan appears (should show "Regional Plan")
5. Select "HR Only" or "HR + Payroll"
6. Click "Start Free Trial"
7. Enter test card: `4242 4242 4242 4242`
8. Complete checkout

**Expected Results:**
- ✅ 60-day trial (not 14-day)
- ✅ Email received with welcome message
- ✅ Holding company structure created in database
- ✅ Can log in successfully

### Test 3: Payment Declined

**Steps:**
1. Complete calculator with any valid inputs
2. Click "Start Free Trial"
3. Use card: `4000 0000 0000 0002` (decline card)
4. Complete checkout

**Expected Results:**
- ✅ Stripe shows "Your card was declined"
- ✅ Customer can try again with different card
- ✅ No account created
- ✅ No email sent

### Test 4: Cancelled Checkout

**Steps:**
1. Complete calculator
2. Click "Start Free Trial"
3. On Stripe checkout page, click "Back" or close tab
4. Return to h-factor.co.uk

**Expected Results:**
- ✅ Redirected to https://h-factor.co.uk/#pricing
- ✅ Error message appears: "Payment was cancelled..."
- ✅ No account created
- ✅ No email sent

### Test 5: Missing Email Validation

**Steps:**
1. Go to pricing calculator
2. Fill in employees but leave email blank
3. Click "Calculate My Pricing"

**Expected Results:**
- ✅ Alert: "Please enter a valid email address"
- ✅ Email field focused
- ✅ Cannot proceed without email

### Test 6: Invalid Email Format

**Steps:**
1. Fill calculator with email: "notanemail"
2. Click "Calculate My Pricing"

**Expected Results:**
- ✅ Alert: "Please enter a valid email address"
- ✅ Email field focused

## 🔍 Verification Points

### In Stripe Dashboard

1. Go to Customers → Find customer by email
2. Verify:
   - ✅ Customer exists
   - ✅ Subscription is active
   - ✅ Metadata is attached to subscription:
     ```
     planName: "Growth Plan"
     planKey: "growth_combo"
     isHoldingCompany: "false"
     numEmployees: "25"
     numEntities: "1"
     ```

3. Go to Webhooks → Your endpoint → Events
4. Verify:
   - ✅ checkout.session.completed shows 200 status
   - ✅ No failed deliveries (red X marks)

### In Backend Logs (Azure)

1. Go to Azure Portal → App Service → Log stream
2. Look for:
   ```
   🎉 New customer checkout completed: cs_test_xxxxx
   📋 Checkout metadata: { customerEmail: 'test@example.com', ... }
   ✅ New user created: 123
   ✅ Company profile created: 456
   ✅ Subscription metadata updated
   📧 Sending welcome email to: test@example.com
   ✅ Welcome email sent successfully
   ```

### In Database

```sql
-- Check user was created
SELECT * FROM users WHERE email = 'test@example.com';

-- Verify company_profile_id is set
SELECT u.id, u.email, u.company_profile_id, cp.company_name
FROM users u
LEFT JOIN company_profiles cp ON u.company_profile_id = cp.id
WHERE u.email = 'test@example.com';

-- Check subscription details
SELECT * FROM subscriptions WHERE stripe_customer_id = 'cus_xxxxx';
```

### In Email Inbox

Email should contain:
- ✅ Subject: "Welcome to H Factor - Your Account is Ready"
- ✅ Login URL: https://app.h-factor.co.uk
- ✅ Email address: test@example.com
- ✅ Temporary password (12 characters, mixed case, numbers, symbols)
- ✅ Instructions to change password on first login
- ✅ H Factor branding

## 🐛 Troubleshooting

### Issue: API returns 404

**Symptoms:**
- Browser console: "Failed to fetch" or "404 Not Found"
- Alert: "Failed to start checkout: HTTP 404"

**Causes & Solutions:**

1. **Wrong URL in CONFIG.backendUrl**
   ```javascript
   // Check index.html line ~3570
   backendUrl: 'https://api.h-factor.co.uk/api/stripe/create-checkout'
   //                                     ^^^ must have /api/
   ```

2. **Backend not deployed**
   - Check Azure App Service is running
   - Visit https://api.h-factor.co.uk/api/health (should return JSON)

3. **CORS issue**
   - Check browser console for CORS error
   - Verify backend allows h-factor.co.uk origin

### Issue: Webhook fails (400 or 500)

**Symptoms:**
- Stripe Dashboard shows red X on webhook events
- Customer completes checkout but no account created
- No email received

**Causes & Solutions:**

1. **Invalid webhook signature**
   ```bash
   # Check Azure environment variables
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```
   - Must match secret from Stripe Dashboard
   - Restart app service after adding

2. **Webhook handler error**
   - Check Azure logs for stack trace
   - Common issues:
     - Database connection failed
     - SMTP credentials invalid
     - Missing required fields in metadata

3. **Wrong webhook URL**
   - Should be: `https://api.h-factor.co.uk/api/stripe/webhook`
   - NOT: `https://h-factor.co.uk/api/stripe-webhook` (marketing site)

### Issue: No email received

**Symptoms:**
- Webhook succeeds (200 status)
- Account created in database
- But no welcome email in inbox

**Causes & Solutions:**

1. **Check spam folder** - Gmail might filter automated emails

2. **SMTP credentials invalid**
   ```bash
   # Verify in Azure
   SMTP_USER=noreply@h-factor.co.uk
   SMTP_PASS=<correct-app-password>  # Not regular password!
   ```

3. **Email service down**
   - Check Azure logs for "Email sending error"
   - Test SMTP connection separately

4. **Test mode limitation**
   - Stripe test mode doesn't send real emails unless using real addresses
   - Use your real email for testing

### Issue: Account created but wrong data

**Symptoms:**
- User account exists
- But numEmployees, numEntities incorrect or missing

**Causes & Solutions:**

1. **Metadata not passed from marketing website**
   - Check browser console logs:
     ```javascript
     Creating checkout session with: {
       priceId: "price_xxx",
       customerEmail: "test@example.com",
       numEmployees: 25,  // Should be set
       numEntities: 1      // Should be set
     }
     ```

2. **Old cached JavaScript**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Clear browser cache

3. **Backend not reading metadata**
   - Check backend code reads session.metadata correctly
   - Verify values are being logged in Azure

## 📊 Success Metrics

A successful integration should show:

- ✅ **Conversion rate**: 95%+ of checkouts result in account creation
- ✅ **Email delivery**: 100% of successful checkouts receive email within 1 minute
- ✅ **Login success**: 100% of emailed credentials work on first login
- ✅ **Webhook reliability**: 100% of webhook events return 200 status
- ✅ **Data accuracy**: 100% of accounts have correct metadata from calculator

## 🔐 Security Checklist

- [ ] STRIPE_SECRET_KEY is secret key (starts with sk_), not publishable key
- [ ] STRIPE_WEBHOOK_SECRET is configured and correct
- [ ] Webhook signature verification is enabled (don't disable!)
- [ ] Passwords are bcrypt hashed (backend handles this)
- [ ] SMTP credentials use app-specific password, not main password
- [ ] Database connection uses encryption (DB_ENCRYPT=true)
- [ ] Marketing website uses HTTPS only

## 📝 Test Data

Use these for testing:

**Test Cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires auth: `4000 0025 0000 3155`

**Test Emails:**
- Use your real email to receive test welcome emails
- Or use: youremail+test1@gmail.com (Gmail ignores +suffix)

**Test Company Data:**
- Single Company: 1-200 employees
- Holding Company: 2-25 entities, varies employees

## 🎉 Success Indicators

When everything works correctly:

1. **In Browser Console:**
   ```
   Creating checkout session with: {...}
   Checkout session created: { success: true, sessionUrl: "..." }
   ```

2. **In Stripe Dashboard:**
   - Green checkmarks on all webhook events
   - Customer exists with subscription
   - Metadata populated correctly

3. **In Azure Logs:**
   ```
   🎉 New customer checkout completed
   ✅ New user created
   ✅ Welcome email sent successfully
   ```

4. **For Customer:**
   - Redirected to success page
   - Email received within 30 seconds
   - Can log in immediately
   - Sees correct plan in dashboard

## 🆘 Need Help?

If all tests fail:

1. **Check basics first:**
   - Is backend running? (https://api.h-factor.co.uk/api/health)
   - Is webhook configured in Stripe?
   - Are environment variables set in Azure?

2. **Enable detailed logging:**
   - Check browser console (F12)
   - Check Azure App Service logs (real-time)
   - Check Stripe Dashboard webhook events

3. **Test each component separately:**
   - Test API with cURL (see API_TEST_EXAMPLES.md)
   - Test webhook with Stripe CLI
   - Test email service separately

4. **Review documentation:**
   - MARKETING_WEBSITE_INTEGRATION.md
   - STRIPE_WEBHOOK_SETUP.md
   - API_TEST_EXAMPLES.md

5. **Contact support:**
   - Check GitHub issues
   - Review Azure logs for specific errors
   - Contact backend developer with error details

---

## Quick Reference

**Marketing Website:** https://h-factor.co.uk
**Customer Portal:** https://app.h-factor.co.uk
**Backend API:** https://api.h-factor.co.uk
**Health Check:** https://api.h-factor.co.uk/api/health
**Create Checkout:** POST https://api.h-factor.co.uk/api/stripe/create-checkout
**Webhook:** POST https://api.h-factor.co.uk/api/stripe/webhook

**Stripe Dashboard:** https://dashboard.stripe.com
**Azure Portal:** https://portal.azure.com
**Cloudflare Pages:** https://dash.cloudflare.com
