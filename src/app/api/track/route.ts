import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { track } from "@/lib/analytics";
import { claimCookieName } from "@/lib/claim";

/** Client-side analytics ping for public pages. Only `link_opened` is accepted. */
export async function POST(request: NextRequest) {
  let body: { name?: string; code?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (body.name !== "link_opened" || typeof body.code !== "string" || !/^[a-z0-9]{4,8}$/i.test(body.code)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: split } = await admin.from("splits").select("id").eq("short_code", body.code.toLowerCase()).maybeSingle();
  if (!split) return NextResponse.json({ ok: false }, { status: 404 });

  const token = request.cookies.get(claimCookieName(body.code))?.value;
  let shareId: string | undefined;
  if (token) {
    const { data: share } = await admin.from("split_shares").select("id").eq("split_id", split.id).eq("claimed_token", token).maybeSingle();
    shareId = share?.id;
  }

  await track("link_opened", { split_id: split.id, share_id: shareId, props: { claimed: !!shareId } });
  return NextResponse.json({ ok: true });
}
