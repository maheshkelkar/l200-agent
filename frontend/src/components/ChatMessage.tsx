import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Message, UserProfile } from '../types';
import { FinancialMetricCard } from './FinancialMetricCard';
import { HITLCard } from './HITLCard';
import { 
  Bot, 
  Copy, 
  Check, 
  Activity, 
  CheckCircle2, 
  ShieldCheck,
  Lock,
  Unlock,
  AlertOctagon
} from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  currentUser: UserProfile;
  onOpenTraceDrawer: () => void;
  onApproveHITL?: (comment?: string) => void;
  onRejectHITL?: (reason: string) => void;
}

export const ChatMessage = ({
  message,
  currentUser,
  onOpenTraceDrawer,
  onApproveHITL,
  onRejectHITL,
}: ChatMessageProps) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isHITLPending = message.hitlAction?.status === 'PENDING';
  const isHITLRejected = message.hitlAction?.status === 'REJECTED';
  const isHITLApproved = message.hitlAction?.status === 'APPROVED';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3.5 py-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600/30 via-indigo-600/30 to-slate-900 border border-cyan-500/40 text-cyan-400 glow-cyan">
          <Bot className="h-5 w-5" />
        </div>
      )}

      {/* Message Content Container */}
      <div className={`flex max-w-3xl flex-col ${isUser ? 'items-end' : 'items-start'} min-w-0`}>
        
        {/* Role & Timestamp Label */}
        <div className="flex items-center gap-2 px-1 mb-1 text-[11px] text-slate-400">
          <span className="font-semibold text-slate-300">
            {isUser ? currentUser.name : 'Financial Research Coordinator (ADK Multi-Agent)'}
          </span>
          <span>•</span>
          <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        {/* Message Bubble */}
        <div
          className={`rounded-2xl p-4 text-xs leading-relaxed shadow-lg ${
            isUser
              ? 'bg-gradient-to-r from-cyan-900/40 to-indigo-900/40 border border-cyan-500/40 text-slate-100 rounded-tr-sm'
              : 'bg-slate-900/80 border border-slate-800 text-slate-200 rounded-tl-sm w-full'
          }`}
        >
          {/* Tool Execution Pill (If assistant executed tools) */}
          {!isUser && message.toolTraces && message.toolTraces.length > 0 && (
            <div className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-slate-950/80 px-3 py-2 border border-slate-800">
              <div className="flex items-center gap-2 text-[11px]">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-slate-300 font-medium">
                  {message.toolTraces.length} SEC & Valuation Tools Executed
                </span>
              </div>
              <button
                onClick={onOpenTraceDrawer}
                className="flex items-center gap-1 text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <Activity className="h-3 w-3 animate-pulse" />
                <span>Inspect Trace</span>
              </button>
            </div>
          )}

          {/* Human-in-the-Loop (HITL) Gate Card rendered at TOP of report if triggered */}
          {!isUser && message.hitlAction && onApproveHITL && onRejectHITL && (
            <HITLCard
              decision={message.hitlAction}
              currentUser={currentUser}
              onApprove={onApproveHITL}
              onReject={onRejectHITL}
            />
          )}

          {/* If HITL is Pending, show Embargo Notice and gate the report */}
          {isHITLPending && (
            <div className="my-3 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-center gap-2.5 text-amber-300 text-xs">
              <Lock className="h-4 w-4 shrink-0 text-amber-400" />
              <div>
                <span className="font-bold block">Draft Report Embargoed</span>
                <span className="text-[11px] text-slate-300">
                  Full institutional distribution and models are held in draft status. Review the investment thesis above and click <b>Approve & Sign</b> to release.
                </span>
              </div>
            </div>
          )}

          {/* If HITL was Rejected, show Rejection Notice */}
          {isHITLRejected && (
            <div className="my-3 rounded-xl bg-rose-950/40 border border-rose-800/60 p-3 flex items-center gap-2.5 text-rose-300 text-xs">
              <AlertOctagon className="h-4 w-4 shrink-0 text-rose-400" />
              <div>
                <span className="font-bold block">Report Publication Rejected</span>
                <span className="text-[11px] text-slate-400">
                  This report has been embargoed from publication per analyst review notes.
                </span>
              </div>
            </div>
          )}

          {/* If HITL was Approved, show Release Banner */}
          {isHITLApproved && (
            <div className="my-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 flex items-center gap-2 text-emerald-300 text-xs">
              <Unlock className="h-3.5 w-3.5 text-emerald-400" />
              <span><b>Official Research Release:</b> Verified and approved by {currentUser.name} ({currentUser.roleTitle}).</span>
            </div>
          )}

          {/* Report Body (Gated / blurred if HITL is pending or rejected) */}
          <div className={`relative transition-all duration-300 ${
            isHITLPending ? 'filter blur-[3px] select-none pointer-events-none opacity-35 max-h-48 overflow-hidden' :
            isHITLRejected ? 'filter blur-[4px] select-none pointer-events-none opacity-20 max-h-24 overflow-hidden' :
            'opacity-100'
          }`}>
            <div className="prose prose-invert prose-xs max-w-none space-y-2 text-slate-200">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                  strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                  ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 my-2">{children}</ul>,
                  li: ({ children }) => <li className="text-slate-300">{children}</li>,
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-3 rounded-lg border border-slate-800">
                      <table className="w-full text-left text-xs border-collapse bg-slate-950/60">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="bg-slate-800/80 px-3 py-2 font-bold text-cyan-300 border-b border-slate-700">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3 py-2 border-b border-slate-800/60 text-slate-300">{children}</td>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>

              {/* Live Streaming Blinking Cursor */}
              {message.isStreaming && (
                <span className="inline-block h-3.5 w-1.5 ml-1 bg-cyan-400 animate-pulse rounded-full align-middle" />
              )}
            </div>

            {/* Structured Financial Metric Card (If extracted) */}
            {!isUser && message.financialMetrics && !isHITLPending && !isHITLRejected && (
              <FinancialMetricCard metrics={message.financialMetrics} />
            )}
          </div>

          {/* Assistant Action Footer */}
          {!isUser && !message.isStreaming && !isHITLPending && (
            <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <div className="flex items-center gap-1.5 text-slate-500">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                <span>Audited SEC Data Grounding</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 rounded px-2 py-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-base">
          {currentUser.avatar}
        </div>
      )}

    </div>
  );
};
