/**
 * Email sender — Amazon SES, with a dev-mode fallback.
 *
 * Behavior:
 * - Production (env vars set): uses @aws-sdk/client-ses with the configured
 *   region + IAM credentials. From-address comes from EMAIL_FROM.
 * - Dev / unconfigured: logs the message to the server console (no crash).
 *
 * Use:
 *   await sendEmail({
 *     to: "user@example.com",
 *     subject: "Confirm your email",
 *     text: "Click here: ...",
 *     html: "<p>Click here: ...</p>",
 *   });
 *
 * Errors are caught and logged; we never throw to the caller because a
 * missing email is usually non-fatal — the user can retry.
 */

import { SESClient, SendEmailCommand, type SendEmailCommandInput } from "@aws-sdk/client-ses";
import { env } from "@/lib/env";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "opencode.guru";

let _client: SESClient | null = null;

/**
 * Lazily build the SES client. Returns null when credentials are missing
 * so the rest of the email pipeline falls back to console logging.
 */
function getClient(): SESClient | null {
  if (_client) return _client;

  const region = process.env.AWS_SES_REGION;
  const accessKeyId = process.env.AWS_SES_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    return null;
  }

  _client = new SESClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _client;
}

function getFromAddress(): string | null {
  return process.env.EMAIL_FROM ?? null;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Optional Reply-To override. Defaults to EMAIL_FROM. */
  replyTo?: string;
  /** Set true in dev to bypass SES even if configured. */
  forceConsole?: boolean;
}

export interface SendEmailResult {
  ok: boolean;
  messageId?: string;
  /** "ses" if sent through AWS, "console" if logged only. */
  channel: "ses" | "console";
  error?: string;
}

/**
 * Send an email. Returns a result object; never throws.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  // Dev / unconfigured: log instead of crashing.
  if (input.forceConsole || env.NODE_ENV !== "production") {
    const client = getClient();
    const from = getFromAddress();
    if (!client || !from) {
      console.log(
        `\n[email:console] to=${input.to} subject="${input.subject}"\n` +
          `--- text ---\n${input.text}\n` +
          `--- html ---\n${input.html}\n`,
      );
      return { ok: true, channel: "console" };
    }
    // Fall through to SES if creds + from are present, even in dev.
  }

  const client = getClient();
  const from = getFromAddress();
  if (!client || !from) {
    console.warn(
      `[email] AWS_SES_* or EMAIL_FROM not configured — falling back to console.\n` +
        `  to:      ${input.to}\n` +
        `  subject: ${input.subject}`,
    );
    console.log(`[email:console]\n${input.text}`);
    return {
      ok: true,
      channel: "console",
      error: "SES not configured",
    };
  }

  const params: SendEmailCommandInput = {
    Source: from,
    Destination: { ToAddresses: [input.to] },
    ReplyToAddresses: input.replyTo ? [input.replyTo] : [from],
    Message: {
      Subject: { Data: input.subject, Charset: "UTF-8" },
      Body: {
        Text: { Data: input.text, Charset: "UTF-8" },
        Html: { Data: input.html, Charset: "UTF-8" },
      },
    },
  };

  try {
    const cmd = new SendEmailCommand(params);
    const out = await client.send(cmd);
    console.log(
      `[email:ses] sent to=${input.to} subject="${input.subject}" messageId=${out.MessageId ?? "?"}`,
    );
    return { ok: true, channel: "ses", messageId: out.MessageId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[email:ses] FAILED to=${input.to}: ${msg}`);
    return { ok: false, channel: "ses", error: msg };
  }
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/** Returns { text, html } for a single-button confirmation email. */
export function confirmationEmail(opts: {
  toName?: string | null;
  actionLabel: string;
  actionUrl: string;
  expiresInHours?: number;
  intro: string;
  warning?: string;
}): { subject: string; text: string; html: string } {
  const subject = `${APP_NAME} — ${opts.actionLabel}`;
  const expires = opts.expiresInHours ?? 24;

  const text = [
    opts.toName ? `Hi ${opts.toName},` : "Hi,",
    "",
    opts.intro,
    "",
    `${opts.actionLabel}:`,
    opts.actionUrl,
    "",
    `This link expires in ${expires} hour${expires === 1 ? "" : "s"}.`,
    opts.warning ?? "",
    "",
    `— The ${APP_NAME} team`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0a0a0a;color:#f5f5f6;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#141414;border:1px solid #27272a;border-radius:12px;padding:32px;text-align:left;">
            <tr><td>
              <p style="margin:0 0 16px 0;color:#a1a1aa;font-size:14px;">${APP_NAME}</p>
              <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">${escapeHtml(opts.actionLabel)}</h1>
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.55;color:#d4d4d8;">${
                opts.toName
                  ? `Hi ${escapeHtml(opts.toName)},`
                  : "Hi,"
              }</p>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.55;color:#d4d4d8;">${escapeHtml(
                opts.intro,
              )}</p>
              <p style="margin:0 0 24px 0;" align="center">
                <a href="${escapeAttr(opts.actionUrl)}" style="display:inline-block;background:#ff2d3a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">${escapeHtml(opts.actionLabel)}</a>
              </p>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.55;color:#a1a1aa;">Or copy and paste this URL into your browser:</p>
              <p style="margin:0 0 24px 0;font-size:12px;line-height:1.5;color:#71717a;word-break:break-all;background:#0a0a0a;padding:10px 12px;border-radius:6px;border:1px solid #27272a;">${escapeHtml(
                opts.actionUrl,
              )}</p>
              <p style="margin:0 0 8px 0;font-size:12px;color:#71717a;">This link expires in ${expires} hour${expires === 1 ? "" : "s"}.</p>
              ${
                opts.warning
                  ? `<p style="margin:0 0 24px 0;font-size:12px;line-height:1.5;color:#f87171;">${escapeHtml(opts.warning)}</p>`
                  : ""
              }
              <hr style="border:none;border-top:1px solid #27272a;margin:24px 0;">
              <p style="margin:0;font-size:11px;color:#71717a;">If you didn't request this, you can safely ignore this email.</p>
            </td></tr>
          </table>
          <p style="margin:16px 0 0 0;font-size:11px;color:#52525b;">The ${APP_NAME} team</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

// ---------------------------------------------------------------------------
// HTML escaping helpers (defense in depth — never trust user content)
// ---------------------------------------------------------------------------
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function escapeAttr(s: string): string {
  return escapeHtml(s);
}