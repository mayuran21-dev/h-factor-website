# H Factor Stripe Webhook Setup Guide

This guide explains how to configure Stripe webhooks for automated customer onboarding.

## Overview

The webhook system handles:
- ✅ Automated user account creation
- ✅ Company profile creation
- ✅ Welcome emails with login credentials
- ✅ Subscription status changes (trial ending, cancellation, etc.)
- ✅ Payment events (successful payments, failed payments)

## Architecture

```
Customer Completes Checkout on Marketing Website
         ↓
Stripe sends webhook event to Backend API
         ↓
Backend API (api.h-factor.co.uk)
         ↓
Automated onboarding:
1. Create user account with temporary password
2. Create company profile and holding company structure
3. Send welcome email with login credentials to customer
4. Update Stripe subscription metadata
```

## Webhook Configuration

### Step 1: Configure Stripe Webhook Endpoint

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Enter endpoint URL:
   ```
   https://api.h-factor.co.uk/api/stripe/webhook
   ```
4. Select events to listen for:
   - ✅ `checkout.session.completed` ← **CRITICAL for automated onboarding**
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.paid`
   - ✅ `invoice.payment_failed`

5. Click **Add endpoint**

### Step 2: Configure Backend Environment Variables

The backend API requires these environment variables (configured in your backend repository):

```
# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@h-factor.co.uk
SMTP_PASSWORD=<app-password>
EMAIL_FROM=H Factor <noreply@h-factor.co.uk>

# Application
APP_URL=https://app.h-factor.co.uk
```

## How It Works

### Customer Journey:

1. **Customer visits marketing website** (https://h-factor.co.uk)
2. **Uses pricing calculator** to find their plan
3. **Clicks "Start Free Trial"**
4. **Marketing website calls backend API**:
   ```
   POST https://api.h-factor.co.uk/api/stripe/create-checkout

   Body:
   {
     priceId: "price_xxxxx",
     planName: "Starter Plan",
     planKey: "starter_hr",
     isHoldingCompany: false,
     numEmployees: 25,
     numEntities: 0,
     industryPack: "General",
     successUrl: "https://h-factor.co.uk/success.html",
     cancelUrl: "https://h-factor.co.uk/#pricing",
     trialDays: 14
   }
   ```

5. **Backend creates Stripe checkout session** with metadata
6. **Customer completes payment on Stripe**
7. **Stripe sends webhook to backend**: `checkout.session.completed`
8. **Backend automatically**:
   - Creates user account with secure temporary password
   - Creates holding company and company profile
   - Links user to company
   - Sends welcome email with login credentials
   - Updates subscription metadata

9. **Customer receives email** within seconds with:
   - Login URL: https://app.h-factor.co.uk
   - Email address (their email)
   - Temporary password
   - Instructions to change password on first login

10. **Customer logs in immediately** - Zero manual intervention!

## Testing

### Test with Stripe Test Cards

**Success:**
- Card: `4242 4242 4242 4242`
- Any future expiry date
- Any 3-digit CVC
- Any ZIP code

**Expected Flow:**
1. Complete checkout
2. Redirected to success page
3. Receive welcome email within 30 seconds
4. Email contains temporary password
5. Can log in at https://app.h-factor.co.uk
6. Company profile exists in database

**Decline:**
- Card: `4000 0000 0000 0002`

**Expected:** Payment fails, customer returned to pricing page

### Verify Webhook is Working

1. **Check Stripe Dashboard**:
   - Go to Developers → Webhooks
   - Click on your webhook endpoint
   - View "Events" tab
   - Should see recent events with 200 status codes

2. **Check Backend Logs**:
   - Look for: `🎉 New customer checkout completed`
   - Verify user creation logs
   - Check email sending logs

3. **Check Database**:
   - Query users table for new customer email
   - Verify company_profile_id is set
   - Check company_profiles table

## Troubleshooting

### Webhook showing failures in Stripe

**Check:**
- Verify webhook URL is correct: `https://api.h-factor.co.uk/api/stripe/webhook`
- Check backend is running and accessible
- Verify `STRIPE_WEBHOOK_SECRET` matches in backend environment
- Check backend logs for errors

### Customer not receiving welcome email

**Check:**
1. **Email service configured**:
   - Verify SMTP credentials in backend
   - Test email service separately

2. **Check spam folder**:
   - Welcome emails might be filtered

3. **Backend logs**:
   - Look for email sending errors
   - Verify `sendEmail()` function executed

4. **SMTP credentials**:
   - Gmail App Password (not regular password)
   - 2FA must be enabled for App Passwords

### Customer account not created

**Check:**
1. **Webhook received**:
   - Check Stripe Dashboard webhook events
   - Should show 200 response

2. **Backend errors**:
   - Check application logs
   - Look for database connection errors
   - Verify migration 023 was run

3. **Database schema**:
   - Ensure `company_profile_id` column exists in users table
   - Run migration: `023_add_company_profile_to_users.sql`

### Metadata not being passed

**Check:**
1. **Marketing website updated**:
   - Verify `CONFIG.backendUrl` points to `https://api.h-factor.co.uk/api/stripe/create-checkout`
   - Check browser console for API errors

2. **Backend receiving metadata**:
   - Check backend logs for received payload
   - Verify metadata extraction in `handleCheckoutSessionCompleted`

## Security

### Best Practices Implemented:

- ✅ **Webhook signature verification**: Prevents spoofing
- ✅ **Timestamp validation**: Prevents replay attacks
- ✅ **Secure password generation**: 12 chars, bcrypt hashed
- ✅ **HTTPS only**: All endpoints secured
- ✅ **Environment variables**: No secrets in code
- ✅ **Email security**: App passwords, not plain text

### Password Security:

- **Generation**: 12 characters, uppercase, lowercase, numbers, symbols
- **Hashing**: bcrypt with 10 rounds
- **Temporary**: User must change on first login
- **Example**: `Kp8#mN2$vL9@`

## Monitoring

### What to Monitor:

1. **Stripe Webhook Events**:
   - Check for failed deliveries
   - Monitor response times

2. **Backend Application Logs**:
   - User creation success/failures
   - Email sending status
   - Database errors

3. **Email Deliverability**:
   - Monitor spam folder placement
   - Check email service quotas

4. **Customer Feedback**:
   - Watch for customers not receiving emails
   - Monitor support tickets

## Support

If you encounter issues:

1. Check Stripe Dashboard webhook event logs
2. Review backend application logs
3. Verify environment variables are set correctly
4. Check email service status
5. Verify database migrations are current

For backend implementation details, see `AUTOMATED_ONBOARDING.md` in the backend repository.

## Related Documentation

- **Backend Implementation**: See backend repo `/AUTOMATED_ONBOARDING.md`
- **Stripe Products Setup**: See `STRIPE_SETUP.md` in this repo
- **Marketing Website**: See `README.md` in this repo
