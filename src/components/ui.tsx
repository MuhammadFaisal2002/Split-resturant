import * as React from "react";
import Link from "next/link";
import type { ShareStatus, SplitStatus } from "@/lib/types";

/* ----------------------------------------------------------------------------
 * Utilities
 * ------------------------------------------------------------------------- */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/* ----------------------------------------------------------------------------
 * Button
 * ------------------------------------------------------------------------- */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "whatsapp";
type ButtonSize = "sm" | "md" | "lg";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors select-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 " +
  "disabled:opacity-50 disabled:pointer-events-none";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-stone-900 text-white hover:bg-stone-800 active:bg-stone-950",
  secondary: "bg-white text-stone-900 border border-stone-200 hover:bg-stone-50 active:bg-stone-100",
  ghost: "text-stone-700 hover:bg-stone-100 active:bg-stone-200",
  danger: "bg-red-600 text-white hover:bg-red-700",
  whatsapp: "bg-[#25D366] text-white hover:bg-[#1ebe5a] active:bg-[#17a74f]",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-[15px]",
  lg: "h-12 px-5 text-base",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra?: string) {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], extra);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  href,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href: string;
}) {
  const external = /^https?:\/\//.test(href);
  if (external) {
    return <a href={href} className={buttonClass(variant, size, className)} {...props} />;
  }
  return <Link href={href} className={buttonClass(variant, size, className)} {...props} />;
}

/* ----------------------------------------------------------------------------
 * Form primitives
 * ------------------------------------------------------------------------- */
export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("block text-sm font-medium text-stone-700", className)} {...props} />;
}

export const inputClass =
  "block w-full h-11 rounded-xl border border-stone-200 bg-white px-3.5 text-[15px] text-stone-900 " +
  "placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 " +
  "disabled:bg-stone-50 disabled:text-stone-500";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(inputClass, className)} {...props} />;
  }
);

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(inputClass, "pr-9", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(inputClass, "h-auto min-h-[88px] py-2.5 resize-y", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-sm text-stone-500">{hint}</p>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Layout
 * ------------------------------------------------------------------------- */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,.04)]", className)}
      {...props}
    />
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  back,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  back?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div className="min-w-0">
        {back ? (
          <Link href={back} className="text-sm text-stone-500 hover:text-stone-900 inline-flex items-center gap-1 mb-1">
            <span aria-hidden>←</span> Back
          </Link>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 truncate">{title}</h1>
        {subtitle ? <p className="text-stone-500 mt-1 text-[15px]">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="p-8 text-center">
      <h3 className="font-semibold text-stone-900">{title}</h3>
      {body ? <p className="text-stone-500 mt-1 text-[15px]">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}

export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "success" | "warning" | "error";
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    info: "bg-sky-50 text-sky-900 border-sky-200",
    success: "bg-emerald-50 text-emerald-900 border-emerald-200",
    warning: "bg-amber-50 text-amber-900 border-amber-200",
    error: "bg-red-50 text-red-900 border-red-200",
  };
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-[15px]", tones[tone], className)}>{children}</div>
  );
}

/* ----------------------------------------------------------------------------
 * Status badges
 * ------------------------------------------------------------------------- */
const shareStatusStyles: Record<ShareStatus, { label: string; cls: string }> = {
  unpaid: { label: "Unpaid", cls: "bg-stone-100 text-stone-600" },
  pending: { label: "Pending confirmation", cls: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Paid", cls: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-700" },
  waived: { label: "Waived", cls: "bg-stone-100 text-stone-500 line-through" },
};

export function ShareStatusBadge({ status, short }: { status: ShareStatus; short?: boolean }) {
  const s = shareStatusStyles[status];
  const label = short && status === "pending" ? "Pending" : s.label;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", s.cls)}>
      {label}
    </span>
  );
}

const splitStatusStyles: Record<SplitStatus, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-sky-100 text-sky-800" },
  settled: { label: "Settled", cls: "bg-emerald-100 text-emerald-800" },
  closed: { label: "Closed", cls: "bg-stone-200 text-stone-600" },
};

export function SplitStatusBadge({ status }: { status: SplitStatus }) {
  const s = splitStatusStyles[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", s.cls)}>
      {s.label}
    </span>
  );
}

/* ----------------------------------------------------------------------------
 * Avatar initials
 * ------------------------------------------------------------------------- */
const avatarColors = [
  "bg-rose-100 text-rose-700",
  "bg-orange-100 text-orange-700",
  "bg-amber-100 text-amber-700",
  "bg-lime-100 text-lime-700",
  "bg-emerald-100 text-emerald-700",
  "bg-teal-100 text-teal-700",
  "bg-sky-100 text-sky-700",
  "bg-indigo-100 text-indigo-700",
  "bg-violet-100 text-violet-700",
  "bg-fuchsia-100 text-fuchsia-700",
];

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const color = avatarColors[hash % avatarColors.length];
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  const sz = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-14 w-14 text-lg" : "h-10 w-10 text-sm";
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", color, sz)}>
      {initials || "?"}
    </span>
  );
}
