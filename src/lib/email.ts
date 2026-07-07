/**
 * Email sender — SMTP via nodemailer (works with Amazon SES SMTP, Resend,
 * Postmark, Mailgun, your own Postfix, etc.) with a dev-mode fallback.
 *
 * Behavior:
 * - Production (SMTP env vars set): opens a nodemailer transport and
 *   sends the email. From-address comes from EMAIL_FROM.
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

import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/lib/env";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "opencode.guru";

let _transporter: Transporter | null = null;

/**
 * Lazily build the nodemailer SMTP transport.
 * Returns null when credentials are missing so the rest of the email
 * pipeline falls back to console logging.
 *
 * Provider detection:
 *  - If EMAIL_SERVER_HOST is set, use that verbatim (works for any SMTP
 *    provider: SES, Resend, Postmark, Mailgun, self-hosted Postfix, …).
 *  - Otherwise, if AWS_SES_REGION is set, default to the SES SMTP endpoint
 *    for that region (email-smtp.<region>.amazonaws.com:587).
 *  - Otherwise, return null → console fallback.
 */
function getTransport(): Transporter | null {
  if (_transporter) return _transporter;

  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD;

  if (!user || !pass) {
    // Try the implicit SES SMTP path if AWS_SES_REGION is configured
    // AND SMTP creds exist (AWS generates them in the SES console).
    const region = process.env.AWS_SES_REGION;
    const sesUser = process.env.AWS_SES_SMTP_USER;
    const sesPass = process.env.AWS_SES_SMTP_PASSWORD;
    if (region && sesUser && sesPass) {
      _transporter = nodemailer.createTransport({
        host: `email-smtp.${region}.amazonaws.com`,
        port: 587,
        secure: false, // STARTTLS
        requireTLS: true,
        auth: { user: sesUser, pass: sesPass },
      });
      return _transporter;
    }
    return null;
  }

  const host = process.env.EMAIL_SERVER_HOST;
  const port = Number(process.env.EMAIL_SERVER_PORT ?? "587");
  const secure = process.env.EMAIL_SERVER_SECURE === "true"; // true = 465 SSL

  _transporter = nodemailer.createTransport({
    host: host ?? "localhost",
    port,
    secure,
    requireTLS: !secure && port === 587,
    auth: { user, pass },
  });
  return _transporter;
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
  /** Set true in dev to bypass SMTP even if configured. */
  forceConsole?: boolean;
}

export interface SendEmailResult {
  ok: boolean;
  messageId?: string;
  /** "smtp" if sent through SMTP, "console" if logged only. */
  channel: "smtp" | "console";
  error?: string;
}

/**
 * Send an email. Returns a result object; never throws.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  // Dev / unconfigured: log instead of crashing.
  if (input.forceConsole || env.NODE_ENV !== "production") {
    const transport = getTransport();
    const from = getFromAddress();
    if (!transport || !from) {
      console.log(
        `\n[email:console] to=${input.to} subject="${input.subject}"\n` +
          `--- text ---\n${input.text}\n` +
          `--- html ---\n${input.html}\n`,
      );
      return { ok: true, channel: "console" };
    }
    // Fall through to SMTP if creds + from are present, even in dev.
  }

  const transport = getTransport();
  const from = getFromAddress();
  if (!transport || !from) {
    console.warn(
      `[email] SMTP not configured — falling back to console.\n` +
        `  to:      ${input.to}\n` +
        `  subject: ${input.subject}\n` +
        `  Set EMAIL_SERVER_HOST + EMAIL_SERVER_USER + EMAIL_SERVER_PASSWORD + EMAIL_FROM in env.`,
    );
    console.log(`[email:console]\n${input.text}`);
    return {
      ok: true,
      channel: "console",
      error: "SMTP not configured",
    };
  }

  try {
    const info = await transport.sendMail({
      from,
      to: input.to,
      replyTo: input.replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    console.log(
      `[email:smtp] sent to=${input.to} subject="${input.subject}" messageId=${info.messageId}`,
    );
    return { ok: true, channel: "smtp", messageId: info.messageId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[email:smtp] FAILED to=${input.to}: ${msg}`);
    return { ok: false, channel: "smtp", error: msg };
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
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.55;color:#d4d4d8;">${
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