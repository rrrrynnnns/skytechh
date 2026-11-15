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

function emailHtml({ title, description, impact, restoresAt }: MaintenanceEmail) {
  const restoration = restoresAt
    ? `Expected restoration: ${restoresAt.toLocaleString('en-PH')}.`
    : 'Restoration time will be announced.';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#172238"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;border:1px solid #dbe5f0;border-radius:16px;background:#ffffff"><tr><td align="center" style="background:#071329;padding:24px"><div style="color:#ffffff;font-size:18px;font-weight:700">Sky-Tech Home Fiber</div><div style="margin-top:5px;color:#bae6fd;font-size:11px;letter-spacing:1.2px;text-transform:uppercase">Official service advisory</div></td></tr><tr><td style="padding:26px 24px"><h1 style="margin:0;color:#071329;font-size:22px;line-height:1.25">Sky-Tech Fiber Service Advisory</h1><p style="margin:12px 0 0;color:#172238;font-size:15px;font-weight:700;line-height:1.5">${escapeHtml(title)}</p><p style="margin:14px 0 0;color:#475569;font-size:14px;line-height:1.65">${escapeHtml(description)}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px"><tr><td style="border-radius:10px;background:#fff7ed;padding:12px 14px;color:#9a3412;font-size:12px;line-height:1.5"><strong>Impact:</strong> ${escapeHtml(impact)}</td></tr></table><p style="margin:18px 0 0;color:#475569;font-size:13px;line-height:1.5">${escapeHtml(restoration)}</p><p style="border-top:1px solid #e2e8f0;margin:22px 0 0;padding:14px 0 0;text-align:center;color:#94a3b8;font-size:11px;line-height:1.5">Sky-Tech Home Fiber<br>Reliable local connectivity for your home.</p></td></tr></table></td></tr></table>`;
}

export async function sendMaintenanceAnnouncementEmail(to: string, announcement: MaintenanceEmail) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@skytech.net';
  const html = emailHtml(announcement);

  if (process.env.RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject: announcement.title, html }),
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
      text: `${announcement.description}\n\nImpact: ${announcement.impact}\n${announcement.restoresAt ? `Expected restoration: ${announcement.restoresAt.toLocaleString('en-PH')}.` : 'Restoration time will be announced.'}`,
      html,
    });
    return;
  }

  throw new Error('No maintenance email provider is configured.');
}
