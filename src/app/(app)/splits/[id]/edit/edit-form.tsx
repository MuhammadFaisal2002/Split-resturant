"use client";

import * as React from "react";
import { useActionState } from "react";
import type { SplitWithShares } from "@/lib/types";
import { formatPKR, parseAmount, sum } from "@/lib/money";
import { Card, Field, Input, Textarea, Alert, Avatar, cn, inputClass, ShareStatusBadge } from "@/components/ui";
import { SubmitButton, ConfirmSubmit } from "@/components/client";
import { updateSplit, addShare, removeShare, type EditSplitState } from "../actions";

export function EditSplitForm({ split, locked }: { split: SplitWithShares; locked: boolean }) {
  const [state, action] = useActionState<EditSplitState, FormData>(updateSplit, {});
  const [total, setTotal] = React.useState(String(split.total_amount));
  const [amounts, setAmounts] = React.useState<Record<string, string>>(
    Object.fromEntries(split.shares.map((s) => [s.id, String(s.amount)]))
  );
  const totalNum = parseAmount(total) ?? 0;
  const amountSum = sum(Object.values(amounts).map((a) => parseAmount(a) ?? 0));
  const diff = totalNum - amountSum;

  function splitEqually() {
    const n = split.shares.length;
    const base = Math.floor(totalNum / n);
    const rem = totalNum - base * n;
    setAmounts(Object.fromEntries(split.shares.map((s, i) => [s.id, String(base + (i < rem ? 1 : 0))])));
  }

  return (
    <div className="space-y-5">
      <form action={action} className="space-y-5">
        <input type="hidden" name="splitId" value={split.id} />
        {state.error ? <Alert tone="error">{state.error}</Alert> : null}

        <Card className="p-5 space-y-4">
          <Field label="Title" htmlFor="title">
            <Input id="title" name="title" defaultValue={split.title} maxLength={80} required />
          </Field>
          <div className="grid grid-cols-[1.4fr_1fr] gap-3">
            <Field label="Total (PKR)" htmlFor="total">
              <Input
                id="total"
                name="total"
                inputMode="numeric"
                value={total}
                onChange={(e) => setTotal(e.target.value.replace(/[^\d]/g, ""))}
                disabled={locked}
                className="tabular-nums"
              />
            </Field>
            <Field label="Date" htmlFor="date">
              <Input id="date" name="date" type="date" defaultValue={split.split_date} />
            </Field>
          </div>
          <Field label="Note (optional)" htmlFor="note" hint="Shown to friends on the split page.">
            <Textarea id="note" name="note" defaultValue={split.note ?? ""} placeholder="e.g. Tip included. Pay by Friday please 🙏" maxLength={300} />
          </Field>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Shares</h2>
            {!locked ? (
              <button type="button" onClick={splitEqually} className="text-sm text-stone-600 underline underline-offset-2 hover:text-stone-900">
                Split equally
              </button>
            ) : null}
          </div>
          <div className="space-y-2">
            {split.shares.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <Avatar name={s.display_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[15px]">
                    {s.display_name}
                    {s.is_owner ? <span className="text-stone-400 text-xs"> (you)</span> : null}
                  </p>
                  <ShareStatusBadge status={s.status} short />
                </div>
                <div className="relative w-32">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400 text-sm">Rs</span>
                  <input
                    name={`amount_${s.id}`}
                    className={cn(inputClass, "pl-8 tabular-nums")}
                    inputMode="numeric"
                    value={amounts[s.id] ?? ""}
                    onChange={(e) => setAmounts((a) => ({ ...a, [s.id]: e.target.value.replace(/[^\d]/g, "") }))}
                    disabled={locked}
                  />
                </div>
              </div>
            ))}
          </div>
          {!locked ? (
            <p
              className={cn(
                "text-sm rounded-lg px-3 py-2",
                diff === 0 ? "bg-emerald-50 text-emerald-800" : diff > 0 ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-800"
              )}
            >
              {diff === 0
                ? `Shares add up to ${formatPKR(totalNum)}.`
                : diff > 0
                  ? `${formatPKR(diff)} unassigned.`
                  : `Over by ${formatPKR(Math.abs(diff))}.`}
            </p>
          ) : null}
        </Card>

        <SubmitButton size="lg" className="w-full" pendingText="Saving…" disabled={!locked && diff !== 0}>
          Save changes
        </SubmitButton>
      </form>

      {!locked ? (
        <Card className="p-5 space-y-3">
          <h2 className="font-semibold">People</h2>
          <form action={addShare} className="flex gap-2">
            <input type="hidden" name="splitId" value={split.id} />
            <Input name="name" placeholder="Add a person" required className="flex-1" />
            <div className="relative w-28">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400 text-sm">Rs</span>
              <Input name="amount" inputMode="numeric" placeholder="0" className="pl-8" />
            </div>
            <SubmitButton variant="secondary" pendingText="…">
              Add
            </SubmitButton>
          </form>
          <p className="text-xs text-stone-500">Adding someone increases the total by their amount. Re-balance above if needed.</p>
          <ul className="divide-y divide-stone-100">
            {split.shares
              .filter((s) => !s.is_owner && (s.status === "unpaid" || s.status === "rejected" || s.status === "waived"))
              .map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-[15px]">
                  <span>{s.display_name}</span>
                  <form action={removeShare}>
                    <input type="hidden" name="shareId" value={s.id} />
                    <ConfirmSubmit variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" message={`Remove ${s.display_name} from this split?`}>
                      Remove
                    </ConfirmSubmit>
                  </form>
                </li>
              ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
