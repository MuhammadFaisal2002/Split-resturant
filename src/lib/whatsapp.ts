import { formatPKR } from "./money";
import { APP_NAME, splitUrl } from "./app";

export function waLink(text: string, phone?: string | null): string {
  const base = phone ? `https://wa.me/${phone.replace(/\D/g, "")}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function shareMessage(opts: {
  title: string;
  total: number;
  peopleCount: number;
  organizerName: string | null;
  shortCode: string;
}): string {
  const who = opts.organizerName ? `${opts.organizerName} ne` : "Maine";
  return (
    `*${opts.title}* — ${formatPKR(opts.total)} total, ${opts.peopleCount} logon mein split.\n` +
    `${who} bill pay kiya hai. Apna share aur pay details yahan dekhein:\n` +
    `${splitUrl(opts.shortCode)}`
  );
}

export function reminderMessage(opts: {
  title: string;
  unpaid: { name: string; amount: number }[];
  shortCode: string;
}): string {
  const lines = opts.unpaid.map((u) => `• ${u.name}: ${formatPKR(u.amount)}`).join("\n");
  return (
    `Reminder from ${APP_NAME}: *${opts.title}* mein abhi pending hai:\n` +
    `${lines}\n` +
    `Pay details & status: ${splitUrl(opts.shortCode)}`
  );
}

export function personalReminderMessage(opts: {
  title: string;
  amount: number;
  shortCode: string;
}): string {
  return (
    `Reminder from ${APP_NAME}: ${formatPKR(opts.amount)} pending for *${opts.title}*. ` +
    `Pay details & status: ${splitUrl(opts.shortCode)}`
  );
}
