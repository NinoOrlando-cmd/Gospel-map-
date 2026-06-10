export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const SECRET_KEY = process.env.STRIPE_SECRET_KEY;

  if (!SECRET_KEY) {
    return res.status(500).json({ error: 'Donations are not configured yet. Please try again later.' });
  }

  try {
    // req.body may arrive parsed (object) or as a raw string depending on headers.
    var body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    body = body || {};

    // Validate the amount server-side — never trust the client.
    var amount = Number(body.amount);

    if (!isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid donation amount.' });
    }
    if (amount < 1) {
      return res.status(400).json({ error: 'The minimum donation is $1.' });
    }
    if (amount > 10000) {
      return res.status(400).json({ error: 'The maximum donation is $10,000. For larger gifts, please contact us.' });
    }

    // Stripe charges in cents. Round to avoid floating-point dust (e.g. 19.999 cents).
    var unitAmount = Math.round(amount * 100);

    // Build the redirect targets from the request origin so it works on any deploy.
    var origin = req.headers.origin || ('https://' + (req.headers.host || 'gospel-map.vercel.app'));

    var params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('submit_type', 'donate');
    params.append('line_items[0][quantity]', '1');
    params.append('line_items[0][price_data][currency]', 'usd');
    params.append('line_items[0][price_data][unit_amount]', String(unitAmount));
    params.append('line_items[0][price_data][product_data][name]', 'GospelMap Ministry Donation');
    params.append('line_items[0][price_data][product_data][description]', 'Thank you for supporting Gospel outreach.');
    params.append('success_url', origin + '/?donation=success');
    params.append('cancel_url', origin + '/?donation=cancelled');

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + SECRET_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await response.json();

    if (!response.ok) {
      var stripeMsg = data && data.error && data.error.message
        ? data.error.message
        : 'Could not start checkout. Please try again.';
      return res.status(response.status).json({ error: stripeMsg });
    }

    return res.status(200).json({ url: data.url });

  } catch (err) {
    return res.status(500).json({ error: 'Something went wrong starting your donation. Please try again.' });
  }
}
