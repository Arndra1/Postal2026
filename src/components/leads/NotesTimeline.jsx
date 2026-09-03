import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/StatusBadge";
import { Loader2, StickyNote, Sparkles } from "lucide-react";

export default function NotesTimeline({ lead }) {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [note, setNote] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setItems(null);
    Promise.all([
      base44.entities.LeadNote.filter({ user_id: user.id, lead_id: lead.id }),
      base44.entities.Enrichment.filter({ user_id: user.id, lead_id: lead.id }).catch(() => []),
    ]).then(([notes, enrichments]) => {
      const merged = [
        ...notes.map((n) => ({ id: n.id, type: "note", date: n.created_date, text: n.note })),
        ...enrichments.map((e) => ({ id: "e_" + e.id, type: "enrichment", date: e.created_date, status: e.status, credits: e.credits_charged, provider: e.provider })),
      ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setItems(merged);
    }).catch(() => setItems([]));
  }, [user, lead.id]);

  const addNote = async () => {
    const text = note.trim();
    if (!text) return;
    setPosting(true);
    try {
      await base44.entities.LeadNote.create({ user_id: user.id, lead_id: lead.id, note: text });
      setNote("");
      const notes = await base44.entities.LeadNote.filter({ user_id: user.id, lead_id: lead.id });
      setItems((prev) => [
        { id: "tmp_" + Date.now(), type: "note", date: new Date().toISOString(), text },
        ...(prev || []).filter((i) => i.type !== "note"),
      ]);
      // refresh full timeline order
      const enrichments = (await base44.entities.Enrichment.filter({ user_id: user.id, lead_id: lead.id }).catch(() => []));
      const merged = [
        ...notes.map((n) => ({ id: n.id, type: "note", date: n.created_date, text: n.note })),
        ...enrichments.map((e) => ({ id: "e_" + e.id, type: "enrichment", date: e.created_date, status: e.status, credits: e.credits_charged, provider: e.provider })),
      ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setItems(merged);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); addNote(); } }}
          placeholder="Add a note..."
          className="h-9 text-sm"
        />
        <Button size="sm" onClick={addNote} disabled={posting || !note.trim()}>
          {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
        </Button>
      </div>

      {items === null && <div className="py-6 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>}

      {items !== null && items.length === 0 && (
        <p className="text-xs text-muted-foreground py-2">No activity yet. Notes and enrichment history will appear here.</p>
      )}

      {items !== null && items.length > 0 && (
        <div className="space-y-0">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                  {item.type === "note" ? <StickyNote className="w-3.5 h-3.5 text-primary" /> : <Sparkles className="w-3.5 h-3.5 text-accent" />}
                </div>
                <div className="w-px flex-1 bg-border my-1" />
              </div>
              <div className="pb-5 flex-1">
                {item.type === "note" ? (
                  <p className="text-sm">{item.text}</p>
                ) : (
                  <div className="text-sm">
                    <span className="font-medium">Enrichment</span>
                    <span className="text-muted-foreground"> via {item.provider || "provider"}</span>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusBadge status={item.status} />
                      {item.credits > 0 && <span className="text-xs text-muted-foreground">{item.credits} credit{item.credits === 1 ? "" : "s"}</span>}
                    </div>
                  </div>
                )}
                {item.date && <p className="text-xs text-muted-foreground mt-1">{new Date(item.date).toLocaleString()}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}