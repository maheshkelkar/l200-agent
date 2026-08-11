import { useState } from 'react';
import type { UserProfile } from '../types';
import { TEST_USER_PROFILES } from '../data/exemplars';
import { 
  TrendingUp, 
  Cpu, 
  Sparkles, 
  BookOpen, 
  Activity, 
  ChevronDown, 
  CheckCircle2, 
  RotateCcw
} from 'lucide-react';

interface HeaderProps {
  currentUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
  onToggleExemplars: () => void;
  onToggleDrawer: () => void;
  onNewSession: () => void;
  sessionId: string;
  isDrawerOpen: boolean;
  activeToolCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSelectUser,
  onToggleExemplars,
  onToggleDrawer,
  onNewSession,
  sessionId,
  isDrawerOpen,
  activeToolCount,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800/80 bg-[#080C14]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left: Branding & Multi-Agent Architecture Badges */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 via-indigo-500/20 to-emerald-500/20 border border-cyan-500/40 glow-cyan">
            <TrendingUp className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base">QUANTUM INTEL</span>
              <span className="rounded-md bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-cyan-400 border border-slate-700/60">
                ADK Multi-Agent v2.6
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Institutional Financial Research & Valuation Platform</p>
          </div>

          {/* Model Routing Pills */}
          <div className="hidden lg:flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-800">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-800">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              <span>Gemini 2.5 Pro</span>
              <span className="text-[9px] text-slate-500">(Valuation / Synthesis)</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-800">
              <Cpu className="h-3 w-3 text-cyan-400" />
              <span>Gemini 2.5 Flash</span>
              <span className="text-[9px] text-slate-500">(SEC Tool Extraction)</span>
            </span>
          </div>
        </div>

        {/* Right: Actions, Test User Switcher, & Reasoning Drawer Toggle */}
        <div className="flex items-center gap-2.5">
          
          {/* Exemplar Command Library Button */}
          <button
            onClick={onToggleExemplars}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 px-3 py-1.5 text-xs font-medium text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 transition-all shadow-sm"
            title="Browse all available analysis commands and prompt examples"
          >
            <BookOpen className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Command Library</span>
          </button>

          {/* New Session Button */}
          <button
            onClick={onNewSession}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 border border-slate-800 transition-all"
            title="Reset conversation and start fresh session"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">New Session</span>
          </button>

          {/* Reasoning Drawer Toggle */}
          <button
            onClick={onToggleDrawer}
            className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-all ${
              isDrawerOpen 
                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20' 
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
            title="Toggle step-by-step reasoning and tool execution trace inspector"
          >
            <Activity className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
            <span className="hidden md:inline">Reasoning Drawer</span>
            {activeToolCount > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-slate-950">
                {activeToolCount}
              </span>
            )}
          </button>

          {/* Test User Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 rounded-lg bg-slate-900/90 hover:bg-slate-800/90 px-3 py-1.5 text-xs font-medium border border-slate-800 transition-all"
            >
              <span className="text-base">{currentUser.avatar}</span>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-slate-200 leading-tight">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 leading-tight">{currentUser.roleTitle}</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1.5 border-b border-slate-800 mb-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Switch Test User Persona</p>
                  <p className="text-[10px] text-slate-500">Simulate analyst, compliance, or executive roles</p>
                </div>
                <div className="space-y-1">
                  {TEST_USER_PROFILES.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => {
                        onSelectUser(profile);
                        setIsUserMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                        profile.id === currentUser.id 
                          ? 'bg-cyan-500/10 border border-cyan-500/30 text-white' 
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="text-lg">{profile.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{profile.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{profile.roleTitle}</p>
                      </div>
                      {profile.id === currentUser.id && (
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800 px-2 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Session:</span>
                  <span className="font-mono text-slate-400">{sessionId.slice(0, 16)}...</span>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
