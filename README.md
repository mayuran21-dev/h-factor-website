# H Factor Website - Stripe Integration

Dynamic pricing and subscription management system for H Factor HR platform.

H Factor - Workforce Management website for UK SMEs. HMRC compliant HR and payroll solution deployed on Cloudflare Pages.

## Overview

This website integrates with Stripe to offer tiered subscription plans with:
- **Single Company Plans**: 7 tiers (1-200 employees) with 14-day free trials
- **Holding Company Plans**: 5 tiers (2-25 entities) with 60-day free trials
- **Flexible Options**: HR-only or HR + Payroll bundles for each tier

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    H Factor Website (Cloudflare Pages)          │
│                        https://h-factor.co.uk                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
                    ▼           ▼           ▼
            ┌───────────┐ ┌──────────┐ ┌────────────┐
            │  Stripe   │ │ Backend  │ │ Cloudflare │
            │  Products │ │   API    │ │ Functions  │
            │    API    │ │(base44)  │ │            │
            └───────────┘ └──────────┘ └────────────┘
                    │           │           │
                    │           │           │
                    └───────────┼───────────┘
                                │
                                ▼
                        ┌───────────────┐
                        │ Stripe Webhook│
                        │   Processing  │
                        └───────────────┘
```

### Components:

1. **Frontend** (`index.html`):
   - Interactive pricing calculator
   - Two-card layout (input form + results display)
   - Dynamic tier matching based on employee/entity counts
   - Stripe Checkout integration

2. **Cloudflare Functions**:
   - `/api/stripe-products` - Fetches products and prices from Stripe
   - `/api/stripe-webhook` - Processes Stripe webhook events
   - `/api/contact` - Handles contact form submissions (to be deployed)

3. **Backend API** (`https://h-factor.base44.app`):
   - Creates Stripe checkout sessions
   - Manages customer portal and login
   - Processes subscriptions (via webhook forwarding)
   - Sends automated welcome emails

4. **Stripe**:
   - 24 products (14 single company + 10 holding company)
   - Monthly recurring subscriptions
   - Webhook events for automation

## Key Features

### 🧮 Dynamic Pricing Calculator
- User selects company type (Single/Holding)
- Enters employee count (and entities for holding companies)
- System automatically matches to correct pricing tier
- Toggle between HR-only and HR+Payroll pricing
- Contact sales flow for enterprise sizes (201+ employees or 26+ entities)

### 🔄 Automatic Tier Matching
Handles complex range formats:
- Standard ranges: "1-5", "16-30", "151-200"
- Conditional formats: "up to 80", "300+"
- Entity ranges: "2-4 entities", "16-25 entities"

### 💳 Stripe Integration
- Dynamic product fetching from Stripe Products API
- Metadata-driven configuration (no hardcoded prices)
- Trial periods: 14 days (single) or 60 days (holding)
- Test mode support with proper error handling

### 📧 Webhook Automation
- Captures successful checkouts
- Forwards subscription data to backend
- Sends team notifications
- Tracks subscription lifecycle events
- Handles payment failures and cancellations

## Files Structure

```
h-factor-website/
├── index.html                          # Main website with pricing calculator
├── success.html                        # Checkout success page
├── learn.html                          # Learning resources page
├── functions/
│   └── api/
│       ├── stripe-products.js         # Fetch Stripe products endpoint
│       └── stripe-webhook.js          # Webhook event processor
├── STRIPE_SETUP.md                     # Guide for configuring Stripe products
├── WEBHOOK_SETUP.md                    # Guide for webhook configuration
└── README.md                           # This file
```

## Setup Instructions

### 1. Stripe Products Configuration

Create 24 products in Stripe with proper metadata. See **STRIPE_SETUP.md** for:
- Complete product list and pricing
- Metadata field requirements
- Naming conventions
- Testing checklist

### 2. Environment Variables

Configure in **Cloudflare Pages → Settings → Environment variables**:

**Required:**
```
STRIPE_SECRET_KEY=sk_xxxxx          # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_xxxxx   # Webhook signing secret
```

**Optional (recommended):**
```
BACKEND_API_URL=https://h-factor.base44.app
BACKEND_API_KEY=your_api_key
EMAIL_SERVICE_URL=https://api.your-email-service.com/send
EMAIL_API_KEY=your_email_key
ADMIN_EMAIL=support@h-factor.co.uk
```

### 3. Webhook Configuration

Configure Stripe webhook to enable automated onboarding. See **WEBHOOK_SETUP.md** for:
- Step-by-step webhook setup in Stripe Dashboard
- Backend API integration requirements
- Email notification configuration
- Testing procedures
- Troubleshooting guide

### 4. Backend API Updates

Your backend at `https://h-factor.base44.app` needs:

1. **Include metadata in checkout sessions**:
```javascript
metadata: {
  planName: planName,
  planKey: planKey,
  isHoldingCompany: isHoldingCompany.toString()
}
```

2. **Create subscription processing endpoint**:
```
POST /api/functions/processSubscription
```

3. **Send automated welcome emails** with login credentials

See **WEBHOOK_SETUP.md** section 3 for detailed backend requirements.

## Testing

### Test Mode Setup:
1. Use Stripe test mode products and keys
2. Test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
3. Any CVV, future expiry date, any ZIP code

### Testing Checklist:
- [ ] Pricing calculator loads products from Stripe
- [ ] Tier matching works correctly for various inputs
- [ ] HR/Payroll toggle updates pricing
- [ ] Trial buttons create checkout sessions
- [ ] Successful checkout redirects to success page
- [ ] Cancelled checkout shows error message
- [ ] Webhook receives and processes events
- [ ] Team receives notification emails
- [ ] Backend creates user account (if configured)
- [ ] Customer receives welcome email (if configured)

## Pricing Model

### Single Companies (14-day trial):

| Tier | Employees | HR Only | HR + Payroll |
|------|-----------|---------|--------------|
| Micro | 1-5 | £49/mo | £114/mo |
| Starter | 6-15 | £150/mo | £245/mo |
| Growth | 16-30 | £200/mo | £350/mo |
| Standard | 31-60 | £280/mo | £500/mo |
| Plus | 61-100 | £350/mo | £630/mo |
| Scale | 101-150 | £450/mo | £750/mo |
| Scale+ | 151-200 | £550/mo | £950/mo |

### Holding Companies (60-day trial):

| Tier | Entities | Employees | HR Only | HR + Payroll |
|------|----------|-----------|---------|--------------|
| Starter | 2-4 | Up to 80 | £300/mo | £450/mo |
| Regional | 5-8 | 80-120 | £550/mo | £800/mo |
| Regional+ | 5-8 | 120-150 | £700/mo | £1,000/mo |
| Enterprise | 9-15 | 150-300 | £1,050/mo | £1,500/mo |
| National | 16-25 | 300-500 | £1,500/mo | £2,100/mo |

## Deployment

### Via Cloudflare Pages:

1. **Connect Repository**:
   - Cloudflare Pages → Create a project
   - Connect to your Git repository

2. **Build Settings**:
   - Build command: (none needed - static site)
   - Build output directory: `/`

3. **Environment Variables**:
   - Add `STRIPE_SECRET_KEY`
   - Add `STRIPE_WEBHOOK_SECRET` (after webhook created)
   - Add optional variables for enhanced features

4. **Deploy**:
   - Cloudflare will automatically deploy on git push
   - Functions in `/functions/api/` are automatically deployed

### Manual Deployment:

```bash
# Deploy via Wrangler CLI
npm install -g wrangler
wrangler pages deploy . --project-name=h-factor-website
```

## Maintenance

### Regular Tasks:

1. **Monitor Webhooks**:
   - Check Stripe Dashboard → Webhooks for failed deliveries
   - Review Cloudflare Functions logs for errors

2. **Update Pricing**:
   - Modify prices in Stripe Dashboard
   - Changes appear automatically (cached for 5 minutes)

3. **Add New Tiers**:
   - Create products in Stripe with proper metadata
   - No code changes needed

4. **Review Subscriptions**:
   - Monitor trial-to-paid conversion rates
   - Track cancellations and payment failures

### Troubleshooting:

**Pricing not loading:**
- Check `STRIPE_SECRET_KEY` is configured
- Verify products are active in Stripe
- Check browser console for API errors

**Webhooks failing:**
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check Cloudflare Functions deployment status
- Review webhook logs in Stripe Dashboard

**Customers not receiving access:**
- Verify webhook is triggering
- Check backend is receiving subscription data
- Review backend email logs
- See WEBHOOK_SETUP.md troubleshooting section

## Security

### Best Practices Implemented:

- ✅ Webhook signature verification (prevents spoofing)
- ✅ Timestamp validation (prevents replay attacks)
- ✅ Environment variable storage (no secrets in code)
- ✅ HTTPS only (enforced by Cloudflare)
- ✅ Backend API authentication (if configured)
- ✅ CORS configuration for API endpoints

### Important:

- Never commit API keys to version control
- Rotate webhook secrets periodically
- Monitor webhook logs for suspicious activity
- Use separate test/live mode keys
- Implement rate limiting on backend API

## Support & Documentation

- **Stripe Products Setup**: See `STRIPE_SETUP.md`
- **Webhook Configuration**: See `WEBHOOK_SETUP.md`
- **Stripe Documentation**: https://stripe.com/docs
- **Cloudflare Pages Docs**: https://developers.cloudflare.com/pages

## License

Proprietary - H Factor Ltd.
