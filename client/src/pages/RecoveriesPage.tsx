import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchRecoveries } from '../services/api';
import { RecoverySummary } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatINR } from '../components/ui/MetricCard';
import { TableSkeleton } from '../components/ui/Skeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { EmptyState } from '../components/ui/EmptyState';

export const RecoveriesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [recoveries, setRecoveries] = useState<RecoverySummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const status = searchParams.get('status') || '';
  const actionType = searchParams.get('actionType') || '';
  const search = searchParams.get('search') || '';

  const loadRecoveries = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchRecoveries({
        page,
        limit: 20,
        status: status || undefined,
        actionType: actionType || undefined,
        search: search || undefined,
      });
      setRecoveries(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch recoveries';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecoveries();
  }, [page, status, actionType, search]);

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
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Recovery Center</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Real-time tracking of recovery attempts dispatched to Razorpay Test Mode and simulation providers.
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg shrink-0">
          Showing <span className="text-white">{recoveries.length}</span> of <span className="text-white">{total}</span> total
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: 'All Attempts', value: '' },
            { label: 'Successful', value: 'SUCCESS' },
            { label: 'Executed', value: 'EXECUTED' },
            { label: 'Pending', value: 'PENDING' },
            { label: 'Failed', value: 'FAILED' },
            { label: 'Cancelled', value: 'CANCELLED' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleFilterChange('status', tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                status === tab.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action Type Filter */}
        <select
          value={actionType}
          onChange={(e) => handleFilterChange('actionType', e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Action Types</option>
          <option value="RETRY">RETRY</option>
          <option value="REMIND">REMIND</option>
          <option value="ESCALATE">ESCALATE</option>
          <option value="WAIT">WAIT</option>
          <option value="STOP">STOP</option>
        </select>
      </div>

      {/* Table Content */}
      {loading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : error ? (
        <ErrorBanner message={error} onRetry={loadRecoveries} />
      ) : recoveries.length === 0 ? (
        <EmptyState
          title="No Recovery Attempts Found"
          description="There are no recovery execution attempts recorded matching the current filter."
          actionLabel="Clear Filters"
          onAction={() => setSearchParams({})}
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Attempt ID</th>
                  <th className="py-3.5 px-4">Transaction / Customer</th>
                  <th className="py-3.5 px-4">Action Type</th>
                  <th className="py-3.5 px-4">Execution Status</th>
                  <th className="py-3.5 px-4">Amount Recovered</th>
                  <th className="py-3.5 px-4">Executed At</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {recoveries.map((att) => (
                  <tr
                    key={att.id}
                    onClick={() => navigate(`/transactions/${att.transactionId}`)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {att.id.slice(0, 12)}...
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{att.customerName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {formatINR(att.amount)} • {att.transactionId.slice(0, 10)}...
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge type="decision" value={att.actionType} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge type="recovery" value={att.status} />
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-400">
                      {att.amountRecovered > 0 ? formatINR(att.amountRecovered) : '₹0'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {att.executedAt ? new Date(att.executedAt).toLocaleString() : 'Pending'}
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
