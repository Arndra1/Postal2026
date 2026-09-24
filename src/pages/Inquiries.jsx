import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import ComplianceBanner from "@/components/ComplianceBanner";
import InquiryCard from "@/components/inquiry/InquiryCard";
import { Loader2, Inbox } from "lucide-react";

// People who asked for help themselves. Every inquiry carries the disclosure
// they agreed to and the moment they agreed to it.
export default function Inquiries() {
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const isAdmin = user.role === "admin" || user.role === "owner" || user.role === "staff";
    const query = isAdmin
      ? base44.entities.Inquiry.list("-created_date", 200)
      : base44.entities.Inquiry.filter({ user_id: user.id }, "-created_date", 200);
    query.then((rows) => { setInquiries(rows || []); setLoading(false); }).catch(() => setLoading(false));
  }, [user]);

  const onChanged = (updated) => {
    setInquiries((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  };

  return (
    <div>
      <PageHeader
        title="Inquiries"
        subtitle="People who reached out and asked for help — each one with the consent they gave on record."
      />

      <ComplianceBanner text="These individuals contacted you first. Their consent disclosure, the exact wording shown, and the time they agreed are stored on every record. Keep that record intact — it is your proof of consent." />

      {loading ? (
        <div className="py-20 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : inquiries.length === 0 ? (
        <div className="glass-panel p-16 text-center mt-6">
          <Inbox className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-heading text-lg font-semibold mb-1">No inquiries yet</h3>
          <p className="text-sm text-muted-foreground">
            Share your public inquiry page so people who want help can ask for it. Every submission lands here with its consent record.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Public page address: <span className="font-mono">/inquiry</span>
          </p>
        </div>
      ) : (
        <div className="grid gap-4 mt-6">
          {inquiries.map((i) => <InquiryCard key={i.id} inquiry={i} onChanged={onChanged} />)}
        </div>
      )}
    </div>
  );
}