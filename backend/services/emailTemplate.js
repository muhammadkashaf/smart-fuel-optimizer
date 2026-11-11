const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
})[character]);

export function emailTemplate({ title, preheader, message, code, expiryMinutes, securityMessage }) {
  const content = {
    title: escapeHtml(title),
    preheader: escapeHtml(preheader),
    message: escapeHtml(message),
    code: escapeHtml(code),
    expiry: escapeHtml(expiryMinutes),
    securityMessage: escapeHtml(securityMessage),
  };

  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${content.title}</title></head>
  <body style="margin:0;padding:0;background-color:#f3f5f9;color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;font-size:1px;line-height:1px;color:#f3f5f9;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${content.preheader}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;background-color:#f3f5f9;">
      <tr><td align="center" style="padding:32px 16px;">
        <!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560"><tr><td><![endif]-->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;max-width:560px;border-collapse:separate;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;">
          <tr><td style="padding:28px 32px 22px;border-bottom:1px solid #e2e8f0;">
            <p style="margin:0;color:#2563eb;font-size:22px;line-height:28px;font-weight:700;letter-spacing:-0.4px;">SmartFuel</p>
            <p style="margin:4px 0 0;color:#64748b;font-size:12px;line-height:18px;">Fuel &amp; Vehicle Management</p>
          </td></tr>
          <tr><td style="padding:30px 32px 32px;">
            <h1 style="margin:0 0 12px;color:#0f172a;font-size:24px;line-height:32px;font-weight:700;">${content.title}</h1>
            <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:24px;">${content.message}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:separate;background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;">
              <tr><td align="center" style="padding:22px 8px;color:#1d4ed8;font-family:Arial,Helvetica,sans-serif;font-size:32px;line-height:40px;font-weight:700;letter-spacing:6px;white-space:nowrap;">${content.code}</td></tr>
            </table>
            <p style="margin:20px 0 0;color:#334155;font-size:14px;line-height:22px;">This code expires in ${content.expiry} minutes.</p>
            <p style="margin:22px 0 0;padding-top:20px;border-top:1px solid #e2e8f0;color:#64748b;font-size:13px;line-height:21px;">${content.securityMessage}</p>
          </td></tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;max-width:560px;border-collapse:collapse;">
          <tr><td align="center" style="padding:20px 16px;color:#64748b;font-size:12px;line-height:19px;">
            <strong style="color:#475569;">SmartFuel</strong><br>Fuel &amp; Vehicle Management<br><br>
            This is an automated email. Please do not reply.
          </td></tr>
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `SmartFuel\nFuel & Vehicle Management\n\n${title}\n\n${message}\n\n${code}\n\nThis code expires in ${expiryMinutes} minutes.\n\n${securityMessage}\n\nThis is an automated email. Please do not reply.`;

  return { html, text };
}
