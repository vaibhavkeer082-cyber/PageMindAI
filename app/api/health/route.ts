import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    app: "PageMind AI",
    hfConfigured: Boolean(process.env.HF_API_KEY),
    supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    databaseConfigured: Boolean(process.env.DATABASE_URL)
  });
}
