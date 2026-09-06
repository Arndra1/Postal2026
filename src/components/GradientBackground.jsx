import React from "react";

export default function GradientBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-br from-[#FAF6F2] via-[#F4ECF1] to-[#EDE3F0]" />
      <div className="absolute -top-32 -right-24 w-[600px] h-[600px] rounded-full bg-[#5B2A6E]/20 blur-[120px] animate-blob-1" />
      <div className="absolute top-1/3 -left-32 w-[520px] h-[520px] rounded-full bg-[#C9A7C7]/35 blur-[120px] animate-blob-2" />
      <div className="absolute -bottom-32 right-1/4 w-[460px] h-[460px] rounded-full bg-[#D4AF37]/18 blur-[120px] animate-blob-3" />
      <div className="absolute top-[15%] left-[45%] w-[380px] h-[380px] rounded-full bg-[#5B2A6E]/10 blur-[100px] animate-blob-1" style={{ animationDelay: "8s" }} />
    </div>
  );
}