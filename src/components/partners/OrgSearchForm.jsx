import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ResponsiveSelect from "@/components/ResponsiveSelect";
import { US_STATES, NTEE_GROUPS } from "@/lib/community";
import { Loader2, Search } from "lucide-react";

// Search form for churches and nonprofits in the official IRS file.
export default function OrgSearchForm({ filters, onChange, onSearch, loading }) {
  const set = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSearch(); }} className="glass-panel p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">State</Label>
          <ResponsiveSelect
            value={filters.state}
            onChange={(v) => set("state", v)}
            aria-label="State"
            options={[{ value: "", label: "Select a state" }, ...US_STATES.map((s) => ({ value: s.code, label: s.name }))]}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">City (optional)</Label>
          <Input value={filters.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Atlanta" className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Name contains (optional)</Label>
          <Input value={filters.keyword} onChange={(e) => set("keyword", e.target.value)} placeholder="e.g. CHURCH" className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Who to find</Label>
          <ResponsiveSelect
            value={filters.org_type}
            onChange={(v) => set("org_type", v)}
            aria-label="Who to find"
            options={[{ value: "", label: "Churches & nonprofits" }, { value: "church", label: "Churches only" }]}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
          <Label className="text-xs text-muted-foreground">Cause area (optional)</Label>
          <ResponsiveSelect
            value={filters.ntee}
            onChange={(v) => set("ntee", v)}
            aria-label="Cause area"
            options={[{ value: "", label: "Any cause area" }, ...NTEE_GROUPS.map((g) => ({ value: g.code, label: g.label }))]}
            className="h-10"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <Button type="submit" className="h-10" disabled={!filters.state || loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
          {loading ? "Searching IRS filings…" : "Search IRS filings"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Official IRS Exempt Organizations file · 0 credits. Add a city or a name to narrow a large state.
        </p>
      </div>
    </form>
  );
}