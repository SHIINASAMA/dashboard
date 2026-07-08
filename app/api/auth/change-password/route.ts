import { NextRequest, NextResponse } from "next/server";
import { changePassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { currentPassword, newPassword } = await req.json();
    if (!newPassword || newPassword.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
    }
    const ok = await changePassword(currentPassword, newPassword);
    if (!ok) {
      await new Promise((r) => setTimeout(r, 800));
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
