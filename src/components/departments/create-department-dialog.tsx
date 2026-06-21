"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { createCustomDepartment } from "@/server/actions/setup.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#06b6d4",
];

export function CreateDepartmentDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  const { execute, isPending } = useAction(createCustomDepartment, {
    onSuccess: () => {
      toast.success("Department created");
      setOpen(false);
      setName("");
      setColor(COLORS[0]);
      router.refresh();
    },
    onError: (err) => toast.error(err.error.serverError ?? "Failed to create department"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const slug = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    execute({ name, slug, colorHex: color });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Department
        </Button>
      } />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Department</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Department Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Marketing, Sales, Operations"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "#000" : "transparent",
                    transform: color === c ? "scale(1.2)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </div>
          <Button type="submit" disabled={isPending || !name.trim()} className="w-full">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Department
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
