import React, { useState } from "react";
import { Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const LIST_COLOR_DOT = {
  plum: "bg-primary",
  mauve: "bg-secondary",
  rose: "bg-accent",
  charcoal: "bg-foreground/70",
};

export default function ListsEditor({ lead, lists, onCreate, onListIdsChange }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("plum");
  const [creating, setCreating] = useState(false);
  const ids = lead.list_ids || [];

  const toggle = (id) => onListIdsChange(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);

  const create = async () => {
    const n = name.trim();
    if (!n) return;
    setCreating(true);
    try {
      const created = await onCreate(n, color);
      if (created && !ids.includes(created.id)) onListIdsChange([...ids, created.id]);
      setName("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="space-y-1.5 mb-3">
        {lists.map((l) => {
          const on = ids.includes(l.id);
          return (
            <button
              key={l.id}
              onClick={() => toggle(l.id)}
              className={"w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm transition " + (on ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted/50")}
            >
              <span className={"w-2.5 h-2.5 rounded-full " + (LIST_COLOR_DOT[l.color] || LIST_COLOR_DOT.plum)} />
              <span className="flex-1 text-left font-medium">{l.name}</span>
              {on && <Check className="w-4 h-4 text-primary" />}
            </button>
          );
        })}
        {lists.length === 0 && <p className="text-xs text-muted-foreground">No lists yet — create your first list below.</p>}
      </div>
      <div className="flex gap-2 items-center">
        <Input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); create(); } }} placeholder="New list name (e.g. Q4 Prospects)" className="h-8 text-sm" />
        <div className="flex gap-1">
          {Object.keys(LIST_COLOR_DOT).map((c) => (
            <button key={c} onClick={() => setColor(c)} className={"w-5 h-5 rounded-full " + (LIST_COLOR_DOT)[c] + (color === c ? " ring-2 ring-ring ring-offset-2 ring-offset-card" : " opacity-50")} title={c} />
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={create} disabled={creating}><Plus className="w-3.5 h-3.5" /></Button>
      </div>
    </div>
  );
}