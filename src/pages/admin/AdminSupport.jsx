import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import SupportThread from "@/components/support/SupportThread";
import { Loader2, Headset, Inbox } from "lucide-react";

// Admin support inbox — staff/admins see all tickets, open a thread, and reply.
export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const list = await base44.entities.SupportRequest.list("-updated_date", 100);
        if (!active) return;
        setTickets(list || []);
        if ((list || []).length && !selectedId) setSelectedId(list[0].id);
      } catch (_e) {
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [refreshKey]);

  const selected = tickets.find((t) => t.id === selectedId);

  const statusColor = (s) =>
    s === "new" ? "bg-accent/15 text-accent" :
    s === "in_progress" ? "bg-gold/15 text-gold" :
    "bg-secondary/15 text-secondary-foreground";

  return (
    <div>
      <PageHeader
        title="Support Inbox"
        subtitle="View and reply to customer support requests."
        action={<Headset className="w-6 h-6 text-primary" />}
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <Inbox className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-heading text-lg font-semibold">No support requests yet</h3>
          <p className="text-sm text-muted-foreground mt-1">New tickets will appear here.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[320px_1fr] gap-6 h-[calc(100vh-220px)]">
          {/* Ticket list */}
          <div className="glass-panel p-3 overflow-y-auto">
            <div className="space-y-1.5">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left p-3 rounded-xl transition ${
                    selectedId === t.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-secondary/10 border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">{t.category}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>
                      {t.status === "in_progress" ? "Open" : t.status === "resolved" ? "Resolved" : "New"}
                    </span>
                  </div>
                  <div className="text-sm font-medium truncate">{t.subject}</div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {t.name} · {t.account_email}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Thread */}
          <div className="glass-panel p-4 flex flex-col">
            {selected ? (
              <>
                <div className="flex items-start justify-between gap-4 pb-3 mb-3 border-b border-border">
                  <div className="min-w-0">
                    <h3 className="font-heading font-semibold truncate">{selected.subject}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selected.name} · {selected.account_email}
                      {selected.company ? ` · ${selected.company}` : ""}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor(selected.status)}`}>
                    {selected.status === "in_progress" ? "Open" : selected.status === "resolved" ? "Resolved" : "New"}
                  </span>
                </div>
                <SupportThread
                  ticket={selected}
                  viewerRole="staff"
                  onReplySent={() => setRefreshKey((k) => k + 1)}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Select a ticket to view the conversation.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}