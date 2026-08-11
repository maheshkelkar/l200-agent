import { useState } from 'react';
import type { ToolExecutionTrace } from '../types';
import { 
  X, 
  Activity, 
  Cpu, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ChevronRight, 
  ChevronDown, 
  Terminal, 
  Database
} from 'lucide-react';

interface ReasoningDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  traces: ToolExecutionTrace[];
  isStreaming: boolean;
  sessionId: string;
}

export const ReasoningDrawer: React.FC<ReasoningDrawerProps> = ({
  isOpen,
  onClose,
  traces,
  isStreaming,
  sessionId,
}) => {
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleExpand = (id: string) => {
    setExpandedTraceId(expandedTraceId === id ? null : id);
  };

  const getToolDisplayName = (toolName: string) => {
    switch (toolName) {
      case 'retrieve_sec_filings_data': return 'Audited SEC Filing Extraction (10-Q/10-K)';
      case 'fetch_stock_quote_metrics': return 'Real-Time Market Quote & Fundamentals';
      case 'calculate_valuation_multiples': return 'GAAP Valuation Multiples & Capital Modeling';
      case 'fetch_company_earnings_news': return 'Market Sentiment & Earnings Headlines';
      default: return toolName;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[480px] lg:w-[540px] bg-[#0B0F19]/95 backdrop-blur-2xl border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
            <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Agent Reasoning & Trace Inspector</h2>
            <p className="text-[10px] text-slate-400">OpenTelemetry Cloud Trace & Multi-Agent Execution</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Observability & Guardrail Status Bar */}
      <div className="px-5 py-2.5 bg-slate-900/40 border-b border-slate-800/80 grid grid-cols-3 gap-2 text-[10px]">
        <div className="flex items-center gap-1.5 text-slate-300">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>PII Redactor: <b className="text-emerald-400">Active</b></span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <Database className="h-3.5 w-3.5 text-cyan-400" />
          <span>SEC Cache: <b className="text-cyan-400">Enabled</b></span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <Clock className="h-3.5 w-3.5 text-indigo-400" />
          <span>Status: <b className={isStreaming ? 'text-amber-400 animate-pulse' : 'text-slate-400'}>{isStreaming ? 'Reasoning...' : 'Idle'}</b></span>
        </div>
      </div>

      {/* Trace Timeline List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        
        {/* Step 1: Coordinator Routing Badge */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold mb-1">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Coordinator Agent (Gemini 2.5 Pro)</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Decomposed inquiry into targeted quantitative retrieval goals. Delegated data extraction to Data Gathering sub-agent.
          </p>
        </div>

        {/* Step 2: Tool Execution Traces */}
        {traces.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
            <Terminal className="h-6 w-6 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium">No tool execution events yet</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Submit an analysis prompt to watch realtime tool invocations.</p>
          </div>
        ) : (
          traces.map((trace, idx) => {
            const isExpanded = expandedTraceId === trace.id;
            return (
              <div
                key={trace.id || idx}
                className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden transition-all duration-150"
              >
                {/* Trace Header Bar */}
                <div
                  onClick={() => toggleExpand(trace.id)}
                  className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-850 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {trace.status === 'SUCCESS' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : trace.status === 'PENDING' ? (
                      <Clock className="h-4 w-4 text-amber-400 shrink-0 animate-spin" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                    )}

                    <div className="truncate">
                      <p className="text-xs font-semibold text-white truncate">
                        {getToolDisplayName(trace.toolName)}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        tool: {trace.toolName}()
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {trace.durationMs && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {trace.durationMs}ms
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Collapsible JSON & Payload Inspector */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-800/80 bg-slate-950/60 text-xs space-y-2">
                    {/* Input Payload */}
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 block mb-1">
                        Input Parameters
                      </span>
                      <pre className="p-2 rounded bg-slate-900 text-[10px] font-mono text-slate-300 overflow-x-auto border border-slate-800">
                        {JSON.stringify(trace.inputPayload, null, 2)}
                      </pre>
                    </div>

                    {/* Output Payload */}
                    {trace.outputPayload && (
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 block mb-1">
                          Extracted Output Payload
                        </span>
                        <pre className="p-2 rounded bg-slate-900 text-[10px] font-mono text-emerald-300/90 overflow-x-auto border border-slate-800 max-h-48">
                          {JSON.stringify(trace.outputPayload, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Error / Recovery Hint */}
                    {trace.error && (
                      <div className="p-2 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 text-[10px]">
                        <p className="font-semibold">Error: {trace.error}</p>
                        {trace.recoveryHint && (
                          <p className="mt-1 text-slate-300">{trace.recoveryHint}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Step 3: Financial Analyst Synthesis Badge */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-cyan-300 font-semibold mb-1">
            <Cpu className="h-3.5 w-3.5 text-cyan-400" />
            <span>Financial Analyst Agent (Gemini 2.5 Pro)</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Synthesized extracted SEC filing data, validated GAAP arithmetic, checked valuation multiples, and applied mandatory SEC disclaimer.
          </p>
        </div>

      </div>

      {/* Drawer Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
        <span className="text-[10px] font-mono text-slate-500">Session: {sessionId.slice(0, 18)}</span>
        <button
          onClick={onClose}
          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
        >
          Close Drawer
        </button>
      </div>

    </div>
  );
};
