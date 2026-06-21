"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { logExpense } from "@/server/actions/spending.actions";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useEffect } from "react";

// This needs to be a server component to fetch departments, but let's keep it simple with a client-side fetch
export default function NewExpensePage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    departmentId: "",
    amount: "",
    category: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
    vendorName: "",
  });

  useEffect(() => {
    fetch("/api/departments").then((r) => r.json()).then(setDepartments).catch(() => {});
  }, []);

  const { execute, isPending } = useAction(logExpense, {
    onSuccess: () => {
      toast.success("Expense logged");
      router.push("/spending");
    },
    onError: (err) => toast.error(err.error.serverError ?? "Failed to log expense"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.departmentId || !form.amount || !form.category || !form.description) {
      toast.error("Please fill in all required fields");
      return;
    }
    execute({
      departmentId: form.departmentId,
      amount: parseFloat(form.amount),
      category: form.category,
      description: form.description,
      date: form.date,
      vendorName: form.vendorName || undefined,
    });
  }

  const COMMON_CATEGORIES = [
    "Facebook Ads", "Google Ads", "LinkedIn Ads", "Influencer Campaign",
    "Software / SaaS", "Contractors", "Office Supplies", "Travel",
    "Equipment", "Legal", "Accounting", "Marketing Materials",
    "Customer Events", "Team Meals", "Training", "Other",
  ];

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Log Expense</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Department *</Label>
              <Select onValueChange={(v) => setForm((p) => ({ ...p, departmentId: v as string }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Amount ($) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Category *</Label>
              <Select onValueChange={(v) => setForm((p) => ({ ...p, category: v as string }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select or type category" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Description *</Label>
              <Textarea
                placeholder="What was this expense for?"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Vendor Name</Label>
              <Input
                placeholder="e.g. Meta, Google, AWS"
                value={form.vendorName}
                onChange={(e) => setForm((p) => ({ ...p, vendorName: e.target.value }))}
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log Expense
              </Button>
              <Button variant="outline" type="button" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
