"use client";

import { useActionState } from "react";
import type { Profile } from "@/lib/types";
import { Card, Field, Input, Select, Alert } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { updateProfile, type ProfileFormState } from "./actions";

const initial: ProfileFormState = { ok: true };

export function ProfileForm({
  profile,
  email,
  next,
}: {
  profile: Profile | null;
  email: string | null;
  next?: string;
}) {
  const [state, action] = useActionState(updateProfile, initial);

  return (
    <form action={action} className="space-y-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.saved ? <Alert tone="success">Saved. Friends will see these details on your splits.</Alert> : null}

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">About you</h2>
        <Field label="Your name" htmlFor="name" hint="Shown as the organizer on every split.">
          <Input id="name" name="name" defaultValue={profile?.name ?? ""} placeholder="e.g. Faisal" required autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="email" hint="Used for login and confirmation notifications.">
          <Input id="email" value={email ?? ""} disabled />
        </Field>
        <label className="flex items-start gap-3 text-[15px] cursor-pointer">
          <input
            type="checkbox"
            name="notify_email"
            defaultChecked={profile?.notify_email ?? true}
            className="mt-1 h-4 w-4 rounded border-stone-300 accent-emerald-600"
          />
          <span>
            Email me when a friend marks their share as paid
            <span className="block text-sm text-stone-500">Only when email sending is configured on the server.</span>
          </span>
        </label>
      </Card>

      <Card className="p-5 space-y-4">
        <div>
          <h2 className="font-semibold">How friends pay you</h2>
          <p className="text-sm text-stone-500 mt-0.5">At least one is required. Friends get one-tap copy buttons for each.</p>
        </div>
        <Field label="Raast ID" htmlFor="raast_id" hint="Usually your mobile number, e.g. 03001234567">
          <Input id="raast_id" name="raast_id" defaultValue={profile?.raast_id ?? ""} inputMode="tel" placeholder="03001234567" />
        </Field>
        <Field label="Bank IBAN" htmlFor="iban">
          <Input
            id="iban"
            name="iban"
            defaultValue={profile?.iban ?? ""}
            placeholder="PK36 SCBL 0000 0011 2345 6702"
            className="font-mono uppercase"
            autoCapitalize="characters"
          />
        </Field>
        <div className="grid grid-cols-[1fr_1.6fr] gap-3">
          <Field label="Wallet" htmlFor="wallet_type">
            <Select id="wallet_type" name="wallet_type" defaultValue={profile?.wallet_type ?? ""}>
              <option value="">None</option>
              <option value="easypaisa">Easypaisa</option>
              <option value="jazzcash">JazzCash</option>
              <option value="sadapay">SadaPay</option>
              <option value="nayapay">NayaPay</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Wallet number" htmlFor="wallet_number">
            <Input id="wallet_number" name="wallet_number" defaultValue={profile?.wallet_number ?? ""} inputMode="tel" placeholder="03001234567" />
          </Field>
        </div>
        <Field label="WhatsApp number (optional)" htmlFor="phone" hint="Not shown to friends. Reserved for future reminders.">
          <Input id="phone" name="phone" defaultValue={profile?.phone ?? ""} inputMode="tel" placeholder="923001234567" />
        </Field>
      </Card>

      <SubmitButton size="lg" className="w-full" pendingText="Saving…">
        {next ? "Save and continue" : "Save profile"}
      </SubmitButton>
    </form>
  );
}
