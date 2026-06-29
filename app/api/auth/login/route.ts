import { NextResponse } from "next/server";
import { getSession, validateLogin } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");

  if (!validateLogin(email, password)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const session = await getSession();
  session.email = email.toLowerCase();
  session.isLoggedIn = true;
  await session.save();

  return NextResponse.json({ ok: true });
}
