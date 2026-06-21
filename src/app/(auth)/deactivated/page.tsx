import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import Link from "next/link";

export default async function DeactivatedPage() {
  const session = await auth();

  let terminationNote: string | null = null;
  let terminationReason: string | null = null;

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { terminationNote: true, terminationReason: true },
    });
    terminationNote = user?.terminationNote ?? null;
    terminationReason = user?.terminationReason ?? null;
  }

  const reasonLabel: Record<string, string> = {
    FIRED: "Your employment has been terminated.",
    SUSPENDED: "Your account has been suspended.",
    ON_LEAVE: "Your account has been placed on leave.",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-xl text-red-700">Account Deactivated</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">
            {terminationReason ? reasonLabel[terminationReason] : "Your account has been deactivated."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {terminationNote && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800 mb-1">Message from your employer:</p>
              <p className="text-sm text-red-700">{terminationNote}</p>
            </div>
          )}
          <p className="text-sm text-muted-foreground text-center">
            If you believe this is a mistake, please contact your employer.
          </p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="outline" className="w-full">
              Sign Out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
