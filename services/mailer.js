// services/mailer.js — Send OTP emails via Resend HTTP API (works on Render free tier)

const sendOTP = async (email, otp, name) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'KLE Canteen <onboarding@resend.dev>',
      to: [email],
      subject: `${otp} is your KLE Canteen login OTP`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#fff8f0;border-radius:16px;border:1px solid #fed7aa">
          <div style="text-align:center;margin-bottom:24px">
            <div style="background:#f97316;width:56px;height:56px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin:auto">
              <span style="font-size:28px">🍽️</span>
            </div>
            <h2 style="color:#1a1a1a;margin:12px 0 4px">KLE Canteen</h2>
            <p style="color:#6b7280;font-size:14px;margin:0">KLE Technological University</p>
          </div>
          <p style="color:#374151;font-size:15px">Hi ${name || 'there'},</p>
          <p style="color:#374151;font-size:15px">Your one-time login code is:</p>
          <div style="background:#fff;border:2px solid #f97316;border-radius:12px;text-align:center;padding:20px;margin:20px 0">
            <span style="font-size:40px;font-weight:800;letter-spacing:10px;color:#f97316">${otp}</span>
          </div>
          <p style="color:#6b7280;font-size:13px">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
          <hr style="border:none;border-top:1px solid #fed7aa;margin:24px 0"/>
          <p style="color:#9ca3af;font-size:12px;text-align:center">KLE Canteen App · KLE Technological University</p>
        </div>
      `,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || JSON.stringify(data));
  }
  return data;
};

module.exports = { sendOTP };