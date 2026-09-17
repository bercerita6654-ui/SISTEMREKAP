/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { 
  AlertCircle, LayoutGrid, KeyRound, UserSquare, ShieldCheck, 
  Warehouse, Store, ShoppingBag, Users, FileText, ArrowRight, 
  Sparkles, Check, Lock
} from 'lucide-react';
import { motion } from 'motion/react';
import { UserSession } from '../types';

interface LoginProps {
  onLoginSuccess: (session: UserSession) => void;
}

interface DivisionOption {
  key: string;
  name: string;
  role: 'store' | 'purchasing';
  title: string;
  desc: string;
  icon: any;
  color: string;
  badge: string;
  badgeBg: string;
}

const DIVISIONS: DivisionOption[] = [
  {
    key: 'admin',
    name: 'Admin',
    role: 'store',
    title: 'Divisi Admin & Inventaris',
    desc: 'Pusat kendali operasional, approval request toko, monitoring laporan stok kosong masuk.',
    icon: ShieldCheck,
    color: 'from-indigo-600 to-violet-600',
    badge: '👑 SUPER ADMIN',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },
  {
    key: 'gudang',
    name: 'Bagian Gudang',
    role: 'store',
    title: 'Divisi Gudang (Warehouse)',
    desc: 'Lapor stok fisik habis di rak, update kondisi barang rusak, dan koordinasi pengiriman.',
    icon: Warehouse,
    color: 'from-amber-500 to-orange-500',
    badge: '📦 GUDANG',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-200'
  },
  {
    key: 'toko',
    name: 'Admin Toko',
    role: 'store',
    title: 'Divisi Toko (Outlet Store)',
    desc: 'Rekap kebutuhan toko harian, buat request barang ke gudang/cabang lain.',
    icon: Store,
    color: 'from-emerald-500 to-teal-600',
    badge: '🏪 TOKO',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  {
    key: 'online',
    name: 'Admin Online',
    role: 'store',
    title: 'Divisi E-Commerce / Online',
    desc: 'Request stok pesanan marketplace (Shopee, Tokopedia, TikTok), info produk online.',
    icon: ShoppingBag,
    color: 'from-blue-500 to-cyan-600',
    badge: '🌐 ONLINE',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    key: 'sales',
    name: 'Admin Sales',
    role: 'store',
    title: 'Divisi Sales & Distribusi',
    desc: 'Koordinasi kebutuhan stok penjualan lapangan dan request order khusus.',
    icon: Users,
    color: 'from-teal-500 to-emerald-600',
    badge: '💼 SALES',
    badgeBg: 'bg-teal-100 text-teal-800 border-teal-200'
  },
  {
    key: 'cs',
    name: 'Purchasing (CS)',
    role: 'purchasing',
    title: 'Divisi Purchasing Dept',
    desc: 'Proses PO ke supplier berdasarkan rekap kebutuhan barang yang disetujui.',
    icon: FileText,
    color: 'from-purple-500 to-pink-600',
    badge: '🛒 PURCHASING',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200'
  }
];

export default function Login({ onLoginSuccess }: LoginProps) {
  const [selectedDivisionKey, setSelectedDivisionKey] = useState('admin');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123');
  const [loginError, setLoginError] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);

  const handleSelectDivision = (div: DivisionOption) => {
    setSelectedDivisionKey(div.key);
    setUsername(div.key);
    setPassword('123');
    setLoginError('');
  };

  const handleDirectLoginAs = (div: DivisionOption) => {
    const loggedInInfo: UserSession = {
      username: div.key,
      role: div.role,
      name: div.name
    };
    onLoginSuccess(loggedInInfo);
  };

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    const userKey = username.toLowerCase().trim();
    const matched = DIVISIONS.find(d => d.key === userKey);

    if (matched && password === '123') {
      const loggedInInfo: UserSession = {
        username: matched.key,
        role: matched.role,
        name: matched.name
      };
      onLoginSuccess(loggedInInfo);
      setLoginError('');
    } else {
      setLoginError('Username atau Password salah! (Gunakan password default: 123)');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background visual elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto w-full relative z-10 space-y-8">
        {/* HEADER */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center space-x-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/15 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-200">Sistem Portal Login Multi-Divisi</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Login Dashboard &amp; Inventaris Divisi
          </h1>
          <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Pilih divisi kerja Anda untuk mengakses dashboard operasional, pelaporan stok kosong real-time, dan rekap barang.
          </p>
        </motion.div>

        {/* DIVISION CARDS GRID */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {DIVISIONS.map((div) => {
            const Icon = div.icon;
            const isSelected = selectedDivisionKey === div.key;

            return (
              <div
                key={div.key}
                onClick={() => handleSelectDivision(div)}
                className={`relative bg-slate-800/90 hover:bg-slate-800 rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between group backdrop-blur-md shadow-lg ${
                  isSelected 
                    ? 'border-indigo-400 ring-2 ring-indigo-500/30 scale-[1.02] bg-slate-800' 
                    : 'border-slate-700/80 hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-tr ${div.color} text-white shadow-md group-hover:scale-105 transition-transform`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${div.badgeBg}`}>
                      {div.badge}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors">
                    {div.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {div.desc}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-700/60 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">
                    User: <strong className="text-slate-200">{div.key}</strong>
                  </span>
                  
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDirectLoginAs(div);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-xs ${
                      isSelected 
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white' 
                        : 'bg-white/10 hover:bg-white/20 text-slate-200'
                    }`}
                  >
                    <span>Masuk Divisi</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* LOGIN FORM SECTION FOR SELECTED DIVISION */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-md mx-auto bg-slate-800/95 border border-slate-700 rounded-2xl p-6 shadow-2xl backdrop-blur-md"
        >
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-700">
            <div className="flex items-center space-x-2">
              <Lock className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase text-slate-300 tracking-wider">Konfirmasi Akses Masuk</span>
            </div>
            <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded font-mono">
              Password default: 123
            </span>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            {loginError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Username Divisi</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <UserSquare className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm font-medium text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                  placeholder="admin, gudang, toko, online, cs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <KeyRound className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm font-medium text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                  placeholder="••••••"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <span>Buka Dashboard Divisi</span>
              <ArrowRight className="h-4 w-4" />
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
