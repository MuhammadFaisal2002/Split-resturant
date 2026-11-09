"use client";

import * as React from "react";
import { useActionState } from "react";
import { formatPKR, parseAmount, splitEqual, sum } from "@/lib/money";
import type { PaymentDetails } from "@/lib/types";
import { walletLabel } from "@/lib/payments";
import { Card, Field, Input, Alert, Avatar, cn, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { createSplit, type NewSplitState, type NewSplitPayload } from "./actions";

type Person = { id: number; name: string; amount: string };
type GroupOption = { id: string; name: string; members: string[] };

let nextId = 1;
const newPerson = (name = "", amount = ""): Person => ({ id: nextId++, name, amount });

export function NewSplitForm({
  organizerName,
  groups,
  paymentSummary,
}: {
  organizerName: string;
  groups: GroupOption[];
  paymentSummary: Omit<PaymentDetails, "name">;
}) {
  const [state, action] = useActionState<NewSplitState, FormData>(createSplit, {});

  const [title, setTitle] = React.useState("");
  const [total, setTotal] = React.useState("");
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [splitType, setSplitType] = React.useState<"equal" | "custom">("equal");
  const [includeSelf, setIncludeSelf] = React.useState(true);
  const [people, setPeople] = React.useState<Person[]>([newPerson(), newPerson()]);
  const [saveGroup, setSaveGroup] = React.useState(false);
  const [saveGroupAs, setSaveGroupAs] = React.useState("");
  const [usedGroup, setUsedGroup] = React.useState<string | null>(null);
  const nameInputs = React.useRef<Map<number, HTMLInputElement>>(new Map());

  const totalNum = parseAmount(total) ?? 0;
  const namedPeople = people.filter((p) => p.name.trim());
  const count = namedPeople.length + (includeSelf ? 1 : 0);

  // Equal preview (organizer first gets any remainder rupee, matching the server).
  const equalAmounts = React.useMemo(() => splitEqual(totalNum, count), [totalNum, count]);

  // Custom: live remainder.
  const customSum = sum(namedPeople.map((p) => parseAmount(p.amount) ?? 0));
  const remainder = totalNum - customSum;
  const customValid =
    splitType !== "custom" ||
    (includeSelf ? remainder >= 0 : remainder === 0) &&
      namedPeople.every((p) => parseAmount(p.amount) !== null);

  function updatePerson(id: number, patch: Partial<Person>) {
    setPeople((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function removePerson(id: number) {
    setPeople((ps) => (ps.length > 1 ? ps.filter((p) => p.id !== id) : ps));
  }
  function addPerson(focus = true) {
    const p = newPerson();
    setPeople((ps) => [...ps, p]);
    if (focus) requestAnimationFrame(() => nameInputs.current.get(p.id)?.focus());
  }
  function applyGroup(g: GroupOption) {
    setPeople(g.members.map((m) => newPerson(m)));
    setUsedGroup(g.id);
    setSaveGroup(false);
  }
  function onNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>, idx: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (idx === people.length - 1) addPerson();
      else nameInputs.current.get(people[idx + 1].id)?.focus();
    }
  }

  const payload: NewSplitPayload = {
    title,
    total,
    date,
    splitType,
    includeSelf,
    people: namedPeople.map((p) => ({ name: p.name, amount: p.amount })),
    saveGroupAs: saveGroup && !usedGroup ? saveGroupAs : undefined,
  };

  const canSubmit = title.trim() && totalNum > 0 && namedPeople.length > 0 && customValid;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      {/* Bill */}
      <Card className="p-5 space-y-4">
        <Field label="What was it?" htmlFor="title">
          <Input
            id="title"
            placeholder="Dinner at Kolachi"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            autoFocus
          />
        </Field>
        <div className="grid grid-cols-[1.4fr_1fr] gap-3">
          <Field label="Total bill (PKR)" htmlFor="total">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-stone-400 text-[15px]">Rs</span>
              <Input
                id="total"
                inputMode="numeric"
                placeholder="11,400"
                className="pl-10 tabular-nums"
                value={total}
                onChange={(e) => setTotal(e.target.value.replace(/[^\d,]/g, ""))}
                onBlur={() => totalNum > 0 && setTotal(totalNum.toLocaleString("en-PK"))}
              />
            </div>
          </Field>
          <Field label="Date" htmlFor="date">
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
          </Field>
        </div>
      </Card>

      {/* People */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Who’s in?</h2>
          {groups.length ? (
            <select
              className="h-9 rounded-lg border border-stone-200 bg-white px-2 text-sm"
              value=""
              onChange={(e) => {
                const g = groups.find((x) => x.id === e.target.value);
                if (g) applyGroup(g);
              }}
            >
              <option value="">Use a saved group…</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.members.length})
                </option>
              ))}
            </select>
          ) : null}
        </div>

        <label className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 border border-stone-200 px-3.5 py-3 cursor-pointer">
          <span className="flex items-center gap-3 min-w-0">
            <Avatar name={organizerName} size="sm" />
            <span className="min-w-0">
              <span className="block font-medium truncate">{organizerName} (you)</span>
              <span className="block text-xs text-stone-500">
                {includeSelf ? "Included in the split" : "Not paying a share"}
              </span>
            </span>
          </span>
          <Toggle checked={includeSelf} onChange={setIncludeSelf} />
        </label>

        <div className="space-y-2">
          {people.map((p, idx) => {
            const shareIdx = namedIndex(people, idx, includeSelf);
            return (
              <div key={p.id} className="flex items-center gap-2">
                <Avatar name={p.name || "?"} size="sm" />
                <input
                  ref={(el) => {
                    if (el) nameInputs.current.set(p.id, el);
                    else nameInputs.current.delete(p.id);
                  }}
                  className={cn(inputClass, "flex-1 min-w-0")}
                  placeholder={idx === 0 ? "Ali" : idx === 1 ? "Sara" : "Name"}
                  value={p.name}
                  onChange={(e) => {
                    updatePerson(p.id, { name: e.target.value });
                    setUsedGroup(null);
                  }}
                  onKeyDown={(e) => onNameKeyDown(e, idx)}
                  autoComplete="off"
                  autoCapitalize="words"
                />
                {splitType === "custom" ? (
                  <div className="relative w-32">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400 text-sm">Rs</span>
                    <input
                      className={cn(inputClass, "pl-8 tabular-nums")}
                      inputMode="numeric"
                      placeholder="0"
                      value={p.amount}
                      onChange={(e) => updatePerson(p.id, { amount: e.target.value.replace(/[^\d]/g, "") })}
                    />
                  </div>
                ) : (
                  <span className="w-28 text-right text-sm text-stone-600 tabular-nums pr-1">
                    {p.name.trim() && totalNum > 0 && equalAmounts[shareIdx] !== undefined
                      ? formatPKR(equalAmounts[shareIdx])
                      : ""}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removePerson(p.id)}
                  aria-label={`Remove ${p.name || "person"}`}
                  className="h-9 w-9 shrink-0 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
                  disabled={people.length === 1}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => addPerson()}
          className="w-full h-10 rounded-xl border border-dashed border-stone-300 text-sm font-medium text-stone-600 hover:border-stone-400 hover:bg-stone-50"
        >
          + Add person
        </button>

        {!usedGroup && namedPeople.length >= 2 ? (
          <div className="pt-1">
            <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
              <input type="checkbox" checked={saveGroup} onChange={(e) => setSaveGroup(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
              Save these {namedPeople.length} people as a group
            </label>
            {saveGroup ? (
              <Input className="mt-2" placeholder="Group name, e.g. Office lunch gang" value={saveGroupAs} onChange={(e) => setSaveGroupAs(e.target.value)} />
            ) : null}
          </div>
        ) : null}
      </Card>

      {/* Split type */}
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">How to split</h2>
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-stone-100">
          {(["equal", "custom"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSplitType(t)}
              className={cn(
                "h-10 rounded-lg text-sm font-medium transition-colors",
                splitType === t ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-800"
              )}
            >
              {t === "equal" ? "Equally" : "Custom amounts"}
            </button>
          ))}
        </div>

        {splitType === "equal" ? (
          <p className="text-sm text-stone-600">
            {totalNum > 0 && count > 0 ? (
              <>
                {formatPKR(totalNum)} ÷ {count} = <strong>{formatPKR(Math.floor(totalNum / count))}</strong> each
                {totalNum % count !== 0 ? (
                  <span className="text-stone-500">
                    {" "}
                    · the extra Rs {totalNum % count} goes to the first {totalNum % count === 1 ? "person" : `${totalNum % count} people`}
                  </span>
                ) : null}
              </>
            ) : (
              "Enter the total and names to see each share."
            )}
          </p>
        ) : (
          <div
            className={cn(
              "rounded-xl px-4 py-3 text-sm flex items-center justify-between",
              remainder === 0
                ? "bg-emerald-50 text-emerald-800"
                : remainder > 0
                  ? includeSelf
                    ? "bg-sky-50 text-sky-900"
                    : "bg-amber-50 text-amber-900"
                  : "bg-red-50 text-red-800"
            )}
          >
            <span>
              {remainder === 0
                ? "Adds up perfectly."
                : remainder > 0
                  ? includeSelf
                    ? `Your share: ${formatPKR(remainder)}`
                    : `${formatPKR(remainder)} still unassigned`
                  : `Over by ${formatPKR(Math.abs(remainder))}`}
            </span>
            <span className="tabular-nums text-xs opacity-70">
              {formatPKR(customSum)} / {formatPKR(totalNum)}
            </span>
          </div>
        )}
      </Card>

      {/* Payment details confirmation */}
      <Card className="p-5">
        <h2 className="font-semibold">Friends will pay you via</h2>
        <ul className="mt-2 text-sm text-stone-700 space-y-1">
          {paymentSummary.raast_id ? <li>Raast ID · <span className="font-mono">{paymentSummary.raast_id}</span></li> : null}
          {paymentSummary.iban ? <li>IBAN · <span className="font-mono">{paymentSummary.iban}</span></li> : null}
          {paymentSummary.wallet_number ? (
            <li>
              {walletLabel(paymentSummary.wallet_type)} · <span className="font-mono">{paymentSummary.wallet_number}</span>
            </li>
          ) : null}
        </ul>
        <a href="/profile?next=/splits/new" className="inline-block mt-2 text-sm text-stone-500 underline underline-offset-2 hover:text-stone-900">
          Edit payment details
        </a>
      </Card>

      <SubmitButton size="lg" className="w-full" disabled={!canSubmit} pendingText="Creating…">
        Create split{totalNum > 0 ? ` · ${formatPKR(totalNum)}` : ""}
      </SubmitButton>
    </form>
  );
}

/** Index of the idx-th row within the "named people" list, offset by organizer. */
function namedIndex(people: Person[], idx: number, includeSelf: boolean) {
  let n = 0;
  for (let i = 0; i < idx; i++) if (people[i].name.trim()) n++;
  return n + (includeSelf ? 1 : 0);
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        checked ? "bg-emerald-500" : "bg-stone-300"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : ""
        )}
      />
    </button>
  );
}
