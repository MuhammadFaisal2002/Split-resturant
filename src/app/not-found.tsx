import { APP_NAME } from "@/lib/app";
import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center px-5">
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-stone-500 mt-2">That page doesn’t exist.</p>
        <div className="mt-6">
          <LinkButton href="/" variant="secondary">
            Go to {APP_NAME}
          </LinkButton>
        </div>
      </div>
    </main>
  );
}
