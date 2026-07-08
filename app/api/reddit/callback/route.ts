import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Reddit OAuth callback — redirect to accounts page
  return NextResponse.redirect(new URL("/accounts", req.url));
}
