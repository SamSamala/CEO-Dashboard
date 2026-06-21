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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Users,
  Crown,
  UserPlus,
  Star,
  Trophy,
  ChevronDown,
  ChevronRight,
  Trash2,
  X,
  Shield,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

  const isCEO = currentUserRole === "CEO";
  const isDeptHead = currentUserRole === "DEPT_HEAD";

  const toggleDept = (id: string) =>
    setExpandedDepts((p) => ({ ...p, [id]: !p[id] }));
  const toggleTeam = (id: string) =>
    setExpandedTeams((p) => ({ ...p, [id]: !p[id] }));

  // Filter to dept head's own department
  const visibleDepts =
    isCEO
      ? departments
      : departments.filter((d) => d.directorId === currentUserId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organization</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isCEO
              ? "Manage departments, teams, and personnel hierarchy"
              : "Your department structure and teams"}
          </p>
        </div>
      </div>

      {visibleDepts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No departments found.
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
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
            onToggle={() => toggleDept(dept.id)}
            expandedTeams={expandedTeams}
            onToggleTeam={toggleTeam}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Department Card ──────────────────────────────────────────────────────────

function DeptCard({
  dept,
  companyUsers,
  employees,
  isCEO,
  isDeptHead,
  currentUserId,
  expanded,
  onToggle,
  expandedTeams,
  onToggleTeam,
}: {
  dept: Department;
  companyUsers: OrgUser[];
  employees: OrgEmployee[];
  isCEO: boolean;
  isDeptHead: boolean;
  currentUserId: string;
  expanded: boolean;
  onToggle: () => void;
  expandedTeams: Record<string, boolean>;
  onToggleTeam: (id: string) => void;
}) {
  const router = useRouter();
  const canManageDept = isCEO;
  const canManageTeams =
    isCEO || (isDeptHead && dept.directorId === currentUserId);

  const { execute: execAppoint, isPending: appointPending } = useAction(
    appointDirector,
    { onSuccess: () => router.refresh() }
  );
  const { execute: execRemove } = useAction(removeDirector, {
    onSuccess: () => router.refresh(),
  });
  const { execute: execCreateTeam } = useAction(createTeam, {
    onSuccess: () => router.refresh(),
  });

  const [directorDialogOpen, setDirectorDialogOpen] = useState(false);
  const [selectedDirectorId, setSelectedDirectorId] = useState("");
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [teamColor, setTeamColor] = useState("#6366f1");

  // Eligible directors: users in same company who are not already a director elsewhere
  const eligibleDirectors = companyUsers.filter(
    (u) => u.id !== dept.directorId
  );

  const handleAppoint = () => {
    if (!selectedDirectorId) return;
    execAppoint({ departmentId: dept.id, userId: selectedDirectorId });
    setDirectorDialogOpen(false);
    setSelectedDirectorId("");
  };

  const handleCreateTeam = () => {
    if (!teamName.trim()) return;
    execCreateTeam({
      departmentId: dept.id,
      name: teamName.trim(),
      description: teamDesc.trim() || undefined,
      colorHex: teamColor,
    });
    setCreateTeamOpen(false);
    setTeamName("");
    setTeamDesc("");
    setTeamColor("#6366f1");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onToggle}
            className="flex items-center gap-2 text-left flex-1 min-w-0"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <Building2 className="h-5 w-5 shrink-0 text-primary" />
            <CardTitle className="text-base truncate">{dept.name}</CardTitle>
            <Badge variant="outline" className="text-xs shrink-0">
              {dept.teams.length} team{dept.teams.length !== 1 ? "s" : ""}
            </Badge>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            {/* Director info */}
            {dept.director ? (
              <div className="flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-sm text-muted-foreground">
                  {dept.director.name}
                </span>
                {canManageDept && (
                  <button
                    onClick={() =>
                      execRemove({ departmentId: dept.id })
                    }
                    className="text-muted-foreground hover:text-destructive"
                    title="Remove director"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : (
              canManageDept && (
                <Dialog
                  open={directorDialogOpen}
                  onOpenChange={setDirectorDialogOpen}
                >
                  <DialogTrigger render={
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <Crown className="h-3.5 w-3.5 mr-1" />
                      Appoint Director
                    </Button>
                  } />
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        Appoint Director — {dept.name}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-1">
                        <Label>Select Person</Label>
                        <Select
                          value={selectedDirectorId}
                          onValueChange={setSelectedDirectorId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a person" />
                          </SelectTrigger>
                          <SelectContent>
                            {eligibleDirectors.map((u) => (
                              <SelectItem
                                key={u.id}
                                value={u.id}
                                label={`${u.name} (${u.email})`}
                              >
                                <span className="font-medium">{u.name}</span>
                                <span className="text-muted-foreground text-xs ml-1">
                                  {u.email}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This person will be promoted to Department Head and
                        assigned to {dept.name}.
                      </p>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => setDirectorDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAppoint}
                          disabled={!selectedDirectorId || appointPending}
                        >
                          Appoint
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )
            )}

            {/* Create Team */}
            {canManageTeams && (
              <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
                <DialogTrigger render={
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    New Team
                  </Button>
                } />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Team in {dept.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1">
                      <Label>Team Name *</Label>
                      <Input
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="e.g. Growth Team, Platform Squad"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Description</Label>
                      <Input
                        value={teamDesc}
                        onChange={(e) => setTeamDesc(e.target.value)}
                        placeholder="Optional description"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Team Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={teamColor}
                          onChange={(e) => setTeamColor(e.target.value)}
                          className="h-8 w-8 rounded cursor-pointer border"
                        />
                        <span className="text-sm text-muted-foreground">
                          {teamColor}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setCreateTeamOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateTeam}
                        disabled={!teamName.trim()}
                      >
                        Create Team
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          {dept.teams.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No teams yet.{" "}
              {canManageTeams && "Create a team to start organizing members."}
            </p>
          ) : (
            <div className="space-y-3">
              {dept.teams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  dept={dept}
                  companyUsers={companyUsers}
                  employees={employees}
                  canManage={canManageTeams}
                  currentUserId={currentUserId}
                  expanded={!!expandedTeams[team.id]}
                  onToggle={() => onToggleTeam(team.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Team Card ────────────────────────────────────────────────────────────────

function TeamCard({
  team,
  dept,
  companyUsers,
  employees,
  canManage,
  currentUserId,
  expanded,
  onToggle,
}: {
  team: Team;
  dept: Department;
  companyUsers: OrgUser[];
  employees: OrgEmployee[];
  canManage: boolean;
  currentUserId: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();

  const { execute: execDelete } = useAction(deleteTeam, {
    onSuccess: () => router.refresh(),
  });
  const { execute: execApptLeader } = useAction(appointTeamLeader, {
    onSuccess: () => router.refresh(),
  });
  const { execute: execAddMember } = useAction(addTeamMember, {
    onSuccess: () => router.refresh(),
  });
  const { execute: execRemoveMember } = useAction(removeTeamMember, {
    onSuccess: () => router.refresh(),
  });
  const { execute: execAwardEom } = useAction(awardEmployeeOfMonth, {
    onSuccess: () => router.refresh(),
  });

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

  // Latest EoM
  const latestEom = team.employeesOfMonth[0];

  // Users not yet in this team — for adding members
  const availableToAdd = companyUsers.filter(
    (u) => u.teamId !== team.id
  );

  // Team members as employees (for EoM)
  const teamEmpIds = new Set(team.members.map((m) => m.id));
  const teamEmployees = employees.filter(
    (e) => e.userId && teamEmpIds.has(e.userId)
  );

  // Is current user the team leader?
  const isLeader = team.leaderId === currentUserId;

  const handleAddMember = () => {
    if (!selectedMemberId) return;
    execAddMember({ teamId: team.id, userId: selectedMemberId });
    setAddMemberOpen(false);
    setSelectedMemberId("");
  };

  const handleApptLeader = () => {
    if (!selectedLeaderId) return;
    execApptLeader({ teamId: team.id, userId: selectedLeaderId });
    setLeaderDialogOpen(false);
    setSelectedLeaderId("");
  };

  const handleAwardEom = () => {
    if (!eomEmployeeId) return;
    execAwardEom({
      teamId: team.id,
      employeeId: eomEmployeeId,
      month: currentMonth,
      year: currentYear,
      reason: eomReason.trim() || undefined,
    });
    setEomOpen(false);
    setEomEmployeeId("");
    setEomReason("");
  };

  const canAward = canManage || isLeader;

  return (
    <div
      className="rounded-lg border bg-muted/30 overflow-hidden"
      style={{ borderLeftColor: team.colorHex, borderLeftWidth: 3 }}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button onClick={onToggle} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <Users
            className="h-4 w-4 shrink-0"
            style={{ color: team.colorHex }}
          />
          <span className="font-medium text-sm truncate">{team.name}</span>
          <Badge variant="secondary" className="text-xs shrink-0">
            {team.members.length} member{team.members.length !== 1 ? "s" : ""}
          </Badge>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Leader badge */}
          {team.leader ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Shield className="h-3 w-3 text-blue-500" />
              {team.leader.name}
            </div>
          ) : (
            canManage && (
              <Dialog open={leaderDialogOpen} onOpenChange={setLeaderDialogOpen}>
                <DialogTrigger render={
                  <Button size="sm" variant="ghost" className="h-6 text-xs px-2">
                    <Shield className="h-3 w-3 mr-1" />
                    Set Leader
                  </Button>
                } />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Appoint Team Leader — {team.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1">
                      <Label>Select Leader</Label>
                      <Select value={selectedLeaderId} onValueChange={setSelectedLeaderId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a member or user" />
                        </SelectTrigger>
                        <SelectContent>
                          {companyUsers.map((u) => (
                            <SelectItem key={u.id} value={u.id} label={`${u.name} (${u.email})`}>
                              {u.name}
                              <span className="text-muted-foreground text-xs ml-1">({u.email})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      The selected person will be added to this team as its leader.
                    </p>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setLeaderDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleApptLeader} disabled={!selectedLeaderId}>Appoint</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )
          )}

          {/* EoM */}
          {canAward && (
            <Dialog open={eomOpen} onOpenChange={setEomOpen}>
              <DialogTrigger render={
                <Button size="sm" variant="ghost" className="h-6 text-xs px-2">
                  <Trophy className="h-3 w-3 mr-1 text-amber-500" />
                  EoM
                </Button>
              } />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    Employee of the Month — {team.name}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Awarding for {MONTH_NAMES[currentMonth]} {currentYear}
                  </p>
                  <div className="space-y-1">
                    <Label>Select Employee *</Label>
                    <Select value={eomEmployeeId} onValueChange={setEomEmployeeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamEmployees.length > 0
                          ? teamEmployees.map((e) => (
                              <SelectItem key={e.id} value={e.id} label={`${e.firstName} ${e.lastName}`}>
                                {e.firstName} {e.lastName}
                                {e.jobTitle && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    · {e.jobTitle}
                                  </span>
                                )}
                              </SelectItem>
                            ))
                          : employees.map((e) => (
                              <SelectItem key={e.id} value={e.id} label={`${e.firstName} ${e.lastName}`}>
                                {e.firstName} {e.lastName}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Reason (optional)</Label>
                    <Input
                      value={eomReason}
                      onChange={(e) => setEomReason(e.target.value)}
                      placeholder="Why are they being recognized?"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setEomOpen(false)}>Cancel</Button>
                    <Button onClick={handleAwardEom} disabled={!eomEmployeeId}>
                      Award
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Add Member */}
          {canManage && (
            <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
              <DialogTrigger render={
                <Button size="sm" variant="ghost" className="h-6 text-xs px-2">
                  <UserPlus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              } />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Member to {team.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <Label>Select Person</Label>
                    <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose person" />
                      </SelectTrigger>
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
                    <Button onClick={handleAddMember} disabled={!selectedMemberId}>Add</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Delete Team */}
          {canManage && (
            <button
              onClick={() => {
                if (confirm(`Delete team "${team.name}"? Members will be unassigned.`)) {
                  execDelete({ teamId: team.id });
                }
              }}
              className="text-muted-foreground hover:text-destructive p-1"
              title="Delete team"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* EoM spotlight */}
      {latestEom && (
        <div className="px-4 pb-2 flex items-center gap-1.5 text-xs text-amber-600">
          <Trophy className="h-3 w-3" />
          <span className="font-medium">EoM:</span>
          <span>{latestEom.employee.firstName} {latestEom.employee.lastName}</span>
          {latestEom.employee.jobTitle && (
            <span className="text-muted-foreground">· {latestEom.employee.jobTitle}</span>
          )}
        </div>
      )}

      {/* Members list */}
      {expanded && (
        <div className="border-t bg-background/50 px-4 py-3">
          {team.members.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No members yet. {canManage && "Add members to get started."}
            </p>
          ) : (
            <div className="space-y-1.5">
              {team.members.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {m.id === team.leaderId && (
                      <Shield className="h-3 w-3 text-blue-500 shrink-0" />
                    )}
                    {m.id !== team.leaderId && (
                      <div className="h-3 w-3 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <span className="text-sm font-medium truncate">{m.name}</span>
                      <span className="text-xs text-muted-foreground ml-1">{m.email}</span>
                    </div>
                  </div>
                  {canManage && (
                    <button
                      onClick={() =>
                        execRemoveMember({ teamId: team.id, userId: m.id })
                      }
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      title="Remove from team"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
