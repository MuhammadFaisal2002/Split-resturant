import Link from "next/link";
import { APP_NAME } from "@/lib/app";
import { LinkButton } from "@/components/ui";

export default function LandingPage() {
  return (
    <main className="flex-1 flex flex-col">
      <header className="max-w-lg w-full mx-auto px-5 py-5 flex items-center justify-between">
        <span className="font-semibold text-lg tracking-tight">{APP_NAME}</span>
        <Link href="/login" className="text-sm font-medium text-stone-600 hover:text-stone-900">
          Log in
        </Link>
      </header>

      <section className="max-w-lg w-full mx-auto px-5 pt-10 pb-16 flex-1">
        <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium px-3 py-1">
          No app. No sign-up for your friends.
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight leading-[1.1]">
          Bill split karo, <br />
          WhatsApp pe link bhejo, <br />
          <span className="text-emerald-600">paisay wapas lo.</span>
        </h1>
        <p className="mt-5 text-lg text-stone-600 leading-relaxed">
          You paid the whole bill. {APP_NAME} gives you one link that shows every friend their exact
          share, your Raast / IBAN / wallet details, and a live board of who has paid.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <LinkButton href="/login" size="lg">
            Create a split
          </LinkButton>
          <LinkButton href="/login" variant="secondary" size="lg">
            See how it works
          </LinkButton>
        </div>

        <ol className="mt-14 space-y-6">
          {[
            ["1", "Enter the bill", "Title, total in PKR, names. Equal split or custom amounts."],
            ["2", "Drop one link in the group", "Pre-filled WhatsApp message. Friends tap their name, see their share."],
            ["3", "Track who has paid", "Friends pay you directly and tap “I've paid”. You confirm. Board updates for everyone."],
          ].map(([n, t, d]) => (
            <li key={n} className="flex gap-4">
              <span className="h-8 w-8 shrink-0 rounded-full bg-stone-900 text-white text-sm font-semibold flex items-center justify-center">
                {n}
              </span>
              <div>
                <h3 className="font-semibold">{t}</h3>
                <p className="text-stone-600 text-[15px] mt-0.5">{d}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-14 text-sm text-stone-500">
          {APP_NAME} never touches money. All payments are direct, person to person, through your own bank or wallet app.
        </p>
      </section>
    </main>
  );
}
