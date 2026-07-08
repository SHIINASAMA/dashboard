import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession } from "@/lib/auth-helpers";
import { getUsers, createUser } from "@/lib/services/users";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dash_session")?.value;
  const session = token ? await validateSession(token) : null;
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ users: await getUsers() });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { username, password, role } = await req.json();
  if (!username || !password) return NextResponse.json({ error: "username and password required" }, { status: 400 });
  if (password.length < 4) return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
  try {
    const user = await createUser(username, password, role || "user");
    const pub = Object.fromEntries(Object.entries(user).filter(([k]) => k !== "password_hash"));
    return NextResponse.json(pub, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE")) return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
