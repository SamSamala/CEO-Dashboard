"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { advanceCandidate, addCandidate } from "@/server/actions/hiring.actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Plus, User } from "lucide-react";

const STAGES = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"] as const;
type Stage = typeof STAGES[number];

const STAGE_LABELS: Record<Stage, string> = {
  APPLIED: "Applied",
  SCREENING: "Screen",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  HIRED: "Hire",
  REJECTED: "Reject",
};

const STAGE_COLORS: Record<Stage, string> = {
  APPLIED: "bg-muted text-muted-foreground",
  SCREENING: "bg-blue-100 text-blue-700",
  INTERVIEW: "bg-purple-100 text-purple-700",
  OFFER: "bg-amber-100 text-amber-700",
  HIRED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

type Candidate = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  currentStage: Stage;
  source: string | null;
};

export default function CandidatesPage() {
  const { id } = useParams<{ id: string }>();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newCand, setNewCand] = useState({ firstName: "", lastName: "", email: "", source: "" });

  useEffect(() => {
    fetch(`/api/hiring/${id}/candidates`).then(r => r.json()).then(setCandidates).catch(() => {});
  }, [id]);

  const { execute: advance, isPending: advancing } = useAction(advanceCandidate, {
    onSuccess: () => {
      toast.success("Stage updated");
      fetch(`/api/hiring/${id}/candidates`).then(r => r.json()).then(setCandidates);
    },
    onError: (err) => toast.error(err.error.serverError ?? "Failed"),
  });

  const { execute: add, isPending: adding } = useAction(addCandidate, {
    onSuccess: () => {
      toast.success("Candidate added");
      setAddOpen(false);
      fetch(`/api/hiring/${id}/candidates`).then(r => r.json()).then(setCandidates);
    },
    onError: (err) => toast.error(err.error.serverError ?? "Failed"),
  });

  const byStage = STAGES.reduce((acc, stage) => {
    acc[stage] = candidates.filter((c) => c.currentStage === stage);
    return acc;
  }, {} as Record<Stage, Candidate[]>);

  const activeStages = STAGES.filter((s) => s !== "HIRED" && s !== "REJECTED");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Candidates</h2>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1 h-3 w-3" />Add Candidate
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {activeStages.map((stage) => (
          <Card key={stage}>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stage}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2 min-h-[80px]">
              {byStage[stage].map((c) => (
                <div key={c.id} className="rounded border bg-card p-2.5 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium">{c.firstName} {c.lastName}</span>
                  </div>
                  {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                  <div className="flex gap-1 flex-wrap">
                    {STAGES.filter((s) => s !== stage && s !== "APPLIED").map((nextStage) => (
                      <Button
                        key={nextStage}
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-2"
                        disabled={advancing}
                        onClick={() => advance({ candidateId: c.id, toStage: nextStage })}
                      >
                        → {STAGE_LABELS[nextStage]}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {(byStage.HIRED.length > 0 || byStage.REJECTED.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {(["HIRED", "REJECTED"] as Stage[]).map((stage) => (
            <Card key={stage}>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{stage}</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {byStage[stage].map((c) => (
                  <div key={c.id} className="text-sm flex items-center gap-2">
                    <Badge className={`text-xs ${STAGE_COLORS[stage]}`}>{stage}</Badge>
                    {c.firstName} {c.lastName}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Candidate</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>First Name</Label>
                <Input value={newCand.firstName} onChange={(e) => setNewCand(p => ({ ...p, firstName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Last Name</Label>
                <Input value={newCand.lastName} onChange={(e) => setNewCand(p => ({ ...p, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={newCand.email} onChange={(e) => setNewCand(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Source (LinkedIn, Referral, etc.)</Label>
              <Input value={newCand.source} onChange={(e) => setNewCand(p => ({ ...p, source: e.target.value }))} />
            </div>
            <Button disabled={adding || !newCand.firstName || !newCand.lastName} onClick={() => add({ hiringRequestId: id, firstName: newCand.firstName, lastName: newCand.lastName, email: newCand.email || undefined, source: newCand.source || undefined })} className="w-full">
              Add Candidate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
