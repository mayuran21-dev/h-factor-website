// functions/api/contact.js
// Cloudflare Pages Function to handle contact form submissions

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // Parse form data
    const formData = await request.formData();
    const name = formData.get('name');
    const email = formData.get('email');
    const company = formData.get('company');
    const employees = formData.get('employees');
    const phone = formData.get('phone');
    const message = formData.get('message');

    // Basic validation
    if (!name || !email || !company || !message) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Required fields missing' 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid email format' 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Prepare email content
    const emailContent = `
      New Contact Form Submission
      
      Name: ${name}
      Email: ${email}
      Company: ${company}
      Employees: ${employees || 'Not specified'}
      Phone: ${phone || 'Not provided'}
      
      Message:
      ${message}
      
      Submitted: ${new Date().toISOString()}
    `;

    // Send email using your preferred service
    // Option 1: Using Cloudflare Email Workers (recommended)
    if (env.EMAIL_SERVICE_URL && env.EMAIL_API_KEY) {
      const emailResponse = await fetch(env.EMAIL_SERVICE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.EMAIL_API_KEY}`
        },
        body: JSON.stringify({
          to: env.CONTACT_EMAIL || 'contact@hfactor.co.uk',
          from: 'noreply@hfactor.co.uk',
          subject: `New Contact: ${name} from ${company}`,
          text: emailContent,
          reply_to: email
        })
      });

      if (!emailResponse.ok) {
        throw new Error('Email service failed');
      }
    }

    // Option 2: Store in Cloudflare KV for later processing
    if (env.CONTACT_SUBMISSIONS) {
      const submissionId = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await env.CONTACT_SUBMISSIONS.put(submissionId, JSON.stringify({
        name,
        email,
        company,
        employees,
        phone,
        message,
        timestamp: new Date().toISOString(),
        ip: request.headers.get('CF-Connecting-IP'),
        userAgent: request.headers.get('User-Agent')
      }));
    }

    // Return success response
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Contact form submitted successfully' 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Contact form error:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}