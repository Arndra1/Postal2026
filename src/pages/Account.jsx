import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Building2, Mail, Lock, Check, Loader2 } from "lucide-react";

export default function Account() {
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.functions.invoke("userStats", {}).then((res) => {
      setUser(res.data.user);
      setFullName(res.data.user.full_name || "");
      setCompany(res.data.user.company_name || "");
    });
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.auth.updateMe({ full_name: fullName, company_name: company });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (_e) {} finally { setSaving(false); }
  };

  if (!user) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Account" subtitle="Manage your profile and security settings." />

      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={save} className="bg-card rounded-2xl border border-border lady-shadow p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Profile</h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10 h-10" /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <div className="relative"><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={company} onChange={(e) => setCompany(e.target.value)} className="pl-10 h-10" /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={user.email} disabled className="pl-10 h-10 bg-muted/40" /></div>
              <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
            </div>
            <Button type="submit" className="h-10" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-2" /> : null}
              {saved ? "Saved" : "Save Changes"}
            </Button>
          </div>
        </form>

        <div className="bg-card rounded-2xl border border-border lady-shadow p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Security</h2>
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border">
              <Lock className="w-4 h-4 text-primary" />
              <div><div className="font-medium">Password</div><div className="text-muted-foreground">Use the forgot-password flow to reset your password.</div></div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border">
              <Check className="w-4 h-4 text-accent" />
              <div><div className="font-medium">Secure sessions</div><div className="text-muted-foreground">Sessions are managed securely by the platform.</div></div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border">
              <Check className="w-4 h-4 text-accent" />
              <div><div className="font-medium">Role</div><div className="text-muted-foreground capitalize">{user.role}</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}