import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, CheckCheck, Trash2, Loader2, Coins, CreditCard, Sparkles, Database, Shield } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const ICONS = {
  credit_low: Coins,
  subscription_renewing: CreditCard,
  subscription_canceled: CreditCard,
  subscription_ended: CreditCard,
  enrichment_complete: Sparkles,
  bulk_enrichment_complete: Sparkles,
  new_data_source: Database,
  compliance_notice: Shield,
  general: Bell,
};

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    base44.entities.Notification.filter({ user_id: user.id }, "-created_date", 50)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await base44.entities.Notification.update(id, { read: true });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = async () => {
    const unread = items.filter((n) => !n.read);
    for (const n of unread) {
      await base44.entities.Notification.update(n.id, { read: true });
    }
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    toast({ title: "All notifications marked as read" });
  };

  const remove = async (id) => {
    await base44.entities.Notification.delete(id);
    setItems((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}.` : "You're all caught up."}
        action={unreadCount > 0 ? <Button variant="outline" onClick={markAllRead}><CheckCheck className="w-4 h-4 mr-2" /> Mark all read</Button> : null}
      />

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <BellOff className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <div key={n.id} className={`glass-card p-4 flex items-start gap-3 ${!n.read ? "border-primary/30" : ""}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${!n.read ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{n.title}</p>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  {n.body && <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>}
                  <p className="text-xs text-muted-foreground/70 mt-1">{n.created_date ? new Date(n.created_date).toLocaleString() : ""}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {n.action_url && (
                    <Button variant="ghost" size="sm" onClick={() => navigate(n.action_url)}>View</Button>
                  )}
                  {!n.read && (
                    <Button variant="ghost" size="icon" onClick={() => markRead(n.id)} title="Mark read"><CheckCheck className="w-4 h-4" /></Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => remove(n.id)} title="Delete"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}