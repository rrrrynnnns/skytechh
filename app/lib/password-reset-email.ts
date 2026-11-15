import nodemailer from 'nodemailer';

function resetUrl(token: string) {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'http://localhost:3000';
  return `${baseUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character] || character));
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = resetUrl(token);
  const baseUrl = url.split('/reset-password?', 1)[0];
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@skytech.net';
  const safeUrl = escapeHtml(url);
  const html = `<div style="margin:0;background:#f1f5f9;padding:24px 12px;font-family:Arial,sans-serif;color:#172238"><div style="margin:0 auto;max-width:520px;border:1px solid #dbe5f0;border-radius:16px;background:#ffffff;overflow:hidden"><div style="background:#071329;padding:20px 24px;text-align:center"><img src="${baseUrl}/sky-tech-logo.png" alt="Sky-Tech" width="44" height="44" style="display:inline-block;border-radius:50%;vertical-align:middle"><div style="margin-top:8px;color:#ffffff;font-size:18px;font-weight:700">Sky-Tech Home Fiber</div><div style="margin-top:4px;color:#bae6fd;font-size:11px;letter-spacing:1.2px;text-transform:uppercase">Secure account access</div></div><div style="padding:26px 24px"><h1 style="margin:0;color:#071329;font-size:22px;line-height:1.25">Reset your password</h1><p style="margin:12px 0 0;color:#475569;font-size:14px;line-height:1.6">We received a request to reset your Sky-Tech account password. Click the button below to choose a new password.</p><div style="margin:22px 0;text-align:center"><a href="${safeUrl}" style="display:inline-block;border-radius:9px;background:#0284c7;padding:12px 22px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">Reset password</a></div><div style="border-radius:10px;background:#f0f9ff;padding:12px 14px;color:#0369a1;font-size:12px;line-height:1.5"><strong>This link expires in 30 minutes.</strong><br>If you did not request this change, you can safely ignore this email.</div><p style="margin:18px 0 0;color:#64748b;font-size:11px;line-height:1.5">If the button does not work, copy and paste this link into your browser:<br><a href="${safeUrl}" style="color:#0284c7;word-break:break-all">${safeUrl}</a></p><p style="border-top:1px solid #e2e8f0;margin:22px 0 0;padding:14px 0 0;text-align:center;color:#94a3b8;font-size:11px;line-height:1.5">Sky-Tech Home Fiber<br>Reliable local connectivity for your home.</p></div></div></div>`;
  const text = `Reset your Sky-Tech password here: ${url}\n\nThis link expires in 30 minutes. If you did not request this change, you can safely ignore this email.`;

  if (process.env.RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [email], subject: 'Reset your Sky-Tech password', text, html }),
    });
    if (!response.ok) throw new Error(`Resend returned ${response.status}.`);
    return;
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
    await transporter.sendMail({ from, to: email, subject: 'Reset your Sky-Tech password', text, html });
    return;
  }

  throw new Error('No password reset email provider is configured.');
}
