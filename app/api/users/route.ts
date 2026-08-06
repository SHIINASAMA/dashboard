import { json, getRequestCookie } from "@/lib/api-server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { validateSession } from "@/lib/auth-helpers";
import { getUsers, createUser } from "@/lib/services/users";

async function requireAdmin(req: Request) {
  const token = getRequestCookie(req, "dash_session");
  const session = token ? await validateSession(token) : null;
  if (!session || session.role !== "admin") return null;
  return session;
}

async function GET(req: Request) {
  if (!(await requireAdmin(req))) return json({ error: "Forbidden" }, { status: 403 });
  return json({ users: await getUsers() });
}

async function POST(req: Request) {
  if (!(await requireAdmin(req))) return json({ error: "Forbidden" }, { status: 403 });
  const { username, password, role } = await req.json();
  if (!username || !password) return json({ error: "username and password required" }, { status: 400 });
  if (password.length < 4) return json({ error: "Password must be at least 4 characters" }, { status: 400 });
  try {
    const user = await createUser(username, password, role || "user");
    if (!user) return json({ error: "Failed to create user" }, { status: 500 });
    const pub = { id: user.id, username: user.username, role: user.role, created_at: user.created_at };
    return json(pub, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE")) return json({ error: "Username already exists" }, { status: 409 });
    return json({ error: msg }, { status: 500 });
  }
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
