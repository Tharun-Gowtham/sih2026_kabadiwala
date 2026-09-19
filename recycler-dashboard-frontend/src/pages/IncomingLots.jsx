import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Search, Filter, CheckSquare, RefreshCw } from 'lucide-react';
import { recyclerApi } from '../api';

export default function IncomingLots() {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  const fetchLots = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await recyclerApi.getIncomingLots(filter);
      setLots(data);
    } catch (err) {
      console.error('Failed to load lots:', err);
      setError(err.message || 'Failed to load incoming lots from backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLots();
  }, [filter]);

  const filteredLots = lots.filter(lot => {
    if (filter === 'all') return true;
    return lot.status === filter;
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Incoming Lots</h1>
          <p className="text-gray-500 mt-1">Authoritative materials assigned by scrap dealers awaiting digital handover.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchLots}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <select 
            className="bg-white border border-gray-300 text-gray-700 rounded-lg px-4 py-2 outline-none focus:border-green-500 shadow-sm text-sm font-medium"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Lots</option>
            <option value="PENDING_HANDOVER">Pending Handover</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Lot UUID</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Dealer</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Declared Weight</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLots.map((lot) => (
              <tr key={lot.lot_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-gray-900">
                  {lot.lot_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                  {lot.dealer_name || 'Authorized Dealer'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {lot.category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-semibold">
                  {lot.declared_weight} kg
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {lot.status === 'COMPLETED' ? (
                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Completed
                    </span>
                  ) : (
                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Pending Handover
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  {lot.status !== 'COMPLETED' ? (
                    <button
                      onClick={() => navigate(`/confirm?lotId=${encodeURIComponent(lot.lot_id)}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      Verify & Confirm
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400 font-medium">Handover Finalized</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {!loading && filteredLots.length === 0 && (
          <div className="text-center py-16">
            <Package className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-base font-semibold text-gray-900">No incoming lots found</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
              When scrap dealers match and assign material lots to your facility, they will appear here ready for physical verification.
            </p>
          </div>
        )}

        {loading && (
          <div className="text-center py-16 text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-green-600" />
            <p className="text-sm font-medium">Connecting to authoritative server...</p>
          </div>
        )}
      </div>
    </div>
  );
}
