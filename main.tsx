import React, { useState } from "react";
import { Sparkles, Route, GraduationCap, Clock, ArrowRight, AlertCircle, BookOpen, Layers, ExternalLink } from "lucide-react";
import { LearningRoadmapResponse } from "../types";
import ActionsConcluder from "./ActionsConcluder";

export default function RoadmapGenerator() {
  const [currentSkills, setCurrentSkills] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [studyHoursPerWeek, setStudyHoursPerWeek] = useState(10);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LearningRoadmapResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRole) {
      setError("Target role is required.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/learning-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentSkills, targetRole, studyHoursPerWeek }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to generate learning roadmap.");
      }

      const data: LearningRoadmapResponse = await res.json();
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
        <h2 className="text-2xl font-bold font-display text-slate-800">Learning Roadmap Generator</h2>
        <p className="text-slate-500 text-sm mt-1">Acquire step-by-step monthly skill plans, resource links, and practical portfolio projects.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Panel */}
        <form onSubmit={handleSubmit} className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Target Job Role</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm placeholder:text-slate-400"
              placeholder="e.g. Cloud Engineer, DevOps"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Current Skills (If Any)</label>
            <textarea
              className="w-full h-24 px-4 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-sans placeholder:text-slate-400 resize-none"
              placeholder="e.g. Basic Python, Command line, HTML"
              value={currentSkills}
              onChange={(e) => setCurrentSkills(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center justify-between">
              <span>Study Hours per Week</span>
              <span className="text-indigo-600 font-mono font-bold text-xs bg-indigo-50 px-2 py-0.5 rounded-sm">{studyHoursPerWeek} hrs</span>
            </label>
            <input
              type="range"
              min="5"
              max="40"
              step="5"
              className="w-full accent-indigo-600"
              value={studyHoursPerWeek}
              onChange={(e) => setStudyHoursPerWeek(Number(e.target.value))}
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
              <span>5h (Light)</span>
              <span>20h (Standard)</span>
              <span>40h (Immersive)</span>
            </div>
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
                Creating Roadmap...
              </>
            ) : (
              <>
                Build Learning Roadmap
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Results Panel */}
        <div className="lg:col-span-8">
          {result ? (
            <div className="space-y-6">
              <div className="bg-linear-to-r from-indigo-500 to-indigo-600 text-white rounded-2xl p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-2 text-indigo-100 text-sm font-semibold">
                  <Route className="w-4.5 h-4.5" />
                  Roadmap generated
                </div>
                <h3 className="text-xl font-bold font-display">Target Curriculum: {targetRole}</h3>
                <p className="text-indigo-100 text-xs mt-1">Based on a study budget of {studyHoursPerWeek} hours per week</p>
              </div>

              {/* Months Timeline */}
              <div className="space-y-6">
                {result.months.map((item, idx) => (
                  <div key={idx} className="bg-white border border-slate-100 hover:border-indigo-50 hover:shadow-xs transition-all rounded-2xl p-5 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start relative">
                    {/* Left Accent indicator */}
                    <div className="md:col-span-3">
                      <div className="bg-indigo-50 text-indigo-700 font-bold px-3 py-1.5 rounded-xl text-center border border-indigo-100/50">
                        <span className="block text-2xl font-display font-extrabold">{item.month}</span>
                      </div>
                    </div>

                    {/* Right core details */}
                    <div className="md:col-span-9 space-y-4">
                      {/* Topics block */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-600" /> Key Topics to Study:
                        </span>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {item.topics.map((top, tIdx) => (
                            <li key={tIdx} className="bg-slate-50 text-slate-700 text-xs py-1.5 px-3 rounded-lg border border-slate-100/50 flex gap-2 items-center">
                              <span className="w-1 h-1 rounded-full bg-indigo-500 shrink-0" />
                              <span className="truncate">{top}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Projects block */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-emerald-600" /> Portfolio Projects to build:
                        </span>
                        <ul className="space-y-2">
                          {item.projects.map((proj, pIdx) => (
                            <li key={pIdx} className="bg-emerald-50/20 border border-emerald-100/30 text-slate-600 text-xs p-2.5 rounded-xl leading-relaxed">
                              <span className="font-semibold text-emerald-800 block mb-0.5">Project {pIdx + 1}</span>
                              {proj}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Resources block */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Study Resources & References:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {item.resources.map((res, rIdx) => (
                            <span key={rIdx} className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-[11px] px-2.5 py-1 rounded-lg border border-slate-200/50 font-medium max-w-xs truncate">
                              <BookOpen className="w-3 h-3 shrink-0 text-slate-500" />
                              {res}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Concluding actions */}
              <ActionsConcluder actions={result.top3Actions} />
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl h-96 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mb-4 text-slate-300">
                <Route className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-slate-700 mb-1">Roadmap Planner</h3>
              <p className="text-xs max-w-sm">Provide your target role and study budget on the left to map out your monthly learning pathway.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
