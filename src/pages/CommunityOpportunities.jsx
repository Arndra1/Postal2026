import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import ComplianceBanner from "@/components/ComplianceBanner";
import OrgSearchForm from "@/components/partners/OrgSearchForm";
import OrgResultCard from "@/components/partners/OrgResultCard";
import MicrobusinessSearch from "@/components/partners/MicrobusinessSearch";
import PartnerOrganizationPanel from "@/components/partners/PartnerOrganizationPanel";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ArrowRight, Building2, Loader2 } from "lucide-react";

const EMPTY_FILTERS = { state: "", city: "", keyword: "", ntee: "", org_type: "" };

const keyOf = (r) => r.official_record_id || r.business_name || "";

export default function CommunityOpportunities() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("orgs");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState({});
  const [savedByKey, setSavedByKey] = useState({});
  const [panelOrg, setPanelOrg] = useState(null);

  useEffect(() => {
    if (!user) return;
    base44.entities.PartnerOrganization.filter({ user_id: user.id })
      .then((rows) => {
        const map = {};
        (rows || []).forEach((o) => { map[o.official_record_id || o.org_name] = o; });
        setSavedByKey(map);
      })
      .catch(() => {});
  }, [user]);

  const search = async () => {
    setLoading(true); setError(""); setSearched(true); setResults([]);
    try {
      const res = await base44.functions.invoke("searchCommunityOrgs", filters);
      const d = res.data || {};
      if (d.status !== "success") {
        setError(d.error || "Source temporarily unavailable.");
      } else {
        setResults(d.results || []);
      }
    } catch (_e) {
      setError("Source temporarily unavailable. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  };

  const track = (org) => {
    setSavedByKey((m) => ({ ...m, [org.official_record_id || org.org_name]: org }));
  };

  const saveOrg = async (r) => {
    const key = keyOf(r);
    setBusy((b) => ({ ...b, [key]: "saving" }));
    try {
      const extra = r.extra || {};
      const org = await base44.entities.PartnerOrganization.create({
        user_id: user.id,
        org_name: r.business_name || "",
        org_type: extra.org_type || "nonprofit",
        ein: extra.ein || "",
        ntee_code: extra.ntee_code || "",
        ntee_category: extra.ntee_category || "",
        subsection: extra.subsection || "",
        ruling_year: extra.ruling_year || "",
        address: r.address || "",
        city: r.city || "",
        state: r.state || "",
        zip: r.zip || "",
        official_record_id: r.official_record_id || "",
        source: r.source || "",
        source_reference: r.source_url || "",
        retrieved_at: r.retrieved_at || new Date().toISOString(),
        original_public_fields: r,
        stage: "new",
        contact_status: "unknown",
      });
      track(org);
      setBusy((b) => ({ ...b, [key]: "saved" }));
    } catch (_e) {
      setBusy((b) => ({ ...b, [key]: "error" }));
      toast({ title: "Could not save", description: "Please try again.", variant: "destructive" });
    }
  };

  const applyUpdate = (updated) => {
    setPanelOrg(updated);
    track(updated);
  };

  const applyDelete = (id) => {
    setPanelOrg(null);
    setSavedByKey((m) => {
      const next = { ...m };
      for (const k in next) if (next[k].id === id) delete next[k];
      return next;
    });
  };

  const savedCount = Object.keys(savedByKey).length;

  return (
    <div>
      <PageHeader
        title="Community & Small Business Opportunities"
        subtitle="Find churches, nonprofits, and microbusinesses to partner with — then track that outreach on its own pipeline."
        action={
          <Button variant="outline" asChild>
            <Link to="/partnerships">Partnership pipeline <ArrowRight className="w-4 h-4 ml-1" /></Link>
          </Button>
        }
      />

      <ComplianceBanner text="Organizations here come from official public filings. Approach them as organizations — partnership and education outreach only. Individuals are never targeted from a public record; they reach you by asking for help on the inquiry page." />

      <div className="mt-6 flex gap-2">
        {[
          { key: "orgs", label: "Churches & Nonprofits" },
          { key: "micro", label: "Microbusinesses" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              "px-4 py-2 rounded-xl text-sm font-medium transition " +
              (tab === t.key ? "bg-primary text-primary-foreground lady-shadow" : "text-muted-foreground hover:bg-secondary/15")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "orgs" ? (
          <>
            <OrgSearchForm filters={filters} onChange={setFilters} onSearch={search} loading={loading} />

            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

            {loading && (
              <div className="py-16 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            )}

            {!loading && searched && !error && results.length === 0 && (
              <div className="glass-panel p-12 text-center mt-6">
                <Building2 className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                <h3 className="font-heading text-lg font-semibold mb-1">No organizations matched</h3>
                <p className="text-sm text-muted-foreground">Try a different city, a broader cause area, or a shorter name.</p>
              </div>
            )}

            {!loading && results.length > 0 && (
              <>
                <p className="mt-6 mb-3 text-xs text-muted-foreground">
                  {results.length} organization{results.length !== 1 ? "s" : ""} from the official IRS file · 0 credits charged
                </p>
                <div className="grid gap-3">
                  {results.map((r) => {
                    const key = keyOf(r);
                    return (
                      <OrgResultCard
                        key={key}
                        r={r}
                        saved={savedByKey[key]}
                        busy={busy[key]}
                        onSave={() => saveOrg(r)}
                        onOpen={() => setPanelOrg(savedByKey[key])}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : (
          <MicrobusinessSearch savedByKey={savedByKey} onSaved={track} onOpen={setPanelOrg} />
        )}
      </div>

      {savedCount > 0 && (
        <div className="mt-8 glass-panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-heading font-semibold">{savedCount} partner prospect{savedCount !== 1 ? "s" : ""} saved</p>
            <p className="text-sm text-muted-foreground">Move them through Contacted, Meeting, and Partner on the partnership pipeline.</p>
          </div>
          <Button asChild><Link to="/partnerships">Open partnership pipeline</Link></Button>
        </div>
      )}

      {panelOrg && (
        <PartnerOrganizationPanel
          org={panelOrg}
          onClose={() => setPanelOrg(null)}
          onUpdated={applyUpdate}
          onDeleted={applyDelete}
        />
      )}
    </div>
  );
}