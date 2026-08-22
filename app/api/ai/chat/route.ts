import { json, getRequestCookie } from "@/lib/api-server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { validateSession } from "@/lib/auth-helpers";
import { getUserByUsername } from "@/lib/services/users";
import { runAgentStream, getAiStatus, type ChatMessage } from "@/lib/services/ai-analysis";
import { aiConfig, isMockMode } from "@/lib/config";

async function POST(req: Request) {
  const token = getRequestCookie(req, "dash_session");
  const session = token ? await validateSession(token) : null;
  if (!session) return json({ error: "Unauthorized" }, { status: 401 });

  if (!isMockMode()) {
    const config = aiConfig();
    if (!config.baseUrl && !config.apiKey) {
      return json({ error: "AI not configured. Contact admin." }, { status: 503 });
    }
  }

  try {
    const user = await getUserByUsername(session.username);
    if (!user) return json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const messages: ChatMessage[] = body.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: "messages array is required" }, { status: 400 });
    }

    // Validate message format
    for (const m of messages) {
      if (m.role !== "user" && m.role !== "assistant") {
        return json({ error: "Invalid message role" }, { status: 400 });
      }
      if (typeof m.content !== "string" || !m.content.trim()) {
        return json({ error: "Invalid message content" }, { status: 400 });
      }
    }

    const { stream } = await runAgentStream(user.id, messages);

    // Return as streaming text response
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Daily token limit exceeded")) {
      return json({ error: msg }, { status: 429 });
    }
    if (msg.includes("AI not configured")) {
      return json({ error: msg }, { status: 503 });
    }
    return json({ error: msg }, { status: 500 });
  }
}

async function GET(req: Request) {
  const token = getRequestCookie(req, "dash_session");
  const session = token ? await validateSession(token) : null;
  if (!session) return json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUserByUsername(session.username);
  if (!user) return json({ error: "User not found" }, { status: 404 });

  const status = await getAiStatus(user.id);
  return json(status);
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method === "GET") return GET(request);
  return json({ error: "Method not allowed" }, { status: 405 });
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method === "POST") return POST(request);
  return json({ error: "Method not allowed" }, { status: 405 });
}
