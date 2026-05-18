import Link from "next/link";
import { CircleUserRound, History, Menu, Plus } from "lucide-react";
import type { SafeUser } from "@/lib/types";

export function Navbar({ user }: { user?: SafeUser | null }) {
  return (
    <nav className="flex items-start justify-between border-b border-black bg-[#f6f3ea] pb-4 pt-2">
      <Link href="/" className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full border-[1.5px] border-black bg-white">
          {user ? <CircleUserRound size={20} /> : <History size={20} />}
        </span>
        <div>
          <p className="text-base font-semibold leading-none tracking-[-0.01em]">PageMind AI</p>
          <p className="mt-1 text-xs text-black/55">Study workspace</p>
        </div>
      </Link>

      <div className="flex flex-col items-end gap-3">
        <button
          type="button"
          aria-label="Open menu"
          className="grid h-10 w-10 place-items-center rounded-full border-[1.5px] border-black bg-white transition hover:bg-[#f2efe5]"
        >
          <Menu size={19} />
        </button>
        <Link
          href={user ? "/" : "/login"}
          className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-black bg-white px-4 py-2 text-sm font-medium transition hover:bg-[#f2efe5]"
        >
          <Plus size={15} />
          {user ? "New Workspace" : "Login"}
        </Link>
      </div>
    </nav>
  );
}
