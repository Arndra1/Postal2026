import React from "react";
import { AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function PastDueBanner() {
  return (
    <div className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
      <p className="text-sm text-amber-900">
        Your last payment didn't go through.{" "}
        <Link to="/billing" className="font-medium underline hover:no-underline">Update your payment method</Link>{" "}
        to avoid losing access.
      </p>
    </div>
  );
}