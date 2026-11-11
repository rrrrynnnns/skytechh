import nodemailer from 'nodemailer';

function resetUrl(token: string) {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'http://localhost:3000';
  return `${baseUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = resetUrl(token);
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@skytech.net';

  if (process.env.RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [email], subject: 'Reset your Sky-Tech password', html: `<p>Reset your Sky-Tech password by clicking the link below. This link expires in 30 minutes.</p><p><a href="${url}">Reset password</a></p>` }),
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
    await transporter.sendMail({ from, to: email, subject: 'Reset your Sky-Tech password', text: `Reset your password here: ${url}\n\nThis link expires in 30 minutes.` });
    return;
  }

  throw new Error('No password reset email provider is configured.');
}
