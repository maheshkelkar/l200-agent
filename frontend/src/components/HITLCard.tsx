import { useState } from 'react';
import type { HITLDecision, UserProfile } from '../types';
import { ShieldCheck, Check, X, UserCheck } from 'lucide-react';

interface HITLCardProps {
  decision: HITLDecision;
  currentUser?: UserProfile;
  onApprove: (comment?: string) => void;
  onReject: (reason: string) => void;
}

export const HITLCard = ({
  decision,
  currentUser,
  onApprove,
  onReject,
}: HITLCardProps) => {
  const [comment, setComment] = useState('');

  return (
    <div className={`rounded-2xl border p-5 shadow-2xl space-y-3.5 my-3 transition-all duration-200 ${
      decision.status === 'APPROVED' ? 'bg-emerald-950/30 border-emerald-500/40' :
      decision.status === 'REJECTED' ? 'bg-rose-950/30 border-rose-500/40' :
      'bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-slate-950/90 border-amber-500/40'
    }`}>
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${
            decision.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' :
            decision.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-400' :
            'bg-amber-500/20 text-amber-400'
          }`}>
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h4 className={`text-xs font-bold uppercase tracking-wider ${
              decision.status === 'APPROVED' ? 'text-emerald-300' :
              decision.status === 'REJECTED' ? 'text-rose-300' :
              'text-amber-300'
            }`}>
              Human-in-the-Loop (HITL) Research Publishing Gate
            </h4>
            <p className="text-[10px] text-slate-400">Mandatory Supervisory Analyst Sign-off & Compliance Release</p>
          </div>
        </div>
        
        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
          decision.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
          decision.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
          'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
        }`}>
          {decision.status}
        </span>
      </div>

      {/* Decision Summary */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium">Proposed Investment Rating:</span>
          <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            {decision.proposedRating} ({decision.symbol})
          </span>
        </div>
        <p className="text-slate-300 text-[11px] leading-relaxed bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
          {decision.rationale}
        </p>
      </div>

      {/* Action Controls (If Pending) */}
      {decision.status === 'PENDING' && (
        <div className="space-y-2 pt-1">
          <input
            type="text"
            placeholder="Add optional analyst revision notes or compliance sign-off commentary..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-500">
              Signatory Persona: <b>{currentUser?.name || 'Senior Analyst'}</b>
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onReject(comment || 'Rejected by supervisory analyst')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-semibold transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reject & Embargo</span>
              </button>
              <button
                onClick={() => onApprove(comment)}
                className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Approve & Release Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decision Completed Banner */}
      {decision.status !== 'PENDING' && (
        <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
          decision.status === 'APPROVED' ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-200' :
          'bg-rose-950/50 border-rose-800/60 text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 shrink-0" />
            <div>
              <span className="font-semibold block">
                {decision.status === 'APPROVED' ? 'Digital Signature Verified & Report Released' : 'Report Publication Embargoed'}
              </span>
              {decision.analystComment && (
                <span className="text-[11px] opacity-90 block mt-0.5">Notes: {decision.analystComment}</span>
              )}
            </div>
          </div>
          <span className="text-[10px] opacity-70 font-mono">
            {new Date(decision.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}

    </div>
  );
};
