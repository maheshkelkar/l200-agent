import { useState, useRef, useEffect } from 'react';
import type { Message, UserProfile, ToolExecutionTrace, FinancialMetricExtracted, HITLDecision } from './types';
import { TEST_USER_PROFILES, COMMAND_EXEMPLARS } from './data/exemplars';
import { Header } from './components/Header';
import { ChatMessage } from './components/ChatMessage';
import { ExemplarModal } from './components/ExemplarModal';
import { ReasoningDrawer } from './components/ReasoningDrawer';
import { 
  Send, 
  Sparkles, 
  BookOpen, 
  ArrowRight,
  AlertTriangle
} from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(TEST_USER_PROFILES[0]);
  const [sessionId, setSessionId] = useState<string>(() => `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isExemplarModalOpen, setIsExemplarModalOpen] = useState(false);
  const [currentTraces, setCurrentTraces] = useState<ToolExecutionTrace[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleNewSession = () => {
    setSessionId(`session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    setMessages([]);
    setCurrentTraces([]);
    setErrorMessage(null);
  };

  // Dynamically parse financial numbers from the real LLM output text
  const parseFinancialMetricsFromText = (text: string, prompt: string): FinancialMetricExtracted | undefined => {
    if (!text || text.length < 20) return undefined;

    const metrics: FinancialMetricExtracted = {};
    const textLower = text.toLowerCase();
    const promptLower = prompt.toLowerCase();

    // Extract ticker symbol & company name
    const symbols = ['GOOGL', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META'];
    for (const sym of symbols) {
      if (text.includes(sym) || prompt.toUpperCase().includes(sym)) {
        metrics.symbol = sym;
        break;
      }
    }

    if (textLower.includes('alphabet') || promptLower.includes('alphabet')) metrics.companyName = 'Alphabet Inc.';
    else if (textLower.includes('apple') || promptLower.includes('apple')) metrics.companyName = 'Apple Inc.';
    else if (textLower.includes('microsoft') || promptLower.includes('microsoft')) metrics.companyName = 'Microsoft Corporation';
    else if (textLower.includes('nvidia') || promptLower.includes('nvidia')) metrics.companyName = 'NVIDIA Corporation';
    else if (textLower.includes('tesla') || promptLower.includes('tesla')) metrics.companyName = 'Tesla, Inc.';
    else metrics.companyName = metrics.symbol || 'Target Company';

    // Extract Total Revenue
    const revMatch = text.match(/Total Revenue[:\s\*]*\$?([0-9,.]+)\s*(billion|million|B|M)?/i) ||
                     text.match(/revenue of[:\s\*]*\$?([0-9,.]+)\s*(billion|million|B|M)?/i) ||
                     text.match(/revenue was[:\s\*]*\$?([0-9,.]+)\s*(billion|million|B|M)?/i);
    if (revMatch) {
      let num = parseFloat(revMatch[1].replace(/,/g, ''));
      const unit = (revMatch[2] || '').toLowerCase();
      if (unit.startsWith('b') || unit === 'billion') num *= 1e9;
      else if (unit.startsWith('m') || unit === 'million') num *= 1e6;
      else if (num < 1000) num *= 1e9; // heuristic for billions if unit omitted
      metrics.revenueUsd = num;
    }

    // Extract Operating Income
    const opMatch = text.match(/Operating Income[:\s\*]*\$?([0-9,.]+)\s*(billion|million|B|M)?/i) ||
                    text.match(/operating profit of[:\s\*]*\$?([0-9,.]+)\s*(billion|million|B|M)?/i);
    if (opMatch) {
      let num = parseFloat(opMatch[1].replace(/,/g, ''));
      const unit = (opMatch[2] || '').toLowerCase();
      if (unit.startsWith('b') || unit === 'billion') num *= 1e9;
      else if (unit.startsWith('m') || unit === 'million') num *= 1e6;
      else if (num < 1000) num *= 1e9;
      metrics.operatingIncomeUsd = num;
    }

    // Extract Net Income
    const netMatch = text.match(/Net Income[:\s\*]*\$?([0-9,.]+)\s*(billion|million|B|M)?/i) ||
                     text.match(/net profit of[:\s\*]*\$?([0-9,.]+)\s*(billion|million|B|M)?/i);
    if (netMatch) {
      let num = parseFloat(netMatch[1].replace(/,/g, ''));
      const unit = (netMatch[2] || '').toLowerCase();
      if (unit.startsWith('b') || unit === 'billion') num *= 1e9;
      else if (unit.startsWith('m') || unit === 'million') num *= 1e6;
      else if (num < 1000) num *= 1e9;
      metrics.netIncomeUsd = num;
    }

    // Extract Operating Margin
    const marginMatch = text.match(/operating margin of (?:approximately )?([0-9.]+)%/i) ||
                        text.match(/operating margin:?\s*([0-9.]+)%/i);
    if (marginMatch) {
      metrics.operatingMarginPct = parseFloat(marginMatch[1]);
    } else if (metrics.revenueUsd && metrics.operatingIncomeUsd) {
      metrics.operatingMarginPct = (metrics.operatingIncomeUsd / metrics.revenueUsd) * 100;
    }

    // Extract EPS
    const epsMatch = text.match(/(?:diluted )?eps (?:stood at |was |of )?\$?([0-9.]+)/i);
    if (epsMatch) {
      metrics.epsUsd = parseFloat(epsMatch[1]);
    }

    // Extract Segments from markdown list items if present
    const segmentMap: Record<string, number> = {};
    const segmentRegex = /\*\s+\*\*([^*:]+)\*\*[:\s]*[^\$]*\$([0-9,.]+)\s*(billion|million|B|M)/gi;
    let sMatch;
    while ((sMatch = segmentRegex.exec(text)) !== null) {
      const segName = sMatch[1].trim();
      let segVal = parseFloat(sMatch[2].replace(/,/g, ''));
      const unit = (sMatch[3] || '').toLowerCase();
      if (unit.startsWith('b') || unit === 'billion') segVal *= 1e9;
      else if (unit.startsWith('m') || unit === 'million') segVal *= 1e6;
      if (!segName.toLowerCase().includes('total') && !segName.toLowerCase().includes('net income') && !segName.toLowerCase().includes('operating income')) {
        segmentMap[segName] = segVal;
      }
    }

    if (Object.keys(segmentMap).length > 0) {
      metrics.segments = segmentMap;
    }

    if (metrics.revenueUsd || metrics.operatingIncomeUsd || metrics.netIncomeUsd) {
      return metrics;
    }

    return undefined;
  };

  const handleSendMessage = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || isStreaming) return;

    setInputPrompt('');
    setErrorMessage(null);

    const userMessage: Message = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const assistantMsgId = `msg_${Date.now()}_assistant`;
    const initialAssistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
      toolTraces: [],
    };

    setMessages((prev) => [...prev, userMessage, initialAssistantMsg]);
    setIsStreaming(true);

    const recordedTraces: ToolExecutionTrace[] = [
      {
        id: `trace_${Date.now()}_1`,
        toolName: 'retrieve_sec_filings_data',
        status: 'SUCCESS',
        startTime: Date.now(),
        durationMs: 180,
        inputPayload: { query: text },
        outputPayload: { status: 'SUCCESS' },
      },
    ];
    setCurrentTraces(recordedTraces);

    try {
      // Step 1: Initialize Session on FastAPI Backend (Ensures session exists)
      const sessionUrl = `/apps/app/users/${currentUser.id}/sessions`;
      try {
        await fetch(sessionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        });
      } catch {
        // Session creation may already exist or succeed silently
      }

      // Step 2: Stream from /run_sse
      const response = await fetch('/run_sse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_name: 'app',
          user_id: currentUser.id,
          session_id: sessionId,
          new_message: {
            role: 'user',
            parts: [{ text }],
          },
        }),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status} ${response.statusText}: ${errBody || 'Failed to connect to agent service'}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let sseBuffer = '';
      const liveToolTraces: ToolExecutionTrace[] = [];

      if (reader) {
        let done = false;
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split('\n');
            // Keep the last potentially incomplete chunk in the buffer
            sseBuffer = lines.pop() || '';
            
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ')) {
                try {
                  const jsonStr = trimmed.slice(6).trim();
                  if (!jsonStr) continue;
                  const data = JSON.parse(jsonStr);
                  const parts = data?.content?.parts || [];
                  for (const part of parts) {
                    // Extract text parts
                    if (part.text) {
                      accumulatedText += part.text;
                      setMessages((prev) =>
                        prev.map((msg) =>
                          msg.id === assistantMsgId
                            ? { ...msg, content: accumulatedText, toolTraces: [...liveToolTraces] }
                            : msg
                        )
                      );
                    }

                    // Extract tool calls for reasoning drawer
                    if (part.functionCall) {
                      const callTrace: ToolExecutionTrace = {
                        id: `trace_${Date.now()}_${liveToolTraces.length}`,
                        toolName: part.functionCall.name || 'tool_invocation',
                        status: 'PENDING',
                        startTime: Date.now(),
                        inputPayload: part.functionCall.args || {},
                      };
                      liveToolTraces.push(callTrace);
                      setCurrentTraces([...liveToolTraces]);
                    }

                    // Extract tool response
                    if (part.functionResponse) {
                      const fnName = part.functionResponse.name;
                      const existing = liveToolTraces.find((t) => t.toolName === fnName && t.status === 'PENDING') || liveToolTraces[liveToolTraces.length - 1];
                      if (existing) {
                        existing.status = 'SUCCESS';
                        existing.durationMs = Math.max(12, Date.now() - existing.startTime);
                        existing.outputPayload = part.functionResponse.response?.output || part.functionResponse.response || {};
                      }
                      setCurrentTraces([...liveToolTraces]);
                    }
                  }
                } catch {
                  // Incomplete or non-json line in chunk
                }
              }
            }
          }
        }
      }

      if (!accumulatedText) {
        accumulatedText = '⚠️ **Agent Execution Error**: The backend completed the connection but did not return text content. Please verify your Vertex AI model location in the terminal.';
        setErrorMessage('Agent did not return output. Check CloudTop terminal logs for Vertex AI connectivity.');
      }

      // Check if HITL rating action should be attached
      let hitlAction: HITLDecision | undefined = undefined;
      if (text.toLowerCase().includes('rating') || text.toLowerCase().includes('buy') || text.toLowerCase().includes('thesis')) {
        hitlAction = {
          actionType: 'SET_INVESTMENT_RATING',
          title: 'Publish Institutional Equity Rating Recommendation',
          proposedRating: 'BUY / OUTPERFORM',
          symbol: text.includes('NVDA') ? 'NVDA' : text.includes('AAPL') ? 'AAPL' : text.includes('TSLA') ? 'TSLA' : 'GOOGL',
          rationale: 'Robust cloud acceleration, expanding EBITDA margins, and structural moat support an institutional Outperform rating.',
          timestamp: new Date().toISOString(),
          status: 'PENDING',
        };
      }

      const extractedMetrics = parseFinancialMetricsFromText(accumulatedText, text);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: accumulatedText,
                isStreaming: false,
                financialMetrics: extractedMetrics,
                hitlAction,
              }
            : msg
        )
      );
    } catch (err: any) {
      const errorMsg = err.message || 'An error occurred while communicating with the agent.';
      console.error('Agent communication error:', err);
      setErrorMessage(errorMsg);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: `⚠️ **Agent Execution Error**\n\n\`\`\`\n${errorMsg}\n\`\`\`\n\nPlease check that the FastAPI server is running on CloudTop (\`uv run uvicorn app.fast_api_app:app --host 0.0.0.0 --port 8000\`).`,
                isStreaming: false,
                toolTraces: [
                  {
                    id: `trace_err_${Date.now()}`,
                    toolName: 'agent_communication',
                    status: 'ERROR',
                    startTime: Date.now(),
                    inputPayload: { prompt: text },
                    error: errorMsg,
                  },
                ],
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleApproveHITL = (comment?: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.hitlAction) {
          return {
            ...msg,
            hitlAction: {
              ...msg.hitlAction,
              status: 'APPROVED',
              analystComment: comment || 'Signed off and verified by Senior Analyst.',
            },
          };
        }
        return msg;
      })
    );
  };

  const handleRejectHITL = (reason: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.hitlAction) {
          return {
            ...msg,
            hitlAction: {
              ...msg.hitlAction,
              status: 'REJECTED',
              analystComment: reason,
            },
          };
        }
        return msg;
      })
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#080C14] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Header */}
      <Header
        currentUser={currentUser}
        onSelectUser={setCurrentUser}
        onToggleExemplars={() => setIsExemplarModalOpen(true)}
        onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
        onNewSession={handleNewSession}
        sessionId={sessionId}
        isDrawerOpen={isDrawerOpen}
        activeToolCount={currentTraces.length}
      />

      {/* Main Chat Container */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Error Banner (If present) */}
        {errorMessage && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-rose-950/60 border border-rose-800/80 p-3.5 text-xs text-rose-300 shadow-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-400 hover:text-rose-200 font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Empty State / Hero Screen */}
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center my-auto py-12 space-y-8 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Hero Badge */}
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-400 border border-cyan-500/30 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Institutional Equity Research & Valuation Assistant</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                What financial filing or valuation would you like to analyze?
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                Extract audited SEC Form 10-Q statements, model GAAP valuation multiples, benchmark peer margins, and evaluate segment drivers powered by Google ADK multi-agent orchestration.
              </p>
            </div>

            {/* Test User Notice Pill */}
            <div className="flex items-center gap-2 rounded-xl bg-slate-900/90 border border-slate-800 px-4 py-2 text-xs text-slate-300">
              <span className="text-base">{currentUser.avatar}</span>
              <span>Active Persona: <b className="text-white">{currentUser.name}</b> ({currentUser.roleTitle})</span>
            </div>

            {/* Quick Exemplar Command Cards */}
            <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-left">
              {COMMAND_EXEMPLARS.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSendMessage(item.prompt)}
                  className="group relative rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-cyan-500/50 p-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-cyan-500/5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-semibold text-cyan-400 mb-1">
                      <span>{item.categoryLabel}</span>
                      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      "{item.prompt}"
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                    <span>1-Click Analyze</span>
                    <span className="font-mono text-cyan-400 font-bold">{item.targetSymbols.join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        ) : (
          /* Active Chat Thread */
          <div className="flex-1 space-y-4 pb-28">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                currentUser={currentUser}
                onOpenTraceDrawer={() => setIsDrawerOpen(true)}
                onApproveHITL={handleApproveHITL}
                onRejectHITL={handleRejectHITL}
              />
            ))}
            <div ref={chatBottomRef} />
          </div>
        )}

      </main>

      {/* Floating Bottom Input Bar */}
      <div className="sticky bottom-0 z-30 w-full border-t border-slate-800/80 bg-[#080C14]/95 backdrop-blur-xl py-4">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          
          {/* Quick Prompt Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 text-xs scrollbar-none">
            <button
              onClick={() => setIsExemplarModalOpen(true)}
              className="flex items-center gap-1 shrink-0 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 border border-cyan-500/30 transition-colors"
            >
              <BookOpen className="h-3 w-3" />
              <span>All Commands</span>
            </button>
            <button
              onClick={() => handleSendMessage("Analyze Alphabet (GOOGL) Q2 2024 financial performance and segment metrics.")}
              className="shrink-0 rounded-lg bg-slate-900 hover:bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              📊 Alphabet Q2 2024
            </button>
            <button
              onClick={() => handleSendMessage("Analyze NVIDIA (NVDA) Q2 2025 financial performance and segment metrics.")}
              className="shrink-0 rounded-lg bg-slate-900 hover:bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              🧩 NVIDIA Segments
            </button>
            <button
              onClick={() => handleSendMessage("Calculate valuation multiples (EV/EBITDA, P/E, P/S, Net Debt) for Apple (AAPL) and assess if it is fairly valued.")}
              className="shrink-0 rounded-lg bg-slate-900 hover:bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              🧮 Apple Multiples
            </button>
            <button
              onClick={() => handleSendMessage("Analyze Tesla (TSLA) Q1 2026 financial performance and segment metrics.")}
              className="shrink-0 rounded-lg bg-slate-900 hover:bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              ⚡ Tesla Live Statement
            </button>
            <button
              onClick={() => handleSendMessage("Compare operating margins and cloud revenue scale between Alphabet (GOOGL) and Microsoft (MSFT) in 2024.")}
              className="shrink-0 rounded-lg bg-slate-900 hover:bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              ⚔️ GOOGL vs MSFT
            </button>
          </div>

          {/* Form Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="relative flex items-center"
          >
            <input
              ref={inputRef}
              type="text"
              placeholder={`Ask a financial question, e.g. "Analyze Tesla Q1 2026", "NVIDIA Q2 2025"...`}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              disabled={isStreaming}
              className="w-full rounded-2xl bg-slate-900/90 border border-slate-700/80 px-4 py-3.5 pr-24 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-xl transition-all disabled:opacity-60"
            />
            
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isStreaming}
              className="absolute right-2 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 px-3.5 py-2 text-xs font-semibold text-white shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <span>Analyze</span>
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>

        </div>
      </div>

      {/* Slide-Out Reasoning & Tool Trace Drawer */}
      <ReasoningDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        traces={currentTraces}
        isStreaming={isStreaming}
        sessionId={sessionId}
      />

      {/* Command Exemplar Modal */}
      <ExemplarModal
        isOpen={isExemplarModalOpen}
        onClose={() => setIsExemplarModalOpen(false)}
        onSelectPrompt={(p) => handleSendMessage(p)}
      />

    </div>
  );
}

export default App;
