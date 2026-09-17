import { useState, useEffect } from 'react';
import { FileText, Download, ShieldCheck, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { recyclerApi } from '../api';

export default function AuditRecords() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchTransactions = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await recyclerApi.getTransactions();
      setTransactions(data);
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setError(err.message || 'Failed to load audit records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleDownload = async (transactionId) => {
    setDownloadingId(transactionId);
    try {
      await recyclerApi.downloadCertificatePdf(transactionId);
    } catch (err) {
      alert('Certificate download failed: ' + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  // Compute metrics
  const totalVerifiedWeight = transactions.reduce((acc, t) => acc + (Number(t.verified_weight) || 0), 0);
  const totalPayout = transactions.reduce((acc, t) => acc + (Number(t.total_payout) || 0), 0);
  const disputedCount = transactions.filter(t => t.disputed || t.status === 'DISPUTED').length;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Traceability &amp; EPR Records</h1>
          <p className="text-gray-500 mt-1">Authoritative transaction certificates and verified dual-weighing records for CPCB audit.</p>
        </div>
        <button
          onClick={fetchTransactions}
          className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-3.5 py-2 rounded-xl hover:bg-gray-50 text-sm font-semibold shadow-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Records
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs uppercase font-bold text-gray-400">Total Verified Scrap</div>
            <div className="text-2xl font-black text-gray-900 mt-0.5">{totalVerifiedWeight.toFixed(1)} kg</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs uppercase font-bold text-gray-400">Total Payout Settled</div>
            <div className="text-2xl font-black text-gray-900 mt-0.5">₹{totalPayout.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs uppercase font-bold text-gray-400">Disputed Discrepancies</div>
            <div className="text-2xl font-black text-amber-600 mt-0.5">{disputedCount} Flagged</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
          {error}
        </div>
      )}

      {/* Transaction Records Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Txn ID</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Declared / Verified</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Discrepancy</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Payout</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">CPCB Certificate</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((tx) => {
              const isDisputed = tx.disputed || tx.status === 'DISPUTED';
              const isDownloading = downloadingId === tx.transaction_id;

              return (
                <tr key={tx.transaction_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-gray-900">
                    {tx.transaction_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                    {tx.timestamp ? new Date(tx.timestamp).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    }) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 inline-flex text-xs font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                      {tx.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    <span className="text-gray-400 font-medium">{tx.declared_weight} kg</span>
                    <span className="mx-1.5 text-gray-300">→</span>
                    <span className="font-bold text-gray-900">{tx.verified_weight} kg</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isDisputed ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700 border border-red-200">
                        <AlertTriangle className="w-3 h-3" />
                        {tx.discrepancy_percentage}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                        {tx.discrepancy_percentage}%
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-gray-900">
                    ₹{Number(tx.total_payout).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => handleDownload(tx.transaction_id)}
                      disabled={isDownloading}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors disabled:opacity-50 shadow-sm"
                    >
                      <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
                      {isDownloading ? 'Generating...' : 'PDF Certificate'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!loading && transactions.length === 0 && (
          <div className="text-center py-16">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-base font-semibold text-gray-900">No transactions recorded yet</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
              Completed lot handovers will automatically generate cryptographic EPR audit certificates here.
            </p>
          </div>
        )}

        {loading && (
          <div className="text-center py-16 text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-green-600" />
            <p className="text-sm font-medium">Loading authoritative audit ledgers...</p>
          </div>
        )}
      </div>
    </div>
  );
}
