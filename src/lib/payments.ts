import type { PaymentDetails } from "./types";

export function walletLabel(t: string | null | undefined) {
  switch (t) {
    case "jazzcash":
      return "JazzCash";
    case "easypaisa":
      return "Easypaisa";
    case "sadapay":
      return "SadaPay";
    case "nayapay":
      return "NayaPay";
    default:
      return "Wallet";
  }
}

export type PaymentMethod = { key: string; label: string; value: string; hint?: string };

/** Payment methods an organizer has set up, in the order payers should see them. */
export function paymentMethods(p: Partial<PaymentDetails> | null | undefined): PaymentMethod[] {
  if (!p) return [];
  const out: PaymentMethod[] = [];
  if (p.raast_id) out.push({ key: "raast", label: "Raast ID", value: p.raast_id, hint: "Works from any bank app" });
  if (p.wallet_number) out.push({ key: "wallet", label: walletLabel(p.wallet_type), value: p.wallet_number });
  if (p.iban) out.push({ key: "iban", label: "Bank IBAN", value: p.iban, hint: formatIban(p.iban) });
  return out;
}

export function formatIban(iban: string) {
  return iban.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}
