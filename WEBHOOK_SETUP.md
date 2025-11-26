# H Factor Stripe Webhook Setup Guide

This guide explains how to configure Stripe webhooks to automatically process new subscriptions and trigger customer onboarding.

## Overview

The webhook system handles:
- ✅ New subscription notifications
- ✅ Subscription status changes (trial ending, cancellation, etc.)
- ✅ Payment events (successful payments, failed payments)
- ✅ Automated team notifications
- ✅ Integration with backend API for automated onboarding

## Architecture

```
Customer Completes Checkout
         ↓
Stripe sends webhook event
         ↓
Cloudflare Function receives & verifies
         ↓
Three parallel actions:
1. Forward to backend API (base44.app) for automated onboarding
2. Send notification email to team
3. Store in KV storage for tracking
```

## Step 1: Configure Stripe Webhook

### 1.1 Create Webhook Endpoint in Stripe

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Enter endpoint URL:
   ```
   https://h-factor.co.uk/api/stripe-webhook
   ```
4. Select events to listen for:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.paid`
   - ✅ `invoice.payment_failed`

5. Click **Add endpoint**

### 1.2 Get Webhook Signing Secret

After creating the endpoint:
1. Click on the webhook endpoint you just created
2. Under **Signing secret**, click **Reveal**
3. Copy the secret (starts with `whsec_`)
4. Save this - you'll need it for environment variables

## Step 2: Configure Environment Variables

Add these variables in **Cloudflare Pages → Settings → Environment variables**:

### Required:
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```
*The signing secret from Step 1.2*

### Optional (for enhanced functionality):

**Backend API Integration:**
```
BACKEND_API_URL=https://h-factor.base44.app
BACKEND_API_KEY=your_backend_api_key
```
*For automated forwarding of subscription data to your backend*

**Email Notifications:**
```
EMAIL_SERVICE_URL=https://api.your-email-service.com/send
EMAIL_API_KEY=your_email_api_key
ADMIN_EMAIL=support@h-factor.co.uk
```
*For sending team notifications about new subscriptions*

**KV Storage (optional):**
```
SUBSCRIPTIONS=your_kv_namespace_id
```
*For storing subscription data for manual processing*

## Step 3: Update Backend API

Your backend at `https://h-factor.base44.app` needs to be updated to include metadata when creating Stripe checkout sessions.

### 3.1 Update createStripeCheckout Function

In your backend's `createStripeCheckout` function, ensure you pass metadata to Stripe:

```javascript
// Example backend code (base44.app/api/functions/createStripeCheckout)
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{
    price: priceId,
    quantity: 1,
  }],
  subscription_data: {
    trial_period_days: trialDays
  },
  success_url: successUrl,
  cancel_url: cancelUrl,

  // IMPORTANT: Add this metadata
  metadata: {
    planName: planName,
    planKey: planKey,
    isHoldingCompany: isHoldingCompany.toString(),
    source: 'website'
  }
});
```

### 3.2 Create Subscription Processing Endpoint (Optional but Recommended)

Create a new endpoint to receive subscription data from the webhook:

```javascript
// base44.app/api/functions/processSubscription
export async function processSubscription(req, res) {
  // Verify API key
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  if (apiKey !== process.env.BACKEND_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const {
    sessionId,
    customerId,
    subscriptionId,
    customerEmail,
    planName,
    planKey,
    isHoldingCompany
  } = req.body;

  // 1. Create user account in your system
  const user = await createUserAccount({
    email: customerEmail,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    plan: planKey
  });

  // 2. Send welcome email with login credentials
  await sendWelcomeEmail({
    to: customerEmail,
    loginUrl: 'https://h-factor.base44.app',
    username: user.username,
    temporaryPassword: user.tempPassword,
    planName: planName,
    trialDays: isHoldingCompany ? 60 : 14
  });

  // 3. Log subscription for reporting
  await logSubscription({
    userId: user.id,
    subscriptionId: subscriptionId,
    plan: planKey,
    startDate: new Date()
  });

  return res.json({ success: true, userId: user.id });
}
```

## Step 4: Test the Webhook

### 4.1 Test in Stripe Dashboard

1. Go to **Stripe Dashboard → Developers → Webhooks**
2. Click on your webhook endpoint
3. Click **Send test webhook**
4. Select `checkout.session.completed`
5. Click **Send test webhook**

### 4.2 Check Webhook Logs

In Cloudflare Pages:
1. Go to **Functions** tab
2. Check **Real-time logs**
3. You should see: `Received Stripe webhook event: checkout.session.completed`

### 4.3 Test with Real Checkout

Use Stripe test cards:
- **Success**: `4242 4242 4242 4242`
- **Failure**: `4000 0000 0000 0002`

Complete a test checkout and verify:
1. Webhook receives the event
2. Notification email is sent (if configured)
3. Backend API is called (if configured)
4. Customer receives welcome email (if backend configured)

## Step 5: Monitor Webhook Events

### In Stripe Dashboard:
- **Webhooks → [Your endpoint] → Events tab**: See all webhook deliveries
- Look for successful deliveries (200 response) or failures

### In Cloudflare:
- **Pages → Functions → Logs**: See real-time webhook processing
- Check for errors or warnings

### In Your Backend:
- Monitor your backend API logs for subscription processing
- Check database for new user accounts created
- Verify welcome emails are being sent

## Webhook Event Handling

### checkout.session.completed
**When**: Customer completes checkout successfully
**Actions**:
1. Extract customer email and subscription details
2. Forward to backend API for account creation
3. Send notification email to team
4. Store in KV storage

### customer.subscription.created
**When**: Subscription is created (usually same time as checkout.session.completed)
**Actions**: Log subscription creation with trial end date

### customer.subscription.updated
**When**: Subscription changes (status, plan, etc.)
**Actions**:
- Check if trial is ending soon (3 days)
- Send reminder emails if needed
- Update backend system

### customer.subscription.deleted
**When**: Customer cancels subscription
**Actions**:
1. Send cancellation notification to team
2. Trigger follow-up workflow
3. Update user account status in backend

### invoice.paid
**When**: Customer pays an invoice (including first payment after trial)
**Actions**: Log successful payment

### invoice.payment_failed
**When**: Payment fails (card declined, expired, etc.)
**Actions**:
1. Send urgent notification to team
2. Trigger dunning workflow
3. Send payment reminder to customer

## Security Best Practices

### 1. Webhook Signature Verification
The webhook function automatically verifies Stripe signatures to ensure requests are genuine. Never disable this check.

### 2. Timestamp Validation
Webhooks older than 5 minutes are rejected to prevent replay attacks.

### 3. HTTPS Only
Webhooks must use HTTPS URLs. Cloudflare Pages provides this automatically.

### 4. Secure Environment Variables
Store all API keys and secrets as Cloudflare environment variables, never in code.

### 5. Backend API Authentication
If forwarding to backend API, use API key authentication to verify requests.

## Troubleshooting

### Webhook showing failures in Stripe Dashboard

**Check 1: Signature Verification**
- Verify `STRIPE_WEBHOOK_SECRET` is set correctly in Cloudflare
- Make sure you're using the correct secret (test mode vs live mode)

**Check 2: Function Deployment**
- Verify webhook function is deployed: `ls functions/api/stripe-webhook.js`
- Check Cloudflare Pages deployment succeeded

**Check 3: Response Status**
- Webhook should return 200 status for success
- Check Cloudflare Functions logs for errors

### Not receiving notification emails

**Check 1: Email Service Configured**
- Verify `EMAIL_SERVICE_URL` and `EMAIL_API_KEY` are set
- Test email service separately

**Check 2: Admin Email Set**
- Verify `ADMIN_EMAIL` is configured

**Check 3: Check Logs**
- Look for email sending errors in Cloudflare logs

### Backend not receiving subscription data

**Check 1: Backend API URL**
- Verify `BACKEND_API_URL` is set correctly
- Test endpoint manually with curl or Postman

**Check 2: API Key Authentication**
- Verify `BACKEND_API_KEY` matches on both sides

**Check 3: Backend Endpoint Exists**
- Create `/api/functions/processSubscription` if it doesn't exist

### Customers not receiving welcome emails

**This requires backend implementation**:
1. Verify backend is receiving webhook data
2. Check backend is creating user accounts
3. Verify backend email service is working
4. Check spam folders

## Testing Checklist

- [ ] Webhook endpoint created in Stripe
- [ ] `STRIPE_WEBHOOK_SECRET` configured in Cloudflare
- [ ] Test webhook sent from Stripe Dashboard (received 200 response)
- [ ] Test checkout completed with test card
- [ ] Webhook event logged in Cloudflare Functions
- [ ] Notification email received (if configured)
- [ ] Backend API received subscription data (if configured)
- [ ] Customer received welcome email (if backend configured)
- [ ] Test subscription cancellation (receives webhook)
- [ ] Test payment failure (receives webhook and notification)

## Next Steps After Setup

1. **Test in Test Mode**: Complete full checkout flow with test cards
2. **Verify Automation**: Check all emails and account creation work
3. **Switch to Live Mode**:
   - Create new webhook endpoint with live mode secret
   - Update `STRIPE_WEBHOOK_SECRET` to live mode secret
   - Update backend to use live Stripe keys
4. **Monitor**: Watch webhook events and logs for first few real customers

## Support

If you encounter issues:
- Check Cloudflare Pages Functions logs
- Check Stripe Dashboard webhook events for delivery status
- Verify all environment variables are set correctly
- Review backend API logs for processing errors
- Check email service logs if emails not sending

## Files in This Implementation

- `/functions/api/stripe-webhook.js` - Webhook handler function
- `/functions/api/stripe-products.js` - Products API endpoint
- `/index.html` - Frontend with pricing calculator
- `/success.html` - Checkout success page
- `STRIPE_SETUP.md` - Stripe products configuration guide
- `WEBHOOK_SETUP.md` - This file
