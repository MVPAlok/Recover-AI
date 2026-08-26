import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { fetchRecoveries } from '../services/api';
import { RecoverySummary } from '../types';
import { SectionTag } from '../components/system/SectionTag';
import { SystemPanel } from '../components/system/SystemPanel';
import { StatusIndicator } from '../components/system/StatusIndicator';
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
    <div className="space-y-6 pb-12 font-mono">
      {/* Header: 03 / EXECUTION PIPELINE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <SectionTag label="03 / EXECUTION PIPELINE" />
            <StatusIndicator status="OPERATIONAL" label="DISPATCH WORKERS READY" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold font-geist text-on-surface tracking-tight">
            RECOVERY CENTER
          </h1>
          <p className="text-xs text-on-surface-variant/80 max-w-2xl leading-relaxed">
            Real-time execution log of autonomous recovery attempts dispatched to Razorpay Test Mode and SMS/email channels.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleNeedsAttention}
            className={`flex items-center gap-2 px-3 py-2 rounded text-xs transition-all ${
              needsAttention
                ? 'border border-tertiary/50 bg-tertiary/10 text-tertiary font-bold shadow-[0_0_10px_rgba(249,188,69,0.2)]'
                : 'border border-white/10 bg-surface/50 text-on-surface-variant hover:text-white'
            }`}
          >
            <span>●</span>
            Needs Attention (&gt;30m)
          </button>
          <div className="text-xs text-on-surface-variant/70 bg-surface/50 border border-white/10 px-3 py-2 rounded">
            TOTAL: <span className="text-white font-bold">{total}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs System Panel */}
      <SystemPanel borderVariant="subtle" className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { label: 'ALL', val: '' },
            { label: 'EXECUTED', val: 'SUCCESS' },
            { label: 'PENDING', val: 'PENDING' },
            { label: 'FAILED', val: 'FAILED' },
            { label: 'CANCELLED', val: 'CANCELLED' },
          ].map((tab) => (
            <button
              key={tab.val}
              onClick={() => handleFilterChange('status', tab.val)}
              className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                status === tab.val
                  ? 'bg-primary/20 text-primary border border-primary/40'
                  : 'text-on-surface-variant/70 hover:text-white hover:bg-surface/50 border border-transparent'
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
            aria-label="Filter by Policy Action"
            className="bg-surface/50 border border-white/10 text-on-surface rounded px-2.5 py-1.5 focus:outline-none focus:border-primary text-xs"
          >
            <option value="" className="bg-[#070B17] text-white">All Action Types</option>
            <option value="RETRY" className="bg-[#070B17] text-white">RETRY</option>
            <option value="REMIND" className="bg-[#070B17] text-white">REMIND</option>
            <option value="ESCALATE" className="bg-[#070B17] text-white">ESCALATE</option>
            <option value="WAIT" className="bg-[#070B17] text-white">WAIT</option>
            <option value="STOP" className="bg-[#070B17] text-white">STOP</option>
          </select>

          {(status || actionType || search || needsAttention) && (
            <button
              onClick={() => setSearchParams(new URLSearchParams())}
              className="flex items-center gap-1 text-xs text-error hover:underline ml-2"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      </SystemPanel>

      {/* Main Table */}
      {loading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : error ? (
        <ErrorBanner message={error} onRetry={loadRecoveries} />
      ) : recoveries.length === 0 ? (
        <EmptyState
          title="No Recovery Attempts Found"
          description="Adjust your active filters or execute a recovery action from the Transaction Explorer."
        />
      ) : (
        <div className="bg-surface-container-high/80 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface/80 text-on-surface-variant/70 border-b border-white/10 text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">ATTEMPT ID</th>
                  <th className="py-3.5 px-4">TX ID & CUSTOMER</th>
                  <th className="py-3.5 px-4">ACTION DISPATCHED</th>
                  <th className="py-3.5 px-4">EXECUTION STATUS</th>
                  <th className="py-3.5 px-4">OUTCOME</th>
                  <th className="py-3.5 px-4">TIMESTAMP</th>
                  <th className="py-3.5 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-on-surface-variant">
                {recoveries.map((rec) => (
                  <tr
                    key={rec.id}
                    onClick={() => navigate(`/transactions/${rec.transactionId}`)}
                    className="hover:bg-surface/50 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-bold text-white group-hover:text-primary">
                      {rec.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{rec.transactionId}</div>
                      <div className="text-[10px] text-on-surface-variant/60">
                        {rec.customerName || 'Customer'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-primary font-bold text-[10px] bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                        {rec.actionType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusIndicator
                        status={
                          rec.status === 'SUCCESS'
                            ? 'OPERATIONAL'
                            : rec.status === 'PENDING'
                            ? 'EXECUTING'
                            : 'FAILED'
                        }
                        label={rec.status}
                      />
                    </td>
                    <td className="py-3.5 px-4 text-[11px]">
                      {rec.reason || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-[10px] text-on-surface-variant/60">
                      {new Date(rec.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/transactions/${rec.transactionId}`);
                        }}
                        className="text-[10px] text-primary hover:text-white border border-primary/30 hover:bg-primary hover:text-surface-dim px-2.5 py-1 rounded transition-all font-bold"
                      >
                        INSPECT &rarr;
                      </button>
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
