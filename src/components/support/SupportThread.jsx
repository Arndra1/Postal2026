import React, { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";

// Shared conversation thread for a single support request.
// viewerRole: "user" | "staff" — controls which read flag is toggled on view
// and which side the bubble renders (staff on the right, user on the left).
export default function SupportThread({ ticket, viewerRole = "user", onReplySent }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const msgs = await base44.entities.SupportMessage.filter(
          { support_request_id: ticket.id },
          "created_date"
        );
        if (!active) return;
        setMessages(msgs || []);
        // Mark messages from the other party as read.
        const readField = viewerRole === "staff" ? "read_by_staff" : "read_by_user";
        const senderToMark = viewerRole === "staff" ? "user" : "staff";
        const unread = (msgs || []).filter(
          (m) => m.sender === senderToMark && m[readField] === false
        );
        if (unread.length) {
          base44.entities.SupportMessage.updateMany(
            { support_request_id: ticket.id, sender: senderToMark, [readField]: false },
            { $set: { [readField]: true } }
          ).catch(() => {});
        }
      } catch (_e) {
        if (active) setError("Couldn't load the conversation.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [ticket.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    const text = reply.trim();
    if (!text) return;
    setSending(true);
    setError("");
    try {
      const res = await base44.functions.invoke("replySupportMessage", {
        support_request_id: ticket.id,
        body: text
      });
      const msg = res?.data?.message || res?.message;
      if (msg) setMessages((prev) => [...prev, msg]);
      setReply("");
      onReplySent?.();
    } catch (_e) {
      setError("Could not send your reply. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 p-4 bg-secondary/5 rounded-xl min-h-[200px] max-h-[480px]">
        {/* Original request */}
        <div className={`flex ${viewerRole === "staff" ? "justify-start" : "justify-start"}`}>
          <div className="max-w-[80%]">
            <div className="text-xs font-semibold text-muted-foreground mb-1">
              {ticket.name} · original request
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-2.5 text-sm whitespace-pre-wrap">
              {ticket.message}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {ticket.created_date ? new Date(ticket.created_date).toLocaleString() : ""}
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {messages.map((m) => {
          const isStaff = m.sender === "staff";
          const mine = (viewerRole === "staff" && isStaff) || (viewerRole === "user" && !isStaff);
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%]">
                <div className="text-xs font-semibold text-muted-foreground mb-1">
                  {isStaff ? "RingBellz Support" : m.author_name || ticket.name}
                </div>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    mine
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-card border border-border rounded-tl-sm"
                  }`}
                >
                  {m.body}
                </div>
                <div className={`text-[10px] text-muted-foreground mt-1 ${mine ? "text-right" : ""}`}>
                  {m.created_date ? new Date(m.created_date).toLocaleString() : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3">
        {error && <p className="text-sm text-destructive mb-2">{error}</p>}
        <div className="flex gap-2">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type your reply..."
            rows={2}
            className="resize-none"
          />
          <Button onClick={send} disabled={!reply.trim() || sending} className="self-end">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}