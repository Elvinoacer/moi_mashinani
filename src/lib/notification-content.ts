export type NoticeContent = {
  kind: string;
  title: string;
  body: string;
  path: string;
  button: string;
};

export function safeNotificationPath(path: string) {
  if (
    !/^\/(admin|dashboard|pro|requests|b|ambassador|merchant|deals)(\/|$|\?)/.test(path) ||
    path.includes("\\") ||
    /[\u0000-\u001f]/.test(path)
  )
    return "/dashboard";
  return path;
}
export function notificationLink(id: string) {
  return `/notifications/open/${encodeURIComponent(id)}`;
}
export function promptEligible(
  permission: string,
  declined: boolean,
  dismissedAt: number,
  now = Date.now(),
) {
  return (
    permission === "default" &&
    !declined &&
    (!dismissedAt || now - dismissedAt >= 7 * 86400000)
  );
}
export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ]!,
  );

export function notificationEmail(
  title: string,
  body: string,
  button: string,
  url: string,
  name = "",
) {
  const e = escapeHtml;
  return `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)}</title></head><body style="margin:0;background:#f7f8f2;font-family:Arial,sans-serif;color:#243b32"><div style="display:none;max-height:0;overflow:hidden">${e(body.slice(0, 160))}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:560px" cellspacing="0" cellpadding="0"><tr><td style="padding:24px 28px;background:#183e35;border-radius:18px 18px 0 0;color:#fff"><strong style="font-size:23px">MoiMashinani</strong><div style="margin-top:8px;font-size:12px;color:#dfe9cf">Your business. Your neighbourhood.</div></td></tr><tr><td style="padding:32px 28px;background:#fff;border:1px solid #dfe5d8;border-top:0;border-radius:0 0 18px 18px">${name ? `<p style="font-size:15px">Hello ${e(name)},</p>` : ""}<h1 style="font-size:25px;line-height:1.3;margin:0 0 18px">${e(title)}</h1><p style="font-size:16px;line-height:1.7;white-space:pre-line">${e(body)}</p><table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0"><tr><td bgcolor="#335e41" style="border-radius:10px;text-align:center"><a href="${e(url)}" style="display:inline-block;padding:16px 26px;border:1px solid #335e41;border-radius:10px;background:#335e41;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;mso-padding-alt:16px 26px">${e(button)}</a></td></tr></table><p style="font-size:12px;line-height:1.6;color:#667064">For your privacy, we may ask you to sign in before opening your dashboard.</p></td></tr><tr><td align="center" style="padding:22px;font-size:12px;line-height:1.7;color:#667064">Moi University · Kesses · Kenya<br>This is a service update about your MoiMashinani account.</td></tr></table></td></tr></table></body></html>`;
}
