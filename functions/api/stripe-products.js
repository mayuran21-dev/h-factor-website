// functions/api/stripe-products.js
// Cloudflare Pages Function to fetch Stripe products and prices for H Factor pricing model

export async function onRequestGet(context) {
  const { env } = context;

  try {
    // Validate Stripe API key is configured
    if (!env.STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Stripe API key not configured'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Fetch products from Stripe API
    const productsResponse = await fetch('https://api.stripe.com/v1/products?active=true&limit=100', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!productsResponse.ok) {
      throw new Error(`Stripe API error: ${productsResponse.status}`);
    }

    const productsData = await productsResponse.json();

    // Fetch all prices for each product
    const productsWithPrices = await Promise.all(
      productsData.data.map(async (product) => {
        // Fetch price for this product
        const pricesResponse = await fetch(`https://api.stripe.com/v1/prices?product=${product.id}&active=true`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        const pricesData = await pricesResponse.json();
        const price = pricesData.data[0]; // Get first active price

        return {
          id: product.id,
          name: product.name,
          priceId: price?.id || null,
          amount: price ? price.unit_amount / 100 : 0,
          currency: price?.currency || 'gbp',
          planTier: product.metadata.plan_tier || '',
          includesPayroll: product.metadata.includes_payroll === 'true',
          employeeRange: product.metadata.employee_range || '',
          entityRange: product.metadata.entity_range || '',
          isHoldingCompany: product.metadata.is_holding_company === 'true',
          order: parseInt(product.metadata.order || '999')
        };
      })
    );

    // Organize products by customer type and tier
    const singleCompanies = [];
    const holdingCompanies = [];

    productsWithPrices.forEach(product => {
      if (product.isHoldingCompany) {
        holdingCompanies.push(product);
      } else {
        singleCompanies.push(product);
      }
    });

    // Sort by order
    singleCompanies.sort((a, b) => a.order - b.order);
    holdingCompanies.sort((a, b) => a.order - b.order);

    // Group products by tier (HR-only and HR+Payroll pairs)
    const groupByTier = (products) => {
      const tiers = {};
      products.forEach(product => {
        if (!tiers[product.planTier]) {
          tiers[product.planTier] = {
            tier: product.planTier,
            employeeRange: product.employeeRange,
            entityRange: product.entityRange,
            hrOnly: null,
            hrPayroll: null,
            order: product.order
          };
        }
        if (product.includesPayroll) {
          tiers[product.planTier].hrPayroll = {
            priceId: product.priceId,
            amount: product.amount
          };
        } else {
          tiers[product.planTier].hrOnly = {
            priceId: product.priceId,
            amount: product.amount
          };
        }
      });
      return Object.values(tiers).sort((a, b) => a.order - b.order);
    };

    return new Response(JSON.stringify({
      success: true,
      pricing: {
        singleCompanies: groupByTier(singleCompanies),
        holdingCompanies: groupByTier(holdingCompanies)
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      }
    });

  } catch (error) {
    console.error('Stripe products fetch error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch products from Stripe'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Handle CORS preflight requests
export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}
