import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollText, ShieldCheck, Loader2 } from "lucide-react";
import {
  TERMS_VERSION, COMPLIANCE_NOTICE, MARKETING_NOTICE,
  PERMITTED_USES, PROHIBITED_ELIGIBILITY_USES, CERTIFICATIONS
} from "@/lib/compliance";

// Gates the whole application until the user accepts the current Terms of Use.
// Records user id, agreement version, and date/time accepted (stored server-side).
export default function TermsGate({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState("loading"); // loading | pending | accepted
  const [checked, setChecked] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.TermsAcceptance.filter({ user_id: user.id, version: TERMS_VERSION })
      .then((r) => setState(r.length > 0 ? "accepted" : "pending"))
      .catch(() => setState("pending"));
  }, [user?.id]);

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (state === "accepted") return children;

  const allChecked = CERTIFICATIONS.every((_, i) => checked[i]);

  const accept = async () => {
    setSubmitting(true);
    try {
      await base44.functions.invoke("acceptTerms", {});
      setState("accepted");
    } catch (_e) {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card rounded-2xl border border-border lady-shadow-lg p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl lady-gradient flex items-center justify-center">
            <ScrollText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold">Terms of Use &amp; Compliance</h1>
            <p className="text-xs text-muted-foreground">Version {TERMS_VERSION} · Required before continuing</p>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-secondary/10 border border-secondary/25">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Compliance Notice</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{COMPLIANCE_NOTICE}</p>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <div>
            <h2 className="text-sm font-semibold mb-2">Permitted uses</h2>
            <ul className="space-y-1.5">
              {PERMITTED_USES.map((p) => (
                <li key={p} className="text-xs text-muted-foreground flex items-start gap-1.5"><span className="text-accent mt-0.5">✓</span>{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold mb-2">Not permitted</h2>
            <ul className="space-y-1.5">
              {PROHIBITED_ELIGIBILITY_USES.map((p) => (
                <li key={p} className="text-xs text-muted-foreground flex items-start gap-1.5"><span className="text-destructive mt-0.5">✕</span>{p}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 space-y-2.5">
          <h2 className="text-sm font-semibold">User certification</h2>
          {CERTIFICATIONS.map((c, i) => (
            <label key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background cursor-pointer hover:bg-muted/40 transition">
              <input
                type="checkbox"
                checked={!!checked[i]}
                onChange={(e) => setChecked({ ...checked, [i]: e.target.checked })}
                className="mt-0.5 accent-[hsl(var(--primary))]"
              />
              <span className="text-xs text-muted-foreground leading-relaxed">{c}</span>
            </label>
          ))}
        </div>

        <p className="mt-4 text-xs text-muted-foreground leading-relaxed">{MARKETING_NOTICE}</p>

        <Button className="w-full h-11 mt-6" onClick={accept} disabled={!allChecked || submitting}>
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Recording acceptance...</> : "Accept Terms & Continue"}
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-3">
          Your acceptance (user, version, date, and time) is recorded for compliance purposes.
        </p>
      </div>
    </div>
  );
}