import { NextResponse } from "next/server";
import { setSessionCookie, signup } from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const user = await signup(await request.json());
    await setSessionCookie(user);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sign up failed." },
      { status: 400 }
    );
  }
}
