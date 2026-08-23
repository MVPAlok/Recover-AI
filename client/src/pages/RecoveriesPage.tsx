import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, AlertTriangle, RotateCcw } from 'lucide-react';
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
  const needsAttention = searchParams.get('needsAttention') === 'true';

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
        needsAttention: needsAttention || undefined,
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
  }, [page, status, actionType, search, needsAttention]);

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
            Needs Attention (Stuck &gt;30m)
          </button>
          <div className="text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg shrink-0">
            Showing <span className="text-white">{recoveries.length}</span> of <span className="text-white">{total}</span> total
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          {[
            { label: 'All Statuses', val: '' },
            { label: 'Executed', val: 'SUCCESS' },
            { label: 'Pending / In Progress', val: 'PENDING' },
            { label: 'Failed', val: 'FAILED' },
            { label: 'Cancelled', val: 'CANCELLED' },
          ].map((tab) => (
            <button
              key={tab.val}
              onClick={() => handleFilterChange('status', tab.val)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                status === tab.val
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action Type Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <select
            value={actionType}
            onChange={(e) => handleFilterChange('actionType', e.target.value)}
            aria-label="Filter by Policy Action Type"
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Action Types</option>
            <option value="RETRY">RETRY</option>
            <option value="REMIND">REMIND</option>
            <option value="ESCALATE">ESCALATE</option>
            <option value="WAIT">WAIT</option>
            <option value="STOP">STOP</option>
          </select>

          {(status || actionType || search || needsAttention) && (
            <button
              onClick={() => setSearchParams(new URLSearchParams())}
              className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 ml-2"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : error ? (
        <ErrorBanner message={error} onRetry={loadRecoveries} />
      ) : recoveries.length === 0 ? (
        <EmptyState
          title="No Recovery Records Found"
          description="No recovery executions match the active filter criteria."
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Attempt ID</th>
                  <th className="py-3.5 px-4">Tx ID / Customer</th>
                  <th className="py-3.5 px-4">Policy Action</th>
                  <th className="py-3.5 px-4">Execution Status</th>
                  <th className="py-3.5 px-4">Verified Recovered</th>
                  <th className="py-3.5 px-4">Executed At</th>
                  <th className="py-3.5 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {recoveries.map((rec) => (
                  <tr
                    key={rec.id}
                    onClick={() => navigate(`/transactions/${rec.transactionId}`)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-200">
                      {rec.id.slice(0, 12)}...
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-indigo-300">{rec.transactionId}</div>
                      <div className="text-[11px] text-slate-400">{rec.customerName}</div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge type="decision" value={rec.actionType} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge type="execution" value={rec.status} />
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {rec.amountRecovered > 0 ? (
                        <span className="text-emerald-400">{formatINR(rec.amountRecovered)}</span>
                      ) : (
                        <span className="text-slate-500">₹0 (Pending Webhook)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {rec.executedAt ? new Date(rec.executedAt).toLocaleString() : 'Pending'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/transactions/${rec.transactionId}`);
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
