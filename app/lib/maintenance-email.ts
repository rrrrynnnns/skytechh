import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';

type MaintenanceEmail = {
  title: string;
  description: string;
  impact: string;
  restoresAt: Date | null;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character] || character));
}

function getLogoContext() {
  const logoPath = path.join(process.cwd(), 'public', 'sky-tech-logo.png');
  const hasLocalLogo = fs.existsSync(logoPath);
  const baseUrl = (process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
  return {
    logoPath,
    hasLocalLogo,
    logoSrc: hasLocalLogo ? 'cid:skytech-logo' : `${escapeHtml(baseUrl)}/sky-tech-logo.png`,
  };
}

function formatRestoration(restoresAt: Date | null) {
  if (!restoresAt) return 'To be announced';
  return restoresAt.toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function emailHtml({ title, description, impact, restoresAt }: MaintenanceEmail, logoSrc: string) {
  const restoration = formatRestoration(restoresAt);
  const isOutage = impact.toLowerCase().includes('disabled') || impact.toLowerCase().includes('outage');
  const impactBg = isOutage ? '#fff1f2' : '#fffbeb';
  const impactBorder = isOutage ? '#fecdd3' : '#fde68a';
  const impactAccent = isOutage ? '#e11d48' : '#d97706';
  const impactText = isOutage ? '#9f1239' : '#92400e';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
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
                Official Service Advisory
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-radius:12px;background-color:${impactBg};border:1px solid ${impactBorder};border-left:4px solid ${impactAccent};">
                <tr>
                  <td style="padding:12px 16px;">
                    <div style="color:${impactText};font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;">
                      Service Impact
                    </div>
                    <div style="margin-top:3px;color:${impactText};font-size:13px;font-weight:700;">
                      ${escapeHtml(impact)}
                    </div>
                  </td>
                </tr>
              </table>

              <h1 style="margin:22px 0 0;color:#0f172a;font-size:20px;font-weight:800;line-height:1.35;letter-spacing:-0.2px;">
                ${escapeHtml(title)}
              </h1>
              <p style="margin:12px 0 0;color:#475569;font-size:14px;line-height:1.7;">
                ${escapeHtml(description)}
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border-radius:12px;background-color:#f8fafc;border:1px solid #e2e8f0;">
                <tr>
                  <td style="padding:16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="color:#64748b;font-size:12px;font-weight:600;padding-bottom:8px;">
                          Expected Restoration
                        </td>
                        <td align="right" style="color:#0f172a;font-size:13px;font-weight:700;padding-bottom:8px;">
                          ${escapeHtml(restoration)}
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="border-top:1px solid #e2e8f0;padding-top:10px;color:#64748b;font-size:12px;line-height:1.5;">
                          If your connection remains offline after this window, please restart your ONU/router or submit a support request in your Sky-Tech subscriber portal.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="border-top:1px solid #e2e8f0;background-color:#f8fafc;padding:18px 24px;">
              <p style="margin:0;color:#64748b;font-size:11px;font-weight:600;">
                Sky-Tech Home Fiber
              </p>
              <p style="margin:4px 0 0;color:#94a3b8;font-size:11px;">
                Reliable local connectivity for your home. Please do not reply to this automated advisory.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export async function sendMaintenanceAnnouncementEmail(to: string, announcement: MaintenanceEmail) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@skytech.net';
  const { logoPath, hasLocalLogo, logoSrc } = getLogoContext();
  const html = emailHtml(announcement, logoSrc);
  const text = `${announcement.title}\n\n${announcement.description}\n\nImpact: ${announcement.impact}\nExpected restoration: ${formatRestoration(announcement.restoresAt)}.`;

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
      body: JSON.stringify({ from, to: [to], subject: announcement.title, text, html, attachments }),
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
      to,
      subject: announcement.title,
      text,
      html,
      attachments: hasLocalLogo ? [{ filename: 'sky-tech-logo.png', path: logoPath, cid: 'skytech-logo' }] : undefined,
    });
    return;
  }

  throw new Error('No maintenance email provider is configured.');
}
