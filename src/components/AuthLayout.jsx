import React from "react";
import Logo from "@/components/Logo";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="dark min-h-screen flex items-center justify-center bg-[#0A0B0F] tech-grid px-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-cyan-500/8 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-indigo-600/8 blur-[120px]" />
      </div>
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-black rounded-3xl p-6 border border-cyan-500/15 tech-glow-cyan">
            <Logo variant="auth" />
          </div>
        </div>
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 mb-4">
            <Icon className="w-7 h-7 text-cyan-400" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
          {subtitle && <p className="text-slate-400 mt-2">{subtitle}</p>}
        </div>
        <div className="bg-[#12131A] rounded-2xl border border-cyan-500/15 tech-glow-cyan p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-slate-400 mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}