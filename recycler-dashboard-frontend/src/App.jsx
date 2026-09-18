import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Package, CheckSquare, User, LayoutDashboard, Shield, FileText, Truck } from 'lucide-react';
import { recyclerApi } from './api';

import IncomingLots from './pages/IncomingLots';
import ConfirmHandover from './pages/ConfirmHandover';
import RecyclerProfile from './pages/RecyclerProfile';
import AuditRecords from './pages/AuditRecords';
import MilkRun from './pages/MilkRun';

function Sidebar() {
  const location = useLocation();
  const [userName, setUserName] = useState('GreenCycle Recycling Corp');

  useEffect(() => {
    recyclerApi.getMe()
      .then(user => {
        if (user && user.name) setUserName(user.name);
      })
      .catch(() => {});
  }, []);

  const navItems = [
    { name: 'Incoming Lots', path: '/', icon: <Package className="w-5 h-5 mr-3" /> },
    { name: 'Milk-Run Logistics', path: '/milkrun', icon: <Truck className="w-5 h-5 mr-3" /> },
    { name: 'Confirm Handover', path: '/confirm', icon: <CheckSquare className="w-5 h-5 mr-3" /> },
    { name: 'Audit & Certificates', path: '/audit', icon: <FileText className="w-5 h-5 mr-3" /> },
    { name: 'Recycler Profile', path: '/profile', icon: <User className="w-5 h-5 mr-3" /> },
  ];

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col min-h-screen shrink-0">
      <div className="p-6 flex items-center border-b border-gray-800">
        <LayoutDashboard className="w-6 h-6 mr-3 text-green-400" />
        <div>
          <h1 className="text-lg font-bold leading-tight">Kabadiwala Connect</h1>
          <span className="text-[10px] uppercase font-semibold text-green-400 tracking-wider">Recycler Portal</span>
        </div>
      </div>
      <nav className="flex-1 py-6">
        <ul>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.name} className="px-4 py-1.5">
                <Link
                  to={item.path}
                  className={`flex items-center px-4 py-2.5 rounded-xl transition-all text-sm font-semibold ${
                    isActive ? 'bg-green-600 text-white shadow-md' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {item.icon}
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-800 bg-gray-950/40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold text-xs shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-gray-200 truncate">{userName}</div>
            <div className="text-[11px] text-green-400 font-medium">Authorized Recycler</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="flex bg-gray-50 min-h-screen font-sans">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-8">
          <Routes>
            <Route path="/" element={<IncomingLots />} />
            <Route path="/milkrun" element={<MilkRun />} />
            <Route path="/confirm" element={<ConfirmHandover />} />
            <Route path="/audit" element={<AuditRecords />} />
            <Route path="/profile" element={<RecyclerProfile />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
