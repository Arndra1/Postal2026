import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

// Collapsible FAQ list. Accepts pre-filtered items so the parent page owns search.
export default function FaqList({ faqs }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="space-y-2">
      {faqs.map((f, i) => (
        <div key={i} className="border border-border rounded-xl overflow-hidden">
          <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30">
            <span className="font-medium text-sm">{f.q}</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition flex-shrink-0 ${open === i ? "rotate-180" : ""}`} />
          </button>
          {open === i && <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{f.a}</div>}
        </div>
      ))}
    </div>
  );
}