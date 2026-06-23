"use client";

import { useState, useRef, useEffect } from "react";
import { useAction } from "next-safe-action/hooks";
import { sendMessage, markMessageRead, deleteMessage } from "@/server/actions/messages.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, formatDistanceToNow } from "date-fns";
import { Loader2, Plus, Trash2, MessageSquare, Send, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

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

function getConversationLabel(msg: MessageData, currentUserId: string): string {
  if (msg.sender.id === currentUserId) {
    if (msg.recipient?.name) return msg.recipient.name;
    if (msg.team?.name) return `Team: ${msg.team.name}`;
    if (msg.toRole) return ROLE_LABELS[msg.toRole] ?? msg.toRole;
    return "Unknown";
  }
  return msg.sender.name ?? msg.sender.email;
}

function getConversationSub(msg: MessageData, currentUserId: string): string {
  if (msg.sender.id === currentUserId) return `To: ${getConversationLabel(msg, currentUserId)}`;
  return `From: ${msg.sender.name ?? msg.sender.email}`;
}

export function MessagesClient({
  inbox,
  sent,
  companyUsers,
  availableTeams,
  currentUserId,
  currentUserRole,
}: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [form, setForm] = useState<ComposeForm>(DEFAULT_FORM);
  const [replyBody, setReplyBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Merge inbox + sent, deduplicate, sort by latest activity
  const allConversations = [...inbox, ...sent]
    .filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
    .sort((a, b) => {
      const latestA = a.replies.length
        ? a.replies[a.replies.length - 1].createdAt
        : a.createdAt;
      const latestB = b.replies.length
        ? b.replies[b.replies.length - 1].createdAt
        : b.createdAt;
      return new Date(latestB).getTime() - new Date(latestA).getTime();
    });

  const selected = allConversations.find((m) => m.id === selectedId) ?? null;

  // Build flat thread from selected message + replies
  const thread = selected
    ? [
        {
          id: selected.id,
          body: selected.body,
          sender: selected.sender,
          createdAt: selected.createdAt,
        },
        ...selected.replies.map((r) => ({
          id: r.id,
          body: r.body,
          sender: r.sender,
          createdAt: r.createdAt,
        })),
      ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];

  // Auto-scroll to bottom when thread changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedId, thread.length]);

  const { execute: send, isPending: sending } = useAction(sendMessage, {
    onSuccess: () => {
      toast.success("Message sent");
      setComposeOpen(false);
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
    onSuccess: () => {
      toast.success("Deleted");
      if (selectedId === selected?.id) setSelectedId(null);
      router.refresh();
    },
    onError: (err) => toast.error(err.error.serverError ?? "Failed"),
  });

  function selectConversation(msg: MessageData) {
    setSelectedId(msg.id);
    setReplyBody("");
    if (!msg.readAt && msg.sender.id !== currentUserId) {
      markRead({ messageId: msg.id });
    }
  }

  function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !replyBody.trim()) return;
    send({ parentId: selected.id, subject: `Re: ${selected.subject}`, body: replyBody });
  }

  function handleCompose(e: React.FormEvent) {
    e.preventDefault();
    send({
      recipientId: form.recipientType === "user" ? form.recipientId || undefined : undefined,
      toRole: form.recipientType === "role" ? form.toRole || undefined : undefined,
      teamId: form.recipientType === "team" ? form.toTeamId || undefined : undefined,
      subject: form.subject,
      body: form.body,
    });
  }

  function isComposeDisabled(): boolean {
    if (sending) return true;
    if (!form.subject.trim() || !form.body.trim()) return true;
    if (form.recipientType === "user") return !form.recipientId;
    if (form.recipientType === "role") return !form.toRole;
    if (form.recipientType === "team") return !form.toTeamId;
    return false;
  }

  const unreadCount = inbox.filter(
    (m) => !m.readAt && m.sender.id !== currentUserId
  ).length;

  return (
    // -m-4 lg:-m-6 cancels the page padding; h fills the main flex-1 area
    <div className="flex -m-4 lg:-m-6 overflow-hidden" style={{ height: "calc(100vh - 3.5rem)" }}>

      {/* ── Left panel: conversation list ───────────────────────────────── */}
      <div
        className={cn(
          "flex flex-col border-r bg-background w-full shrink-0 lg:w-80",
          selectedId && "hidden lg:flex"
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between gap-2 border-b px-4 shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="font-bold">Messages</h1>
            {unreadCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-medium">
                {unreadCount}
              </span>
            )}
          </div>
          <Dialog
            open={composeOpen}
            onOpenChange={(o) => { setComposeOpen(o); if (!o) setForm(DEFAULT_FORM); }}
          >
            <DialogTrigger render={
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />New
              </Button>
            } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Message</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCompose} className="space-y-4">
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
                      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
                    >
                      <option value="">Select person…</option>
                      {companyUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name ?? u.email} — {u.role}
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
                      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
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
                      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
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

                <div className="space-y-1">
                  <Label>Message</Label>
                  <Textarea
                    value={form.body}
                    onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                    placeholder="Write your message…"
                    rows={4}
                    required
                  />
                </div>

                <Button type="submit" disabled={isComposeDisabled()} className="w-full">
                  {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Send className="mr-2 h-4 w-4" />Send
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto divide-y">
          {allConversations.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground px-4 text-center">
              <MessageSquare className="h-8 w-8 opacity-30" />
              <p className="text-sm">No messages yet</p>
              <Button size="sm" onClick={() => setComposeOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />New Message
              </Button>
            </div>
          ) : (
            allConversations.map((msg) => {
              const isUnread = !msg.readAt && msg.sender.id !== currentUserId;
              const isMine = msg.sender.id === currentUserId;
              const lastMsg = msg.replies.length
                ? msg.replies[msg.replies.length - 1]
                : msg;
              const lastPreview = lastMsg.body.length > 60
                ? lastMsg.body.slice(0, 60) + "…"
                : lastMsg.body;
              const avatarName = getConversationLabel(msg, currentUserId);

              return (
                <button
                  key={msg.id}
                  onClick={() => selectConversation(msg)}
                  className={cn(
                    "w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
                    selectedId === msg.id && "bg-primary/5 border-r-2 border-primary",
                    isUnread && "bg-primary/[0.03]"
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    isMine ? "bg-primary/10 text-primary" : "bg-muted text-foreground"
                  )}>
                    {avatarName.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className={cn("text-sm truncate", isUnread ? "font-semibold" : "font-medium")}>
                        {avatarName}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: false })}
                      </span>
                    </div>
                    <p className={cn("text-xs truncate mt-0.5", isUnread ? "text-foreground font-medium" : "text-muted-foreground")}>
                      {msg.subject}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {isMine && lastMsg === msg ? "You: " : lastMsg.sender.id === currentUserId ? "You: " : ""}{lastPreview}
                    </p>
                  </div>

                  {isUnread && (
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right panel: chat view ───────────────────────────────────────── */}
      {selected ? (
        <div className={cn(
          "flex-1 flex flex-col overflow-hidden bg-muted/10",
          !selectedId && "hidden lg:flex"
        )}>
          {/* Chat header */}
          <div className="flex h-14 items-center gap-3 border-b bg-background px-4 shrink-0">
            <button
              className="lg:hidden p-1 rounded hover:bg-muted"
              onClick={() => setSelectedId(null)}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
              {getConversationLabel(selected, currentUserId).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight">{getConversationLabel(selected, currentUserId)}</p>
              <p className="text-xs text-muted-foreground truncate">{selected.subject}</p>
            </div>
            {selected.sender.id === currentUserId && (
              <button
                onClick={() => del({ messageId: selected.id })}
                className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Delete conversation"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
            {thread.map((msg, i) => {
              const isMine = msg.sender.id === currentUserId;
              const prevMsg = i > 0 ? thread[i - 1] : null;
              const showSender = !isMine && prevMsg?.sender.id !== msg.sender.id;

              return (
                <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                  <div className={cn("flex flex-col max-w-[72%]", isMine && "items-end")}>
                    {showSender && (
                      <span className="text-xs text-muted-foreground ml-1 mb-1">
                        {msg.sender.name ?? msg.sender.email}
                      </span>
                    )}
                    <div
                      className={cn(
                        "px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words",
                        isMine
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-background border rounded-tl-sm"
                      )}
                    >
                      {msg.body}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 px-1">
                      {format(new Date(msg.createdAt), "h:mm a")}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Reply input */}
          <form
            onSubmit={handleReply}
            className="flex items-end gap-2 border-t bg-background px-4 py-3 shrink-0"
          >
            <Textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (replyBody.trim()) handleReply(e as any);
                }
              }}
              placeholder="Type a reply… (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="resize-none flex-1 max-h-32 overflow-y-auto"
            />
            <Button
              type="submit"
              size="icon"
              disabled={sending || !replyBody.trim()}
              className="shrink-0 h-9 w-9 rounded-full"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      ) : (
        <div className="flex-1 hidden lg:flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
          <MessageSquare className="h-14 w-14 opacity-10 mb-3" />
          <p className="font-medium">Select a conversation</p>
          <p className="text-sm mt-1">or start a new one</p>
          <Button size="sm" variant="outline" className="mt-4" onClick={() => setComposeOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />New Message
          </Button>
        </div>
      )}
    </div>
  );
}
