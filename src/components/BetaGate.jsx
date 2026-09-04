import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import BetaOnboarding from "@/components/beta/BetaOnboarding";
import { FlaskConical, Loader2, LogOut } from "lucide-react";

// Gates the app for the controlled beta. Admin/owner/staff always bypass.
// Regular users must have an active BetaUser record (granted by admin).
export default function BetaGate({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState("loading"); // loading | denied | onboarding | allowed

  useEffect(() => {
    if (!user?.id) return;
    if (["admin", "owner", "staff"].includes(user.role)) {
      setState("allowed");
      return;
    }
    base44.entities.BetaUser.filter({ user_id: user.id })
      .then((r) => {
        const beta = r[0];
        if (!beta || beta.status !== "active") setState("denied");
        else if (!beta.onboarded) setState("onboarding");
        else setState("allowed");
      })
      .catch(() => setState("denied"));
  }, [user?.id]);

  const handleLogout = () => {
    logout(false);
    navigate("/");
  };

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="max-w-md mx-auto py-20">
        <div className="bg-card rounded-2xl border border-border lady-shadow-lg p-8 text-center">
          <div className="w-14 h-14 rounded-2xl lady-gradient flex items-center justify-center mx-auto mb-4">
            <FlaskConical className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-heading text-2xl font-semibold mb-2">Beta Access Required</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Leadora is currently in a closed beta. Your account hasn't been granted beta access yet. If you believe this is an error, please contact the team.
          </p>
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </div>
    );
  }

  if (state === "onboarding") {
    return <BetaOnboarding onComplete={() => setState("allowed")} />;
  }

  return children;
}