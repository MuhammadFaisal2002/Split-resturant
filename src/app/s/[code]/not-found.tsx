import Link from "next/link";
import { APP_NAME } from "@/lib/app";
import { LinkButton } from "@/components/ui";

export default function SplitNotFound() {
  return (
    <main className="flex-1 flex items-center justify-center px-5">
      <div className="text-center max-w-sm">
        <p className="text-5xl mb-4">🧾</p>
        <h1 className="text-2xl font-semibold">This split doesn’t exist</h1>
        <p className="text-stone-500 mt-2">The link may be wrong, or the organizer deleted the split.</p>
        <div className="mt-6">
          <LinkButton href="/" variant="secondary">
            Go to {APP_NAME}
          </LinkButton>
        </div>
        <p className="mt-8 text-xs text-stone-400">
          <Link href="/">{APP_NAME}</Link>
        </p>
      </div>
    </main>
  );
}
