type Destination = { email: string } | { phone: string };

export function isOtpDeliveryConfigured(destination: Destination) {
  return "email" in destination
    ? Boolean(process.env.RESEND_API_KEY && process.env.OTP_EMAIL_FROM)
    : Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_SMS_FROM);
}

export async function deliverOtp(destination: Destination, code: string) {
  if ("email" in destination) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.OTP_EMAIL_FROM;
    if (!apiKey || !from) throw new Error("Email OTP delivery is not configured");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [destination.email],
        subject: "Your Takapay verification code",
        text: `Your verification code is ${code}. It expires in 10 minutes.`,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`OTP email provider returned HTTP ${response.status}`);
    return;
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SMS_FROM;
  if (!sid || !token || !from) throw new Error("Phone OTP delivery is not configured");
  const body = new URLSearchParams({
    To: destination.phone,
    From: from,
    Body: `Takapay verification code: ${code}. Expires in 10 minutes.`,
  });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`OTP SMS provider returned HTTP ${response.status}`);
}
