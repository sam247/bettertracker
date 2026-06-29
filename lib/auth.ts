import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { ALLOWED_EMAIL, SESSION_COOKIE } from "@/lib/constants";

export { ALLOWED_EMAIL, SESSION_COOKIE };

export interface SessionData {
  email: string;
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.AUTH_SECRET!,
  cookieName: SESSION_COOKIE,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session.isLoggedIn || session.email !== ALLOWED_EMAIL) {
    return null;
  }
  return session;
}

export function validateLogin(email: string, password: string): boolean {
  if (email.trim().toLowerCase() !== ALLOWED_EMAIL) return false;
  return password === process.env.AUTH_PASSWORD;
}
