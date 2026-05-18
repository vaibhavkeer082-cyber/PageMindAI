import { AuthPanel } from "@/components/auth-panel";

export default function LoginPage() {
  return (
    <main className="workspace-shell min-h-screen text-black">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-5 py-10">
        <AuthPanel />
      </div>
    </main>
  );
}
