// functions/api/stripe-products.js
// Cloudflare Pages Function to fetch Stripe products and prices

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
    const productsResponse = await fetch('https://api.stripe.com/v1/products?active=true&expand[]=data.default_price', {
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
        // Fetch all prices for this product
        const pricesResponse = await fetch(`https://api.stripe.com/v1/prices?product=${product.id}&active=true`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        const pricesData = await pricesResponse.json();

        // Organize prices by billing period
        const prices = {
          monthly: null,
          annual: null
        };

        pricesData.data.forEach(price => {
          if (price.recurring) {
            if (price.recurring.interval === 'month') {
              prices.monthly = {
                id: price.id,
                amount: price.unit_amount / 100, // Convert from cents
                currency: price.currency
              };
            } else if (price.recurring.interval === 'year') {
              prices.annual = {
                id: price.id,
                amount: price.unit_amount / 100, // Convert from cents
                currency: price.currency
              };
            }
          }
        });

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          features: product.metadata.features ? JSON.parse(product.metadata.features) : [],
          highlighted: product.metadata.highlighted === 'true',
          order: parseInt(product.metadata.order || '999'),
          prices: prices
        };
      })
    );

    // Sort products by order metadata
    const sortedProducts = productsWithPrices.sort((a, b) => a.order - b.order);

    return new Response(JSON.stringify({
      success: true,
      products: sortedProducts
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
