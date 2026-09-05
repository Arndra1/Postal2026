import React from "react";
import { Image } from "@/components/ui/image";
import { BRAND_ASSETS } from "@/lib/brand";

// Sizing map — square lockup (bell + wordmark + tagline), 1:1 aspect ratio.
// "header":  40-48px tall — website nav, mobile header
// "auth":    224-256px — login/signup centered header
// "sidebar": 48px — dashboard sidebar
// "footer":  56px — landing footer
// "icon":    32px bell mark only — favicon, app icon, small areas
const VARIANTS = {
  header: { src: BRAND_ASSETS.header, className: "h-10 w-10 sm:h-12 sm:w-12" },
  auth: { src: BRAND_ASSETS.header, className: "h-56 w-56 sm:h-64 sm:w-64" },
  sidebar: { src: BRAND_ASSETS.header, className: "h-12 w-12" },
  footer: { src: BRAND_ASSETS.header, className: "h-14 w-14" },
  icon: { src: BRAND_ASSETS.icon, className: "w-8 h-8 rounded-lg" },
};

export default function Logo({ variant = "header", className = "", ...props }) {
  const v = VARIANTS[variant] || VARIANTS.header;
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