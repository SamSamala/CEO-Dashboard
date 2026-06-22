"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { sendMessage, markMessageRead, deleteMessage } from "@/server/actions/messages.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Loader2, Plus, Reply, Trash2, MessageSquare, Inbox, Send } from "lucide-react";

type User = { id: string; name: string | null; email: string; role: string };
type Team = { id: string; name: string };
type MessageData = {
  id: string;
  subject: string;
  body: string;
  toRole: string | null;
  teamId: string | null;
  readAt: string | null;
  createdAt: string;
  sender: User;
  recipient?: User | null;
  team?: Team | null;
  replies: Array<{ id: string; body: string; createdAt: string; sender: User }>;
};

interface Props {
  inbox: MessageData[];
  sent: MessageData[];
  companyUsers: User[];
  availableTeams: Team[];
  currentUserId: string;
  currentUserRole: string;
}

const ROLE_LABELS: Record<string, string> = {
  CEO: "CEO",
  DEPT_HEAD: "All Department Heads",
  EMPLOYEE: "All Employees",
};

type RecipientType = "user" | "role" | "team";

interface ComposeForm {
  recipientType: RecipientType;
  recipientId: string;
  toRole: string;
  toTeamId: string;
  subject: string;
  body: string;
}

const DEFAULT_FORM: ComposeForm = {
  recipientType: "user",
  recipientId: "",
  toRole: "",
  toTeamId: "",
  subject: "",
  body: "",
};

export function MessagesClient({
  inbox,
  sent,
  companyUsers,
  availableTeams,
  currentUserId,
  currentUserRole,
}: Props) {
  const router = useRouter();
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; subject: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState<ComposeForm>(DEFAULT_FORM);
  const [replyBody, setReplyBody] = useState("");

  const { execute: send, isPending: sending } = useAction(sendMessage, {
    onSuccess: () => {
      toast.success("Message sent");
      setComposeOpen(false);
      setReplyTo(null);
      setForm(DEFAULT_FORM);
      setReplyBody("");
      router.refresh();
    },
    onError: (err) => toast.error(err.error.serverError ?? "Failed to send"),
  });

  const { execute: markRead } = useAction(markMessageRead, {
    onSuccess: () => router.refresh(),
    onError: () => {},
  });

  const { execute: del } = useAction(deleteMessage, {
    onSuccess: () => { toast.success("Deleted"); router.refresh(); },
    onError: (err) => toast.error(err.error.serverError ?? "Failed"),
  });

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (replyTo) {
      send({ parentId: replyTo.id, subject: `Re: ${replyTo.subject}`, body: replyBody });
    } else {
      send({
        recipientId: form.recipientType === "user" ? form.recipientId || undefined : undefined,
        toRole: form.recipientType === "role" ? form.toRole || undefined : undefined,
        teamId: form.recipientType === "team" ? form.toTeamId || undefined : undefined,
        subject: form.subject,
        body: form.body,
      });
    }
  }

  function openMessage(msg: MessageData) {
    setExpanded(expanded === msg.id ? null : msg.id);
    if (!msg.readAt && msg.sender.id !== currentUserId) {
      markRead({ messageId: msg.id });
    }
  }

  function getRecipientLabel(msg: MessageData, showRecipient: boolean): string {
    if (showRecipient) {
      if (msg.recipient?.name) return `To: ${msg.recipient.name}`;
      if (msg.team?.name) return `To team: ${msg.team.name}`;
      if (msg.toRole) return `To: ${ROLE_LABELS[msg.toRole] ?? msg.toRole}`;
      return "To: —";
    }
    return `From: ${msg.sender.name ?? msg.sender.email}`;
  }

  function isSendDisabled(): boolean {
    if (sending) return true;
    if (replyTo) return !replyBody.trim();
    if (!form.subject.trim() || !form.body.trim()) return true;
    if (form.recipientType === "user") return !form.recipientId;
    if (form.recipientType === "role") return !form.toRole;
    if (form.recipientType === "team") return !form.toTeamId;
    return false;
  }

  function MessageCard({ msg, showRecipient }: { msg: MessageData; showRecipient?: boolean }) {
    const isUnread = !msg.readAt && msg.sender.id !== currentUserId;
    const isOpen = expanded === msg.id;
    return (
      <div className={`rounded-lg border transition-all ${isUnread ? "border-primary/50 bg-primary/5" : "bg-card"}`}>
        <button className="w-full text-left p-3 flex items-start gap-3" onClick={() => openMessage(msg)}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isUnread && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
              <span className={`text-sm ${isUnread ? "font-semibold" : "font-medium"} truncate`}>{msg.subject}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {getRecipientLabel(msg, !!showRecipient)}
              {" · "}{format(new Date(msg.createdAt), "MMM d, h:mm a")}
              {msg.replies.length > 0 && ` · ${msg.replies.length} repl${msg.replies.length === 1 ? "y" : "ies"}`}
            </p>
          </div>
        </button>

        {isOpen && (
          <div className="px-3 pb-3 space-y-3 border-t pt-3">
            <div className="text-sm whitespace-pre-wrap">{msg.body}</div>
            {msg.replies.length > 0 && (
              <div className="space-y-2 border-l-2 border-muted pl-3">
                {msg.replies.map((r) => (
                  <div key={r.id} className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      {r.sender.name} · {format(new Date(r.createdAt), "MMM d, h:mm a")}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{r.body}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setReplyTo({ id: msg.id, subject: msg.subject }); setComposeOpen(true); }}
              >
                <Reply className="h-3 w-3 mr-1" />Reply
              </Button>
              {msg.sender.id === currentUserId && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => del({ messageId: msg.id })}
                >
                  <Trash2 className="h-3 w-3 mr-1" />Delete
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  const unreadCount = inbox.filter((m) => !m.readAt && m.sender.id !== currentUserId).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Internal communication · messages auto-delete after 48 hours
          </p>
        </div>
        <Dialog
          open={composeOpen}
          onOpenChange={(o) => {
            setComposeOpen(o);
            if (!o) { setReplyTo(null); setForm(DEFAULT_FORM); setReplyBody(""); }
          }}
        >
          <DialogTrigger render={
            <Button>
              <Plus className="h-4 w-4 mr-1" />Compose
            </Button>
          } />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{replyTo ? `Reply to: ${replyTo.subject}` : "New Message"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSend} className="space-y-4">
              {!replyTo && (
                <>
                  <div className="space-y-1">
                    <Label>Send To</Label>
                    <Select
                      value={form.recipientType}
                      onValueChange={(v) =>
                        setForm((p) => ({
                          ...p,
                          recipientType: (v as RecipientType) || "user",
                          recipientId: "",
                          toRole: "",
                          toTeamId: "",
                        }))
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user" label="Specific person">Specific person</SelectItem>
                        <SelectItem value="role" label="All users in a role">All users in a role</SelectItem>
                        {availableTeams.length > 0 && (
                          <SelectItem value="team" label="A team">A team</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {form.recipientType === "user" && (
                    <div className="space-y-1">
                      <Label>Recipient</Label>
                      <select
                        value={form.recipientId}
                        onChange={(e) => setForm((p) => ({ ...p, recipientId: e.target.value }))}
                        className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <option value="">Select person…</option>
                        {companyUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name ?? u.email} — {u.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {form.recipientType === "role" && (
                    <div className="space-y-1">
                      <Label>Broadcast to Role</Label>
                      <select
                        value={form.toRole}
                        onChange={(e) => setForm((p) => ({ ...p, toRole: e.target.value }))}
                        className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <option value="">Select role…</option>
                        {["CEO", "DEPT_HEAD", "EMPLOYEE"].map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {form.recipientType === "team" && (
                    <div className="space-y-1">
                      <Label>Broadcast to Team</Label>
                      <select
                        value={form.toTeamId}
                        onChange={(e) => setForm((p) => ({ ...p, toTeamId: e.target.value }))}
                        className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <option value="">Select team…</option>
                        {availableTeams.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label>Subject</Label>
                    <Input
                      value={form.subject}
                      onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                      placeholder="Message subject"
                      required
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <Label>Message</Label>
                <Textarea
                  value={replyTo ? replyBody : form.body}
                  onChange={(e) =>
                    replyTo
                      ? setReplyBody(e.target.value)
                      : setForm((p) => ({ ...p, body: e.target.value }))
                  }
                  placeholder="Write your message..."
                  rows={5}
                  required
                />
              </div>

              <Button type="submit" disabled={isSendDisabled()} className="w-full">
                {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                {replyTo ? "Send Reply" : "Send Message"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">
            <Inbox className="h-3.5 w-3.5 mr-1" />
            Inbox
            {unreadCount > 0 && (
              <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-medium">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent">
            <Send className="h-3.5 w-3.5 mr-1" />Sent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-4 space-y-2">
          {inbox.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                <MessageSquare className="h-8 w-8" />
                <p>No messages yet</p>
              </CardContent>
            </Card>
          ) : (
            inbox.map((msg) => <MessageCard key={msg.id} msg={msg} />)
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-4 space-y-2">
          {sent.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                <Send className="h-8 w-8" />
                <p>No sent messages</p>
              </CardContent>
            </Card>
          ) : (
            sent.map((msg) => <MessageCard key={msg.id} msg={msg} showRecipient />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
