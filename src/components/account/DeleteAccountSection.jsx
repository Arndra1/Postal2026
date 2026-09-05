import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function DeleteAccountSection() {
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    try {
      await base44.functions.invoke("deleteAccount", {});
      toast({ title: "Account data deleted", description: "Your data has been permanently removed." });
      setTimeout(() => { base44.auth.logout("/login"); }, 1500);
    } catch (_e) {
      toast({ title: "Deletion failed", description: "Please contact support to complete account deletion.", variant: "destructive" });
      setDeleting(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-destructive/30 lady-shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <h2 className="font-heading text-lg font-semibold text-destructive">Danger Zone</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Permanently delete your account and all associated data — saved leads, notes, lists, enrichment history, credits, and billing records. This action cannot be undone. Audit logs are retained per legal requirements.
      </p>
      {!confirming ? (
        <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/5" onClick={() => setConfirming(true)}>
          <Trash2 className="w-4 h-4 mr-2" /> Delete My Account
        </Button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium">Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm:</p>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" className="max-w-xs" />
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleDelete} disabled={deleting || confirmText !== "DELETE"}>
              {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Permanently Delete
            </Button>
            <Button variant="outline" onClick={() => { setConfirming(false); setConfirmText(""); }} disabled={deleting}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}