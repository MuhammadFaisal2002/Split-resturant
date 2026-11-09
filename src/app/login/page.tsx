import Link from "next/link";
import type { Metadata } from "next";
import { APP_NAME } from "@/lib/app";
import { Card, Alert } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("YOUR_PROJECT");

  return (
    <main className="flex-1 flex flex-col">
      <header className="max-w-lg w-full mx-auto px-5 py-5">
        <Link href="/" className="font-semibold text-lg tracking-tight">
          {APP_NAME}
        </Link>
      </header>
      <section className="max-w-md w-full mx-auto px-5 pt-6 pb-16 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight">Log in to {APP_NAME}</h1>
        <p className="text-stone-500 mt-1">Only organizers need an account. Your friends just open the link.</p>

        {error ? (
          <Alert tone="error" className="mt-5">
            {decodeURIComponent(error)}
          </Alert>
        ) : null}

        {!configured ? (
          <Alert tone="warning" className="mt-5">
            Supabase is not configured yet. Add your project URL and keys to <code>.env.local</code> (see
            <code> supabase/README.md</code>) and restart the dev server.
          </Alert>
        ) : null}

        <Card className="mt-6 p-5">
          <LoginForm next={next} />
        </Card>
      </section>
    </main>
  );
}
