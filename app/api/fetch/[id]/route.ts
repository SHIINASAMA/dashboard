import { NextRequest, NextResponse } from "next/server";
import { getAccountById, updateAccount } from "@/lib/services/accounts";
import { fetchAccount } from "@/lib/fetcher";
import { fetchGithubAccount } from "@/lib/fetchers/github";
import { fetchGitlabAccount } from "@/lib/fetchers/gitlab";
import { fetchRedditAccount, fetchRedditPublicAccount } from "@/lib/fetchers/reddit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await getAccountById(Number(id));
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
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
  return NextResponse.json({ ok: true, message: `Fetch started for @${account.screen_name}` });
}
