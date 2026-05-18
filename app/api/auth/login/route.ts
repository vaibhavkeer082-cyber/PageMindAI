import { NextResponse } from "next/server";
import { login, setSessionCookie } from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const user = await login(await request.json());
    await setSessionCookie(user);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed." },
      { status: 400 }
    );
  }
}
