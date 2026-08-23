import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { fetchAuditLogs } from '../services/api';
import { AuditLogItem } from '../types';
import { TableSkeleton } from '../components/ui/Skeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { EmptyState } from '../components/ui/EmptyState';

export const AuditLogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const entityType = searchParams.get('entityType') || '';
  const action = searchParams.get('action') || '';
  const transactionId = searchParams.get('transactionId') || '';

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAuditLogs({
        page,
        limit: 30,
        entityType: entityType || undefined,
        action: action || undefined,
        transactionId: transactionId || undefined,
      });
      setLogs(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch audit logs';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [page, entityType, action, transactionId]);

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
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">System Audit Log</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Immutable chronological record of all AI decisions, webhook receptions, and execution actions.
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg shrink-0">
          Showing <span className="text-white">{logs.length}</span> of <span className="text-white">{total}</span> events
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center gap-3">
        <select
          value={entityType}
          onChange={(e) => handleFilterChange('entityType', e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Entities</option>
          <option value="TRANSACTION">TRANSACTION</option>
          <option value="AI_DECISION">AI_DECISION</option>
          <option value="RECOVERY_ATTEMPT">RECOVERY_ATTEMPT</option>
          <option value="WEBHOOK">WEBHOOK</option>
        </select>

        {transactionId && (
          <button
            onClick={() => handleFilterChange('transactionId', '')}
            className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 text-xs font-semibold"
          >
            Filtered by Tx: {transactionId.slice(0, 8)}... (Clear)
          </button>
        )}
      </div>

      {/* Content Table */}
      {loading ? (
        <TableSkeleton rows={10} cols={5} />
      ) : error ? (
        <ErrorBanner message={error} onRetry={loadAuditLogs} />
      ) : logs.length === 0 ? (
        <EmptyState
          title="No Audit Logs Found"
          description="No system activity events matched the selected filters."
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Entity Type</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Details</th>
                  <th className="py-3.5 px-4 text-right">Transaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-200">
                      {log.action}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                        {log.entityType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {log.actor || 'SYSTEM'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate font-sans text-xs">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {log.transaction?.id ? (
                        <button
                          onClick={() => navigate(`/transactions/${log.transaction!.id}`)}
                          className="inline-flex items-center gap-1 font-semibold text-indigo-400 hover:text-indigo-300"
                        >
                          View <ArrowRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
