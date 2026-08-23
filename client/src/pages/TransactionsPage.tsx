import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Transaction Explorer
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Search and inspect all customer payment transactions, failure causes, and recovery states.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleNeedsAttention}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              needsAttention
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Needs Attention
          </button>
          <div className="text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg shrink-0">
            Showing <span className="text-white">{transactions.length}</span> of <span className="text-white">{total}</span> total
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Transaction ID, Customer Name, Email, or Failure Code..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            aria-label="Filter by Transaction Status"
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="FAILED">Failed Only</option>
            <option value="SUCCESS">Success Only</option>
          </select>

          {/* Payment Status Filter */}
          <select
            value={paymentStatus}
            onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
            aria-label="Filter by Payment Status"
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Payment States</option>
            <option value="CAPTURED">Captured</option>
            <option value="AUTHORIZED">Authorized</option>
            <option value="UNPAID">Unpaid</option>
            <option value="FAILED">Failed</option>
          </select>

          {/* Recovery Status Filter */}
          <select
            value={recoveryStatus}
            onChange={(e) => handleFilterChange('recoveryStatus', e.target.value)}
            aria-label="Filter by Recovery Status"
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Recovery States</option>
            <option value="RECOVERED">Recovered</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="REQUIRES_REVIEW">Requires Review</option>
            <option value="NOT_STARTED">Not Started</option>
          </select>

          {/* Decision Filter */}
          <select
            value={decision}
            onChange={(e) => handleFilterChange('decision', e.target.value)}
            aria-label="Filter by AI Policy Decision"
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All AI Decisions</option>
            <option value="RETRY">RETRY</option>
            <option value="REMIND">REMIND</option>
            <option value="ESCALATE">ESCALATE</option>
            <option value="WAIT">WAIT</option>
            <option value="STOP">STOP</option>
          </select>

          {/* Reset Filters */}
          {(status || paymentStatus || recoveryStatus || decision || risk || search || needsAttention) && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 ml-auto transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
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
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Tx ID</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Status / Payment</th>
                  <th className="py-3.5 px-4">Recovery State</th>
                  <th className="py-3.5 px-4">Failure Code</th>
                  <th className="py-3.5 px-4">AI Decision</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => navigate(`/transactions/${tx.id}`)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-200">
                      {tx.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{tx.customerName}</div>
                      <div className="text-[11px] text-slate-400">{tx.customerEmail}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {formatINR(tx.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusBadge type="transaction" value={tx.status} />
                        {tx.paymentStatus && <StatusBadge type="payment" value={tx.paymentStatus} />}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        type="recoveryState"
                        value={tx.recoveryStatus || (tx.status === 'SUCCESS' ? 'RECOVERED' : 'NOT_STARTED')}
                      />
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {tx.failureCode || '—'}
                    </td>
                    <td className="py-3 px-4">
                      {tx.decision ? (
                        <StatusBadge type="decision" value={tx.decision} />
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/transactions/${tx.id}`);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-400 bg-slate-950/40">
            <div>
              Page <span className="font-semibold text-white">{page}</span> of{' '}
              <span className="font-semibold text-white">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => handleFilterChange('page', (page - 1).toString())}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => handleFilterChange('page', (page + 1).toString())}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 transition-colors"
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
