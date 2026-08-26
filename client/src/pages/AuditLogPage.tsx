import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchAuditLogs } from '../services/api';
import { AuditLogItem } from '../types';
import { SectionTag } from '../components/system/SectionTag';
import { SystemPanel } from '../components/system/SystemPanel';
import { StatusIndicator } from '../components/system/StatusIndicator';
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
    <div className="space-y-6 pb-12 font-mono">
      {/* Header: 05 / AUDIT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <SectionTag label="05 / AUDIT" />
            <StatusIndicator status="VERIFIED" label="IMMUTABLE LEDGER STREAM" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold font-geist text-on-surface tracking-tight">
            SYSTEM AUDIT LOG
          </h1>
          <p className="text-xs text-on-surface-variant/80 max-w-2xl leading-relaxed">
            Immutable chronological record of all AI decisions, webhook receptions, and execution actions.
          </p>
        </div>

        <div className="text-xs text-on-surface-variant/70 bg-surface/50 border border-white/10 px-3 py-2 rounded">
          TOTAL: <span className="text-white font-bold">{total}</span>
        </div>
      </div>

      {/* Filter System Panel */}
      <SystemPanel borderVariant="subtle" className="p-4 sm:p-5 flex flex-wrap items-center gap-3">
        <select
          value={entityType}
          onChange={(e) => handleFilterChange('entityType', e.target.value)}
          aria-label="Filter by Entity Type"
          className="bg-surface/50 border border-white/10 text-on-surface rounded px-3 py-2 text-xs focus:outline-none focus:border-primary"
        >
          <option value="" className="bg-[#070B17] text-white">All Entities</option>
          <option value="TRANSACTION" className="bg-[#070B17] text-white">TRANSACTION</option>
          <option value="AI_DECISION" className="bg-[#070B17] text-white">AI_DECISION</option>
          <option value="RECOVERY_ATTEMPT" className="bg-[#070B17] text-white">RECOVERY_ATTEMPT</option>
          <option value="WEBHOOK" className="bg-[#070B17] text-white">WEBHOOK</option>
        </select>

        {transactionId && (
          <button
            onClick={() => handleFilterChange('transactionId', '')}
            className="px-2.5 py-1.5 rounded bg-primary/10 border border-primary/30 text-primary text-xs"
          >
            Filtered by Tx: {transactionId.slice(0, 10)}... (Clear)
          </button>
        )}
      </SystemPanel>

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
        <div className="bg-surface-container-high/80 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface/80 text-on-surface-variant/70 border-b border-white/10 text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">TIMESTAMP</th>
                  <th className="py-3.5 px-4">ACTION</th>
                  <th className="py-3.5 px-4">ENTITY TYPE</th>
                  <th className="py-3.5 px-4">ACTOR</th>
                  <th className="py-3.5 px-4">DETAILS</th>
                  <th className="py-3.5 px-4 text-right">TRANSACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-on-surface-variant">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface/50 transition-colors group">
                    <td className="py-3.5 px-4 text-on-surface-variant/60 text-[11px]">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white group-hover:text-primary">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20">
                        {log.entityType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-on-surface font-semibold text-[11px]">
                      {log.actor || 'SYSTEM'}
                    </td>
                    <td className="py-3.5 px-4 text-on-surface-variant/60 max-w-xs truncate text-[11px]">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {log.transaction?.id ? (
                        <button
                          onClick={() => navigate(`/transactions/${log.transaction!.id}`)}
                          className="text-[10px] text-primary hover:text-white border border-primary/30 hover:bg-primary hover:text-surface-dim px-2.5 py-1 rounded transition-all font-bold"
                        >
                          INSPECT &rarr;
                        </button>
                      ) : (
                        <span className="text-on-surface-variant/40">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 text-xs text-on-surface-variant/70 bg-surface/40">
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
