import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Crown, UserCheck, Briefcase, Calendar } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

type TeamMember = { id: string; name: string; email: string; role: string };

interface Props {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: {
      id: string;
      name: string;
      colorHex: string;
      director: { id: string; name: string; email: string } | null;
    } | null;
    teamMembership: {
      id: string;
      name: string;
      colorHex: string;
      leader: { id: string; name: string; email: string } | null;
      members: TeamMember[];
    } | null;
  };
  jobTitle: string | null;
  startDate: Date | null;
}

const ROLE_LABEL: Record<string, string> = {
  CEO: "Chief Executive Officer",
  DEPT_HEAD: "Department Head",
  EMPLOYEE: "Employee",
};

export function EmployeeHome({ user, jobTitle, startDate }: Props) {
  const isLeader = user.teamMembership?.leader?.id === user.id;
  const teammates = user.teamMembership?.members.filter((m) => m.id !== user.id) ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user.name.split(" ")[0]}</h1>
        <p className="text-muted-foreground text-sm mt-1">Your workspace at a glance</p>
      </div>

      {/* Profile card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <UserCheck className="h-4 w-4" /> Your Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-lg leading-tight">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="secondary">{ROLE_LABEL[user.role] ?? user.role}</Badge>
                {jobTitle && <Badge variant="outline">{jobTitle}</Badge>}
                {isLeader && <Badge className="bg-amber-100 text-amber-700 border-amber-200">Team Leader</Badge>}
              </div>
            </div>
          </div>

          {(jobTitle || startDate) && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              {jobTitle && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{jobTitle}</span>
                </div>
              )}
              {startDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Joined {format(startDate, "MMM yyyy")}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Department card */}
      {user.department ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Your Department
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: user.department.colorHex }} />
              <span className="font-semibold">{user.department.name}</span>
            </div>

            {user.department.director ? (
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  {user.department.director.name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Department Director</p>
                  <p className="font-medium text-sm">{user.department.director.name}</p>
                  <p className="text-xs text-muted-foreground">{user.department.director.email}</p>
                </div>
                <Crown className="ml-auto h-4 w-4 text-amber-500 shrink-0" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No director assigned yet</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            You have not been assigned to a department yet.
          </CardContent>
        </Card>
      )}

      {/* Team card */}
      {user.teamMembership ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Your Team
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: user.teamMembership.colorHex }} />
              <span className="font-semibold">{user.teamMembership.name}</span>
            </div>

            {user.teamMembership.leader && user.teamMembership.leader.id !== user.id && (
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-sm font-bold">
                  {user.teamMembership.leader.name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Team Leader</p>
                  <p className="font-medium text-sm">{user.teamMembership.leader.name}</p>
                  <p className="text-xs text-muted-foreground">{user.teamMembership.leader.email}</p>
                </div>
                <Crown className="ml-auto h-4 w-4 text-amber-500 shrink-0" />
              </div>
            )}

            {teammates.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Team members ({teammates.length})</p>
                <div className="space-y-2">
                  {teammates.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 py-1.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {member.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight">
                          {member.name}
                          {user.teamMembership?.leader?.id === member.id && (
                            <span className="ml-1.5 text-xs text-amber-600">(Leader)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {teammates.length === 0 && (
              <p className="text-sm text-muted-foreground">No other members in this team yet.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            You have not been assigned to a team yet.
          </CardContent>
        </Card>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/messages" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <p className="text-sm font-medium">Messages</p>
              <p className="text-xs text-muted-foreground mt-1">Team communication</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/goals" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <p className="text-sm font-medium">Goals</p>
              <p className="text-xs text-muted-foreground mt-1">Company objectives</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
