import fs from 'node:fs';
import path from 'node:path';
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
  const safeEmail = escapeHtml(email);
  const logoPath = path.join(process.cwd(), 'public', 'sky-tech-logo.png');
  const hasLocalLogo = fs.existsSync(logoPath);
  const logoSrc = hasLocalLogo ? 'cid:skytech-logo' : `${escapeHtml(baseUrl)}/sky-tech-logo.png`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your Sky-Tech password</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:540px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.06);">
          <tr>
            <td align="center" style="background-color:#0b1630;padding:28px 24px 26px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <img src="${logoSrc}" alt="Sky-Tech" width="56" height="56" style="display:block;width:56px;height:56px;border-radius:999px;object-fit:cover;border:2px solid rgba(255,255,255,0.18);" />
                  </td>
                </tr>
              </table>
              <div style="margin-top:14px;color:#ffffff;font-size:19px;font-weight:800;letter-spacing:-0.2px;">
                Sky-Tech Home Fiber
              </div>
              <div style="display:inline-block;margin-top:8px;padding:4px 12px;border-radius:999px;background-color:rgba(56,189,248,0.14);color:#7dd3fc;font-size:10px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">
                Secure Account Access
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px 28px;">
              <h1 style="margin:0;color:#0f172a;font-size:22px;font-weight:800;line-height:1.3;letter-spacing:-0.3px;">
                Reset your password
              </h1>
              <p style="margin:12px 0 0;color:#475569;font-size:14px;line-height:1.65;">
                We received a password reset request for <strong style="color:#0f172a;">${safeEmail}</strong>. Click the button below to choose a new password for your Sky-Tech account.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:26px 0;">
                <tr>
                  <td align="center">
                    <a href="${safeUrl}" style="display:inline-block;border-radius:12px;background-color:#2166f3;padding:14px 30px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.1px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-radius:12px;background-color:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #2166f3;">
                <tr>
                  <td style="padding:14px 16px;">
                    <div style="color:#0f172a;font-size:12px;font-weight:700;">
                      This link expires in 30 minutes
                    </div>
                    <div style="margin-top:4px;color:#64748b;font-size:12px;line-height:1.55;">
                      If you did not request a password reset, you can safely ignore this email—your current password will remain unchanged.
                    </div>
                  </td>
                </tr>
              </table>

              <div style="margin-top:22px;">
                <p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:600;">
                  Button not working? Copy and paste this link into your browser:
                </p>
                <div style="border-radius:10px;background-color:#f8fafc;border:1px solid #e2e8f0;padding:10px 12px;">
                  <a href="${safeUrl}" style="color:#2166f3;font-size:11px;line-height:1.5;word-break:break-all;text-decoration:none;">
                    ${safeUrl}
                  </a>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="border-top:1px solid #e2e8f0;background-color:#f8fafc;padding:18px 24px;">
              <p style="margin:0;color:#64748b;font-size:11px;font-weight:600;">
                Sky-Tech Home Fiber
              </p>
              <p style="margin:4px 0 0;color:#94a3b8;font-size:11px;">
                Reliable local connectivity for your home. Please do not reply to this automated message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const text = `Reset your Sky-Tech password for ${email}: ${url}\n\nThis link expires in 30 minutes. If you did not request this change, you can safely ignore this email.`;

  if (process.env.RESEND_API_KEY) {
    const attachments = hasLocalLogo
      ? [
          {
            filename: 'sky-tech-logo.png',
            content: fs.readFileSync(logoPath).toString('base64'),
            content_id: 'skytech-logo',
          },
        ]
      : undefined;
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [email], subject: 'Reset your Sky-Tech password', text, html, attachments }),
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
    await transporter.sendMail({
      from,
      to: email,
      subject: 'Reset your Sky-Tech password',
      text,
      html,
      attachments: hasLocalLogo ? [{ filename: 'sky-tech-logo.png', path: logoPath, cid: 'skytech-logo' }] : undefined,
    });
    return;
  }

  throw new Error('No password reset email provider is configured.');
}
