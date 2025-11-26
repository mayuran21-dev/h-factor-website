# H Factor Stripe Products Setup Guide

This guide explains how to configure your Stripe products for the H Factor pricing model with Single Companies and Holding Companies tiers.

## Overview

H Factor has two customer types:
- **Single Companies**: Individual businesses (7 pricing tiers)
- **Holding Companies**: Multi-entity groups (5 pricing tiers)

Each tier offers two options:
- **HR Platform Only** (core product)
- **HR + Payroll Bundle** (includes payroll processing)

**Total products to create**: 24 (14 for single companies + 10 for holding companies)

## Trial Periods

- **Single Companies**: 14-day free trial
- **Holding Companies**: 60-day free trial

## Environment Configuration

### Step 1: Set Environment Variable in Cloudflare Pages

1. Go to your Cloudflare Pages dashboard
2. Select your project (`h-factor-website`)
3. Go to **Settings** > **Environment variables**
4. Add:
   - **Variable name**: `STRIPE_SECRET_KEY`
   - **Value**: Your Stripe secret key (starts with `sk_`)
   - **Environment**: Production (and Preview if desired)
5. Click **Save** and redeploy

## Creating Stripe Products

### Product Naming Convention

**Single Companies:**
```
H Factor - [Tier Name] Plan ([Type])
```
Examples:
- `H Factor - Micro Plan (HR Only)`
- `H Factor - Growth Plan (HR + Payroll)`

**Holding Companies:**
```
H Factor - [Tier Name] ([Type])
```
Examples:
- `H Factor - Starter Group (HR Only)`
- `H Factor - Enterprise Group (HR + Payroll)`

### Single Company Tiers

Create these 14 products in Stripe:

| Plan | Employee Range | HR Only Price | HR + Payroll Price |
|------|----------------|---------------|-------------------|
| Micro | 1-5 | £49/month | £114/month |
| Starter | 6-15 | £150/month | £245/month |
| Growth | 16-30 | £200/month | £350/month |
| Standard | 31-60 | £280/month | £500/month |
| Plus | 61-100 | £350/month | £630/month |
| Scale | 101-150 | £450/month | £750/month |
| Scale+ | 151-200 | £550/month | £950/month |

### Holding Company Tiers

Create these 10 products in Stripe:

| Plan | Entities | Employees | HR Only Price | HR + Payroll Price |
|------|----------|-----------|---------------|-------------------|
| Starter Group | 2-4 | Up to 80 | £300/month | £450/month |
| Regional Group | 5-8 | 80-120 | £550/month | £800/month |
| Regional Group+ | 5-8 | 120-150 | £700/month | £1,000/month |
| Enterprise Group | 9-15 | 150-300 | £1,050/month | £1,500/month |
| National Group | 16-25 | 300-500 | £1,500/month | £2,100/month |

## Product Metadata

Each Stripe product MUST include these metadata fields:

### Single Company Metadata Example:

For "H Factor - Micro Plan (HR Only)":
```
plan_tier: micro
includes_payroll: false
employee_range: 1-5 employees
is_holding_company: false
order: 1
```

For "H Factor - Micro Plan (HR + Payroll)":
```
plan_tier: micro
includes_payroll: true
employee_range: 1-5 employees
is_holding_company: false
order: 2
```

### Holding Company Metadata Example:

For "H Factor - Starter Group (HR Only)":
```
plan_tier: holding_starter
includes_payroll: false
employee_range: Up to 80 employees
entity_range: 2-4 entities
is_holding_company: true
order: 1
```

For "H Factor - Starter Group (HR + Payroll)":
```
plan_tier: holding_starter
includes_payroll: true
employee_range: Up to 80 employees
entity_range: 2-4 entities
is_holding_company: true
order: 2
```

### Metadata Field Reference

| Field | Type | Description | Example Values |
|-------|------|-------------|----------------|
| `plan_tier` | string | Unique tier identifier | `micro`, `starter`, `growth`, `holding_starter`, `holding_regional` |
| `includes_payroll` | boolean | Whether product includes payroll | `true` or `false` |
| `employee_range` | string | Employee count range | `1-5 employees`, `Up to 80 employees` |
| `entity_range` | string | Entity count (holding only) | `2-4 entities`, `5-8 entities` |
| `is_holding_company` | boolean | Whether this is for holding companies | `true` or `false` |
| `order` | integer | Display order on website | `1`, `2`, `3`, etc. |

## Plan Tier Values Reference

### Single Companies:
- `micro` (1-5 employees)
- `starter` (6-15 employees)
- `growth` (16-30 employees)
- `standard` (31-60 employees)
- `plus` (61-100 employees)
- `scale` (101-150 employees)
- `scaleplus` (151-200 employees)

### Holding Companies:
- `holding_starter` (2-4 entities, up to 80 employees)
- `holding_regional` (5-8 entities, 80-120 employees)
- `holding_regional_plus` (5-8 entities, 120-150 employees)
- `holding_enterprise` (9-15 entities, 150-300 employees)
- `holding_national` (16-25 entities, 300-500 employees)

## Price Configuration

For each product:
1. Create ONE recurring monthly price
2. Set currency to **GBP (£)**
3. Mark price as **Active**
4. Set billing period to **Monthly**

**Example:**
- Product: "H Factor - Micro Plan (HR Only)"
- Price: £49.00
- Recurring: Monthly
- Currency: GBP

## How It Works

### API Endpoint

The pricing data is fetched from:
```
/api/stripe-products
```

This endpoint:
- Fetches all active products from Stripe
- Organizes them by customer type (single/holding)
- Groups products by tier (HR-only + HR+Payroll pairs)
- Returns structured data for display

### Response Format

```json
{
  "success": true,
  "pricing": {
    "singleCompanies": [
      {
        "tier": "micro",
        "employeeRange": "1-5 employees",
        "hrOnly": {
          "priceId": "price_xxxxx",
          "amount": 49
        },
        "hrPayroll": {
          "priceId": "price_yyyyy",
          "amount": 114
        }
      }
      // ... more tiers
    ],
    "holdingCompanies": [
      {
        "tier": "holding_starter",
        "employeeRange": "Up to 80 employees",
        "entityRange": "2-4 entities",
        "hrOnly": {
          "priceId": "price_xxxxx",
          "amount": 300
        },
        "hrPayroll": {
          "priceId": "price_yyyyy",
          "amount": 450
        }
      }
      // ... more tiers
    ]
  }
}
```

### Plan Keys

When a user clicks a subscription button, a **planKey** is generated:

**Format:**
- Single Company HR-only: `[tier]_hr` (e.g., `growth_hr`)
- Single Company HR+Payroll: `[tier]_combo` (e.g., `growth_combo`)
- Holding Company HR-only: `holding_[tier]_hr` (e.g., `holding_enterprise_hr`)
- Holding Company HR+Payroll: `holding_[tier]_combo` (e.g., `holding_enterprise_combo`)

This planKey is sent to your backend for checkout session creation.

## Testing Your Setup

### 1. Create Products in Stripe

Start with one tier to test:
- Create "H Factor - Micro Plan (HR Only)"
- Create "H Factor - Micro Plan (HR + Payroll)"
- Add all required metadata
- Create monthly prices for each

### 2. Verify Metadata

Double-check each product has:
- ✅ Correct `plan_tier` value
- ✅ Correct `includes_payroll` (true/false)
- ✅ Employee range text
- ✅ `is_holding_company` set correctly
- ✅ Unique `order` number

### 3. Test API Endpoint

Once deployed, visit:
```
https://your-site.com/api/stripe-products
```

You should see JSON with your products organized by type.

### 4. Check Website Display

Visit your pricing section:
- Toggle between "Single Companies" and "Holding Companies"
- Verify prices display correctly
- Click a trial button to test checkout flow

## Troubleshooting

### Pricing doesn't load:
- ✅ Check `STRIPE_SECRET_KEY` is set in Cloudflare
- ✅ Verify products are marked "Active" in Stripe
- ✅ Check browser console for errors
- ✅ Verify API endpoint returns 200 status

### Products display in wrong order:
- ✅ Check `order` metadata values
- ✅ Lower numbers appear first (1, 2, 3...)

### Tier doesn't show HR+Payroll option:
- ✅ Verify both products exist (HR-only and HR+Payroll)
- ✅ Check both have same `plan_tier` value
- ✅ Verify `includes_payroll` is `true` for bundle product

### Employee/entity ranges don't display:
- ✅ Check `employee_range` metadata is set
- ✅ For holding companies, check `entity_range` is set
- ✅ Verify text format matches examples

### Wrong trial period:
- ✅ Check `is_holding_company` metadata
- ✅ `false` = 14-day trial (single companies)
- ✅ `true` = 60-day trial (holding companies)

## Complete Product Checklist

Use this to track your Stripe product setup:

### Single Companies (14 products)
- [ ] Micro Plan (HR Only) - £49
- [ ] Micro Plan (HR + Payroll) - £114
- [ ] Starter Plan (HR Only) - £150
- [ ] Starter Plan (HR + Payroll) - £245
- [ ] Growth Plan (HR Only) - £200
- [ ] Growth Plan (HR + Payroll) - £350
- [ ] Standard Plan (HR Only) - £280
- [ ] Standard Plan (HR + Payroll) - £500
- [ ] Plus Plan (HR Only) - £350
- [ ] Plus Plan (HR + Payroll) - £630
- [ ] Scale Plan (HR Only) - £450
- [ ] Scale Plan (HR + Payroll) - £750
- [ ] Scale+ Plan (HR Only) - £550
- [ ] Scale+ Plan (HR + Payroll) - £950

### Holding Companies (10 products)
- [ ] Starter Group (HR Only) - £300
- [ ] Starter Group (HR + Payroll) - £450
- [ ] Regional Group (HR Only) - £550
- [ ] Regional Group (HR + Payroll) - £800
- [ ] Regional Group+ (HR Only) - £700
- [ ] Regional Group+ (HR + Payroll) - £1,000
- [ ] Enterprise Group (HR Only) - £1,050
- [ ] Enterprise Group (HR + Payroll) - £1,500
- [ ] National Group (HR Only) - £1,500
- [ ] National Group (HR + Payroll) - £2,100

## Automated Customer Onboarding

After customers complete checkout, you need to:
1. Create their account in your system
2. Send them login credentials
3. Grant access to the H Factor platform

**IMPORTANT**: See `WEBHOOK_SETUP.md` for complete instructions on configuring Stripe webhooks to automate this process.

### Quick Webhook Setup:

1. **Create webhook in Stripe**:
   - URL: `https://h-factor.co.uk/api/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`

2. **Configure environment variable**:
   - Add `STRIPE_WEBHOOK_SECRET` to Cloudflare Pages settings
   - Get the secret from Stripe Dashboard after creating webhook

3. **Update backend API**:
   - Your backend at `https://h-factor.base44.app` needs to:
     - Include metadata when creating checkout sessions
     - Create endpoint to receive subscription data from webhook
     - Send automated welcome emails with login credentials

For detailed setup instructions, see **WEBHOOK_SETUP.md**.

## Support

If you encounter issues:
1. Check Cloudflare Pages deployment logs
2. Review browser console for JavaScript errors
3. Verify Stripe Dashboard > Logs for API errors
4. Confirm all metadata fields are set correctly
5. Test with Stripe test mode first before going live
