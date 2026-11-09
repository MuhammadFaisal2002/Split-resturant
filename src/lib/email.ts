import "server-only";
import { formatPKR } from "./money";
import { APP_NAME, appUrl } from "./app";

/**
 * Sends the organizer an email when a payer marks their share as paid.
 * No-op unless RESEND_API_KEY is set. Never throws.
 */
export async function sendMarkedPaidEmail(opts: {
  to: string;
  organizerName: string | null;
  payerName: string;
  amount: number;
  title: string;
  splitId: string;
  note?: string | null;
  hasScreenshot: boolean;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(key);
    const link = appUrl(`/splits/${opts.splitId}`);
    await resend.emails.send({
      from: process.env.RESEND_FROM || `${APP_NAME} <onboarding@resend.dev>`,
      to: opts.to,
      subject: `${opts.payerName} marked ${formatPKR(opts.amount)} as paid · ${opts.title}`,
      text:
        `Hi ${opts.organizerName ?? ""},\n\n` +
        `${opts.payerName} says they've paid ${formatPKR(opts.amount)} for "${opts.title}".\n` +
        (opts.note ? `Note: ${opts.note}\n` : "") +
        (opts.hasScreenshot ? `They attached a screenshot.\n` : "") +
        `\nConfirm or reject here: ${link}\n\n— ${APP_NAME}`,
    });
  } catch (err) {
    console.error("[email] failed to send", err);
  }
}
