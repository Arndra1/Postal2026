import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function ResponsibleUseSection() {
  return (
    <section id="responsible-use" className="max-w-7xl mx-auto px-6 py-20">
      <div className="max-w-3xl mx-auto text-center">
        <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-6 h-6 text-cyan-400" />
        </div>
        <h2 className="font-heading text-3xl md:text-4xl font-semibold text-white">Powerful Data. Responsible Use.</h2>
        <p className="mt-4 text-slate-400 leading-relaxed">
          RingBellz is built for lawful marketing, prospecting, business research, lead generation, and business development.
        </p>
        <p className="mt-3 text-slate-400 leading-relaxed">
          RingBellz is not a consumer reporting agency and is not designed for FCRA-regulated eligibility decisions.
        </p>
        <Link
          to="/responsible-data-use"
          className="inline-flex items-center gap-2 mt-6 text-cyan-400 font-medium hover:text-cyan-300 transition"
        >
          Learn About Responsible Data Use <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}