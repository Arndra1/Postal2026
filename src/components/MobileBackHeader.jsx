import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

// Mobile-only back-navigation header (lg:hidden). Renders a chevron + title
// that navigates browser history back, falling back to /dashboard. Desktop
// keeps the page's own PageHeader.
export default function MobileBackHeader({ title }) {
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/dashboard");
  };

  return (
    <div className="lg:hidden sticky top-14 z-30 glass-nav -mx-4 sm:-mx-6 px-4 sm:px-6 h-12 flex items-center gap-1 mb-4">
      <button
        type="button"
        onClick={goBack}
        aria-label="Go back"
        className="no-tap-highlight -ml-1 flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
      >
        <ChevronLeft className="w-5 h-5" />
        Back
      </button>
      {title && (
        <span className="ml-2 text-sm font-semibold truncate">{title}</span>
      )}
    </div>
  );
}