# Stripe Products Integration Setup Guide

This guide explains how to configure your Stripe products to display correctly on your website.

## Overview

Your website now dynamically fetches pricing information from Stripe using the Products API. When you update products in your Stripe dashboard, the changes will automatically appear on your website.

## Required Configuration

### 1. Environment Variables

You need to set the following environment variable in your Cloudflare Pages settings:

- **`STRIPE_SECRET_KEY`**: Your Stripe secret API key (starts with `sk_`)

#### How to set environment variables in Cloudflare Pages:

1. Go to your Cloudflare Pages dashboard
2. Select your project (`h-factor-website`)
3. Go to **Settings** > **Environment variables**
4. Add a new variable:
   - **Variable name**: `STRIPE_SECRET_KEY`
   - **Value**: Your Stripe secret key (found in Stripe Dashboard > Developers > API keys)
   - **Environment**: Production (and Preview if you want)
5. Click **Save**
6. Redeploy your site for changes to take effect

### 2. Stripe Product Configuration

For each product in your Stripe dashboard, you need to configure:

#### Product Information:
- **Name**: The plan name (e.g., "Essential", "Professional", "Enterprise")
- **Description** (optional): A brief description of the plan

#### Product Metadata:

Add the following metadata fields to each product:

| Metadata Key | Value | Description |
|--------------|-------|-------------|
| `features` | JSON array | List of features as a JSON array |
| `highlighted` | `true` or `false` | Whether to highlight this plan (only one should be `true`) |
| `order` | Number (1, 2, 3, etc.) | Display order on the website |

#### Example Metadata Configuration:

**Essential Plan:**
- `features`: `["Up to 10 employees","HMRC RTI submissions","Payroll processing","Employee self-service","Basic reporting","Email support"]`
- `highlighted`: `false`
- `order`: `1`

**Professional Plan:**
- `features`: `["Up to 50 employees","Everything in Essential","Advanced reporting","Holiday management","Performance tracking","Priority support","API access"]`
- `highlighted`: `true`
- `order`: `2`

**Enterprise Plan:**
- `features`: `["Unlimited employees","Everything in Professional","Custom integrations","Dedicated account manager","Custom reporting","Phone support","SLA guarantee"]`
- `highlighted`: `false`
- `order`: `3`

#### How to add metadata in Stripe:

1. Go to **Products** in your Stripe dashboard
2. Click on a product to edit it
3. Scroll down to **Metadata**
4. Click **Add metadata**
5. Add each key-value pair listed above
6. Click **Save product**

### 3. Price Configuration

For each product, you should create **two prices**:

1. **Monthly Price**:
   - Billing period: Monthly
   - Set as recurring
   - Active: Yes

2. **Annual Price**:
   - Billing period: Yearly
   - Set as recurring
   - Active: Yes

The website will automatically detect and display both pricing options with a toggle switch.

## API Endpoint

The pricing data is fetched from:
```
/api/stripe-products
```

This endpoint:
- Fetches all active products from Stripe
- Retrieves associated prices (monthly and annual)
- Returns formatted data for the website
- Caches results for 5 minutes to improve performance

## Fallback Behavior

If the Stripe API is unavailable or returns an error, the website will display your current hardcoded pricing as a fallback. This ensures your pricing page always works, even if there are API issues.

## Testing Your Setup

1. **Set the environment variable** in Cloudflare Pages
2. **Configure your products** in Stripe with the required metadata
3. **Create monthly and annual prices** for each product
4. **Deploy your site** (or trigger a new deployment if already deployed)
5. **Visit your website** and check the pricing section

## Troubleshooting

### Pricing doesn't load:
- Check that `STRIPE_SECRET_KEY` is set correctly in Cloudflare Pages
- Verify the secret key has the correct permissions in Stripe
- Check browser console for error messages
- Verify products are marked as "Active" in Stripe

### Products display in wrong order:
- Check the `order` metadata value for each product
- Lower numbers appear first (1, 2, 3, etc.)

### Features don't show correctly:
- Verify the `features` metadata is valid JSON
- Ensure it's an array of strings: `["Feature 1", "Feature 2"]`
- Check for proper quote escaping

### Wrong plan is highlighted:
- Only one product should have `highlighted: true`
- Others should have `highlighted: false`

## Security Notes

- **Never expose your Stripe secret key** in frontend code or public repositories
- The secret key should only be set as an environment variable in Cloudflare Pages
- The API endpoint only fetches public product information (not customer data)
- The checkout process still uses your existing backend at `https://h-factor.base44.app`

## Making Changes

Whenever you update pricing in Stripe:
1. Edit the product in your Stripe dashboard
2. Update prices, features, or metadata as needed
3. Save the changes
4. Your website will reflect the changes within 5 minutes (due to caching)
5. To see changes immediately, you can clear the cache by redeploying

## Support

If you encounter issues, check:
1. Cloudflare Pages deployment logs
2. Browser console for JavaScript errors
3. Stripe Dashboard > Logs for API errors
4. Verify all metadata is properly formatted
