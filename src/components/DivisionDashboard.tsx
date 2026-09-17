/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { 
  PackageX, MessageSquare, Plus, Search, ShoppingBag, 
  Warehouse, Store, CheckCircle, Clock, AlertTriangle, 
  ArrowRight, ShieldCheck, Activity, Users, Send, 
  Download, RefreshCw, FileText, Sparkles, TrendingUp
} from 'lucide-react';
import { motion } from 'motion/react';
import { LiveChatMessage, Product, UserSession } from '../types';

interface DivisionDashboardProps {
  currentUser: UserSession;
  onSwitchUser: (userKey: string) => void;
  products: Product[];
  headers: string[];
  rekapCount: number;
  requestCount: number;
  onOpenLiveChat: () => void;
  onOpenReportModal: () => void;
  onNavigateTab: (tab: 'dashboard' | 'database' | 'rekap' | 'request' | 'history') => void;
  onOpenRecordingCenter: () => void;
  onAddToRekap: (product: Product, note?: string) => void;
  onAddToRequest: (product: Product, qty?: number) => void;
  onSearchInDatabase: (searchTerm: string) => void;
}

export default function DivisionDashboard({
  currentUser,
  onSwitchUser,
  products,
  headers,
  rekapCount,
  requestCount,
  onOpenLiveChat,
  onOpenReportModal,
  onNavigateTab,
  onOpenRecordingCenter,
  onAddToRekap,
  onAddToRequest,
  onSearchInDatabase
}: DivisionDashboardProps) {
  const [liveMessages, setLiveMessages] = useState<LiveChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('app_live_chat_messages_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Re-read messages periodically or when storage changes
  useMemo(() => {
    try {
      const saved = localStorage.getItem('app_live_chat_messages_v2');
      if (saved) setLiveMessages(JSON.parse(saved));
    } catch {}
  }, []);

  // Calculate division specific metrics
  const emptyStockAlerts = useMemo(() => {
    return liveMessages.filter(m => Boolean(m.stockAlert));
  }, [liveMessages]);

  const pendingAlerts = useMemo(() => {
    return emptyStockAlerts.filter(m => m.stockAlert?.status === 'pending');
  }, [emptyStockAlerts]);

  const acknowledgedAlerts = useMemo(() => {
    return emptyStockAlerts.filter(m => m.stockAlert?.status === 'acknowledged' || m.stockAlert?.status === 'reordered');
  }, [emptyStockAlerts]);

  const myDivisionAlerts = useMemo(() => {
    if (currentUser.username === 'admin') return emptyStockAlerts;
    return emptyStockAlerts.filter(m => m.senderUsername === currentUser.username);
  }, [emptyStockAlerts, currentUser.username]);

  // Division Configuration Details
  const divisionInfo = useMemo(() => {
    switch (currentUser.username) {
      case 'admin':
        return {
          title: 'Divisi Admin & Manajemen Inventaris',
          badge: '👑 SUPER ADMIN',
          badgeColor: 'bg-indigo-600 text-white',
          desc: 'Pusat kontrol operasional: monitoring laporan stok kosong masuk dari gudang, approval request toko, dan rekap pembelian.',
          accentColor: 'indigo',
          icon: <ShieldCheck className="h-6 w-6 text-indigo-400" />
        };
      case 'gudang':
        return {
          title: 'Divisi Operasional Gudang (Warehouse)',
          badge: '📦 BAGIAN GUDANG',
          badgeColor: 'bg-amber-500 text-slate-900 font-black',
          desc: 'Pengawasan stok fisik rak gudang, pelaporan cepat produk habis ke Admin, dan monitoring status tindak lanjut rekap.',
          accentColor: 'amber',
          icon: <Warehouse className="h-6 w-6 text-amber-400" />
        };
      case 'toko':
        return {
          title: 'Divisi Pelayanan & Operasional Toko',
          badge: '🏪 ADMIN TOKO',
          badgeColor: 'bg-emerald-600 text-white',
          desc: 'Pencatatan rekap kebutuhan barang toko, request pengiriman stok dari gudang/toko lain, dan koordinasi penjualan fisik.',
          accentColor: 'emerald',
          icon: <Store className="h-6 w-6 text-emerald-400" />
        };
      case 'online':
        return {
          title: 'Divisi Penjualan E-Commerce & Online',
          badge: '🌐 ADMIN ONLINE',
          badgeColor: 'bg-blue-600 text-white',
          desc: 'Monitoring ketersediaan produk fast-moving marketplace, pemesanan stok online, dan koordinasi ketersediaan ke gudang.',
          accentColor: 'blue',
          icon: <ShoppingBag className="h-6 w-6 text-blue-400" />
        };
      case 'sales':
        return {
          title: 'Divisi Sales & Distribusi',
          badge: '💼 ADMIN SALES',
          badgeColor: 'bg-teal-600 text-white',
          desc: 'Koordinasi kebutuhan stok penjualan lapangan, request produk pesanan khusus, dan info stok.',
          accentColor: 'teal',
          icon: <Users className="h-6 w-6 text-teal-400" />
        };
      default:
        return {
          title: 'Divisi Purchasing & Customer Service',
          badge: '🛒 PURCHASING',
          badgeColor: 'bg-purple-600 text-white',
          desc: 'Verifikasi dan proses Purchase Order dari rekap kebutuhan divisi ke supplier.',
          accentColor: 'purple',
          icon: <FileText className="h-6 w-6 text-purple-400" />
        };
    }
  }, [currentUser.username]);

  return (
    <div className="space-y-6">
      {/* 1. DIVISION HERO BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-5 sm:p-7 text-white shadow-xl border border-slate-700/50 relative overflow-hidden">
        {/* Background decorative glow */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md tracking-wider uppercase shadow-sm ${divisionInfo.badgeColor}`}>
                {divisionInfo.badge}
              </span>
              <span className="bg-white/10 text-slate-300 text-xs px-2.5 py-1 rounded-md font-semibold flex items-center space-x-1 border border-white/10">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>User: <strong className="text-white">{currentUser.name}</strong></span>
              </span>
              <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[11px] px-2 py-0.5 rounded-md font-bold flex items-center space-x-1">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                <span>REC: Real-Time Aktif</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center space-x-2">
              <span>{divisionInfo.title}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {divisionInfo.desc}
            </p>
          </div>

          {/* Quick Division Switcher Pills */}
          <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 flex flex-col gap-2 sm:self-start md:self-auto flex-shrink-0">
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Pindah Login Divisi:</span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'admin', label: 'Admin', color: 'hover:bg-indigo-600' },
                { id: 'gudang', label: 'Gudang', color: 'hover:bg-amber-600' },
                { id: 'toko', label: 'Toko', color: 'hover:bg-emerald-600' },
                { id: 'online', label: 'Online', color: 'hover:bg-blue-600' },
                { id: 'sales', label: 'Sales', color: 'hover:bg-teal-600' },
                { id: 'cs', label: 'Purchasing', color: 'hover:bg-purple-600' }
              ].map((div) => (
                <button
                  key={div.id}
                  onClick={() => onSwitchUser(div.id)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    currentUser.username === div.id
                      ? 'bg-white text-slate-900 shadow-md font-black'
                      : `bg-white/10 text-slate-200 ${div.color} hover:text-white`
                  }`}
                >
                  {div.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. DIVISION KPI STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Laporan Kosong Masuk / Dikirim */}
        <div 
          onClick={onOpenLiveChat}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              {currentUser.username === 'gudang' ? 'Laporan Terkirim' : 'Laporan Stok Kosong'}
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <PackageX className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">
              {currentUser.username === 'gudang' ? myDivisionAlerts.length : emptyStockAlerts.length}
            </span>
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
              {pendingAlerts.length} Menunggu
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Klik untuk buka info chat real-time</p>
        </div>

        {/* Card 2: Keranjang Rekap */}
        <div 
          onClick={() => onNavigateTab('rekap')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Item Rekap Saat Ini</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-colors">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">{rekapCount}</span>
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
              {rekapCount > 0 ? 'Siap Kirim WA' : 'Kosong'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Daftar rekap kebutuhan divisi</p>
        </div>

        {/* Card 3: Request Antar Divisi */}
        <div 
          onClick={() => onNavigateTab('request')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Item Request Outlet</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-500 group-hover:text-white transition-colors">
              <Store className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">{requestCount}</span>
            <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
              {requestCount > 0 ? 'Siap Request' : 'Belum Ada'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Permintaan pengiriman stok</p>
        </div>

        {/* Card 4: Total Master Data & Rekaman Chat */}
        <div 
          onClick={onOpenRecordingCenter}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Log Chat Terekam</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">{liveMessages.length}</span>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center space-x-1">
              <CheckCircle className="h-3 w-3" />
              <span>Tersimpan</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Klik untuk audit &amp; download log</p>
        </div>
      </div>

      {/* 3. DIVISION ACTION CENTER & WORKFLOW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column (2 spans): Fast Action Workflows */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                  <span>Aksi Cepat Divisi: {currentUser.name}</span>
                </h3>
                <p className="text-xs text-slate-400">Pilih tindakan operasional utama untuk divisi Anda</p>
              </div>
              <span className="text-[11px] bg-slate-100 text-slate-600 font-bold px-2 py-1 rounded-lg">
                Role: {currentUser.role === 'purchasing' ? 'Purchasing CS' : 'Store & Warehouse'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Gudang Quick Action: Lapor Produk Kosong */}
              <button
                onClick={onOpenReportModal}
                className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-200 rounded-xl text-left transition-all group flex items-start space-x-3 shadow-2xs"
              >
                <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs group-hover:scale-105 transition-transform flex-shrink-0">
                  <PackageX className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900 text-xs sm:text-sm">Lapor Produk Kosong / Rusak</h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">Kirimkan info SKU yang habis di rak langsung ke Admin via chat real-time</p>
                </div>
              </button>

              {/* Chat Interaktif */}
              <button
                onClick={onOpenLiveChat}
                className="p-4 bg-gradient-to-br from-indigo-50 to-violet-50 hover:from-indigo-100 hover:to-violet-100 border border-indigo-200 rounded-xl text-left transition-all group flex items-start space-x-3 shadow-2xs"
              >
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs group-hover:scale-105 transition-transform flex-shrink-0">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-indigo-900 text-xs sm:text-sm">Buka Chat Interaktif Divisi</h4>
                  <p className="text-[11px] text-indigo-700 mt-0.5">Komunikasi langsung real-time antar Gudang, Admin, Toko, dan Purchasing</p>
                </div>
              </button>

              {/* Cek Master Database */}
              <button
                onClick={() => onNavigateTab('database')}
                className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 border border-slate-200 rounded-xl text-left transition-all group flex items-start space-x-3 shadow-2xs"
              >
                <div className="p-2.5 bg-slate-700 text-white rounded-xl shadow-xs group-hover:scale-105 transition-transform flex-shrink-0">
                  <Search className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Cek Database Master Produk</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Cari SKU, nama barang, foto produk, dan stok per lokasi ({products.length} item)</p>
                </div>
              </button>

              {/* Log Rekaman Chat */}
              <button
                onClick={onOpenRecordingCenter}
                className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200 rounded-xl text-left transition-all group flex items-start space-x-3 shadow-2xs"
              >
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs group-hover:scale-105 transition-transform flex-shrink-0">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-900 text-xs sm:text-sm">Audit &amp; Log Rekaman Chat</h4>
                  <p className="text-[11px] text-emerald-700 mt-0.5">Lihat semua rekaman history laporan stok kosong &amp; unduh bukti laporan CSV</p>
                </div>
              </button>
            </div>
          </div>

          {/* Recent Alerts Feed for This Division */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Laporan Produk Kosong Terbaru (Real-Time Feed)</span>
              </h3>
              <button
                onClick={onOpenLiveChat}
                className="text-xs text-indigo-600 font-bold hover:underline flex items-center space-x-1"
              >
                <span>Lihat Semua di Chat</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {emptyStockAlerts.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <PackageX className="h-8 w-8 mx-auto text-slate-300 mb-1" />
                <p className="text-xs font-semibold">Belum ada laporan produk kosong hari ini</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Gudang dapat menekan tombol "Lapor Produk Kosong" untuk mengirim data.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {emptyStockAlerts.slice(-3).reverse().map((msg) => {
                  const alert = msg.stockAlert!;
                  return (
                    <div 
                      key={msg.id}
                      className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-start space-x-3 overflow-hidden">
                        <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 font-bold">
                          <PackageX className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-900 truncate">{alert.productName}</span>
                            <span className={"text-[9px] font-extrabold px-1.5 py-0.2 rounded " + 
                              (alert.alertType === 'empty' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800')
                            }>
                              {alert.alertType === 'empty' ? 'KOSONG' : 'MENIPIS'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Oleh: <strong className="text-slate-700">{msg.senderName}</strong> ({msg.senderLocation || 'Gudang'}) &bull; SKU: <span className="font-mono">{alert.sku}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className={"text-[10px] font-bold px-2 py-0.5 rounded-md " + 
                          (alert.status === 'pending' ? 'bg-amber-100 text-amber-800' : 
                           alert.status === 'reordered' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800')
                        }>
                          {alert.status === 'pending' ? '⏳ Pending' : alert.status === 'reordered' ? '📝 Di-Rekap' : '✅ Selesai'}
                        </span>

                        <button
                          onClick={() => {
                            const match = products.find(p => {
                              const skuCol = headers.find(h => h.toLowerCase().includes('sku') || h.toLowerCase().includes('kode'));
                              return skuCol && String(p[skuCol]) === alert.sku;
                            }) || {
                              id: Date.now(),
                              SKU: alert.sku,
                              'Nama Produk': alert.productName,
                              Unit: alert.unit || 'PCS'
                            };
                            onAddToRekap(match, `Info dari ${msg.senderName}: Stok Kosong`);
                          }}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold flex items-center space-x-1 shadow-2xs"
                        >
                          <Plus className="h-3 w-3" />
                          <span>+ Rekap</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Division Summary & Real-time Live Log Preview */}
        <div className="space-y-4">
          {/* Status Real-Time Recording Info Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">Sistem Perekam Real-Time</h4>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                AKTIF
              </span>
            </div>

            <div className="mt-3 space-y-2.5 text-xs text-slate-300">
              <p className="leading-relaxed">
                Setiap pesan chat, update stok fisik kosong, status respon admin, dan request barang disimpan secara permanen pada log audit.
              </p>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Percakapan:</span>
                  <span className="font-bold text-white">{liveMessages.length} Pesan</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Alert Stok:</span>
                  <span className="font-bold text-amber-400">{emptyStockAlerts.length} Laporan</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Channel Sinkron:</span>
                  <span className="font-bold text-emerald-400">Broadcast Multi-Tab</span>
                </div>
              </div>

              <button
                onClick={onOpenRecordingCenter}
                className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Buka Audit &amp; Ekspor Rekaman</span>
              </button>
            </div>
          </div>

          {/* Quick Division Notes / Policy */}
          <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200/80 text-xs text-amber-900 space-y-2">
            <h4 className="font-bold flex items-center space-x-1.5 text-amber-800">
              <Sparkles className="h-4 w-4" />
              <span>Panduan Kolaborasi Antar Divisi:</span>
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-800/90 leading-tight">
              <li><strong>Gudang:</strong> Wajib kirim laporan jika stok fisik di rak habis atau rusak.</li>
              <li><strong>Admin:</strong> Melakukan konfirmasi dan memasukkan barang ke rekap harian.</li>
              <li><strong>Toko &amp; Online:</strong> Memeriksa status ketersediaan sebelum membuat pesanan outlet.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
