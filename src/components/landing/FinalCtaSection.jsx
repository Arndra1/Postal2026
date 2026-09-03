import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function FinalCtaSection() {
  return (
    <section className="max-w-7xl mx-auto px-6 pb-20">
      <div className="rounded-3xl lady-gradient p-10 md:p-16 text-center text-white">
        <h2 className="font-heading text-3xl md:text-4xl font-semibold">Ready to Find Better Leads?</h2>
        <p className="mt-4 text-white/80 max-w-xl mx-auto">
          Discover prospects, enrich the records that matter, and organize your opportunities in one workspace.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/register">
            <Button size="lg" variant="secondary" className="h-12 px-8 text-base bg-white text-primary hover:bg-white/90">
              Start Now <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline" className="h-12 px-8 text-base bg-transparent text-white border-white/40 hover:bg-white/10 hover:text-white">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}