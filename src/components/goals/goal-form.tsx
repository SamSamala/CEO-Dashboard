"use client";

import { useState, useEffect } from "react";
import { useAction } from "next-safe-action/hooks";
import { createGoal } from "@/server/actions/goals.actions";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";

export function GoalForm() {
  const [open, setOpen] = useState(false);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    title: "", description: "", type: "QUARTERLY" as const,
    departmentId: "", targetValue: "", unit: "percentage",
    startDate: format(new Date(), "yyyy-MM-dd"),
    dueDate: "",
  });

  useEffect(() => {
    fetch("/api/departments").then(r => r.json()).then(setDepartments).catch(() => {});
  }, []);

  const { execute, isPending } = useAction(createGoal, {
    onSuccess: () => { toast.success("Goal created"); setOpen(false); },
    onError: (err) => toast.error(err.error.serverError ?? "Failed"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    execute({
      title: form.title,
      description: form.description || undefined,
      type: form.type,
      departmentId: form.departmentId || undefined,
      targetValue: parseFloat(form.targetValue),
      unit: form.unit,
      startDate: form.startDate,
      dueDate: form.dueDate,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button><Plus className="mr-2 h-4 w-4" />Create Goal</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create New Goal</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Q1 Revenue Goal" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["COMPANY", "DEPARTMENT", "QUARTERLY", "ANNUAL"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Department (optional)</Label>
              <Select onValueChange={v => setForm(p => ({ ...p, departmentId: v as string }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Company-wide" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.id} value={d.id} label={d.name}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Target Value *</Label>
              <Input type="number" value={form.targetValue} onChange={e => setForm(p => ({ ...p, targetValue: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Unit</Label>
              <Select value={form.unit} onValueChange={v => setForm(p => ({ ...p, unit: v as string }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["percentage", "currency", "count", "days"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Due Date *</Label>
              <Input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} required />
            </div>
          </div>
          <Button type="submit" disabled={isPending || !form.title || !form.targetValue || !form.dueDate} className="w-full">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Goal
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
