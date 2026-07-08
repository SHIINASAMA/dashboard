import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession } from "@/lib/auth-helpers";
import { getAccounts, createAccount } from "@/lib/services/accounts";
import { getOverviewStats } from "@/lib/repositories/twitter";
import { getUserByUsername } from "@/lib/services/users";

export async function GET() {
  const accounts = await getAccounts();
  const overview = await getOverviewStats();
  const safe = accounts.map(({ auth_token: _, ...rest }) => rest);
  return NextResponse.json({ accounts: safe, overview });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("dash_session")?.value;
  const session = token ? await validateSession(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { screenName, authToken, fetchInterval, platform, instanceUrl, authType } = body;
  if (!screenName || !authToken) {
    return NextResponse.json({ error: "screenName and authToken required" }, { status: 400 });
  }

  const user = await getUserByUsername(session.username);
  const account = await createAccount({
    screenName,
    authToken,
    fetchInterval: fetchInterval || 3600,
    platform: platform || "twitter",
    instanceUrl: instanceUrl || null,
    authType: authType || null,
    ownerId: user?.id,
  });

  const { auth_token: _, ...pub } = account;
  return NextResponse.json(pub, { status: 201 });
}
