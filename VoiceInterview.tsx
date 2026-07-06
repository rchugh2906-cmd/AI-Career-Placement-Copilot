import React from "react";
import { CheckSquare } from "lucide-react";

interface ActionsConcluderProps {
  actions: string[];
}

export default function ActionsConcluder({ actions }: ActionsConcluderProps) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="mt-8 border-t border-indigo-100 pt-6 bg-linear-to-r from-indigo-50/50 to-emerald-50/30 rounded-xl p-5 border border-indigo-50">
      <h4 className="text-sm font-semibold text-slate-800 tracking-wider uppercase mb-4 flex items-center gap-2">
        <CheckSquare className="w-4 h-4 text-emerald-600" />
        Top 3 actions you should take next:
      </h4>
      <ol className="space-y-3">
        {actions.map((action, idx) => (
          <li key={idx} className="flex gap-3 text-slate-700 text-sm md:text-base leading-relaxed items-start">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold shrink-0 mt-0.5">
              {idx + 1}
            </span>
            <span>{action}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
