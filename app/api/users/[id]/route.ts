import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession } from "@/lib/auth-helpers";
import { deleteUser } from "@/lib/services/users";
import { validateConfirmToken } from "@/lib/confirm-helpers";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("dash_session")?.value;
  const session = token ? await validateSession(token) : null;
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const userId = Number(id);
  if (userId === 1) return NextResponse.json({ error: "Cannot delete the bootstrap admin" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const { confirmToken } = body as { confirmToken?: string };
  if (!confirmToken || !validateConfirmToken(confirmToken)) {
    return NextResponse.json({ error: "Invalid or expired confirmation token" }, { status: 400 });
  }
  await deleteUser(userId);
  return NextResponse.json({ ok: true });
}
