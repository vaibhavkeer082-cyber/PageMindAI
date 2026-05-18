import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { createUser, findUserByEmail, findUserById } from "@/lib/server/storage";
import type { SafeUser, StoredUser } from "@/lib/types";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const cookieName = "pagemind_token";

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured.");
  return secret;
}

export async function signup(body: unknown) {
  const parsed = schema.parse(body);
  const existing = await findUserByEmail(parsed.email);
  if (existing) throw new Error("An account already exists for this email.");

  const user: StoredUser = {
    id: crypto.randomUUID(),
    email: parsed.email.toLowerCase(),
    passwordHash: await bcrypt.hash(parsed.password, 12),
    plan: "free",
    createdAt: new Date().toISOString()
  };
  await createUser(user);
  return toSafeUser(user);
}

export async function login(body: unknown) {
  const parsed = schema.parse(body);
  const user = await findUserByEmail(parsed.email);
  if (!user || !(await bcrypt.compare(parsed.password, user.passwordHash))) {
    throw new Error("Invalid email or password.");
  }
  return toSafeUser(user);
}

export function createSessionToken(user: SafeUser) {
  return jwt.sign({ sub: user.id, email: user.email, plan: user.plan }, jwtSecret(), { expiresIn: "7d" });
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, jwtSecret()) as { sub: string };
    const user = await findUserById(payload.sub);
    return user ? toSafeUser(user) : null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: SafeUser) {
  const jar = await cookies();
  jar.set(cookieName, createSessionToken(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (user) return user;
  const guestId = "guest";
  return { id: guestId, email: "guest@pagemind.local", plan: "free" as const };
}

function toSafeUser(user: StoredUser): SafeUser {
  return { id: user.id, email: user.email, plan: user.plan };
}
