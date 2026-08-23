import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { fetchTransactions } from '../services/api';
import { TransactionSummary } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
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
  }, [page, search, status, decision, risk]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Transaction Explorer</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Search and inspect all customer payment transactions, failure causes, and recovery states.
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg shrink-0">
          Showing <span className="text-white">{transactions.length}</span> of <span className="text-white">{total}</span> total
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by ID, customer name, email, or failure code..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </form>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="FAILED">Failed</option>
              <option value="SUCCESS">Success</option>
              <option value="PENDING">Pending</option>
            </select>

            {/* Decision Filter */}
            <select
              value={decision}
              onChange={(e) => handleFilterChange('decision', e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All AI Decisions</option>
              <option value="RETRY">RETRY</option>
              <option value="REMIND">REMIND</option>
              <option value="ESCALATE">ESCALATE</option>
              <option value="WAIT">WAIT</option>
              <option value="STOP">STOP</option>
            </select>

            {/* Clear Filters Button */}
            {(search || status || decision || risk) && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setSearchParams({});
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Table / Error / Loading */}
      {loading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : error ? (
        <ErrorBanner message={error} onRetry={loadTransactions} />
      ) : transactions.length === 0 ? (
        <EmptyState
          title="No Transactions Match Your Filters"
          description="Try broadening your search term or clearing the active filters."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchInput('');
            setSearchParams({});
          }}
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Transaction ID</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Failure Reason</th>
                  <th className="py-3.5 px-4">Recovery Likelihood</th>
                  <th className="py-3.5 px-4">AI Decision</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => navigate(`/transactions/${tx.id}`)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {tx.id.slice(0, 12)}...
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{tx.customerName}</div>
                      <div className="text-[11px] text-slate-400">{tx.customerEmail}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {formatINR(tx.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge type="transaction" value={tx.status} />
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-400">
                      {tx.failureReason || tx.failureCode || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{tx.recoveryProbability}%</span>
                        <StatusBadge type="risk" value={tx.riskLevel} />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {tx.decision ? (
                        <StatusBadge type="decision" value={tx.decision} />
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                        View <ArrowRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (<1024px) */}
          <div className="lg:hidden divide-y divide-slate-800/80">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                onClick={() => navigate(`/transactions/${tx.id}`)}
                className="p-4 hover:bg-slate-800/40 cursor-pointer transition-colors space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-base font-bold text-white block">{formatINR(tx.amount)}</span>
                    <span className="text-[11px] font-mono text-slate-400">{tx.id.slice(0, 16)}...</span>
                  </div>
                  <StatusBadge type="transaction" value={tx.status} />
                </div>

                <div className="text-xs text-slate-300">
                  <div className="font-semibold text-slate-200">{tx.customerName}</div>
                  <div className="text-slate-400 text-[11px]">{tx.customerEmail}</div>
                </div>

                {tx.failureReason && (
                  <div className="bg-slate-950/80 rounded p-2 text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">Failure: </span>
                    {tx.failureReason}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-400">{tx.recoveryProbability}%</span>
                    {tx.decision && <StatusBadge type="decision" value={tx.decision} />}
                  </div>
                  <span className="text-indigo-400 font-semibold flex items-center gap-1">
                    Details <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-slate-950/60 px-4 py-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Page <span className="font-bold text-white">{page}</span> of <span className="font-bold text-white">{totalPages}</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => handleFilterChange('page', (page - 1).toString())}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => handleFilterChange('page', (page + 1).toString())}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
