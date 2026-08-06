import { json, getRequestCookie } from "@/lib/api-server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { validateSession } from "@/lib/auth-helpers";
import { getAccounts, createAccount } from "@/lib/services/accounts";
import { getOverviewStats } from "@/lib/repositories/twitter";
import { getUserByUsername } from "@/lib/services/users";

async function GET(req: Request) {
  const token = getRequestCookie(req, "dash_session");
  const session = token ? await validateSession(token) : null;
  if (!session) return json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUserByUsername(session.username);
  const ownerId = user && session.role !== "admin" ? user.id : undefined;
  const accounts = await getAccounts(ownerId);
  const overview = await getOverviewStats();
  const safe = accounts.map(({ auth_token: _, ...rest }) => rest);
  return json({ accounts: safe, overview });
}

async function POST(req: Request) {
  const token = getRequestCookie(req, "dash_session");
  const session = token ? await validateSession(token) : null;
  if (!session) return json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { screenName, authToken, fetchInterval, platform, instanceUrl, authType } = body;
  if (!screenName) {
    return json({ error: "screenName is required" }, { status: 400 });
  }
  if (!authToken && authType !== "reddit_public") {
    return json({ error: "authToken is required" }, { status: 400 });
  }

  const user = await getUserByUsername(session.username);
  const account = await createAccount({
    screenName,
    authToken: authToken || "reddit_public",
    fetchInterval: fetchInterval || 60,
    platform: platform || "twitter",
    instanceUrl: instanceUrl || null,
    authType: authType || null,
    ownerId: user?.id,
  });

  const { auth_token: _, ...pub } = account;
  return json(pub, { status: 201 });
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET(request);
}
export async function action({ request }: ActionFunctionArgs) {
  switch (request.method) {
    case "POST": return POST(request);
    default: return json({ error: "Method not allowed" }, { status: 405 });
  }
}
