import React from "react";
import Logo from "@/components/Logo";
import GradientBackground from "@/components/GradientBackground";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <GradientBackground />
      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <div className="glass-panel p-5 rounded-3xl">
            <Logo variant="auth" />
          </div>
        </div>
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl lady-gradient mb-4 shadow-lg">
            <Icon className="w-7 h-7 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="glass-panel p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}