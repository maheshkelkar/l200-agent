import type { FinancialMetricExtracted } from '../types';
import { PieChart } from 'lucide-react';

interface FinancialMetricCardProps {
  metrics: FinancialMetricExtracted;
}

export const FinancialMetricCard = ({ metrics }: FinancialMetricCardProps) => {
  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return 'N/A';
    if (Math.abs(val) >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
    if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toLocaleString()}`;
  };

  const totalSegmentSum = metrics.segments
    ? Object.values(metrics.segments).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-700/70 p-5 shadow-2xl space-y-4 my-3">
      
      {/* Card Header: Company & Filing Badge */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 font-bold text-xs border border-cyan-500/40">
            {metrics.symbol || 'SEC'}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              {metrics.companyName || metrics.symbol} Audited Financial Summary
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              Filing Period: {metrics.period || 'Quarterly 10-Q'}
            </p>
          </div>
        </div>

        {metrics.valuationAssessment && (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            {metrics.valuationAssessment}
          </span>
        )}
      </div>

      {/* Primary Financial Numbers Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* Total Revenue */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Total Revenue
          </span>
          <p className="text-base font-bold text-white mt-0.5">
            {formatCurrency(metrics.revenueUsd)}
          </p>
          <span className="text-[10px] text-emerald-400 font-medium">Audited GAAP</span>
        </div>

        {/* Operating Income & Margin */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Operating Income
          </span>
          <p className="text-base font-bold text-white mt-0.5">
            {formatCurrency(metrics.operatingIncomeUsd)}
          </p>
          {metrics.operatingMarginPct !== undefined && (
            <span className="text-[10px] text-cyan-400 font-medium">
              Margin: {metrics.operatingMarginPct.toFixed(1)}%
            </span>
          )}
        </div>

        {/* Net Income */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Net Income
          </span>
          <p className="text-base font-bold text-white mt-0.5">
            {formatCurrency(metrics.netIncomeUsd)}
          </p>
          {metrics.epsUsd !== undefined && (
            <span className="text-[10px] text-slate-400 font-medium">
              EPS: ${metrics.epsUsd.toFixed(2)}
            </span>
          )}
        </div>

        {/* Enterprise Value / Multiples */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Enterprise Value (EV)
          </span>
          <p className="text-base font-bold text-white mt-0.5">
            {formatCurrency(metrics.enterpriseValueUsd)}
          </p>
          {metrics.evToEbitda !== undefined && (
            <span className="text-[10px] text-indigo-400 font-medium">
              EV/EBITDA: {metrics.evToEbitda}x
            </span>
          )}
        </div>

      </div>

      {/* Segment Breakdown Waterfall / Progress Bars (If Present) */}
      {metrics.segments && Object.keys(metrics.segments).length > 0 && (
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <PieChart className="h-3.5 w-3.5 text-cyan-400" />
              <span>Divisional & Product Segment Disaggregation</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Total: {formatCurrency(totalSegmentSum)}
            </span>
          </div>

          <div className="space-y-2">
            {Object.entries(metrics.segments).map(([segName, segVal]) => {
              const pct = totalSegmentSum > 0 ? (segVal / totalSegmentSum) * 100 : 0;
              return (
                <div key={segName} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-medium truncate">{segName}</span>
                    <span className="text-slate-200 font-mono font-semibold">
                      {formatCurrency(segVal)} <span className="text-slate-500 font-normal">({pct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MD&A Highlights Note */}
      {metrics.mdaHighlights && (
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 text-xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 block mb-1">
            Management Discussion & Analysis (MD&A)
          </span>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            {metrics.mdaHighlights}
          </p>
        </div>
      )}

    </div>
  );
};
