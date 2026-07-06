import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Play, Sparkles, AlertCircle, RefreshCw, BarChart2, MessageSquare, Volume2, ArrowRight } from "lucide-react";
import { VoiceInterviewResponse } from "../types";
import ActionsConcluder from "./ActionsConcluder";

export default function VoiceInterview() {
  const [targetRole, setTargetRole] = useState("AI Intern");
  const [selectedQuestion, setSelectedQuestion] = useState("What is prompt engineering, and how do you prevent prompt injection attacks in AI integrations?");
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VoiceInterviewResponse | null>(null);

  const recognitionRef = useRef<any>(null);
  const baseTranscriptRef = useRef<string>("");

  // Set up Speech Recognition on mount
  useEffect(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = 0; i < event.results.length; ++i) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += text + " ";
        } else {
          interimTranscript += text;
        }
      }

      const currentSessionText = (finalTranscript + interimTranscript).trim();
      const base = baseTranscriptRef.current.trim();
      if (base) {
        setTranscript(`${base} ${currentSessionText}`);
      } else {
        setTranscript(currentSessionText);
      }
    };

    recognition.onerror = (e: any) => {
      console.error("Speech Recognition Error:", e);
      if (e.error === "not-allowed") {
        setError("Microphone permission was denied. Please update page permissions.");
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const handleToggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError(null);
      baseTranscriptRef.current = transcript;
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err: any) {
        console.error(err);
      }
    }
  };

  const handleCleanTranscript = async () => {
    if (!transcript.trim()) return;
    setCleaning(true);
    setError(null);
    try {
      const res = await fetch("/api/voice-interview/clean-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to polish transcript.");
      }

      const data = await res.json();
      if (data.cleanedTranscript) {
        setTranscript(data.cleanedTranscript);
        baseTranscriptRef.current = data.cleanedTranscript;
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while cleaning the transcript.");
    } finally {
      setCleaning(false);
    }
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcript.trim()) {
      setError("Please record your voice answer or type some text first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/voice-interview/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole,
          question: selectedQuestion,
          transcript,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to evaluate voice answer.");
      }

      const data: VoiceInterviewResponse = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred during speech evaluation.");
    } finally {
      setLoading(false);
    }
  };

  const scoreLabelColor = (score: number) => {
    if (score >= 85) return "text-emerald-700 bg-emerald-50 border-emerald-100";
    if (score >= 65) return "text-amber-700 bg-amber-50 border-amber-100";
    return "text-rose-700 bg-rose-50 border-rose-100";
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="border-b border-slate-100 pb-5">
        <h2 className="text-2xl font-bold font-display text-slate-800">Voice Interview Assessment</h2>
        <p className="text-slate-500 text-sm mt-1">Practice verbal communication. Record your spoken response and obtain structured feedback on clarity, confidence, and accuracy.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Interactive Column */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Job Role</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm placeholder:text-slate-400"
                placeholder="e.g. Node.js Tech Lead"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Interview Question</label>
              <div className="space-y-2">
                <textarea
                  className="w-full h-20 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-xs font-sans placeholder:text-slate-400 resize-none"
                  placeholder="Enter the question you want to practice answering..."
                  value={selectedQuestion}
                  onChange={(e) => setSelectedQuestion(e.target.value)}
                  required
                />
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase self-center mr-1">Presets:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedQuestion("What is prompt engineering, and how do you prevent prompt injection attacks in AI integrations?")}
                    className="text-[10px] bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium border border-indigo-100/40"
                  >
                    AI Prompt Engineering
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedQuestion("Explain the difference between synchronous and asynchronous execution in Node.js.")}
                    className="text-[10px] bg-slate-50 hover:bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md transition-all cursor-pointer border border-slate-100"
                  >
                    Sync/Async
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedQuestion("How do you ensure proper security standards when setting up REST APIs?")}
                    className="text-[10px] bg-slate-50 hover:bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md transition-all cursor-pointer border border-slate-100"
                  >
                    API Security
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Speak Control panel */}
          <div className="bg-slate-50 border border-slate-100/60 rounded-2xl p-5 space-y-4 text-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Live Microphone Capture</span>

            <div className="flex items-center justify-center relative">
              {/* Pulsing Visualizer Rings */}
              {isListening && (
                <>
                  <span className="absolute w-24 h-24 rounded-full bg-indigo-500/20 animate-ping" />
                  <span className="absolute w-16 h-16 rounded-full bg-indigo-500/30 animate-pulse" />
                </>
              )}

              <button
                type="button"
                onClick={handleToggleListening}
                disabled={!speechSupported}
                className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-all relative z-10 ${
                  isListening 
                    ? "bg-rose-500 text-white shadow-lg shadow-rose-100 scale-105" 
                    : "bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:scale-105 hover:bg-indigo-700"
                } ${!speechSupported && "bg-slate-300 text-slate-400 cursor-not-allowed"}`}
              >
                {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              {isListening ? "Listening... Speak now and click stop when done." : "Click microphone icon to begin speaking."}
            </p>

            {!speechSupported && (
              <p className="text-[10px] text-amber-600 font-semibold leading-relaxed px-4">
                Speech recognition is not fully supported in this browser environment. You may type your transcript directly.
              </p>
            )}
          </div>

          {/* Transcript Box */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-500 uppercase">Spoken Answer Transcript</label>
              <div className="flex items-center gap-2">
                {transcript.trim() && (
                  <button
                    type="button"
                    onClick={handleCleanTranscript}
                    disabled={cleaning}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {cleaning ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Polishing with AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-indigo-500 fill-indigo-100" />
                        Clean with AI
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setTranscript("");
                    baseTranscriptRef.current = "";
                  }}
                  className="text-[10px] text-rose-500 hover:underline cursor-pointer font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
            <textarea
              className="w-full h-32 px-4 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-xs font-sans placeholder:text-slate-400 resize-none"
              placeholder="Your transcript will appear here in real-time as you speak, or you can paste text..."
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value);
                baseTranscriptRef.current = e.target.value;
              }}
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleEvaluate}
            disabled={loading}
            className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Evaluating Verbal Delivery...
              </>
            ) : (
              <>
                Evaluate Speech answer
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </>
            )}
          </button>

          {/* Vocal Recording Pro-Tips */}
          <div className="bg-amber-50/55 border border-amber-100 rounded-xl p-4 space-y-2 text-xs text-amber-900">
            <h4 className="font-bold flex items-center gap-1.5 text-amber-800">
              <Volume2 className="w-4 h-4 text-amber-600 shrink-0" />
              💡 Voice Capture Pro-Tips
            </h4>
            <ul className="space-y-1.5 list-disc list-inside text-amber-800/80 pl-1 leading-relaxed">
              <li><strong>Reduce Background Noise:</strong> The speech API struggles with AC, fan noise, laptop speaker feedback, and distant chatter.</li>
              <li><strong>Wired Earphones:</strong> Highly recommended to separate your voice from audio feedback.</li>
              <li><strong>Quiet Room:</strong> Speak in a serene environment to prevent ambient interference.</li>
              <li><strong>Microphone Distance:</strong> Keep the microphone about 10–20 cm away and speak clearly.</li>
            </ul>
          </div>
        </div>

        {/* Right Output Column */}
        <div className="lg:col-span-7">
          {result ? (
            <div className="space-y-6">
              {/* Overall & Score indicators */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="space-y-1.5 text-center sm:text-left">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Verbal Delivery score</span>
                  <h3 className="text-lg font-bold text-slate-800 font-display">Communication Analysis Successful</h3>
                  <p className="text-xs text-slate-400">Ignore minor transcription errors - focused on delivery, structure & clarity</p>
                </div>

                <div className={`w-20 h-20 border rounded-2xl flex flex-col items-center justify-center shrink-0 font-display font-extrabold ${scoreLabelColor(result.overallScore)}`}>
                  <span className="text-3xl leading-none">{result.overallScore}</span>
                  <span className="text-[8px] uppercase font-bold tracking-wider opacity-80 mt-1">Overall</span>
                </div>
              </div>

              {/* Individual sub scores */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-100 rounded-xl p-4 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Clarity</span>
                  <span className="text-xl font-extrabold text-indigo-600 font-display">{result.communicationScore}%</span>
                </div>

                <div className="bg-white border border-slate-100 rounded-xl p-4 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Confidence</span>
                  <span className="text-xl font-extrabold text-emerald-600 font-display">{result.confidenceScore}%</span>
                </div>

                <div className="bg-white border border-slate-100 rounded-xl p-4 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Accuracy</span>
                  <span className="text-xl font-extrabold text-amber-600 font-display">{result.technicalScore}%</span>
                </div>
              </div>

              {/* Feedback box */}
              <div className="bg-linear-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6">
                <h3 className="text-sm font-bold text-emerald-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4.5 h-4.5 text-emerald-400" />
                  Verbal Presentation Review
                </h3>
                <p className="text-slate-300 text-sm md:text-base leading-relaxed leading-relaxed whitespace-pre-line">
                  {result.feedback}
                </p>
              </div>

              {/* Improvement Tips */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2.5">
                  <Volume2 className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
                  Verbal Improvement Tips
                </h3>
                <ul className="space-y-3">
                  {result.improvementTips.map((tip, idx) => (
                    <li key={idx} className="text-slate-600 text-xs md:text-sm flex gap-2 items-start leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Concluding actions */}
              <ActionsConcluder actions={result.top3Actions} />
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl h-96 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mb-4 text-slate-300">
                <Mic className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-slate-700 mb-1">Vocal Analysis Suite</h3>
              <p className="text-xs max-w-sm">Tap the mic to record, express your thoughts clearly, and receive structured speech diagnostics.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
