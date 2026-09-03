import React from "react";
import { useAuth } from "@/lib/AuthContext";

export default function AdminGuard({ children }) {
  const { user } = useAuth();
  if (!user || (user.role !== "admin" && user.role !== "owner")) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <span className="text-2xl">🔒</span>
        </div>
        <h2 className="font-heading text-xl font-semibold">Admin access required</h2>
        <p className="text-muted-foreground mt-1">You don't have permission to view this page.</p>
      </div>
    );
  }
  return children;
}