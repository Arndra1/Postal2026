import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Loader2, Send } from "lucide-react";

const TYPES = [
  { value: "useful_result", label: "Useful result" },
  { value: "poor_result", label: "Poor result" },
  { value: "missing_information", label: "Missing information" },
  { value: "enrichment_issue", label: "Enrichment issue" },
  { value: "confusing_page", label: "Confusing page" },
  { value: "bug", label: "Bug" },
  { value: "other", label: "Other" },
];

export default function BetaFeedbackWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Only show to non-admin beta users.
  if (!user || ["admin", "owner", "staff"].includes(user.role)) return null;

  const submit = async () => {
    if (!type) return;
    setSubmitting(true);
    try {
      await base44.entities.BetaFeedback.create({
        user_id: user.id,
        feedback_type: type,
        message,
      });
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
        setType("");
        setMessage("");
      }, 1500);
    } catch (_e) {} finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full lady-gradient lady-shadow-lg flex items-center justify-center text-white hover:scale-105 transition"
          aria-label="Beta Feedback"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Beta Feedback</DialogTitle>
        </DialogHeader>
        {done ? (
          <div className="py-6 text-center">
            <div className="text-2xl mb-2">✓</div>
            <p className="text-sm text-muted-foreground">Thank you! Your feedback was submitted.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">What's this about?</label>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    className={`text-left px-3 py-2 rounded-lg border text-sm transition ${
                      type === t.value
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Details (optional)</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us more..."
                rows={3}
              />
            </div>
            <Button className="w-full" onClick={submit} disabled={!type || submitting}>
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Submit Feedback</>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}