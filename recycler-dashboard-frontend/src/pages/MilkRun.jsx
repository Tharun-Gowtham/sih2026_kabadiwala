import { useState, useEffect } from 'react';
import { Truck, MapPin, Package, CheckCircle, RefreshCw, Zap, Clock, Weight, Navigation, ChevronDown, ChevronUp } from 'lucide-react';
import { recyclerApi } from '../api';

const STATUS_STYLES = {
  READY:      { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500', label: 'Ready to Accept' },
  ASSIGNED:   { bg: 'bg-blue-100',  text: 'text-blue-800',  dot: 'bg-blue-500',  label: 'Assigned' },
  DISPATCHED: { bg: 'bg-purple-100',text: 'text-purple-800',dot: 'bg-purple-500', label: 'Dispatched' },
  COMPLETED:  { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500',  label: 'Completed' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.READY;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function RouteStops({ stops }) {
  return (
    <div className="mt-4 space-y-2">
      {stops.map((stop, i) => (
        <div key={stop.lot_id || i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
            {stop.stop_number || i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{stop.dealer_name || 'Dealer'}</p>
            <p className="text-xs text-gray-500 font-mono">{stop.lat?.toFixed(4)}, {stop.lng?.toFixed(4)}</p>
          </div>
          {stop.estimated_arrival_minutes != null && (
            <span className="text-xs text-blue-600 font-semibold shrink-0">~{stop.estimated_arrival_minutes} min</span>
          )}
        </div>
      ))}
    </div>
  );
}

function BatchCard({ batch, onAccept, onDispatch, accepting, dispatching }) {
  const [expanded, setExpanded] = useState(false);
  const [route, setRoute] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  const handleExpand = async () => {
    if (!expanded && !route) {
      setLoadingRoute(true);
      try {
        const r = await recyclerApi.getBatchRoute(batch.batch_id);
        setRoute(r);
      } catch (e) {
        console.error('route fetch failed', e);
      } finally {
        setLoadingRoute(false);
      }
    }
    setExpanded(v => !v);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-mono text-gray-400 mb-0.5">{batch.batch_id.substring(0, 16)}...</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-gray-900">{batch.material_category}</span>
                <StatusBadge status={batch.status} />
              </div>
            </div>
          </div>
          <button
            onClick={handleExpand}
            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Weight className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="font-semibold text-gray-900">{batch.total_weight_kg} kg</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="font-semibold text-gray-900">{batch.num_stops} stops</span>
          </div>
          {batch.pickup_scheduled_at && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-xs font-medium">
                {new Date(batch.pickup_scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        {/* Geohash cell */}
        <div className="mt-3 flex items-center gap-2">
          <Navigation className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-500 font-mono">Cluster cell: {batch.geohash_cell}</span>
        </div>
      </div>

      {/* Expanded route */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 pb-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2">Pickup Route</p>
          {loadingRoute ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading route...
            </div>
          ) : route?.route?.length > 0 ? (
            <>
              <RouteStops stops={route.route} />
              {route.total_distance_km != null && (
                <p className="text-xs text-gray-500 mt-2 text-right">
                  Total route: <span className="font-semibold text-gray-700">{route.total_distance_km.toFixed(1)} km</span>
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400 py-2">No route data available yet.</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-gray-100 px-5 py-3 bg-gray-50 flex justify-end gap-2">
        {batch.status === 'READY' && (
          <button
            onClick={() => onAccept(batch.batch_id)}
            disabled={accepting === batch.batch_id}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {accepting === batch.batch_id ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Accepting...</>
            ) : (
              <><CheckCircle className="w-4 h-4" /> Accept Batch</>
            )}
          </button>
        )}
        {batch.status === 'ASSIGNED' && (
          <button
            onClick={() => onDispatch(batch.batch_id)}
            disabled={dispatching === batch.batch_id}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {dispatching === batch.batch_id ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Dispatching...</>
            ) : (
              <><Truck className="w-4 h-4" /> Dispatch Van</>
            )}
          </button>
        )}
        {batch.status === 'DISPATCHED' && (
          <span className="text-sm text-purple-600 font-semibold flex items-center gap-1.5">
            <Truck className="w-4 h-4" /> Van is on the way
          </span>
        )}
        {batch.status === 'COMPLETED' && (
          <span className="text-sm text-green-600 font-semibold flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" /> Pickup Complete
          </span>
        )}
      </div>
    </div>
  );
}

export default function MilkRun() {
  const [tab, setTab] = useState('available'); // 'available' | 'my'
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forming, setForming] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [accepting, setAccepting] = useState(null);
  const [dispatching, setDispatching] = useState(null);

  const fetchBatches = async () => {
    setLoading(true);
    setError('');
    try {
      const data = tab === 'available'
        ? await recyclerApi.getAvailableBatches()
        : await recyclerApi.getMyBatches();
      setBatches(data);
    } catch (e) {
      setError(e.message || 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBatches(); }, [tab]);

  const handleFormBatches = async () => {
    setForming(true);
    setFormMessage('');
    try {
      const res = await recyclerApi.triggerBatchFormation();
      setFormMessage(res.message || 'Batch formation triggered.');
      fetchBatches();
    } catch (e) {
      setFormMessage(e.message || 'Batch formation failed.');
    } finally {
      setForming(false);
    }
  };

  const handleAccept = async (batchId) => {
    setAccepting(batchId);
    try {
      await recyclerApi.acceptBatch(batchId);
      fetchBatches();
    } catch (e) {
      setError(e.message || 'Failed to accept batch');
    } finally {
      setAccepting(null);
    }
  };

  const handleDispatch = async (batchId) => {
    setDispatching(batchId);
    try {
      await recyclerApi.dispatchBatch(batchId);
      fetchBatches();
    } catch (e) {
      setError(e.message || 'Failed to dispatch batch');
    } finally {
      setDispatching(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Truck className="w-8 h-8 text-green-600" />
            Milk-Run Logistics
          </h1>
          <p className="text-gray-500 mt-1 max-w-xl">
            Geographically clustered pickup batches. Accept a batch to claim all dealer lots in a neighbourhood, then dispatch your van with a single click.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={fetchBatches}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleFormBatches}
            disabled={forming}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 ${forming ? 'animate-pulse' : ''}`} />
            {forming ? 'Forming...' : 'Form New Batches'}
          </button>
        </div>
      </div>

      {/* How it works banner */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Package className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
        <div className="text-sm text-green-800">
          <span className="font-semibold">How Milk-Run works: </span>
          Our algorithm uses geohash clustering to group multiple dealer lots from the same neighbourhood into a single optimised pickup route. You accept a ready batch, dispatch your van, and all dealers get notified automatically.
        </div>
      </div>

      {formMessage && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl mb-4 text-sm font-medium">
          {formMessage}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {[
          { key: 'available', label: 'Available Batches' },
          { key: 'my', label: 'My Batches' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Batch cards */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-green-600" />
          <p className="text-sm font-medium">Loading batches...</p>
        </div>
      ) : batches.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <Truck className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-base font-semibold text-gray-900">No batches found</h3>
          <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
            {tab === 'available'
              ? "Click 'Form New Batches' to trigger the geo-clustering algorithm on pooled dealer lots."
              : "You haven't accepted any batches yet. Check the Available Batches tab."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {batches.map(batch => (
            <BatchCard
              key={batch.batch_id}
              batch={batch}
              onAccept={handleAccept}
              onDispatch={handleDispatch}
              accepting={accepting}
              dispatching={dispatching}
            />
          ))}
        </div>
      )}
    </div>
  );
}
