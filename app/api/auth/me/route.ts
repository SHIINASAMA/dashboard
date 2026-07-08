import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("dash_session")?.value;
  if (!token) return NextResponse.json({ authenticated: false });
  const session = await validateSession(token);
  if (!session) return NextResponse.json({ authenticated: false });
  return NextResponse.json({ authenticated: true, username: session.username, role: session.role });
}
