import { getUsage } from "@/lib/server/storage";
import type { SafeUser } from "@/lib/types";

export async function assertUploadAllowed(user: SafeUser) {
  const today = new Date().toISOString().slice(0, 10);
  const usage = await getUsage(user.id, today);
  const limit =
    user.plan === "paid"
      ? Number(process.env.PAID_UPLOADS_PER_DAY ?? 1000)
      : Number(process.env.FREE_UPLOADS_PER_DAY ?? 5);

  if (usage.count >= limit) {
    throw new Error(`Daily upload limit reached. ${user.plan === "free" ? "Free users get 5 uploads per day." : "Plan limit reached."}`);
  }
}
