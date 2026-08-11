import { useState } from 'react';
import type { MouseEvent } from 'react';
import { COMMAND_EXEMPLARS } from '../data/exemplars';
import { 
  X, 
  Search, 
  FileSpreadsheet, 
  PieChart, 
  Calculator, 
  TrendingUp, 
  Newspaper, 
  ShieldCheck, 
  Play, 
  Copy, 
  Check, 
  Sparkles
} from 'lucide-react';

interface ExemplarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (prompt: string) => void;
}

const CATEGORY_TABS = [
  { key: 'ALL', label: 'All Categories', icon: Sparkles },
  { key: '10Q_STATEMENTS', label: '10-Q / 10-K Statements', icon: FileSpreadsheet },
  { key: 'SEGMENT_BREAKDOWN', label: 'Segment Breakdowns', icon: PieChart },
  { key: 'VALUATION_MODELING', label: 'Valuation & Multiples', icon: Calculator },
  { key: 'PEER_BENCHMARK', label: 'Peer Benchmarking', icon: TrendingUp },
  { key: 'MDA_SENTIMENT', label: 'MD&A & Sentiment', icon: Newspaper },
  { key: 'HITL_APPROVAL', label: 'HITL Publishing', icon: ShieldCheck },
];

export const ExemplarModal: React.FC<ExemplarModalProps> = ({
  isOpen,
  onClose,
  onSelectPrompt,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredExemplars = COMMAND_EXEMPLARS.filter((item) => {
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleCopy = (id: string, text: string, e: MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'FileSpreadsheet': return <FileSpreadsheet className="h-4 w-4 text-cyan-400" />;
      case 'PieChart': return <PieChart className="h-4 w-4 text-indigo-400" />;
      case 'Calculator': return <Calculator className="h-4 w-4 text-emerald-400" />;
      case 'TrendingUp': return <TrendingUp className="h-4 w-4 text-amber-400" />;
      case 'Newspaper': return <Newspaper className="h-4 w-4 text-rose-400" />;
      case 'ShieldCheck': return <ShieldCheck className="h-4 w-4 text-purple-400" />;
      default: return <Sparkles className="h-4 w-4 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0F172A] border border-slate-700/80 shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">Financial Analysis Command Library</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Explore verified exemplar queries, input prompt syntax, and expected financial model outputs.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Category Filter Tabs */}
        <div className="px-6 pt-4 pb-3 border-b border-slate-800/80 space-y-3 bg-slate-900/30">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company (e.g. Alphabet, Apple, Tesla), metrics (EBITDA, Segments), or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {CATEGORY_TABS.map((tab) => {
              const Icon = tab.icon;
              const isSelected = selectedCategory === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setSelectedCategory(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Exemplars Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredExemplars.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">No matching command exemplars found</p>
              <p className="text-xs text-slate-500 mt-1">Try searching for other tickers like GOOGL, NVDA, AAPL, or MSFT.</p>
            </div>
          ) : (
            filteredExemplars.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectPrompt(item.prompt);
                  onClose();
                }}
                className="group relative rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 hover:border-cyan-500/50 p-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-cyan-500/5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 shrink-0 mt-0.5">
                      {getCategoryIcon(item.iconName)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {item.title}
                        </h3>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                          {item.categoryLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                    </div>
                  </div>

                  {/* Actions: Run & Copy */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => handleCopy(item.id, item.prompt, e)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                      title="Copy prompt text"
                    >
                      {copiedId === item.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-md group-hover:scale-105"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Run Query</span>
                    </button>
                  </div>
                </div>

                {/* Prompt & Expected Output Box */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 block mb-1">
                      Input Command Prompt
                    </span>
                    <p className="text-slate-200 font-mono text-[11px] select-all leading-relaxed">
                      "{item.prompt}"
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 block mb-1">
                      Expected Output Synthesis
                    </span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {item.expectedOutputSummary}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800/60 text-slate-400 border border-slate-700/50"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-900/60 text-xs text-slate-400">
          <span>Clicking any card immediately fills and executes the prompt</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
