import { NextResponse } from "next/server";
import { createConfirmToken } from "@/lib/confirm-helpers";

export async function POST() {
  return NextResponse.json({ token: createConfirmToken() });
}
