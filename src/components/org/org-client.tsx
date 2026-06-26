"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import {
  appointDirector,
  removeDirector,
  createTeam,
  deleteTeam,
  appointTeamLeader,
  addTeamMember,
  removeTeamMember,
  awardEmployeeOfMonth,
} from "@/server/actions/org.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Crown,
  UserPlus,
  Trophy,
  Trash2,
  X,
  Shield,
  Users,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  departmentId?: string | null;
  teamId?: string | null;
}

interface OrgEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string | null;
  departmentId: string | null;
  teamId: string | null;
  userId: string | null;
}

interface EomAward {
  employee: { id: string; firstName: string; lastName: string; email: string; jobTitle: string | null };
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  colorHex: string;
  leaderId: string | null;
  leader: OrgUser | null;
  members: OrgUser[];
  employeesOfMonth: EomAward[];
}

interface Department {
  id: string;
  name: string;
  slug: string;
  directorId: string | null;
  director: OrgUser | null;
  teams: Team[];
  colorHex?: string;
}

interface OrgClientProps {
  departments: Department[];
  companyUsers: OrgUser[];
  employees: OrgEmployee[];
  currentUserId: string;
  currentUserRole: string;
}

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── Avatar ───────────────────────────────────────────────────────────────────

function PersonAvatar({ name, size = "md" }: { name: string | null; size?: "sm" | "md" }) {
  const displayName = name ?? "?";
  const initials = displayName
    .split(" ")
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const hue = (displayName.charCodeAt(0) * 37 + displayName.charCodeAt(1 % displayName.length) * 17) % 360;
  const sz = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";
  return (
    <div
      style={{ background: `hsl(${hue},55%,48%)` }}
      className={`${sz} rounded-full flex items-center justify-center text-white font-semibold shrink-0 select-none`}
      title={displayName}
    >
      {initials}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OrgClient({
  departments,
  companyUsers,
  employees,
  currentUserId,
  currentUserRole,
}: OrgClientProps) {
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>(
    Object.fromEntries(departments.map((d) => [d.id, true]))
  );

  const isCEO = currentUserRole === "CEO";
  const isDeptHead = currentUserRole === "DEPT_HEAD";

  const visibleDepts = isCEO
    ? departments
    : departments.filter((d) => d.directorId === currentUserId);

  const totalTeams = departments.reduce((a, d) => a + d.teams.length, 0);
  const totalMembers = employees.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organization</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isCEO ? "Company hierarchy — departments, teams, and personnel" : "Your department structure"}
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex items-center gap-6 px-4 py-3 rounded-xl border bg-muted/30 text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          {departments.length} Department{departments.length !== 1 ? "s" : ""}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="flex items-center gap-1.5 font-medium">
          <Users className="h-4 w-4 text-muted-foreground" />
          {totalMembers} Employee{totalMembers !== 1 ? "s" : ""}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="flex items-center gap-1.5 font-medium">
          <Shield className="h-4 w-4 text-muted-foreground" />
          {totalTeams} Team{totalTeams !== 1 ? "s" : ""}
        </span>
      </div>

      {visibleDepts.length === 0 && (
        <div className="rounded-xl border py-12 text-center text-muted-foreground">
          No departments found.
        </div>
      )}

      {/* 2-column department grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleDepts.map((dept) => (
          <DeptCard
            key={dept.id}
            dept={dept}
            companyUsers={companyUsers}
            employees={employees}
            isCEO={isCEO}
            isDeptHead={isDeptHead}
            currentUserId={currentUserId}
            expanded={!!expandedDepts[dept.id]}
            onToggle={() => setExpandedDepts((p) => ({ ...p, [dept.id]: !p[dept.id] }))}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Department Card ──────────────────────────────────────────────────────────

const DEPT_COLORS: Record<string, string> = {
  sales: "#10b981",
  marketing: "#8b5cf6",
  finance: "#ef4444",
  hr: "#f59e0b",
  "human resources": "#f59e0b",
  operations: "#3b82f6",
  development: "#6366f1",
  product: "#ec4899",
  customer_success: "#14b8a6",
};

function deptColor(dept: Department): string {
  return dept.colorHex ?? DEPT_COLORS[dept.slug?.toLowerCase() ?? ""] ?? DEPT_COLORS[dept.name?.toLowerCase() ?? ""] ?? "#6366f1";
}

function DeptCard({
  dept,
  companyUsers,
  employees,
  isCEO,
  isDeptHead,
  currentUserId,
  expanded,
  onToggle,
}: {
  dept: Department;
  companyUsers: OrgUser[];
  employees: OrgEmployee[];
  isCEO: boolean;
  isDeptHead: boolean;
  currentUserId: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const canManageDept = isCEO;
  const canManageTeams = isCEO || (isDeptHead && dept.directorId === currentUserId);

  const { execute: execAppoint, isPending: appointPending } = useAction(appointDirector, {
    onSuccess: () => router.refresh(),
  });
  const { execute: execRemoveDir } = useAction(removeDirector, {
    onSuccess: () => router.refresh(),
  });
  const { execute: execCreateTeam } = useAction(createTeam, {
    onSuccess: () => router.refresh(),
  });

  const [dirDialogOpen, setDirDialogOpen] = useState(false);
  const [selectedDirectorId, setSelectedDirectorId] = useState("");
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [teamColor, setTeamColor] = useState("#6366f1");

  const color = deptColor(dept);
  const eligibleDirectors = companyUsers.filter((u) => u.id !== dept.directorId);
  const totalMembersInDept = dept.teams.reduce((a, t) => a + t.members.length, 0);

  // Count direct dept employees (not in a team)
  const teamMemberIds = new Set(dept.teams.flatMap((t) => t.members.map((m) => m.id)));
  const directorUser = dept.director;

  return (
    <div
      className="rounded-xl border bg-card overflow-hidden"
      style={{ borderLeftColor: color, borderLeftWidth: 4 }}
    >
      {/* Card header */}
      <div
        className="px-4 pt-4 pb-3 flex items-center justify-between gap-2"
        style={{ backgroundColor: `${color}12` }}
      >
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-left flex-1 min-w-0"
        >
          {expanded
            ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <Building2 className="h-4 w-4 shrink-0" style={{ color }} />
          <span className="font-semibold text-sm truncate">{dept.name}</span>
          <Badge variant="secondary" className="text-xs shrink-0 font-normal">
            {dept.teams.length}t · {totalMembersInDept}p
          </Badge>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          {canManageTeams && (
            <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
              <DialogTrigger render={
                <Button size="sm" variant="outline" className="h-7 text-xs px-2">
                  <UserPlus className="h-3 w-3 mr-1" />
                  New Team
                </Button>
              } />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Team — {dept.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <Label>Team Name *</Label>
                    <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Growth Squad" />
                  </div>
                  <div className="space-y-1">
                    <Label>Description</Label>
                    <Input value={teamDesc} onChange={(e) => setTeamDesc(e.target.value)} placeholder="Optional" />
                  </div>
                  <div className="space-y-1">
                    <Label>Team Color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={teamColor} onChange={(e) => setTeamColor(e.target.value)} className="h-8 w-8 rounded cursor-pointer border" />
                      <span className="text-sm text-muted-foreground">{teamColor}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setCreateTeamOpen(false)}>Cancel</Button>
                    <Button disabled={!teamName.trim()} onClick={() => {
                      execCreateTeam({ departmentId: dept.id, name: teamName.trim(), description: teamDesc.trim() || undefined, colorHex: teamColor });
                      setCreateTeamOpen(false); setTeamName(""); setTeamDesc(""); setTeamColor("#6366f1");
                    }}>Create Team</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Body — only show when expanded */}
      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-3">
          {/* Director row */}
          <div className="flex items-center justify-between gap-2">
            {directorUser ? (
              <div className="flex items-center gap-2 min-w-0">
                <PersonAvatar name={directorUser.name} size="md" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Crown className="h-3 w-3 text-amber-500 shrink-0" />
                    <span className="font-semibold text-sm truncate">{directorUser.name}</span>
                    <Badge className="text-[10px] px-1.5 py-0 shrink-0 bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300">
                      Director
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{directorUser.email}</p>
                </div>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground italic">No director assigned</span>
            )}

            {canManageDept && (
              directorUser ? (
                <button
                  onClick={() => execRemoveDir({ departmentId: dept.id })}
                  className="text-muted-foreground hover:text-destructive shrink-0 p-1"
                  title="Remove director"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <Dialog open={dirDialogOpen} onOpenChange={setDirDialogOpen}>
                  <DialogTrigger render={
                    <Button size="sm" variant="outline" className="h-7 text-xs shrink-0">
                      <Crown className="h-3 w-3 mr-1" />
                      Appoint
                    </Button>
                  } />
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Appoint Director — {dept.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-1">
                        <Label>Select Person</Label>
                        <Select items={Object.fromEntries(eligibleDirectors.map(u => [u.id, `${u.name} (${u.email})`]))} value={selectedDirectorId} onValueChange={setSelectedDirectorId}>
                          <SelectTrigger><SelectValue placeholder="Choose person" /></SelectTrigger>
                          <SelectContent>
                            {eligibleDirectors.map((u) => (
                              <SelectItem key={u.id} value={u.id} label={`${u.name} (${u.email})`}>
                                <span className="font-medium">{u.name}</span>
                                <span className="text-xs text-muted-foreground ml-1">{u.email}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs text-muted-foreground">Promotes this person to Department Head.</p>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setDirDialogOpen(false)}>Cancel</Button>
                        <Button disabled={!selectedDirectorId || appointPending} onClick={() => {
                          execAppoint({ departmentId: dept.id, userId: selectedDirectorId });
                          setDirDialogOpen(false); setSelectedDirectorId("");
                        }}>Appoint</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )
            )}
          </div>

          {/* Divider if teams exist */}
          {dept.teams.length > 0 && <div className="border-t" />}

          {/* Teams — always expanded inline */}
          {dept.teams.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              No teams yet.{canManageTeams && " Use 'New Team' to create one."}
            </p>
          ) : (
            <div className="space-y-3">
              {dept.teams.map((team) => (
                <TeamSection
                  key={team.id}
                  team={team}
                  dept={dept}
                  companyUsers={companyUsers}
                  employees={employees}
                  canManage={canManageTeams}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Team Section (always visible, no expand) ─────────────────────────────────

function TeamSection({
  team,
  dept,
  companyUsers,
  employees,
  canManage,
  currentUserId,
}: {
  team: Team;
  dept: Department;
  companyUsers: OrgUser[];
  employees: OrgEmployee[];
  canManage: boolean;
  currentUserId: string;
}) {
  const router = useRouter();

  const { execute: execDelete } = useAction(deleteTeam, { onSuccess: () => router.refresh() });
  const { execute: execApptLeader } = useAction(appointTeamLeader, { onSuccess: () => router.refresh() });
  const { execute: execAddMember } = useAction(addTeamMember, { onSuccess: () => router.refresh() });
  const { execute: execRemoveMember } = useAction(removeTeamMember, { onSuccess: () => router.refresh() });
  const { execute: execAwardEom } = useAction(awardEmployeeOfMonth, { onSuccess: () => router.refresh() });

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [leaderDialogOpen, setLeaderDialogOpen] = useState(false);
  const [selectedLeaderId, setSelectedLeaderId] = useState("");
  const [eomOpen, setEomOpen] = useState(false);
  const [eomEmployeeId, setEomEmployeeId] = useState("");
  const [eomReason, setEomReason] = useState("");

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const latestEom = team.employeesOfMonth[0];
  const availableToAdd = companyUsers.filter((u) => u.teamId !== team.id);
  const teamEmpIds = new Set(team.members.map((m) => m.id));
  const teamEmployees = employees.filter((e) => e.userId && teamEmpIds.has(e.userId));
  const isLeader = team.leaderId === currentUserId;
  const canAward = canManage || isLeader;

  return (
    <div className="rounded-lg border bg-muted/20 overflow-hidden" style={{ borderLeftColor: team.colorHex, borderLeftWidth: 3 }}>
      {/* Team header row */}
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: team.colorHex }} />
          <span className="font-medium text-sm truncate">{team.name}</span>
          <span className="text-xs text-muted-foreground shrink-0">{team.members.length} member{team.members.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* EoM button */}
          {canAward && (
            <Dialog open={eomOpen} onOpenChange={setEomOpen}>
              <DialogTrigger render={
                <button className="p-1 text-muted-foreground hover:text-amber-500" title="Award Employee of Month">
                  <Trophy className="h-3.5 w-3.5" />
                </button>
              } />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Employee of the Month — {team.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">Awarding for {MONTH_NAMES[currentMonth]} {currentYear}</p>
                  <div className="space-y-1">
                    <Label>Select Employee *</Label>
                    <Select items={Object.fromEntries((teamEmployees.length > 0 ? teamEmployees : employees).map(e => [e.id, `${e.firstName} ${e.lastName}`]))} value={eomEmployeeId} onValueChange={setEomEmployeeId}>
                      <SelectTrigger><SelectValue placeholder="Choose employee" /></SelectTrigger>
                      <SelectContent>
                        {(teamEmployees.length > 0 ? teamEmployees : employees).map((e) => (
                          <SelectItem key={e.id} value={e.id} label={`${e.firstName} ${e.lastName}`}>
                            {e.firstName} {e.lastName}
                            {e.jobTitle && <span className="text-xs text-muted-foreground ml-1">· {e.jobTitle}</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Reason (optional)</Label>
                    <Input value={eomReason} onChange={(e) => setEomReason(e.target.value)} placeholder="Why are they being recognized?" />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setEomOpen(false)}>Cancel</Button>
                    <Button disabled={!eomEmployeeId} onClick={() => {
                      execAwardEom({ teamId: team.id, employeeId: eomEmployeeId, month: currentMonth, year: currentYear, reason: eomReason.trim() || undefined });
                      setEomOpen(false); setEomEmployeeId(""); setEomReason("");
                    }}>Award</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Set leader */}
          {canManage && !team.leader && (
            <Dialog open={leaderDialogOpen} onOpenChange={setLeaderDialogOpen}>
              <DialogTrigger render={
                <button className="p-1 text-muted-foreground hover:text-blue-500" title="Set team leader">
                  <Shield className="h-3.5 w-3.5" />
                </button>
              } />
              <DialogContent>
                <DialogHeader><DialogTitle>Set Leader — {team.name}</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <Label>Select Leader</Label>
                    <Select items={Object.fromEntries(companyUsers.map(u => [u.id, `${u.name} (${u.email})`]))} value={selectedLeaderId} onValueChange={setSelectedLeaderId}>
                      <SelectTrigger><SelectValue placeholder="Choose person" /></SelectTrigger>
                      <SelectContent>
                        {companyUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id} label={`${u.name} (${u.email})`}>
                            {u.name}<span className="text-xs text-muted-foreground ml-1">({u.email})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setLeaderDialogOpen(false)}>Cancel</Button>
                    <Button disabled={!selectedLeaderId} onClick={() => {
                      execApptLeader({ teamId: team.id, userId: selectedLeaderId });
                      setLeaderDialogOpen(false); setSelectedLeaderId("");
                    }}>Appoint</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Add member */}
          {canManage && (
            <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
              <DialogTrigger render={
                <button className="p-1 text-muted-foreground hover:text-primary" title="Add member">
                  <UserPlus className="h-3.5 w-3.5" />
                </button>
              } />
              <DialogContent>
                <DialogHeader><DialogTitle>Add Member — {team.name}</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <Label>Select Person</Label>
                    <Select items={Object.fromEntries(availableToAdd.map(u => [u.id, `${u.name} (${u.email})`]))} value={selectedMemberId} onValueChange={setSelectedMemberId}>
                      <SelectTrigger><SelectValue placeholder="Choose person" /></SelectTrigger>
                      <SelectContent>
                        {availableToAdd.map((u) => (
                          <SelectItem key={u.id} value={u.id} label={`${u.name} (${u.email})`}>
                            <span className="font-medium">{u.name}</span>
                            <span className="text-xs text-muted-foreground ml-1">({u.email})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setAddMemberOpen(false)}>Cancel</Button>
                    <Button disabled={!selectedMemberId} onClick={() => {
                      execAddMember({ teamId: team.id, userId: selectedMemberId });
                      setAddMemberOpen(false); setSelectedMemberId("");
                    }}>Add</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Delete team */}
          {canManage && (
            <button
              onClick={() => { if (confirm(`Delete "${team.name}"? Members will be unassigned.`)) execDelete({ teamId: team.id }); }}
              className="p-1 text-muted-foreground hover:text-destructive"
              title="Delete team"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Leader + members */}
      <div className="px-3 pb-3 space-y-2">
        {/* Leader highlight */}
        {team.leader && (
          <div className="flex items-center gap-2">
            <PersonAvatar name={team.leader.name} size="sm" />
            <div className="flex items-center gap-1.5 min-w-0">
              <Shield className="h-3 w-3 text-blue-500 shrink-0" />
              <span className="text-sm font-medium truncate">{team.leader.name}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">Leader</Badge>
            </div>
            {canManage && (
              <button
                onClick={() => execRemoveMember({ teamId: team.id, userId: team.leader!.id })}
                className="ml-auto text-muted-foreground hover:text-destructive shrink-0"
                title="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Other members */}
        {team.members
          .filter((m) => m.id !== team.leaderId)
          .map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <PersonAvatar name={m.name} size="sm" />
              <span className="text-sm truncate flex-1">{m.name}</span>
              {canManage && (
                <button
                  onClick={() => execRemoveMember({ teamId: team.id, userId: m.id })}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}

        {team.members.length === 0 && (
          <p className="text-xs text-muted-foreground">No members yet.</p>
        )}

        {/* EoM spotlight */}
        {latestEom && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 pt-1 border-t">
            <Trophy className="h-3 w-3 shrink-0" />
            <span className="font-medium">EoM:</span>
            <span>{latestEom.employee.firstName} {latestEom.employee.lastName}</span>
            {latestEom.employee.jobTitle && (
              <span className="text-muted-foreground">· {latestEom.employee.jobTitle}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
