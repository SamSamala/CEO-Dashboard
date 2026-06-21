import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { Plus, Target } from "lucide-react";
import { cn, daysUntil } from "@/lib/utils";
import { GoalForm } from "@/components/goals/goal-form";

export const metadata = { title: "Goals" };

const STATUS_COLORS: Record<string, string> = {
  ON_TRACK: "bg-emerald-100 text-emerald-700",
  AT_RISK: "bg-amber-100 text-amber-700",
  BEHIND: "bg-red-100 text-red-700",
  COMPLETED: "bg-purple-100 text-purple-700",
};

export default async function GoalsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const goals = await prisma.goal.findMany({
    where: { companyId: session.user.companyId, isArchived: false },
    include: { owner: { select: { name: true } }, department: { select: { name: true } } },
    orderBy: [{ type: "asc" }, { dueDate: "asc" }],
  });

  const grouped = goals.reduce((acc, g) => {
    const key = g.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(g);
    return acc;
  }, {} as Record<string, typeof goals>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {goals.filter(g => g.status === "COMPLETED").length}/{goals.length} completed
          </p>
        </div>
        {session.user.role !== "EMPLOYEE" && <GoalForm />}
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Target className="h-8 w-8" />
            <p>No goals set yet — create your first goal to track progress</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {(Object.entries(grouped) as [string, typeof goals][]).map(([type, typeGoals]) => (
            <div key={type}>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">{type.replace("_", " ")} Goals</h2>
              <div className="space-y-3">
                {typeGoals.map((goal) => {
                  const progress = goal.targetValue > 0 ? Math.min((goal.currentValue / goal.targetValue) * 100, 100) : 0;
                  const daysLeft = daysUntil(goal.dueDate);
                  return (
                    <Card key={goal.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium">{goal.title}</p>
                              <Badge className={`text-xs ${STATUS_COLORS[goal.status]}`}>{goal.status.replace("_", " ")}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Owner: {goal.owner.name}
                              {goal.department && ` · ${goal.department.name}`}
                              {" · "}
                              {daysLeft > 0 ? `${daysLeft} days left` : "Overdue"}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold">{progress.toFixed(0)}%</p>
                            <p className="text-xs text-muted-foreground">
                              {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()} {goal.unit}
                            </p>
                          </div>
                        </div>
                        <Progress value={progress} className="mt-3 h-2" />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
