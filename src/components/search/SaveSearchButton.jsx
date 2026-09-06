import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Bell, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function SaveSearchButton({ searchType, filters, disabled }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [cadence, setCadence] = useState("daily");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await base44.entities.SavedSearch.create({
        name: name.trim(),
        search_type: searchType,
        filters: filters || {},
        alert_cadence: cadence,
        email_alerts: true,
      });
      toast({ title: "Search saved!", description: `You'll get ${cadence} email alerts when new leads match.` });
      setOpen(false);
      setName("");
    } catch (_e) {
      toast({ title: "Failed to save search", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={disabled}>
        <Bell className="w-4 h-4 mr-1.5" />
        Save Search
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save this search</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="search-name">Name</Label>
              <Input id="search-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Florida tech startups" className="mt-1.5" />
            </div>
            <div>
              <Label>Email alert frequency</Label>
              <div className="flex gap-2 mt-1.5">
                {["daily", "weekly", "none"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCadence(c)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                      cadence === c ? "bg-primary text-primary-foreground" : "bg-white/40 border border-white/40 hover:border-primary/30"
                    }`}
                  >
                    {c === "none" ? "No alerts" : c.charAt(0).toUpperCase() + c.slice(1)}
                  </button>
                ))}
              </div>
              {cadence !== "none" && <p className="text-xs text-muted-foreground mt-1.5">We'll email you when new leads match your search criteria.</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Bell className="w-4 h-4 mr-1.5" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}