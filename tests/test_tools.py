# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Unit tests for tool functions, schema validation, and guided error handling."""

import pytest
from app.tools import (
    calculate_valuation_multiples,
    fetch_company_earnings_news,
    fetch_stock_quote_metrics,
    retrieve_sec_filings_data,
)


def test_fetch_stock_quote_metrics_success():
    """Verify fetch_stock_quote_metrics returns valid structure for GOOGL."""
    res = fetch_stock_quote_metrics("GOOGL")
    assert res["status"] == "SUCCESS"
    assert res["symbol"] == "GOOGL"
    assert "current_price" in res
    assert "market_cap" in res


def test_fetch_stock_quote_metrics_invalid_ticker():
    """Verify guided recovery is provided when an invalid ticker is supplied."""
    res = fetch_stock_quote_metrics("NONEXISTENTTICKER999")
    assert res["status"] == "ERROR"
    assert "recovery_hint" in res
    assert "RECOVERY INSTRUCTION" in res["recovery_hint"]


def test_calculate_valuation_multiples_success():
    """Verify precision calculations of valuation multiples."""
    res = calculate_valuation_multiples(
        symbol="GOOGL",
        market_cap=2000000000000.0,
        net_income=80000000000.0,
        revenue=300000000000.0,
        ebitda=100000000000.0,
        total_debt=30000000000.0,
        cash_and_equivalents=100000000000.0,
    )
    assert res["status"] == "SUCCESS"
    assert res["enterprise_value_usd"] == 1930000000000.0  # 2000B + 30B - 100B
    assert res["pe_ratio"] == 25.0  # 2000B / 80B
    assert res["ev_to_ebitda"] == 19.3  # 1930B / 100B
    assert res["ps_ratio"] == 6.67


def test_calculate_valuation_multiples_invalid_input():
    """Verify guided recovery when negative market cap is provided."""
    res = calculate_valuation_multiples(
        symbol="GOOGL",
        market_cap=-100.0,
        net_income=50.0,
        revenue=100.0,
        ebitda=20.0,
    )
    assert res["status"] == "ERROR"
    assert "recovery_hint" in res
    assert "RECOVERY INSTRUCTION" in res["recovery_hint"]


def test_retrieve_sec_filings_data_ground_truth():
    """Verify retrieval of ground truth filing records for GOOGL Q2 2024."""
    res = retrieve_sec_filings_data(
        symbol="GOOGL",
        filing_type="10-Q",
        fiscal_year=2024,
        fiscal_quarter=2,
    )
    assert res["status"] == "SUCCESS"
    assert res["symbol"] == "GOOGL"
    assert res["total_revenue_usd"] == 84742000000.0
    assert res["operating_income_usd"] == 27425000000.0
    assert "Google Cloud" in res["segment_breakdown"]


def test_retrieve_sec_filings_data_missing_quarter():
    """Verify error recovery when 10-Q is queried without fiscal quarter."""
    res = retrieve_sec_filings_data(
        symbol="GOOGL",
        filing_type="10-Q",
        fiscal_year=2024,
        fiscal_quarter=None,
    )
    assert res["status"] == "ERROR"
    assert res["error_type"] == "MISSING_QUARTER_PARAMETER"
    assert "recovery_hint" in res


def test_fetch_company_earnings_news():
    """Verify news extraction returns structured articles."""
    res = fetch_company_earnings_news("GOOGL", max_articles=2)
    assert res["status"] == "SUCCESS"
    assert "articles" in res
    assert len(res["articles"]) >= 1


def test_retrieve_sec_filings_cache():
    """Verify local cache miss and hit for SEC filings."""
    # First call populates cache
    res1 = retrieve_sec_filings_data(symbol="TSLA", filing_type="10-Q", fiscal_year=2026, fiscal_quarter=1)
    assert res1["status"] == "SUCCESS"
    
    # Second call returns from LOCAL_DISK_CACHE
    res2 = retrieve_sec_filings_data(symbol="TSLA", filing_type="10-Q", fiscal_year=2026, fiscal_quarter=1)
    assert res2["status"] == "SUCCESS"
    assert res2.get("data_source") == "LOCAL_DISK_CACHE"


def test_retrieve_sec_filings_data_fallback_recovery(monkeypatch):
    """Verify live quote fallback when dynamic statement parsing encounters exceptions."""
    import yfinance as yf
    
    def mock_ticker_error(*args, **kwargs):
        raise RuntimeError("Simulated network API timeout")
        
    monkeypatch.setattr(yf, "Ticker", mock_ticker_error)
    
    # Should catch exception and gracefully recover via live quote fallback
    res = retrieve_sec_filings_data(symbol="GOOGL", filing_type="10-Q", fiscal_year=2028, fiscal_quarter=1)
    assert res["status"] == "SUCCESS"
    assert res.get("data_source") == "LIVE_QUOTE_FALLBACK"
    assert "notes" in res


