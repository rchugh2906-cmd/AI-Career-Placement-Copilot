import React, { useState } from "react";
import { Sparkles, BrainCircuit, Target, CheckCircle2, AlertCircle, ArrowRight, ListOrdered, Calendar } from "lucide-react";
import { SkillGapResponse } from "../types";
import ActionsConcluder from "./ActionsConcluder";

export default function SkillGapAnalyzer() {
  const [targetRole, setTargetRole] = useState("");
  const [skills, setSkills] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SkillGapResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRole || !skills) {
      setError("Please fill in both the target role and current skills.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/skill-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetRole, skills }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to analyze skill gaps.");
      }

      const data: SkillGapResponse = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500 text-white";
    if (score >= 50) return "bg-amber-500 text-white";
    return "bg-rose-500 text-white";
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="border-b border-slate-100 pb-5">
        <h2 className="text-2xl font-bold font-display text-slate-800">Skill Gap Analysis</h2>
        <p className="text-slate-500 text-sm mt-1">Cross-examine your skills against dynamic industry expectations for your target role.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form panel */}
        <form onSubmit={handleSubmit} className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Target Role</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm placeholder:text-slate-400"
              placeholder="e.g. Backend Developer"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Your Current Skills</label>
            <textarea
              className="w-full h-36 px-4 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-sans placeholder:text-slate-400 resize-none"
              placeholder="List your skills, comma-separated (e.g. HTML, CSS, JavaScript, Basic Python)"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              required
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
            className={`w-full py-3 px-4 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-all cursor-pointer ${
              loading ? "bg-slate-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] shadow-md shadow-indigo-100"
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Evaluating Skillsets...
              </>
            ) : (
              <>
                Map Skill Gaps
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Results Panel */}
        <div className="lg:col-span-8">
          {result ? (
            <div className="space-y-6">
              {/* Readiness Score Card */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm">
                    <Target className="w-4 h-4" />
                    Readiness Score
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold font-display text-slate-800">
                    Your profile matching for <span className="text-indigo-600">{targetRole}</span>
                  </h3>
                  <p className="text-xs text-slate-400">Based on standard industry expectations for tech roles</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className={`w-24 h-24 rounded-2xl flex flex-col items-center justify-center shrink-0 ${scoreColor(result.readinessScore)}`}>
                    <span className="text-3xl font-black font-display">{result.readinessScore}%</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 mt-0.5">Readiness</span>
                  </div>
                </div>
              </div>

              {/* Skills breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-100 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2 mb-4 border-b border-emerald-50 pb-2.5">
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                    Existing Skills Matching Role
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.existingSkills.map((sk, i) => (
                      <span key={i} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-lg font-medium">
                        {sk}
                      </span>
                    ))}
                    {result.existingSkills.length === 0 && (
                      <span className="text-xs text-slate-400 italic">No direct match detected yet.</span>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2.5">
                    <BrainCircuit className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
                    Critical Gaps Identified
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.missingSkills.map((sk, i) => (
                      <span key={i} className="text-xs bg-slate-50 text-slate-600 border border-slate-200/60 px-2.5 py-1 rounded-lg font-medium">
                        {sk}
                      </span>
                    ))}
                    {result.missingSkills.length === 0 && (
                      <span className="text-xs text-slate-400 italic">No missing skills detected!</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Priority skills card */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2 mb-4">
                  <ListOrdered className="w-4.5 h-4.5 text-indigo-600 shrink-0" />
                  Priority Skills to Acquire First
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {result.prioritySkills.map((sk, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-indigo-100 shadow-xs flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm font-semibold text-slate-700 mt-0.5">{sk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Learning sequence timeline */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-5 border-b border-slate-100 pb-3">
                  <Calendar className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
                  Recommended Action Timeline
                </h3>
                <div className="relative border-l-2 border-slate-100 pl-6 ml-3 space-y-6">
                  {result.learningSequence.map((seq, i) => (
                    <div key={i} className="relative">
                      {/* Timeline Dot */}
                      <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-indigo-500 bg-white" />
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{seq.timeframe}</span>
                        <p className="text-sm text-slate-600 leading-relaxed">{seq.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Actions */}
              <ActionsConcluder actions={result.top3Actions} />
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl h-96 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mb-4 text-slate-300">
                <BrainCircuit className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-slate-700 mb-1">Audit Ready</h3>
              <p className="text-xs max-w-sm">Enter your target role and current skills on the left to review your readiness score.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
