import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (
    username === process.env.SROI_USERNAME &&
    password === process.env.SROI_PASSWORD
  ) {
    return NextResponse.json({ ok: true, name: process.env.SROI_NAME });
  }

  return NextResponse.json({ ok: false }, { status: 401 });
}
