"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { changePassword } from "@/server/actions/users.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function PasswordChangeForm({ isForced }: { isForced?: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);

  const { execute, isPending } = useAction(changePassword, {
    onSuccess: () => {
      setDone(true);
      toast.success("Password changed successfully");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1500);
    },
    onError: (err) => toast.error(err.error.serverError ?? "Failed to change password"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (next.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    execute({ currentPassword: current, newPassword: next });
  }

  if (done) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-2">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
          <p className="font-medium">Password changed successfully</p>
          <p className="text-sm text-muted-foreground">Redirecting to dashboard…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {isForced ? "Set Your New Password" : "Update Password"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current">Current Password</Label>
            <Input
              id="current"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Your current password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="next">New Password</Label>
            <Input
              id="next"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="At least 8 characters"
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm New Password</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Repeat your new password"
            />
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isForced ? "Set New Password & Continue" : "Change Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
