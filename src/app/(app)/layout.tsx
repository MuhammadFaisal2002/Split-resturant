import Link from "next/link";
import { requireUser, getProfile } from "@/lib/auth";
import { APP_NAME } from "@/lib/app";
import { NavLinks } from "./nav-links";
import { signOut } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const displayName = profile?.name || user.email?.split("@")[0] || "You";

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-20 bg-stone-50/90 backdrop-blur border-b border-stone-200">
        <div className="max-w-lg w-full mx-auto px-5 h-14 flex items-center justify-between gap-4">
          <Link href="/home" className="font-semibold text-lg tracking-tight">
            {APP_NAME}
          </Link>
          <nav className="flex items-center gap-1">
            <NavLinks />
            <form action={signOut}>
              <button
                type="submit"
                title={`Signed in as ${displayName}`}
                className="h-9 px-3 rounded-lg text-sm text-stone-500 hover:text-stone-900 hover:bg-stone-100"
              >
                Log out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-lg w-full mx-auto px-5 py-6 pb-24">{children}</main>
    </div>
  );
}
