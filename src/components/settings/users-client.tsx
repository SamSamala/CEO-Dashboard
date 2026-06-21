"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { bulkCreateUsers, terminateUser, reactivateUser, resetPassword } from "@/server/actions/users.actions";
import { assignRole } from "@/server/actions/roles.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, UserCheck, UserX, KeyRound, ChevronDown } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  employeeId: string | null;
  terminationNote: string | null;
  terminationReason: string | null;
  mustChangePassword: boolean;
  department: { name: string } | null;
  customRole: { name: string; color: string } | null;
}

interface Department { id: string; name: string }
interface CustomRole { id: string; name: string; color: string }

interface BulkRow {
  name: string;
  email: string;
  employeeId: string;
  customRoleId: string;
  departmentId: string;
  password: string;
}

function emptyRow(): BulkRow {
  return { name: "", email: "", employeeId: "", customRoleId: "", departmentId: "", password: "" };
}

export function UsersClient({
  users: initialUsers,
  departments,
  customRoles,
  currentUserId,
}: {
  users: User[];
  departments: Department[];
  customRoles: CustomRole[];
  currentUserId: string;
}) {
  const [users] = useState<User[]>(initialUsers);
  const [rows, setRows] = useState<BulkRow[]>([emptyRow()]);

  // Termination dialog state
  const [terminatingUser, setTerminatingUser] = useState<User | null>(null);
  const [terminateReason, setTerminateReason] = useState<"FIRED" | "SUSPENDED" | "ON_LEAVE">("FIRED");
  const [terminateNote, setTerminateNote] = useState("");

  // Reset password dialog state
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [newPwd, setNewPwd] = useState("");

  const activeUsers = users.filter((u) => u.isActive);
  const deactivatedUsers = users.filter((u) => !u.isActive);

  const { execute: execBulk, isPending: bulkPending } = useAction(bulkCreateUsers, {
    onSuccess: (res) => {
      const { created, skipped } = res.data ?? {};
      toast.success(`Created ${created} user(s)${skipped ? `, skipped ${skipped}` : ""}`);
      setRows([emptyRow()]);
      window.location.reload();
    },
    onError: (err) => toast.error(err.error.serverError ?? "Failed to create users"),
  });

  const { execute: execTerminate, isPending: termPending } = useAction(terminateUser, {
    onSuccess: () => {
      toast.success("Account deactivated");
      setTerminatingUser(null);
      window.location.reload();
    },
    onError: (err) => toast.error(err.error.serverError ?? "Failed to deactivate"),
  });

  const { execute: execReactivate } = useAction(reactivateUser, {
    onSuccess: () => { toast.success("Account reactivated"); window.location.reload(); },
    onError: (err) => toast.error(err.error.serverError ?? "Failed to reactivate"),
  });

  const { execute: execResetPwd, isPending: resetPending } = useAction(resetPassword, {
    onSuccess: () => {
      toast.success("Password reset. Employee must set a new password on next login.");
      setResettingUser(null);
      setNewPwd("");
    },
    onError: (err) => toast.error(err.error.serverError ?? "Failed to reset password"),
  });

  function updateRow(i: number, field: keyof BulkRow, val: string) {
    const next = [...rows];
    next[i] = { ...next[i], [field]: val };
    setRows(next);
  }

  function handleBulkSubmit() {
    const valid = rows.filter((r) => r.name.trim() && r.email.trim() && r.password.trim());
    if (valid.length === 0) { toast.error("Fill in at least one row with Name, Email, and Password"); return; }
    execBulk({ users: valid });
  }

  function handlePaste(e: React.ClipboardEvent, rowIndex: number) {
    const text = e.clipboardData.getData("text");
    const lines = text.trim().split("\n").filter(Boolean);
    if (lines.length <= 1) return; // Single line paste, let it go through normally
    e.preventDefault();
    const newRows: BulkRow[] = lines.map((line) => {
      const cols = line.split("\t").map((c) => c.trim());
      return {
        name: cols[0] ?? "",
        email: cols[1] ?? "",
        employeeId: cols[2] ?? "",
        customRoleId: "",
        departmentId: "",
        password: cols[3] ?? "",
      };
    });
    const updated = [...rows];
    updated.splice(rowIndex, 1, ...newRows);
    setRows(updated);
    toast.info(`Pasted ${newRows.length} row(s). Review and submit.`);
  }

  const REASON_LABELS = { FIRED: "Fired", SUSPENDED: "Suspended", ON_LEAVE: "On Leave" };

  return (
    <Tabs defaultValue="team">
      <TabsList>
        <TabsTrigger value="team">Team ({activeUsers.length})</TabsTrigger>
        <TabsTrigger value="add-many">Add Employees</TabsTrigger>
        {deactivatedUsers.length > 0 && (
          <TabsTrigger value="deactivated">Deactivated ({deactivatedUsers.length})</TabsTrigger>
        )}
      </TabsList>

      {/* ── Active Users ── */}
      <TabsContent value="team" className="mt-4">
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {activeUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                    {getInitials(user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{user.name}</p>
                      {user.mustChangePassword && (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Must change password</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                      {user.employeeId && ` · ${user.employeeId}`}
                      {user.department && ` · ${user.department.name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {user.role === "CEO" ? (
                      <Badge className="bg-purple-100 text-purple-700 text-xs">CEO</Badge>
                    ) : user.customRole ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: user.customRole.color + "20", color: user.customRole.color }}>
                        {user.customRole.name}
                      </span>
                    ) : (
                      <Badge variant="secondary" className="text-xs">{user.role}</Badge>
                    )}
                    {user.id !== currentUserId && user.role !== "CEO" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" title="Reset Password"
                          onClick={() => { setResettingUser(user); setNewPwd(""); }}>
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700"
                          title="Deactivate Account"
                          onClick={() => { setTerminatingUser(user); setTerminateNote(""); setTerminateReason("FIRED"); }}>
                          <UserX className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {activeUsers.length === 0 && (
                <p className="py-10 text-center text-muted-foreground text-sm">No active users</p>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Add Many ── */}
      <TabsContent value="add-many" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Bulk Add Employees</CardTitle>
            <p className="text-xs text-muted-foreground">
              Fill in the table below. Tip: paste a spreadsheet (Tab-separated columns: Name, Email, Employee ID, Password) to auto-fill.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b">
                    <th className="text-left py-2 pr-2 font-medium">Name *</th>
                    <th className="text-left py-2 pr-2 font-medium">Email *</th>
                    <th className="text-left py-2 pr-2 font-medium">Employee ID</th>
                    <th className="text-left py-2 pr-2 font-medium">Role</th>
                    <th className="text-left py-2 pr-2 font-medium">Department</th>
                    <th className="text-left py-2 pr-2 font-medium">Initial Password *</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row, i) => (
                    <tr key={i}>
                      <td className="py-1.5 pr-2">
                        <Input value={row.name} onChange={(e) => updateRow(i, "name", e.target.value)}
                          onPaste={(e) => handlePaste(e, i)} placeholder="Jane Smith" className="h-8 text-sm" />
                      </td>
                      <td className="py-1.5 pr-2">
                        <Input value={row.email} onChange={(e) => updateRow(i, "email", e.target.value)}
                          placeholder="jane@company.com" type="email" className="h-8 text-sm" />
                      </td>
                      <td className="py-1.5 pr-2">
                        <Input value={row.employeeId} onChange={(e) => updateRow(i, "employeeId", e.target.value)}
                          placeholder="EMP-001 (auto)" className="h-8 text-sm" />
                      </td>
                      <td className="py-1.5 pr-2">
                        <select value={row.customRoleId} onChange={(e) => updateRow(i, "customRoleId", e.target.value)}
                          className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm">
                          <option value="">Select role</option>
                          {customRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </td>
                      <td className="py-1.5 pr-2">
                        <select value={row.departmentId} onChange={(e) => updateRow(i, "departmentId", e.target.value)}
                          className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm">
                          <option value="">Select dept</option>
                          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </td>
                      <td className="py-1.5 pr-2">
                        <Input value={row.password} onChange={(e) => updateRow(i, "password", e.target.value)}
                          placeholder="Min 8 chars" type="password" className="h-8 text-sm" />
                      </td>
                      <td className="py-1.5">
                        {rows.length > 1 && (
                          <Button size="sm" variant="ghost" onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setRows([...rows, emptyRow()])}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Row
              </Button>
              <Button onClick={handleBulkSubmit} disabled={bulkPending}>
                {bulkPending ? "Creating accounts…" : `Create ${rows.filter((r) => r.name && r.email && r.password).length} Account(s)`}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Employees will be required to change their password on first login. Passwords are never stored or visible to anyone.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Deactivated ── */}
      {deactivatedUsers.length > 0 && (
        <TabsContent value="deactivated" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {deactivatedUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 px-4 py-3 bg-muted/30">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0 opacity-50">
                      {getInitials(user.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-muted-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                        {user.terminationReason && ` · ${REASON_LABELS[user.terminationReason as keyof typeof REASON_LABELS] ?? user.terminationReason}`}
                      </p>
                      {user.terminationNote && (
                        <p className="text-xs text-muted-foreground italic truncate">"{user.terminationNote}"</p>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => execReactivate({ userId: user.id })}>
                      <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Reactivate
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      )}

      {/* ── Termination Dialog ── */}
      {terminatingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader>
              <CardTitle className="text-base text-red-700">Deactivate Account</CardTitle>
              <p className="text-sm text-muted-foreground">
                Deactivating <strong>{terminatingUser.name}</strong> will immediately sign them out of all devices.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Reason</Label>
                <div className="flex gap-2">
                  {(["FIRED", "SUSPENDED", "ON_LEAVE"] as const).map((r) => (
                    <button key={r} onClick={() => setTerminateReason(r)}
                      className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${terminateReason === r ? "border-red-400 bg-red-50 text-red-700 font-medium" : "border-border hover:bg-muted"}`}>
                      {REASON_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Message to Employee <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <textarea
                  className="w-full rounded-md border border-input px-3 py-2 text-sm resize-none min-h-[80px] bg-transparent"
                  placeholder="This message will be shown to the employee when they next try to log in…"
                  value={terminateNote}
                  onChange={(e) => setTerminateNote(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" disabled={termPending}
                  onClick={() => execTerminate({ userId: terminatingUser.id, reason: terminateReason, note: terminateNote || undefined })}>
                  {termPending ? "Deactivating…" : `${REASON_LABELS[terminateReason]} Employee`}
                </Button>
                <Button variant="outline" onClick={() => setTerminatingUser(null)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Reset Password Dialog ── */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-base">Reset Password</CardTitle>
              <p className="text-sm text-muted-foreground">
                Set a temporary password for <strong>{resettingUser.name}</strong>. They will be required to change it on next login.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>New Temporary Password</Label>
                <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="At least 8 characters" minLength={8} />
              </div>
              <p className="text-xs text-muted-foreground">
                You will not be able to see this password after saving. The employee must change it on first login.
              </p>
              <div className="flex gap-2">
                <Button className="flex-1" disabled={resetPending || newPwd.length < 8}
                  onClick={() => execResetPwd({ userId: resettingUser.id, newPassword: newPwd })}>
                  {resetPending ? "Resetting…" : "Reset Password"}
                </Button>
                <Button variant="outline" onClick={() => setResettingUser(null)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Tabs>
  );
}
