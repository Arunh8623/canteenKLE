// services/mailer.js — Email notifications via Resend HTTP API

const sendEmail = async (to, subject, html) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'KLE Canteen <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || JSON.stringify(data));
  return data;
};

const orderConfirmedEmail = async (email, name, orderUUID, stallName, queuePos, items, total) => {
  const itemRows = items.map(i =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #fed7aa;color:#374151">${i.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #fed7aa;color:#374151;text-align:center">x${i.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #fed7aa;color:#374151;text-align:right">₹${i.subtotal}</td>
    </tr>`
  ).join('');

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#fff8f0;border-radius:16px;border:1px solid #fed7aa">
      <div style="text-align:center;margin-bottom:24px">
        <div style="background:#f97316;width:56px;height:56px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin:auto">
          <span style="font-size:28px">🍽️</span>
        </div>
        <h2 style="color:#1a1a1a;margin:12px 0 4px">Order Confirmed!</h2>
        <p style="color:#6b7280;font-size:14px;margin:0">KLE Technological University Canteen</p>
      </div>

      <p style="color:#374151;font-size:15px">Hi <strong>${name}</strong>,</p>
      <p style="color:#374151;font-size:15px">Your order has been confirmed at <strong>${stallName}</strong>. 🎉</p>

      <div style="background:#fff;border-radius:12px;padding:16px;margin:16px 0;border:1px solid #fed7aa">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px">
          <span style="color:#6b7280;font-size:13px">Order ID</span>
          <span style="color:#f97316;font-weight:700;font-size:13px">#${orderUUID.slice(0,8).toUpperCase()}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:#6b7280;font-size:13px">Queue Position</span>
          <span style="color:#1a1a1a;font-weight:700;font-size:13px">#${queuePos}</span>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead>
          <tr style="background:#f97316">
            <th style="padding:10px 12px;text-align:left;color:#fff;font-size:13px;border-radius:8px 0 0 0">Item</th>
            <th style="padding:10px 12px;text-align:center;color:#fff;font-size:13px">Qty</th>
            <th style="padding:10px 12px;text-align:right;color:#fff;font-size:13px;border-radius:0 8px 0 0">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:10px 12px;font-weight:700;color:#1a1a1a">Total</td>
            <td style="padding:10px 12px;font-weight:700;color:#f97316;text-align:right">₹${total}</td>
          </tr>
        </tfoot>
      </table>

      <div style="background:#fef3c7;border-radius:12px;padding:14px;text-align:center;margin-top:16px">
        <p style="color:#92400e;font-size:13px;margin:0">⏳ We'll email you again when your order is ready for pickup!</p>
      </div>

      <hr style="border:none;border-top:1px solid #fed7aa;margin:24px 0"/>
      <p style="color:#9ca3af;font-size:12px;text-align:center">KLE Canteen App · KLE Technological University</p>
    </div>
  `;

  return sendEmail(email, `Order Confirmed #${orderUUID.slice(0,8).toUpperCase()} — ${stallName}`, html);
};

const orderReadyEmail = async (email, name, orderUUID, stallName) => {
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#fff8f0;border-radius:16px;border:1px solid #fed7aa">
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:56px">🎉</div>
        <h2 style="color:#1a1a1a;margin:12px 0 4px">Your Order is Ready!</h2>
        <p style="color:#6b7280;font-size:14px;margin:0">KLE Technological University Canteen</p>
      </div>

      <p style="color:#374151;font-size:15px">Hi <strong>${name}</strong>,</p>
      <p style="color:#374151;font-size:15px">Your order at <strong>${stallName}</strong> is ready for pickup! 🍽️</p>

      <div style="background:#f97316;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
        <p style="color:#fff;font-size:13px;margin:0 0 6px">Order ID</p>
        <p style="color:#fff;font-size:28px;font-weight:800;margin:0;letter-spacing:4px">#${orderUUID.slice(0,8).toUpperCase()}</p>
      </div>

      <div style="background:#dcfce7;border-radius:12px;padding:14px;text-align:center">
        <p style="color:#166534;font-size:14px;font-weight:600;margin:0">🏃 Please collect your order from the counter now!</p>
      </div>

      <hr style="border:none;border-top:1px solid #fed7aa;margin:24px 0"/>
      <p style="color:#9ca3af;font-size:12px;text-align:center">KLE Canteen App · KLE Technological University</p>
    </div>
  `;

  return sendEmail(email, `🎉 Order Ready! #${orderUUID.slice(0,8).toUpperCase()} — ${stallName}`, html);
};

module.exports = { sendEmail, orderConfirmedEmail, orderReadyEmail };