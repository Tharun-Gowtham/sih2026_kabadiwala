import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QrCode, CheckCircle, AlertTriangle, FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import { recyclerApi } from '../api';

export default function ConfirmHandover() {
  const [searchParams] = useSearchParams();
  const [lotId, setLotId] = useState(searchParams.get('lotId') || '');
  const [verifiedWeight, setVerifiedWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyWarning, setVerifyWarning] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const urlLot = searchParams.get('lotId');
    if (urlLot) setLotId(urlLot);
  }, [searchParams]);

  // Check discrepancy when weight changes
  const checkDiscrepancy = async (weightVal) => {
    if (!lotId || !weightVal || isNaN(weightVal) || Number(weightVal) <= 0) {
      setVerifyWarning(null);
      return;
    }
    setVerifying(true);
    try {
      const v = await recyclerApi.verifyHandover(lotId.trim(), Number(weightVal));
      if (v.discrepancy_warning) {
        setVerifyWarning({
          percentage: v.discrepancy_percentage,
          message: v.warning_message || `Discrepancy of ${v.discrepancy_percentage}% exceeds 30% threshold.`
        });
      } else {
        setVerifyWarning(null);
      }
    } catch (err) {
      // Non-blocking verification preview
      setVerifyWarning(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleWeightChange = (e) => {
    const val = e.target.value;
    setVerifiedWeight(val);
    checkDiscrepancy(val);
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await recyclerApi.confirmHandover(
        lotId.trim(),
        Number(verifiedWeight),
        notes.trim() || undefined
      );
      setResult(data);
    } catch (err) {
      setError(err.message || 'Confirmation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCert = async () => {
    if (!result?.transaction_id) return;
    try {
      await recyclerApi.downloadCertificatePdf(result.transaction_id);
    } catch (err) {
      alert('Failed to download certificate: ' + err.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Confirm Handover</h1>
        <p className="text-gray-500 mt-1">Scan digital QR or enter authoritative Lot UUID to execute digital mass-balance verification.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {!result ? (
          <form onSubmit={handleConfirm} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Lot UUID (from Dealer QR Code)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <QrCode className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  className="pl-11 block w-full rounded-xl border-gray-300 border px-4 py-3 focus:ring-green-500 focus:border-green-500 font-mono text-sm bg-gray-50 focus:bg-white transition-colors"
                  placeholder="e.g. 8c0f1234-5678-4abc-9def-0123456789ab"
                  value={lotId}
                  onChange={(e) => setLotId(e.target.value)}
                  onBlur={() => checkDiscrepancy(verifiedWeight)}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Actual Physical Weight (Measured on Calibrated Scale)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  required
                  className="block w-full rounded-xl border-gray-300 border px-4 py-3.5 focus:ring-green-500 focus:border-green-500 text-xl font-bold font-mono"
                  placeholder="0.00"
                  value={verifiedWeight}
                  onChange={handleWeightChange}
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <span className="text-gray-500 font-semibold text-base">kg</span>
                </div>
              </div>
            </div>

            {verifyWarning && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-semibold text-yellow-900">High Weight Discrepancy Detected ({verifyWarning.percentage}%)</div>
                  <div className="text-xs text-yellow-700 mt-0.5">
                    The difference between declared and measured weight exceeds the 30% regulatory threshold. Handover remains permitted, but the transaction will be flagged for dealer verification recourse.
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Inspection & Quality Notes (Optional)
              </label>
              <textarea
                rows="2"
                className="block w-full rounded-xl border-gray-300 border px-4 py-2.5 text-sm focus:ring-green-500 focus:border-green-500"
                placeholder="e.g. Visual inspection passed; clean non-ferrous PCBs without contaminants."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center text-sm font-medium">
                <AlertTriangle className="h-5 w-5 mr-2 shrink-0 text-red-600" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !lotId || !verifiedWeight}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl shadow-md text-base font-bold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <span>Executing Atomic Handover...</span>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Verify Weight &amp; Confirm Handover</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="text-center py-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-5">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Handover Confirmed &amp; Sealed!</h2>
            <p className="text-gray-500 text-sm mb-6">
              Lot <span className="font-mono font-semibold text-gray-800">{result.lot_id.substring(0, 16)}...</span> from {result.dealer_name || 'Dealer'} has been finalized.
            </p>

            {/* Financial & Weight Summary Card */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 max-w-md mx-auto mb-8 text-left space-y-3">
              <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-2.5">
                <span className="text-gray-500 font-medium">Material Category</span>
                <span className="font-bold text-gray-900">{result.category}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-2.5">
                <span className="text-gray-500 font-medium">Verified Weight</span>
                <span className="font-bold text-green-700 font-mono text-base">{result.verified_weight} kg</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-2.5">
                <span className="text-gray-500 font-medium">Applied Rate</span>
                <span className="font-semibold text-gray-800">₹{result.rate_per_kg} / kg</span>
              </div>
              <div className="flex justify-between items-center text-base pt-1 font-bold">
                <span className="text-gray-900">Total Payout</span>
                <span className="text-green-600 text-xl font-mono">₹{result.total_payout.toLocaleString('en-IN')}</span>
              </div>
              {result.discrepancy_percentage > 0 && (
                <div className="text-xs text-gray-500 text-right pt-1">
                  Declared: {result.declared_weight} kg (Discrepancy: {result.discrepancy_percentage}%)
                </div>
              )}
            </div>
            
            {/* PDF Certificate Box */}
            <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200 max-w-md mx-auto mb-6">
              <FileText className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-900 mb-1">Authoritative Digital Certificate Generated</h3>
              <p className="text-xs text-gray-600 mb-4">
                The cryptographic transaction and mass-balance record has been immutably committed to the platform.
              </p>
              
              <button
                onClick={handleDownloadCert}
                className="w-full inline-flex justify-center items-center gap-2 px-4 py-3 rounded-xl shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                Download Authoritative PDF Certificate
              </button>
            </div>
            
            <button
              onClick={() => { setResult(null); setLotId(''); setVerifiedWeight(''); setNotes(''); setVerifyWarning(null); }}
              className="text-sm font-semibold text-green-700 hover:text-green-800 transition-colors cursor-pointer"
            >
              ← Process another digital handover
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
