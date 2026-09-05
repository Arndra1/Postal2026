import React from "react";
import { Image } from "@/components/ui/image";
import { BRAND_ASSETS } from "@/lib/brand";

// Sizing map — display areas per placement spec (aspect ratio 4:1 lockup).
// "header": max 240x64 desktop, 180x48 mobile
// "auth":    max 300x100 (login/signup)
// "sidebar": max 200x56 (dashboard sidebar)
// "icon":   square "L" monogram only — favicon, app icon, mobile header
const VARIANTS = {
  header: { src: BRAND_ASSETS.header, className: "h-10 w-40 sm:h-14 sm:w-56" },
  auth: { src: BRAND_ASSETS.header, className: "h-14 w-56 sm:h-16 sm:w-64" },
  sidebar: { src: BRAND_ASSETS.header, className: "h-12 w-48" },
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