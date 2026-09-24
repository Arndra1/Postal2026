import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DragDropContext } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import PartnerStageColumn from "@/components/partners/PartnerStageColumn";
import MobilePartnerStages from "@/components/partners/MobilePartnerStages";
import PartnerOrganizationPanel from "@/components/partners/PartnerOrganizationPanel";
import { PARTNER_STAGES } from "@/lib/community";
import { Button } from "@/components/ui/button";
import { useUrlDetailParam } from "@/hooks/useUrlDetailParam";
import { Building2, Loader2 } from "lucide-react";

// Partnership outreach pipeline — deliberately separate from the individual
// lead pipeline. One organization, one relationship.
export default function PartnershipPipeline() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const { id: urlId, open: openUrl, close: closeUrl } = useUrlDetailParam("partnerId");

  useEffect(() => {
    if (!user) return;
    base44.entities.PartnerOrganization.filter({ user_id: user.id })
      .then((rows) => { setOrgs(rows || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!urlId) { setDetail(null); return; }
    if (detail && detail.id === urlId) return;
    const found = orgs.find((o) => o.id === urlId);
    if (found) setDetail(found);
  }, [urlId, orgs]);

  const openDetail = (o) => { setDetail(o); openUrl(o.id); };
  const closeDetail = () => { setDetail(null); closeUrl(); };

  const byStage = useMemo(() => {
    const grouped = {};
    PARTNER_STAGES.forEach((s) => { grouped[s.key] = []; });
    orgs.forEach((o) => {
      const key = PARTNER_STAGES.some((s) => s.key === o.stage) ? o.stage : "new";
      grouped[key].push(o);
    });
    return grouped;
  }, [orgs]);

  const moveTo = (org, stage) => {
    const current = PARTNER_STAGES.some((s) => s.key === org.stage) ? org.stage : "new";
    if (current === stage) return;
    const updated = { ...org, stage };
    setOrgs((prev) => prev.map((o) => (o.id === org.id ? updated : o)));
    base44.entities.PartnerOrganization.update(org.id, { stage }).catch(() => {});
  };

  const onDragEnd = (result) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const org = orgs.find((o) => o.id === draggableId);
    if (org) moveTo(org, destination.droppableId);
  };

  const applyUpdate = (updated) => {
    setOrgs((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setDetail(updated);
  };

  const applyDelete = (id) => {
    setOrgs((prev) => prev.filter((o) => o.id !== id));
    setDetail(null);
  };

  return (
    <div>
      <PageHeader
        title="Partnership Pipeline"
        subtitle="Where each church, nonprofit, and microbusiness stands in your outreach."
      />

      {loading ? (
        <div className="py-20 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : orgs.length === 0 ? (
        <div className="glass-panel p-16 text-center">
          <Building2 className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-heading text-lg font-semibold mb-1">No partner prospects yet</h3>
          <p className="text-sm text-muted-foreground mb-5">Find churches, nonprofits, and microbusinesses, then save the ones worth approaching.</p>
          <Button asChild><Link to="/community">Find organizations</Link></Button>
        </div>
      ) : (
        <>
          <MobilePartnerStages byStage={byStage} onMove={moveTo} onOpen={openDetail} />
          <div className="hidden lg:block">
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh] items-start">
                {PARTNER_STAGES.map((stage) => (
                  <PartnerStageColumn key={stage.key} stage={stage} orgs={byStage[stage.key]} onOpen={openDetail} />
                ))}
              </div>
            </DragDropContext>
          </div>
        </>
      )}

      {detail && (
        <PartnerOrganizationPanel
          org={detail}
          onClose={closeDetail}
          onUpdated={applyUpdate}
          onDeleted={applyDelete}
        />
      )}
    </div>
  );
}