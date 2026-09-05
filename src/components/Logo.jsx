import React from "react";
import { Image } from "@/components/ui/image";
import { BRAND_ASSETS } from "@/lib/brand";

// Square lockup (bell + wordmark + tagline, 1:1) — only legible at large sizes.
// Small placements pair the bell icon with "RingBellz" text for readability.
const VARIANTS = {
  // 32-36px bell + wordmark text — website nav, mobile header
  header: { icon: true, src: BRAND_ASSETS.icon, className: "h-8 w-8 sm:h-9 sm:w-9", textClass: "text-lg sm:text-xl" },
  // 36px bell + wordmark text — dashboard sidebar
  sidebar: { icon: true, src: BRAND_ASSETS.icon, className: "h-9 w-9", textClass: "text-lg" },
  // 36px bell + wordmark text — landing footer
  footer: { icon: true, src: BRAND_ASSETS.icon, className: "h-9 w-9", textClass: "text-lg" },
  // Full lockup at 256px — login/signup centered header
  auth: { icon: false, src: BRAND_ASSETS.header, className: "h-56 w-56 sm:h-64 sm:w-64" },
  // 32px bell mark only — no text (favicon-style, rare inline use)
  icon: { icon: false, src: BRAND_ASSETS.icon, className: "w-8 h-8 rounded-lg" },
};

export default function Logo({ variant = "header", className = "", ...props }) {
  const v = VARIANTS[variant] || VARIANTS.header;

  if (v.icon) {
    return (
      <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
        <Image src={v.src} alt="RingBellz" fittingType="fit" className={v.className} />
        <span className={`font-heading font-semibold tracking-tight ${v.textClass}`}>
          <span className="text-foreground">Ring</span>
          <span className="text-primary">bellz</span>
        </span>
      </span>
    );
  }

  return (
    <Image
      src={v.src}
      alt="RingBellz"
      fittingType="fit"
      className={`${v.className} ${className}`.trim()}
      {...props}
    />
  );
}