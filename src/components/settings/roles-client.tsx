"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { createRole, updateRole, deleteRole } from "@/server/actions/roles.actions";
import { ALL_ASSIGNABLE_PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Save, ChevronDown, ChevronRight, Users, Shield } from "lucide-react";

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  color: string;
  isProtected: boolean;
  userCount: number;
}

const SECTIONS = [...new Set(ALL_ASSIGNABLE_PERMISSIONS.map((p) => p.section))];

export function RolesClient({ roles: initialRoles }: { roles: Role[] }) {
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", description: "", color: "#6366f1", permissions: [] as string[] });

  const { execute: execCreate, isPending: creating } = useAction(createRole, {
    onSuccess: () => {
      toast.success("Role created");
      setShowNewForm(false);
      setNewRole({ name: "", description: "", color: "#6366f1", permissions: [] });
      window.location.reload();
    },
    onError: (err) => toast.error(err.error.serverError ?? "Failed to create role"),
  });

  const { execute: execUpdate, isPending: updating } = useAction(updateRole, {
    onSuccess: () => {
      toast.success("Role updated — affected users will need to sign in again");
      setEditingRole(null);
      window.location.reload();
    },
    onError: (err) => toast.error(err.error.serverError ?? "Failed to update role"),
  });

  const { execute: execDelete } = useAction(deleteRole, {
    onSuccess: () => {
      toast.success("Role deleted");
      window.location.reload();
    },
    onError: (err) => toast.error(err.error.serverError ?? "Failed to delete role"),
  });

  function togglePermission(perms: string[], key: string): string[] {
    return perms.includes(key) ? perms.filter((p) => p !== key) : [...perms, key];
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowNewForm(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> New Role
        </Button>
      </div>

      {/* New role form */}
      {showNewForm && (
        <Card className="border-primary/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Create New Role</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Role Name</Label>
                <Input value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} placeholder="e.g. Sales Manager" />
              </div>
              <div className="space-y-1">
                <Label>Color</Label>
                <div className="flex gap-2">
                  <input type="color" value={newRole.color} onChange={(e) => setNewRole({ ...newRole, color: e.target.value })} className="h-9 w-12 rounded border cursor-pointer" />
                  <Input value={newRole.color} onChange={(e) => setNewRole({ ...newRole, color: e.target.value })} className="font-mono text-xs" />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Input value={newRole.description} onChange={(e) => setNewRole({ ...newRole, description: e.target.value })} placeholder="What does this role do?" />
            </div>
            <div className="space-y-3">
              <Label>Permissions</Label>
              {SECTIONS.map((section) => (
                <div key={section}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{section}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ALL_ASSIGNABLE_PERMISSIONS.filter((p) => p.section === section).map((p) => (
                      <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newRole.permissions.includes(p.key)}
                          onChange={() => setNewRole({ ...newRole, permissions: togglePermission(newRole.permissions, p.key) })}
                          className="rounded"
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => execCreate(newRole)} disabled={creating || !newRole.name.trim()}>
                {creating ? "Creating…" : "Create Role"}
              </Button>
              <Button variant="outline" onClick={() => setShowNewForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing roles */}
      {roles.map((role) => {
        const isExpanded = expandedRole === role.id;
        const isEditing = editingRole?.id === role.id;
        const editData = isEditing ? editingRole! : role;

        return (
          <Card key={role.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <button
                  className="flex items-center gap-2 flex-1 text-left"
                  onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                >
                  <div className="h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
                  <span className="font-medium">{role.name}</span>
                  {role.userCount > 0 && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Users className="h-2.5 w-2.5" />
                      {role.userCount}
                    </Badge>
                  )}
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5 ml-auto text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />}
                </button>
                <div className="flex gap-1.5 shrink-0">
                  {!isEditing && (
                    <Button size="sm" variant="outline" onClick={() => { setEditingRole({ ...role }); setExpandedRole(role.id); }}>
                      Edit
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      if (role.userCount > 0) {
                        toast.error(`Cannot delete — ${role.userCount} user(s) are assigned to this role`);
                        return;
                      }
                      if (confirm(`Delete role "${role.name}"? This cannot be undone.`)) {
                        execDelete({ roleId: role.id });
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {role.description && <p className="text-xs text-muted-foreground pl-5.5">{role.description}</p>}
            </CardHeader>

            {isExpanded && (
              <CardContent className="space-y-3 pt-0">
                {isEditing && (
                  <div className="grid grid-cols-2 gap-3 pb-2">
                    <div className="space-y-1">
                      <Label>Role Name</Label>
                      <Input value={editData.name ?? ""} onChange={(e) => setEditingRole({ ...editData, name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Color</Label>
                      <div className="flex gap-2">
                        <input type="color" value={editData.color ?? "#6366f1"} onChange={(e) => setEditingRole({ ...editData, color: e.target.value })} className="h-9 w-12 rounded border cursor-pointer" />
                      </div>
                    </div>
                  </div>
                )}

                {SECTIONS.map((section) => (
                  <div key={section}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{section}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {ALL_ASSIGNABLE_PERMISSIONS.filter((p) => p.section === section).map((p) => {
                        const checked = (isEditing ? editData.permissions : role.permissions)?.includes(p.key) ?? false;
                        return (
                          <label key={p.key} className={`flex items-center gap-2 text-sm ${isEditing ? "cursor-pointer" : "cursor-default"}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!isEditing}
                              onChange={() => {
                                if (!isEditing) return;
                                setEditingRole({ ...editData, permissions: togglePermission(editData.permissions ?? [], p.key) });
                              }}
                              className="rounded"
                            />
                            <span className={!checked && !isEditing ? "text-muted-foreground" : ""}>{p.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {isEditing && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={() => execUpdate({ roleId: role.id, name: editData.name, permissions: editData.permissions ?? [], color: editData.color })} disabled={updating}>
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                      {updating ? "Saving…" : "Save Changes"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingRole(null)}>Cancel</Button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {roles.length === 0 && !showNewForm && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Shield className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No roles yet</p>
            <p className="text-sm">Create your first role to assign permissions to your team.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
