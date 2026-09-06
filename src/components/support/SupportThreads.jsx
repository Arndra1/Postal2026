import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, ChevronDown, ChevronUp, MessageSquare, Inbox } from "lucide-react";
import SupportThread from "@/components/support/SupportThread";

// Shows the authenticated user's support conversations and lets them reply.
// Embedded in the Help page.
export default function SupportThreads() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const list = await base44.entities.SupportRequest.filter(
          { user_id: user.id },
          "-updated_date",
          50
        );
        if (!active) return;
        setTickets(list || []);
      } catch (_e) {
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [user, refreshKey]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="glass-panel p-8 text-center mb-6">
        <Inbox className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">You haven't submitted any support requests yet.</p>
      </div>
    );
  }

  const statusLabel = (s) =>
    s === "new" ? "New" : s === "in_progress" ? "Open" : s === "resolved" ? "Resolved" : s;

  return (
    <div className="glass-panel p-6 mb-6">
      <h2 className="font-heading text-lg font-semibold mb-1.5 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" /> Your Conversations
      </h2>
      <p className="text-sm text-muted-foreground mb-5">
        View and reply to your support requests. We respond by email and in-app.
      </p>
      <div className="space-y-3">
        {tickets.map((t) => {
          const open = openId === t.id;
          return (
            <div key={t.id} className="rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setOpenId(open ? null : t.id)}
                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-secondary/5 transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium truncate">{t.subject}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary-foreground">
                      {statusLabel(t.status)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.category} · {t.updated_date ? new Date(t.updated_date).toLocaleDateString() : ""}
                  </div>
                </div>
                {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
              </button>
              {open && (
                <div className="p-4 border-t border-border bg-card/30">
                  <SupportThread
                    ticket={t}
                    viewerRole="user"
                    onReplySent={() => setRefreshKey((k) => k + 1)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}