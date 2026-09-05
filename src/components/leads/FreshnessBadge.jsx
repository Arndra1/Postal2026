import React from "react";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";

const STALE_DAYS = 90;
const AGING_DAYS = 30;

export default function FreshnessBadge({ created_date, retrieval_timestamp }) {
  const dateStr = retrieval_timestamp || created_date;
  if (!dateStr) return null;

  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);

  let label, icon, className;
  if (days < AGING_DAYS) {
    label = "Fresh";
    icon = <CheckCircle className="w-3 h-3" />;
    className = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (days < STALE_DAYS) {
    label = `${days}d old`;
    icon = <Clock className="w-3 h-3" />;
    className = "bg-amber-50 text-amber-700 border-amber-200";
  } else {
    label = "Stale";
    icon = <AlertTriangle className="w-3 h-3" />;
    className = "bg-rose-50 text-rose-700 border-rose-200";
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {icon} {label}
    </span>
  );
}