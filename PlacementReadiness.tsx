import React, { useState } from "react";
import { Sparkles, Compass, GraduationCap, Code, Heart, Briefcase, FileCheck, ArrowRight, AlertCircle, ChevronRight, BarChart3 } from "lucide-react";
import { CareerRecommendationResponse } from "../types";
import ActionsConcluder from "./ActionsConcluder";

export default function CareerAdvisor() {
  const [education, setEducation] = useState("");
  const [skills, setSkills] = useState("");
  const [interests, setInterests] = useState("");
  const [projects, setProjects] = useState("");
  const [certifications, setCertifications] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CareerRecommendationResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!education && !skills && !interests) {
      setError("Please fill out at least your education, skills, or interests to get personalized recommendations.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/career-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ education, skills, interests, projects, certifications }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to generate career recommendations.");
      }

      const data: CareerRecommendationResponse = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="border-b border-slate-100 pb-5">
        <h2 className="text-2xl font-bold font-display text-slate-800">Career Recommendation Engine</h2>
        <p className="text-slate-500 text-sm mt-1">Discover customized high-fit career paths based on your holistic profile, projects, and personal interests.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-600" />
            Candidate Background profile
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" /> Education / Degree
            </label>
            <input
              type="text"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-xs placeholder:text-slate-400"
              placeholder="e.g. B.Tech in Computer Science, Year 3"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5" /> Technical / Soft Skills
            </label>
            <input
              type="text"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-xs placeholder:text-slate-400"
              placeholder="e.g. Python, SQL, Git, Public Speaking"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5" /> Interests & Passion
            </label>
            <input
              type="text"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-xs placeholder:text-slate-400"
              placeholder="e.g. Automation, Web Dev, UI Design, Finance"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Key Projects Built
            </label>
            <textarea
              className="w-full h-16 px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-xs placeholder:text-slate-400 resize-none"
              placeholder="e.g. Personal Portflio, E-Commerce clone using React"
              value={projects}
              onChange={(e) => setProjects(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5" /> Certifications (Optional)
            </label>
            <input
              type="text"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-xs placeholder:text-slate-400"
              placeholder="e.g. AWS Certified Cloud Practitioner"
              value={certifications}
              onChange={(e) => setCertifications(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 px-4 rounded-xl font-medium text-white text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              loading ? "bg-slate-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] shadow-md shadow-indigo-100"
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing Fit...
              </>
            ) : (
              <>
                Suggest Career Paths
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Results */}
        <div className="lg:col-span-7">
          {result ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm bg-white p-4 rounded-2xl border border-slate-100">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                AI Career Matches Generated
              </div>

              {/* Recommended careers cards */}
              <div className="space-y-5">
                {result.careers.map((career, idx) => (
                  <div key={idx} className="bg-white border border-slate-100 hover:border-indigo-100 hover:shadow-xs transition-all rounded-2xl p-5 md:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 text-sm font-bold">
                          {idx + 1}
                        </span>
                        <h3 className="font-bold text-slate-800 text-lg md:text-xl font-display">{career.title}</h3>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-bold uppercase">
                        High Fit
                      </span>
                    </div>

                    <div className="space-y-3">
                      <p className="text-slate-600 text-sm leading-relaxed">{career.description}</p>

                      <div className="p-3.5 bg-slate-50/50 rounded-xl space-y-1 border border-slate-100">
                        <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Why it fits your profile:</span>
                        <p className="text-slate-600 text-xs md:text-sm leading-relaxed">{career.whyItFits}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        <div>
                          <span className="text-xs font-bold text-indigo-700 block uppercase tracking-wider mb-2">Required Skills:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {career.requiredSkills.map((sk, sidx) => (
                              <span key={sidx} className="text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-100/50 px-2.5 py-0.5 rounded-md font-medium">
                                {sk}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1 flex items-center gap-1">
                            <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
                            Market Outlook:
                          </span>
                          <p className="text-slate-600 text-xs leading-relaxed">{career.expectedOpportunities}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <ActionsConcluder actions={result.top3Actions} />
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl h-96 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mb-4 text-slate-300">
                <Compass className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-slate-700 mb-1">Career Compass</h3>
              <p className="text-xs max-w-sm">Provide your education details, current skills, and interests to uncover your best career pathways.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
