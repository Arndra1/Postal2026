import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TAG_STYLES = [
  "bg-primary/10 text-primary",
  "bg-secondary/30 text-secondary-foreground",
  "bg-accent/15 text-accent",
  "bg-foreground/10 text-foreground",
];

const tagStyle = (tag) =>
  TAG_STYLES[tag.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % TAG_STYLES.length];

export default function TagsEditor({ tags, onTagsChange }) {
  const [value, setValue] = useState("");
  const tagsList = tags || [];

  const add = () => {
    const t = value.trim();
    setValue("");
    if (!t || tagsList.includes(t)) return;
    onTagsChange([...tagsList, t]);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[26px]">
        {tagsList.map((t) => (
          <span key={t} className={"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium " + tagStyle(t)}>
            {t}
            <button onClick={() => onTagsChange(tagsList.filter((x) => x !== t))} className="hover:opacity-70" title={"Remove " + t}>
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {tagsList.length === 0 && <span className="text-xs text-muted-foreground self-center">No tags yet — add one below.</span>}
      </div>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Add a tag (e.g. hot prospect)..."
          className="h-8 text-sm"
        />
        <Button variant="outline" size="sm" onClick={add}><Plus className="w-3.5 h-3.5" /></Button>
      </div>
    </div>
  );
}