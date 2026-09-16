import { useState, useEffect } from 'react';
import { Save, Loader, Building2, Truck, CheckCircle, AlertCircle } from 'lucide-react';
import { recyclerApi } from '../api';

export default function RecyclerProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Strict 7 canonical categories matching backend config
  const CANONICAL_CATEGORIES = [
    { id: 'PCB', name: 'Printed Circuit Boards (PCB)', defaultRate: 520 },
    { id: 'Battery', name: 'Lithium & Lead-Acid Batteries', defaultRate: 110 },
    { id: 'Cable', name: 'Copper & Insulated Wiring', defaultRate: 380 },
    { id: 'CRT', name: 'Cathode Ray Tubes (CRT)', defaultRate: 40 },
    { id: 'LCD', name: 'LCD / Flat Screens', defaultRate: 90 },
    { id: 'Motor/Magnet', name: 'Motors & Magnets', defaultRate: 160 },
    { id: 'Mixed Plastic', name: 'Mixed E-Waste Plastics', defaultRate: 25 },
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await recyclerApi.getProfile();
      setProfile({
        company_name: data.company_name || 'GreenCycle Recycling Corp',
        accepted_categories: data.accepted_categories || ['PCB', 'Battery', 'Cable'],
        rates: data.rates || { 'PCB': 520, 'Battery': 110, 'Cable': 380 },
        pickup_available: data.pickup_available ?? true,
        service_radius_km: data.service_radius_km || 40.0
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
      setMessage({ text: 'Error connecting to profile API: ' + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCategory = (catId) => {
    const isAccepted = profile.accepted_categories.includes(catId);
    let newAccepted;
    let newRates = { ...profile.rates };

    if (isAccepted) {
      newAccepted = profile.accepted_categories.filter(c => c !== catId);
      delete newRates[catId];
    } else {
      newAccepted = [...profile.accepted_categories, catId];
      const defaultInfo = CANONICAL_CATEGORIES.find(c => c.id === catId);
      newRates[catId] = newRates[catId] || (defaultInfo ? defaultInfo.defaultRate : 100);
    }

    setProfile({
      ...profile,
      accepted_categories: newAccepted,
      rates: newRates
    });
  };

  const handleRateChange = (catId, value) => {
    setProfile({
      ...profile,
      rates: {
        ...profile.rates,
        [catId]: Math.max(0, Number(value) || 0)
      }
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      // Validate that all accepted categories have a rate > 0
      for (const cat of profile.accepted_categories) {
        if (!profile.rates[cat] || profile.rates[cat] <= 0) {
          throw new Error(`Please specify a valid buying rate (> ₹0/kg) for accepted category: ${cat}`);
        }
      }

      await recyclerApi.updateProfile({
        company_name: profile.company_name,
        accepted_categories: profile.accepted_categories,
        rates: profile.rates,
        pickup_available: profile.pickup_available,
        service_radius_km: Number(profile.service_radius_km)
      });

      setMessage({ text: 'Profile updated successfully! Live rates are now active in the dealer matching algorithm.', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    } catch (err) {
      console.error('Save failed:', err);
      setMessage({ text: err.message || 'Failed to save profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center text-gray-500">
        <Loader className="w-8 h-8 animate-spin mx-auto mb-2 text-green-600" />
        <p className="text-sm font-medium">Loading recycler profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Recycler Facility Profile</h1>
        <p className="text-gray-500 mt-1">Configure accepted material streams, offered rates, and logistics. This directly powers the Dealer App smart matching algorithm.</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl mb-6 flex items-center gap-2.5 text-sm font-medium ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Facility Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-green-600" />
            Facility Details &amp; Logistics
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Facility / Company Name
              </label>
              <input
                type="text"
                required
                className="w-full rounded-xl border-gray-300 border px-3.5 py-2.5 text-sm focus:ring-green-500 focus:border-green-500"
                value={profile.company_name}
                onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Collection Radius (km)
              </label>
              <input
                type="number"
                min="1"
                max="500"
                required
                className="w-full rounded-xl border-gray-300 border px-3.5 py-2.5 text-sm focus:ring-green-500 focus:border-green-500 font-mono"
                value={profile.service_radius_km}
                onChange={(e) => setProfile({ ...profile, service_radius_km: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={profile.pickup_available}
                onChange={(e) => setProfile({ ...profile, pickup_available: e.target.checked })}
                className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Provide door-step pickup service for dealer lots (+20% algorithm weight bonus)
              </span>
            </label>
          </div>
        </div>

        {/* Material Streams & Buying Rates */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Accepted E-Waste Categories &amp; Buying Rates</h2>
              <p className="text-xs text-gray-500 mt-0.5">Toggle streams you are authorized and equipped to recycle, then set your offered rate in ₹/kg.</p>
            </div>
            <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              {profile.accepted_categories.length} of 7 Accepted
            </span>
          </div>

          <div className="space-y-3">
            {CANONICAL_CATEGORIES.map((cat) => {
              const isAccepted = profile.accepted_categories.includes(cat.id);
              const currentRate = profile.rates[cat.id] || cat.defaultRate;

              return (
                <div 
                  key={cat.id} 
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    isAccepted ? 'border-green-300 bg-green-50/40' : 'border-gray-200 bg-gray-50/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isAccepted}
                      onChange={() => handleToggleCategory(cat.id)}
                      className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                    />
                    <div>
                      <div className="text-sm font-bold text-gray-900">{cat.id}</div>
                      <div className="text-xs text-gray-500">{cat.name}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500">Rate: ₹</span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      disabled={!isAccepted}
                      className="w-24 rounded-lg border-gray-300 border px-2.5 py-1.5 text-sm font-mono font-bold text-right focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:text-gray-400"
                      value={currentRate}
                      onChange={(e) => handleRateChange(cat.id, e.target.value)}
                    />
                    <span className="text-xs text-gray-500 font-medium">/ kg</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl shadow-md text-base font-bold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-all cursor-pointer"
        >
          {saving ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              <span>Saving Profile to Backend...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>Save &amp; Publish Recycler Rates</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
