"use client";

import * as React from "react";
import { useActionState } from "react";
import { Card, Field, Input, Alert, Avatar, cn, inputClass } from "@/components/ui";
import { SubmitButton, ConfirmSubmit } from "@/components/client";
import { saveGroup, deleteGroup, type GroupFormState } from "./actions";

type Member = { id: number; name: string };
let nextId = 1;
const mk = (name = ""): Member => ({ id: nextId++, name });

export function GroupForm({
  group,
}: {
  group?: { id: string; name: string; members: string[] };
}) {
  const [state, action] = useActionState<GroupFormState, FormData>(saveGroup, {});
  const [name, setName] = React.useState(group?.name ?? "");
  const [members, setMembers] = React.useState<Member[]>(
    group?.members.length ? group.members.map((m) => mk(m)) : [mk(), mk(), mk()]
  );
  const inputs = React.useRef<Map<number, HTMLInputElement>>(new Map());

  function add() {
    const m = mk();
    setMembers((ms) => [...ms, m]);
    requestAnimationFrame(() => inputs.current.get(m.id)?.focus());
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>, idx: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (idx === members.length - 1) add();
      else inputs.current.get(members[idx + 1].id)?.focus();
    }
  }

  const named = members.map((m) => m.name.trim()).filter(Boolean);

  return (
    <div className="space-y-5">
      <form action={action} className="space-y-5">
        {group ? <input type="hidden" name="id" value={group.id} /> : null}
        <input type="hidden" name="members" value={JSON.stringify(named)} />
        {state.error ? <Alert tone="error">{state.error}</Alert> : null}

        <Card className="p-5 space-y-4">
          <Field label="Group name" htmlFor="name">
            <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Office lunch gang" required autoFocus={!group} />
          </Field>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-semibold">People</h2>
          <div className="space-y-2">
            {members.map((m, idx) => (
              <div key={m.id} className="flex items-center gap-2">
                <Avatar name={m.name || "?"} size="sm" />
                <input
                  ref={(el) => {
                    if (el) inputs.current.set(m.id, el);
                    else inputs.current.delete(m.id);
                  }}
                  className={cn(inputClass, "flex-1")}
                  placeholder="Name"
                  value={m.name}
                  onChange={(e) => setMembers((ms) => ms.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)))}
                  onKeyDown={(e) => onKeyDown(e, idx)}
                  autoCapitalize="words"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setMembers((ms) => (ms.length > 1 ? ms.filter((x) => x.id !== m.id) : ms))}
                  className="h-9 w-9 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
                  disabled={members.length === 1}
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={add}
            className="w-full h-10 rounded-xl border border-dashed border-stone-300 text-sm font-medium text-stone-600 hover:border-stone-400 hover:bg-stone-50"
          >
            + Add person
          </button>
        </Card>

        <SubmitButton size="lg" className="w-full" pendingText="Saving…" disabled={!name.trim() || named.length === 0}>
          {group ? "Save group" : "Create group"}
        </SubmitButton>
      </form>

      {group ? (
        <form action={deleteGroup} className="text-center">
          <input type="hidden" name="id" value={group.id} />
          <ConfirmSubmit variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" message={`Delete the group “${group.name}”? Existing splits are not affected.`}>
            Delete group
          </ConfirmSubmit>
        </form>
      ) : null}
    </div>
  );
}
