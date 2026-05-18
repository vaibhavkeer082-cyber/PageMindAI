import { HomeExperience } from "@/components/home-experience";
import { getCurrentUser } from "@/lib/server/auth";

export default async function HomePage() {
  const user = await getCurrentUser();
  return <HomeExperience user={user} />;
}
