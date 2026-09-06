import React from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import ManualLeadForm from "@/components/leads/ManualLeadForm";
import ComplianceBanner from "@/components/ComplianceBanner";
import { MARKETING_NOTICE } from "@/lib/compliance";

export default function AddLead() {
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader title="Add Lead Manually" subtitle="Enter a contact you already have — it'll be scored and organized alongside your discovered leads." />
      <ComplianceBanner text={MARKETING_NOTICE} />
      <ManualLeadForm onSaved={() => navigate("/saved-leads")} />
    </div>
  );
}