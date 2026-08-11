export type UserRole = 'SENIOR_ANALYST' | 'CHIEF_INVESTMENT_OFFICER' | 'PORTFOLIO_MANAGER' | 'COMPLIANCE_OFFICER';

export interface UserProfile {
  id: string;
  name: string;
  roleTitle: string;
  role: UserRole;
  avatar: string;
  badgeColor: string;
}

export interface ToolExecutionTrace {
  id: string;
  toolName: 'retrieve_sec_filings_data' | 'fetch_stock_quote_metrics' | 'calculate_valuation_multiples' | 'fetch_company_earnings_news' | string;
  status: 'PENDING' | 'SUCCESS' | 'ERROR';
  startTime: number;
  durationMs?: number;
  inputPayload: Record<string, any>;
  outputPayload?: Record<string, any>;
  error?: string;
  recoveryHint?: string;
}

export interface FinancialMetricExtracted {
  companyName?: string;
  symbol?: string;
  period?: string;
  revenueUsd?: number;
  operatingIncomeUsd?: number;
  netIncomeUsd?: number;
  operatingMarginPct?: number;
  epsUsd?: number;
  enterpriseValueUsd?: number;
  peRatio?: number;
  psRatio?: number;
  evToEbitda?: number;
  valuationAssessment?: string;
  segments?: Record<string, number>;
  mdaHighlights?: string;
}

export interface HITLDecision {
  actionType: 'PUBLISH_RESEARCH_REPORT' | 'SET_INVESTMENT_RATING' | 'HIGH_CAPEX_APPROVAL';
  title: string;
  proposedRating: 'BUY / OUTPERFORM' | 'HOLD / NEUTRAL' | 'SELL / UNDERPERFORM';
  targetPrice?: string;
  symbol: string;
  rationale: string;
  timestamp: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  analystComment?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  toolTraces?: ToolExecutionTrace[];
  financialMetrics?: FinancialMetricExtracted;
  hitlAction?: HITLDecision;
}

export interface CommandExemplar {
  id: string;
  category: '10Q_STATEMENTS' | 'SEGMENT_BREAKDOWN' | 'VALUATION_MODELING' | 'PEER_BENCHMARK' | 'MDA_SENTIMENT' | 'HITL_APPROVAL';
  categoryLabel: string;
  iconName: string;
  title: string;
  description: string;
  prompt: string;
  expectedOutputSummary: string;
  tags: string[];
  targetSymbols: string[];
}
