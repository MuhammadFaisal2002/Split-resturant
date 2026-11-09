import type { Metadata } from "next";
import { requireUser, getProfile } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await requireUser();
  const [profile, { next }] = await Promise.all([getProfile(user.id), searchParams]);

  return (
    <>
      <PageHeader
        title="Profile"
        subtitle="Your name and payment details are shown to friends so they can pay you directly."
      />
      <ProfileForm
        profile={profile}
        email={user.email ?? null}
        next={next}
      />
    </>
  );
}
