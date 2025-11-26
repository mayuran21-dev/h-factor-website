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
│              Marketing Website (Cloudflare Pages)               │
│                     https://h-factor.co.uk                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
            ┌───────────────┐      ┌────────────────┐
            │   Cloudflare  │      │   Backend API  │
            │   Functions   │      │(Azure Static   │
            │ stripe-products│      │  Web Apps)    │
            └───────────────┘      └────────────────┘
                    │               api.h-factor.co.uk
                    │                       │
                    ▼                       ▼
            ┌───────────────┐      ┌────────────────┐
            │ Stripe Products│      │ Stripe Checkout│
            │      API       │      │   & Webhooks   │
            └───────────────┘      └────────────────┘
                                            │
                                            ▼
                                    ┌────────────────┐
                                    │   Automated    │
                                    │   Onboarding   │
                                    │ (User Creation,│
                                    │ Welcome Email) │
                                    └────────────────┘
```

### Components:

1. **Frontend** (`index.html`):
   - Interactive pricing calculator
   - Two-card layout (input form + results display)
   - Dynamic tier matching based on employee/entity counts
   - Stripe Checkout integration

2. **Cloudflare Functions**:
   - `/api/stripe-products` - Fetches products and prices from Stripe

3. **Backend API** (`https://api.h-factor.co.uk`):
   - Creates Stripe checkout sessions
   - Processes Stripe webhooks for automated onboarding
   - Creates user accounts and company profiles
   - Sends automated welcome emails with login credentials
   - Manages customer portal at `https://app.h-factor.co.uk`

4. **Stripe**:
   - 24 products (14 single company + 10 holding company)
   - Monthly recurring subscriptions
   - Webhook events trigger automated customer onboarding

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

### 📧 Automated Customer Onboarding
- Webhook captures successful checkouts in real-time
- Automatically creates user accounts with secure temporary passwords
- Creates company profiles and holding company structures
- Sends welcome emails with login credentials immediately
- Tracks subscription lifecycle events
- Handles payment failures and cancellations
- Zero manual intervention required

## Files Structure

```
h-factor-website/
├── index.html                          # Main website with pricing calculator
├── success.html                        # Checkout success page
├── learn.html                          # Learning resources page
├── functions/
│   └── api/
│       └── stripe-products.js         # Fetch Stripe products endpoint
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

### 2. Environment Variables (Cloudflare Pages)

Configure in **Cloudflare Pages → Settings → Environment variables**:

**Required:**
```
STRIPE_SECRET_KEY=sk_xxxxx          # Your Stripe secret key (for stripe-products function)
```

**Note**: Webhook secrets and other backend configuration is managed in your backend repository.

### 3. Backend API Configuration

Your backend at `https://api.h-factor.co.uk` is already configured with:
- Stripe webhook handler at `/api/stripe/webhook`
- Checkout session creation at `/api/stripe/create-checkout`
- Automated onboarding on `checkout.session.completed` events
- Email service for welcome messages
- User and company creation

See **backend repository → AUTOMATED_ONBOARDING.md** for backend setup details.

### 4. Webhook Configuration

Configure Stripe webhook to point to your backend. See **WEBHOOK_SETUP.md** for:
- Step-by-step webhook setup in Stripe Dashboard (endpoint: `https://api.h-factor.co.uk/api/stripe/webhook`)
- Testing procedures with Stripe test cards
- Troubleshooting common issues
- Customer journey flow diagram

**Note**: The marketing website already sends all required metadata to the backend, including:
- `planName`, `planKey`, `isHoldingCompany`
- `numEmployees`, `numEntities`, `industryPack`
- `trialDays`, `successUrl`, `cancelUrl`

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
