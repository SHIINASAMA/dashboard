import { json } from "@/lib/api-server";
import type { ActionFunctionArgs } from "react-router";
import { getAccountById, updateAccount } from "@/lib/services/accounts";
import { fetchAccount } from "@/lib/fetcher";
import { fetchGithubAccount } from "@/lib/fetchers/github";
import { fetchGitlabAccount } from "@/lib/fetchers/gitlab";
import { fetchRedditAccount, fetchRedditPublicAccount } from "@/lib/fetchers/reddit";
import { isMockMode } from "@/lib/config";

async function POST(req: Request, params: Record<string, string>) {
  const { id } = params;

  // Mock/debug mode: no real fetch — pretend it started.
  if (isMockMode()) {
    return json({ ok: true, message: `Mock fetch started for account ${id}` });
  }

  const account = await getAccountById(Number(id));
  if (!account) return json({ error: "Account not found" }, { status: 404 });
  if (!account.is_active) {
    await updateAccount(Number(id), { is_active: 1 });
    account.is_active = 1;
  }

  // Mark as fetching to prevent duplicate concurrent runs.
  await updateAccount(Number(id), { last_fetched_at: new Date().toISOString() });

  const fn =
    account.platform === "github"
      ? fetchGithubAccount
      : account.platform === "gitlab"
        ? fetchGitlabAccount
        : account.platform === "reddit"
          ? account.auth_type === "reddit_public"
            ? fetchRedditPublicAccount
            : fetchRedditAccount
          : fetchAccount;

  fn(account as never).catch((e: unknown) =>
    console.error("Background fetch error:", e instanceof Error ? e.message : String(e))
  );
  return json({ ok: true, message: `Fetch started for @${account.screen_name}` });
}

export async function action({ request, params }: ActionFunctionArgs) {
  switch (request.method) {
    case "POST": return POST(request, params as Record<string, string>);
    default: return json({ error: "Method not allowed" }, { status: 405 });
  }
}
