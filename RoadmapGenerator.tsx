import React, { useState, useEffect } from "react";
import { 
  FileText, BrainCircuit, Compass, Route, Briefcase, HelpCircle, 
  MessageSquare, Mic, BarChart3, Menu, X, Sparkles, Key, CheckCircle2 
} from "lucide-react";
import { ActiveTab } from "./types";

// Import modular components
import ResumeAnalyzer from "./components/ResumeAnalyzer";
import SkillGapAnalyzer from "./components/SkillGapAnalyzer";
import CareerAdvisor from "./components/CareerAdvisor";
import RoadmapGenerator from "./components/RoadmapGenerator";
import JobRecommender from "./components/JobRecommender";
import QuestionGenerator from "./components/QuestionGenerator";
import MockInterview from "./components/MockInterview";
import VoiceInterview from "./components/VoiceInterview";
import PlacementReadiness from "./components/PlacementReadiness";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("resume");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState<boolean | null>(null);

  // Check backend and API key status on mount
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setApiKeyConfigured(data.hasApiKey);
      })
      .catch((err) => {
        console.error("Health check failed:", err);
        setApiKeyConfigured(false);
      });
  }, []);

  const navItems = [
    { id: "resume" as ActiveTab, label: "Resume Analysis", icon: FileText, desc: "ATS & Recruiter feedback" },
    { id: "skillgap" as ActiveTab, label: "Skill Gap Analysis", icon: BrainCircuit, desc: "Competency comparison" },
    { id: "careers" as ActiveTab, label: "Career Recommendation", icon: Compass, desc: "High-fit job pathways" },
    { id: "roadmap" as ActiveTab, label: "Roadmap Generator", icon: Route, desc: "Step-by-step monthly study plans" },
    { id: "jobs" as ActiveTab, label: "Job Recommender", icon: Briefcase, desc: "Role & Match percentages" },
    { id: "questions" as ActiveTab, label: "Interview Questions", icon: HelpCircle, desc: "Technical & Behavioral bank" },
    { id: "mock" as ActiveTab, label: "Mock Interview", icon: MessageSquare, desc: "Live sequential board review" },
    { id: "voice" as ActiveTab, label: "Voice Interview Mode", icon: Mic, desc: "Speech accuracy & confidence review" },
    { id: "readiness" as ActiveTab, label: "Placement Readiness", icon: BarChart3, desc: "Composite 5-pillar matching Index" },
  ];

  const renderActiveComponent = () => {
    switch (activeTab) {
      case "resume":
        return <ResumeAnalyzer />;
      case "skillgap":
        return <SkillGapAnalyzer />;
      case "careers":
        return <CareerAdvisor />;
      case "roadmap":
        return <RoadmapGenerator />;
      case "jobs":
        return <JobRecommender />;
      case "questions":
        return <QuestionGenerator />;
      case "mock":
        return <MockInterview />;
      case "voice":
        return <VoiceInterview />;
      case "readiness":
        return <PlacementReadiness />;
      default:
        return <ResumeAnalyzer />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Mobile Top Navigation */}
      <header className="md:hidden bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between z-30 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4 fill-white" />
          </div>
          <span className="font-bold text-slate-800 font-display tracking-tight text-sm">AI Placement Copilot</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 text-slate-600 cursor-pointer"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar Navigation Frame */}
      <aside
        className={`fixed md:sticky top-0 left-0 bottom-0 z-40 w-72 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col h-screen md:h-auto transition-transform md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="px-6 py-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-4.5 h-4.5 fill-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-white font-display tracking-tight leading-none text-md">Placement</h1>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">Career Copilot</span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Items List */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 scrollbar-thin">
          <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Modules</span>
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-xl flex items-start gap-3.5 text-left transition-all cursor-pointer group ${
                  isActive
                    ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/10"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >
                <IconComponent className={`w-5 h-5 shrink-0 mt-0.5 transition-colors ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"}`} />
                <div className="space-y-0.5">
                  <span className="text-xs md:text-sm block">{item.label}</span>
                  <span className={`text-[10px] block font-normal leading-none ${isActive ? "text-indigo-200" : "text-slate-500"}`}>
                    {item.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* API Key Connection Status */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 bg-slate-850/50 rounded-xl p-3 border border-slate-800">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${apiKeyConfigured ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
              {apiKeyConfigured ? <CheckCircle2 className="w-4 h-4" /> : <Key className="w-4 h-4" />}
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-xs text-white font-semibold block">Gemini 3.5 Engine</span>
              <span className="text-[9px] text-slate-400 block truncate">
                {apiKeyConfigured ? "Connected & Active" : "No Key - Setup in Secrets"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-10">
          {renderActiveComponent()}
        </div>
      </main>
    </div>
  );
}
