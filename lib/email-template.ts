type EmailDetail = { label: string; value: string };

type EmailTemplate = {
  preview: string;
  title: string;
  intro: string;
  action?: { label: string; url: string };
  details?: EmailDetail[];
  message?: { label?: string; body: string };
  notice?: string;
  footer: string;
};

export const escapeEmailHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const text = (value: string) => escapeEmailHtml(value).replaceAll('\n', '<br>');

export function renderSitterfolioEmail(input: EmailTemplate) {
  const details = input.details?.filter((detail) => detail.value);
  const actionUrl = input.action ? escapeEmailHtml(input.action.url) : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeEmailHtml(input.title)}</title>
  </head>
  <body style="margin:0;background:#f7faf8;color:#16241f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeEmailHtml(input.preview)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#f7faf8;">
      <tr>
        <td align="center" style="padding:28px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:520px;background:#ffffff;border:1px solid #dce8e1;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:20px 24px;border-bottom:1px solid #e5ede8;">
                <span style="color:#173f33;font-size:16px;font-weight:700;letter-spacing:-.2px;">Sitterfolio</span>
                <span style="color:#54a879;font-size:18px;line-height:0;">&nbsp;&bull;</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px 24px;">
                <h1 style="margin:0;color:#16241f;font-size:26px;line-height:1.2;font-weight:700;letter-spacing:-.5px;">${escapeEmailHtml(input.title)}</h1>
                <p style="margin:12px 0 0;color:#53645e;font-size:15px;line-height:1.6;">${text(input.intro)}</p>
                ${details?.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin-top:22px;border-top:1px solid #e5ede8;">${details.map((detail) => `<tr><td style="width:116px;padding:10px 12px 10px 0;border-bottom:1px solid #e5ede8;color:#6a7974;font-size:12px;line-height:1.45;vertical-align:top;">${escapeEmailHtml(detail.label)}</td><td style="padding:10px 0;border-bottom:1px solid #e5ede8;color:#24342e;font-size:14px;line-height:1.45;vertical-align:top;">${text(detail.value)}</td></tr>`).join('')}</table>` : ''}
                ${input.message ? `<div style="margin-top:22px;padding:16px 18px;background:#f0f7f3;border-radius:10px;color:#31473f;font-size:14px;line-height:1.55;">${input.message.label ? `<p style="margin:0 0 6px;color:#667770;font-size:11px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;">${escapeEmailHtml(input.message.label)}</p>` : ''}<p style="margin:0;">${text(input.message.body)}</p></div>` : ''}
                ${input.action ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr><td style="border-radius:8px;background:#1f624d;"><a href="${actionUrl}" style="display:inline-block;padding:12px 18px;color:#ffffff;font-size:14px;font-weight:700;line-height:1.2;text-decoration:none;">${escapeEmailHtml(input.action.label)}</a></td></tr></table><p style="margin:14px 0 0;color:#74827d;font-size:11px;line-height:1.5;word-break:break-all;">Or open: <a href="${actionUrl}" style="color:#28725e;text-decoration:underline;">${actionUrl}</a></p>` : ''}
                ${input.notice ? `<p style="margin:22px 0 0;padding-top:18px;border-top:1px solid #e5ede8;color:#667770;font-size:12px;line-height:1.55;">${text(input.notice)}</p>` : ''}
              </td>
            </tr>
          </table>
          <p style="margin:14px 0 0;color:#7c8a85;font-size:11px;line-height:1.5;">${escapeEmailHtml(input.footer)}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
