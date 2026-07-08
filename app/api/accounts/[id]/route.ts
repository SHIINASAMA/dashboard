import { NextRequest, NextResponse } from "next/server";
import { getAccountById, updateAccount, deleteAccount } from "@/lib/services/accounts";
import { validateConfirmToken } from "@/lib/confirm-helpers";
import { getLatestUserStats } from "@/lib/repositories/twitter";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await getAccountById(Number(id));
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const stats = await getLatestUserStats(account.id);
  const { auth_token: _, ...rest } = account;
  return NextResponse.json({ ...rest, stats: stats || null });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { screenName, authToken, fetchInterval, isActive, instanceUrl, authType } = body;

  const updates: Record<string, unknown> = {};
  if (screenName !== undefined) updates.screen_name = screenName;
  if (authToken !== undefined) updates.auth_token = authToken;
  if (fetchInterval !== undefined) updates.fetch_interval = fetchInterval;
  if (isActive !== undefined) updates.is_active = isActive ? 1 : 0;
  if (instanceUrl !== undefined) updates.instance_url = instanceUrl;
  if (authType !== undefined) updates.auth_type = authType;

  await updateAccount(Number(id), updates);
  const updated = await getAccountById(Number(id));
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { auth_token: _, ...pub } = updated;
  return NextResponse.json(pub);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { confirmToken } = body as { confirmToken?: string };
  if (!confirmToken || !validateConfirmToken(confirmToken)) {
    return NextResponse.json({ error: "Invalid or expired confirmation token" }, { status: 400 });
  }
  await deleteAccount(Number(id));
  return NextResponse.json({ success: true });
}
