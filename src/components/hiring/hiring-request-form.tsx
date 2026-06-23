"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { createHiringRequest } from "@/server/actions/hiring.actions";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface Props {
  departments: { id: string; name: string }[];
}

export function HiringRequestForm({ departments }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    departmentId: "",
    jobTitle: "",
    reason: "",
    priority: "MEDIUM" as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
    salaryMin: "",
    salaryMax: "",
    jobDescription: "",
  });

  const { execute, isPending } = useAction(createHiringRequest, {
    onSuccess: () => { toast.success("Hiring request submitted for approval"); router.push("/hiring"); },
    onError: (err) => toast.error(err.error.serverError ?? "Failed"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    execute({
      departmentId: form.departmentId,
      jobTitle: form.jobTitle,
      reason: form.reason,
      priority: form.priority,
      salaryMin: form.salaryMin ? parseFloat(form.salaryMin) : undefined,
      salaryMax: form.salaryMax ? parseFloat(form.salaryMax) : undefined,
      jobDescription: form.jobDescription || undefined,
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Department *</Label>
            <select
              value={form.departmentId}
              onChange={(e) => setForm(p => ({ ...p, departmentId: e.target.value }))}
              required
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Select department…</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Job Title *</Label>
            <Input
              value={form.jobTitle}
              onChange={e => setForm(p => ({ ...p, jobTitle: e.target.value }))}
              placeholder="e.g. Senior Sales Manager"
              required
            />
          </div>

          <div className="space-y-1">
            <Label>Priority *</Label>
            <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v as typeof form.priority }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Reason for Hire *</Label>
            <Textarea
              value={form.reason}
              onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
              placeholder="Why is this hire needed?"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Salary Min ($)</Label>
              <Input
                type="number"
                value={form.salaryMin}
                onChange={e => setForm(p => ({ ...p, salaryMin: e.target.value }))}
                placeholder="60000"
              />
            </div>
            <div className="space-y-1">
              <Label>Salary Max ($)</Label>
              <Input
                type="number"
                value={form.salaryMax}
                onChange={e => setForm(p => ({ ...p, salaryMax: e.target.value }))}
                placeholder="80000"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isPending || !form.departmentId || !form.jobTitle || !form.reason}
            className="w-full"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit for Approval
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
