"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Mail, UserRound } from "lucide-react";

export function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Authentication failed.");
      router.push("/dashboard");
      router.refresh();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel w-full rounded-3xl p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full border-[1.5px] border-black bg-[#fbfaf5]">
          <UserRound size={21} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">PageMind AI</h1>
          <p className="mt-1 text-sm text-black/55">{mode === "login" ? "Return to your workspace" : "Create your workspace"}</p>
        </div>
      </div>
      <div className="mt-7 grid grid-cols-2 rounded-full border-[1.5px] border-black bg-[#fbfaf5] p-1">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-full px-3 py-2 text-sm transition ${mode === "login" ? "bg-black text-white" : "text-black/62"}`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-full px-3 py-2 text-sm transition ${mode === "signup" ? "bg-black text-white" : "text-black/62"}`}
        >
          Sign up
        </button>
      </div>
      <label className="mt-6 block text-sm font-medium text-black">Email</label>
      <div className="mt-2 flex items-center gap-2 rounded-2xl border-[1.5px] border-black bg-white px-3">
        <Mail size={17} />
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-black/35"
          placeholder="you@example.com"
          type="email"
        />
      </div>
      <label className="mt-4 block text-sm font-medium text-black">Password</label>
      <div className="mt-2 flex items-center gap-2 rounded-2xl border-[1.5px] border-black bg-white px-3">
        <Lock size={17} />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="min-h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-black/35"
          placeholder="8+ characters"
          type="password"
        />
      </div>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={loading}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-black bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2a2a2a] disabled:cursor-wait disabled:opacity-70"
      >
        {loading ? <Loader2 className="animate-spin" size={18} /> : null}
        {mode === "login" ? "Enter workspace" : "Create workspace"}
      </button>
      <p className="mt-5 text-xs leading-5 text-black/50">
        Secure email sessions are handled server-side with JWT.
      </p>
    </section>
  );
}
