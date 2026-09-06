import React from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const PIPELINE_COLORS = {
  new: "#5B2A6E",
  contacted: "#C9A7C7",
  qualified: "#D4AF37",
  won: "#22C55E",
  lost: "#EF4444",
};

const PIPELINE_LABELS = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  won: "Won",
  lost: "Lost",
};

export default function DashboardCharts({ leads }) {
  const pipelineData = Object.keys(PIPELINE_LABELS)
    .map((key) => ({
      name: PIPELINE_LABELS[key],
      value: leads.filter((l) => (l.pipeline_status || "new") === key).length,
      key,
    }))
    .filter((d) => d.value > 0);

  const enrichData = [
    { name: "Not Enriched", value: leads.filter((l) => !l.enrichment_status || l.enrichment_status === "none").length, fill: "#C9A7C7" },
    { name: "Enriched", value: leads.filter((l) => l.enrichment_status === "enriched").length, fill: "#5B2A6E" },
    { name: "Failed", value: leads.filter((l) => l.enrichment_status === "failed").length, fill: "#EF4444" },
  ].filter((d) => d.value > 0);

  const sourceMap = {};
  leads.forEach((l) => {
    const cat = (l.source_category || "other").replace(/_/g, " ");
    sourceMap[cat] = (sourceMap[cat] || 0) + 1;
  });
  const sourceData = Object.entries(sourceMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (leads.length === 0) return null;

  return (
    <div className="grid lg:grid-cols-3 gap-6 mb-8">
      {pipelineData.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-heading text-sm font-semibold mb-4">Pipeline Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pipelineData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={38} paddingAngle={2}>
                {pipelineData.map((d) => (
                  <Cell key={d.key} fill={PIPELINE_COLORS[d.key]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 24px rgba(91,42,110,0.12)" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2">
            {pipelineData.map((d) => (
              <div key={d.key} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIPELINE_COLORS[d.key] }} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="font-semibold">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {enrichData.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-heading text-sm font-semibold mb-4">Enrichment Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={enrichData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={30} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 24px rgba(91,42,110,0.12)" }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {enrichData.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {sourceData.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-heading text-sm font-semibold mb-4">Lead Sources</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sourceData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={95} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 24px rgba(91,42,110,0.12)" }} />
              <Bar dataKey="value" fill="#C9A7C7" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}