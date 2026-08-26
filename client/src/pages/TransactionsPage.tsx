import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { fetchTransactions } from '../services/api';
import { TransactionSummary } from '../types';
import { SectionTag } from '../components/system/SectionTag';
import { SystemPanel } from '../components/system/SystemPanel';
import { StatusIndicator } from '../components/system/StatusIndicator';
import { formatINR } from '../components/ui/MetricCard';
import { TableSkeleton } from '../components/ui/Skeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { EmptyState } from '../components/ui/EmptyState';

export const TransactionsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<TransactionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Search & Filter state
  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const paymentStatus = searchParams.get('paymentStatus') || '';
  const recoveryStatus = searchParams.get('recoveryStatus') || '';
  const needsAttention = searchParams.get('needsAttention') === 'true';
  const decision = searchParams.get('decision') || '';
  const risk = searchParams.get('risk') || '';

  const [searchInput, setSearchInput] = useState(search);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTransactions({
        page,
        limit: 20,
        search: search || undefined,
        status: status || undefined,
        paymentStatus: paymentStatus || undefined,
        recoveryStatus: recoveryStatus || undefined,
        needsAttention: needsAttention || undefined,
        decision: decision || undefined,
        risk: risk || undefined,
      });
      setTransactions(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch transactions';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [page, search, status, paymentStatus, recoveryStatus, needsAttention, decision, risk]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchInput) {
      newParams.set('search', searchInput);
    } else {
      newParams.delete('search');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const toggleNeedsAttention = () => {
    const newParams = new URLSearchParams(searchParams);
    if (needsAttention) {
      newParams.delete('needsAttention');
    } else {
      newParams.set('needsAttention', 'true');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header Hierarchy with 32px Spacing */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionTag label="02 / TRANSACTION LEDGER" />
          <div className="flex items-center gap-3">
            <button
              onClick={toggleNeedsAttention}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono transition-all ${
                needsAttention
                  ? 'border border-tertiary/50 bg-tertiary/10 text-tertiary font-bold shadow-[0_0_10px_rgba(249,188,69,0.2)]'
                  : 'border border-white/10 bg-surface/50 text-on-surface-variant hover:text-white'
              }`}
            >
              <span>●</span>
              Needs Attention
            </button>
            <div className="text-xs font-mono text-on-surface-variant/70 bg-surface/50 border border-white/10 px-3 py-1.5 rounded">
              TOTAL: <span className="text-white font-bold">{total}</span>
            </div>
          </div>
        </div>

        <div>
          <h1 className="text-3xl sm:text-5xl font-bold font-geist text-on-surface tracking-tight">
            TRANSACTION EXPLORER
          </h1>
          <p className="text-xs sm:text-sm font-geist text-on-surface-variant/80 max-w-2xl mt-2 leading-relaxed">
            Search and inspect payment failures, AI root-cause decisions, and cryptographic recovery outcomes.
          </p>
        </div>
      </div>

      {/* 2. Compressed Filter Toolbar (Surface 1) */}
      <SystemPanel borderVariant="subtle" className="p-4 sm:p-5 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-on-surface-variant/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Transaction ID, Customer Name, Email, or Failure Code..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-surface/50 border border-white/10 rounded pl-9 pr-3 py-2 text-xs font-mono text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-surface-dim font-bold text-xs uppercase font-mono tracking-wider rounded transition-all"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
          <select
            value={status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            aria-label="Filter by Status"
            className="bg-surface/50 border border-white/10 text-on-surface rounded px-2.5 py-1.5 focus:outline-none focus:border-primary text-xs"
          >
            <option value="" className="bg-[#070B17] text-white">All Statuses</option>
            <option value="FAILED" className="bg-[#070B17] text-white">Failed Only</option>
            <option value="SUCCESS" className="bg-[#070B17] text-white">Success Only</option>
          </select>

          <select
            value={paymentStatus}
            onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
            aria-label="Filter by Payment State"
            className="bg-surface/50 border border-white/10 text-on-surface rounded px-2.5 py-1.5 focus:outline-none focus:border-primary text-xs"
          >
            <option value="" className="bg-[#070B17] text-white">All Payment States</option>
            <option value="CAPTURED" className="bg-[#070B17] text-white">Captured</option>
            <option value="AUTHORIZED" className="bg-[#070B17] text-white">Authorized</option>
            <option value="UNPAID" className="bg-[#070B17] text-white">Unpaid</option>
            <option value="FAILED" className="bg-[#070B17] text-white">Failed</option>
          </select>

          <select
            value={recoveryStatus}
            onChange={(e) => handleFilterChange('recoveryStatus', e.target.value)}
            aria-label="Filter by Recovery State"
            className="bg-surface/50 border border-white/10 text-on-surface rounded px-2.5 py-1.5 focus:outline-none focus:border-primary text-xs"
          >
            <option value="" className="bg-[#070B17] text-white">All Recovery States</option>
            <option value="RECOVERED" className="bg-[#070B17] text-white">Recovered</option>
            <option value="IN_PROGRESS" className="bg-[#070B17] text-white">In Progress</option>
            <option value="REQUIRES_REVIEW" className="bg-[#070B17] text-white">Requires Review</option>
            <option value="NOT_STARTED" className="bg-[#070B17] text-white">Not Started</option>
          </select>

          <select
            value={decision}
            onChange={(e) => handleFilterChange('decision', e.target.value)}
            aria-label="Filter by AI Policy"
            className="bg-surface/50 border border-white/10 text-on-surface rounded px-2.5 py-1.5 focus:outline-none focus:border-primary text-xs"
          >
            <option value="" className="bg-[#070B17] text-white">All AI Decisions</option>
            <option value="RETRY" className="bg-[#070B17] text-white">RETRY</option>
            <option value="REMIND" className="bg-[#070B17] text-white">REMIND</option>
            <option value="ESCALATE" className="bg-[#070B17] text-white">ESCALATE</option>
            <option value="WAIT" className="bg-[#070B17] text-white">WAIT</option>
            <option value="STOP" className="bg-[#070B17] text-white">STOP</option>
          </select>

          {(status || paymentStatus || recoveryStatus || decision || risk || search || needsAttention) && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-xs text-error hover:underline ml-auto"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filters
            </button>
          )}
        </div>
      </SystemPanel>

      {/* 3. Main Financial Ledger Table (16px Row Spacing, Clickable Rows) */}
      {loading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : error ? (
        <ErrorBanner message={error} onRetry={loadTransactions} />
      ) : transactions.length === 0 ? (
        <EmptyState
          title="No Transactions Found"
          description="Try broadening your search query or reset the active filter settings."
        />
      ) : (
        <div className="bg-surface-container-high/80 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface/80 text-on-surface-variant/70 border-b border-white/10 text-[10px] uppercase font-mono font-bold tracking-wider">
                <tr>
                  <th className="py-4 px-5">TX ID</th>
                  <th className="py-4 px-5">CUSTOMER</th>
                  <th className="py-4 px-5">AMOUNT</th>
                  <th className="py-4 px-5">STATUS / PAYMENT</th>
                  <th className="py-4 px-5">RECOVERY STATE</th>
                  <th className="py-4 px-5">FAILURE CODE</th>
                  <th className="py-4 px-5">AI DECISION</th>
                  <th className="py-4 px-5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-on-surface-variant">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => navigate(`/transactions/${tx.id}`)}
                    className="hover:bg-surface/50 cursor-pointer transition-colors group"
                  >
                    <td className="py-4 px-5 font-mono font-bold text-white group-hover:text-primary">
                      {tx.id}
                    </td>
                    <td className="py-4 px-5">
                      <div className="text-white font-semibold font-geist">{tx.customerName}</div>
                      <div className="text-[10px] font-mono text-on-surface-variant/60">{tx.customerEmail}</div>
                    </td>
                    <td className="py-4 px-5 font-mono font-bold text-white">
                      {formatINR(tx.amount)}
                    </td>
                    <td className="py-4 px-5 font-mono">
                      <div className="flex items-center gap-1.5">
                        <StatusIndicator
                          status={tx.status === 'SUCCESS' ? 'OPERATIONAL' : 'FAILED'}
                          label={tx.status}
                        />
                        {tx.paymentStatus && (
                          <span className="text-[10px] text-on-surface-variant/60">
                            ({tx.paymentStatus})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-5 font-mono">
                      <StatusIndicator
                        status={
                          tx.recoveryStatus === 'RECOVERED' || tx.status === 'SUCCESS'
                            ? 'RECOVERED'
                            : tx.recoveryStatus === 'IN_PROGRESS'
                            ? 'EXECUTING'
                            : 'WARNING'
                        }
                        label={tx.recoveryStatus || (tx.status === 'SUCCESS' ? 'RECOVERED' : 'NOT STARTED')}
                      />
                    </td>
                    <td className="py-4 px-5 font-mono text-[11px]">
                      {tx.failureCode || '—'}
                    </td>
                    <td className="py-4 px-5 font-mono">
                      {tx.decision ? (
                        <span className="text-primary font-bold text-[10px] bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                          {tx.decision}
                        </span>
                      ) : (
                        <span className="text-on-surface-variant/40">—</span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-right font-mono">
                      <span className="text-[10px] text-primary group-hover:underline font-bold">
                        INSPECT &rarr;
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/10 text-xs font-mono text-on-surface-variant/70 bg-surface/40">
            <div>
              PAGE <span className="font-bold text-white">{page}</span> OF <span className="font-bold text-white">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => handleFilterChange('page', (page - 1).toString())}
                className="p-1.5 rounded bg-surface/50 hover:bg-surface/80 disabled:opacity-30 text-white border border-white/10 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => handleFilterChange('page', (page + 1).toString())}
                className="p-1.5 rounded bg-surface/50 hover:bg-surface/80 disabled:opacity-30 text-white border border-white/10 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
