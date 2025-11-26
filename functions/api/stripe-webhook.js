// functions/api/stripe-webhook.js
// Cloudflare Pages Function to handle Stripe webhook events

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // Get the raw body as text for signature verification
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No signature provided'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify webhook signature
    if (!env.STRIPE_WEBHOOK_SECRET) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return new Response(JSON.stringify({
        success: false,
        error: 'Webhook secret not configured'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Manual signature verification (Cloudflare Workers compatible)
    const verified = await verifyStripeSignature(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );

    if (!verified) {
      console.error('Webhook signature verification failed');
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid signature'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse the event
    const event = JSON.parse(payload);
    console.log('Received Stripe webhook event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object, env);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object, env);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object, env);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, env);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object, env);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object, env);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Webhook processing failed'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Verify Stripe webhook signature
 */
async function verifyStripeSignature(payload, signatureHeader, secret) {
  try {
    const [timestamp, signature] = signatureHeader.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=');
      if (key === 't') acc[0] = value;
      if (key === 'v1') acc[1] = value;
      return acc;
    }, ['', '']);

    // Check timestamp is recent (within 5 minutes)
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = currentTime - parseInt(timestamp);
    if (timeDiff > 300) {
      console.error('Webhook timestamp too old:', timeDiff);
      return false;
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBytes = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signedPayload)
    );
    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Handle checkout.session.completed event
 * This is triggered when a customer completes checkout
 */
async function handleCheckoutCompleted(session, env) {
  console.log('Processing checkout completed:', session.id);

  const customerEmail = session.customer_email;
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  // Extract metadata from checkout session
  const planName = session.metadata?.planName || 'Unknown Plan';
  const planKey = session.metadata?.planKey || 'unknown';
  const isHoldingCompany = session.metadata?.isHoldingCompany === 'true';

  const subscriptionData = {
    sessionId: session.id,
    customerId: customerId,
    subscriptionId: subscriptionId,
    customerEmail: customerEmail,
    planName: planName,
    planKey: planKey,
    isHoldingCompany: isHoldingCompany,
    status: 'active',
    timestamp: new Date().toISOString()
  };

  // Option 1: Forward to backend API for processing
  if (env.BACKEND_API_URL && env.BACKEND_API_KEY) {
    try {
      await fetch(`${env.BACKEND_API_URL}/api/functions/processSubscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.BACKEND_API_KEY}`
        },
        body: JSON.stringify(subscriptionData)
      });
      console.log('Forwarded subscription to backend API');
    } catch (error) {
      console.error('Failed to forward to backend:', error);
    }
  }

  // Option 2: Send notification email to team
  if (env.EMAIL_SERVICE_URL && env.EMAIL_API_KEY) {
    try {
      const emailContent = `
New Subscription Received!

Customer Email: ${customerEmail}
Plan: ${planName}
Plan Key: ${planKey}
Customer Type: ${isHoldingCompany ? 'Holding Company (60-day trial)' : 'Single Company (14-day trial)'}

Stripe Details:
- Customer ID: ${customerId}
- Subscription ID: ${subscriptionId}
- Session ID: ${session.id}

Action Required:
Please set up this customer's account and send them login credentials at:
https://h-factor.base44.app

Time: ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}
      `;

      await fetch(env.EMAIL_SERVICE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.EMAIL_API_KEY}`
        },
        body: JSON.stringify({
          to: env.ADMIN_EMAIL || 'support@h-factor.co.uk',
          from: 'webhooks@h-factor.co.uk',
          subject: `🎉 New Subscription: ${customerEmail}`,
          text: emailContent
        })
      });
      console.log('Sent notification email to team');
    } catch (error) {
      console.error('Failed to send notification email:', error);
    }
  }

  // Option 3: Store in KV for manual processing
  if (env.SUBSCRIPTIONS) {
    try {
      const kvKey = `subscription_${subscriptionId}`;
      await env.SUBSCRIPTIONS.put(kvKey, JSON.stringify(subscriptionData), {
        metadata: {
          customerEmail: customerEmail,
          planKey: planKey,
          status: 'pending_setup'
        }
      });
      console.log('Stored subscription in KV storage');
    } catch (error) {
      console.error('Failed to store in KV:', error);
    }
  }

  console.log('Checkout completed processing finished');
}

/**
 * Handle customer.subscription.created event
 */
async function handleSubscriptionCreated(subscription, env) {
  console.log('Subscription created:', subscription.id);

  // Log subscription creation
  if (env.SUBSCRIPTIONS) {
    try {
      const kvKey = `subscription_created_${subscription.id}`;
      await env.SUBSCRIPTIONS.put(kvKey, JSON.stringify({
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        status: subscription.status,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Failed to log subscription creation:', error);
    }
  }
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(subscription, env) {
  console.log('Subscription updated:', subscription.id, 'Status:', subscription.status);

  // Check if trial ending soon or subscription status changed
  if (subscription.trial_end) {
    const trialEndDate = new Date(subscription.trial_end * 1000);
    const daysUntilEnd = Math.ceil((trialEndDate - new Date()) / (1000 * 60 * 60 * 24));

    // Send reminder if trial ending in 3 days
    if (daysUntilEnd === 3 && env.EMAIL_SERVICE_URL && env.EMAIL_API_KEY) {
      console.log('Trial ending soon, sending reminder');
      // Implement reminder email logic here
    }
  }
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(subscription, env) {
  console.log('Subscription cancelled:', subscription.id);

  // Notify team about cancellation
  if (env.EMAIL_SERVICE_URL && env.EMAIL_API_KEY) {
    try {
      await fetch(env.EMAIL_SERVICE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.EMAIL_API_KEY}`
        },
        body: JSON.stringify({
          to: env.ADMIN_EMAIL || 'support@h-factor.co.uk',
          from: 'webhooks@h-factor.co.uk',
          subject: `⚠️ Subscription Cancelled: ${subscription.customer}`,
          text: `
Subscription Cancelled

Subscription ID: ${subscription.id}
Customer ID: ${subscription.customer}
Cancelled At: ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}

Please follow up with this customer.
          `
        })
      });
    } catch (error) {
      console.error('Failed to send cancellation notification:', error);
    }
  }
}

/**
 * Handle invoice.paid event
 */
async function handleInvoicePaid(invoice, env) {
  console.log('Invoice paid:', invoice.id);

  // Check if this is the first invoice after trial
  if (invoice.billing_reason === 'subscription_cycle') {
    console.log('First payment after trial for subscription:', invoice.subscription);
  }
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(invoice, env) {
  console.log('Payment failed for invoice:', invoice.id);

  // Notify team about failed payment
  if (env.EMAIL_SERVICE_URL && env.EMAIL_API_KEY) {
    try {
      await fetch(env.EMAIL_SERVICE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.EMAIL_API_KEY}`
        },
        body: JSON.stringify({
          to: env.ADMIN_EMAIL || 'support@h-factor.co.uk',
          from: 'webhooks@h-factor.co.uk',
          subject: `⚠️ Payment Failed: ${invoice.customer_email}`,
          text: `
Payment Failed

Customer Email: ${invoice.customer_email}
Invoice ID: ${invoice.id}
Amount: £${(invoice.amount_due / 100).toFixed(2)}
Attempt Count: ${invoice.attempt_count}

Action Required: Contact customer about payment issue.
          `
        })
      });
    } catch (error) {
      console.error('Failed to send payment failure notification:', error);
    }
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, stripe-signature',
      'Access-Control-Max-Age': '86400'
    }
  });
}
