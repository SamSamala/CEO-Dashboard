import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PasswordChangeForm } from "@/components/settings/password-change-form";
import { KeyRound, AlertTriangle } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ forced?: string }>;
}

export default async function PasswordPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { forced } = await searchParams;
  const isForced = forced === "1";

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Change Password</h1>
      </div>

      {isForced && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            You must set a new password before you can access the dashboard.
            {" "}This is required for security.
          </span>
        </div>
      )}

      <PasswordChangeForm isForced={isForced} />
    </div>
  );
}
