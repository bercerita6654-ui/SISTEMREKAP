/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { 
  X, Download, Search, Filter, Trash2, RefreshCw, 
  CheckCircle, AlertTriangle, PackageX, MessageSquare, 
  FileSpreadsheet, FileText, Calendar, Clock, User, 
  Warehouse, Store, ShoppingBag, ShieldCheck, ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LiveChatMessage, UserSession } from '../types';

interface ChatRecordingCenterProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession;
}

const STORAGE_KEY = 'app_live_chat_messages_v2';

export default function ChatRecordingCenter({
  isOpen,
  onClose,
  currentUser
}: ChatRecordingCenterProps) {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'empty-product' | 'general'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [copySuccess, setCopySuccess] = useState(false);

  // Load recorded messages from storage
  const loadMessages = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
    } catch (e) {
      console.error("Error loading chat records", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMessages();
    }
  }, [isOpen]);

  // Listen to storage events for real-time updates
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadMessages();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Filter and sort records
  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      // Channel filter
      if (selectedChannel !== 'all' && msg.channel !== selectedChannel) return false;

      // Division / sender filter
      if (selectedDivision !== 'all') {
        if (selectedDivision === 'gudang' && msg.senderUsername !== 'gudang') return false;
        if (selectedDivision === 'admin' && msg.senderUsername !== 'admin') return false;
        if (selectedDivision === 'toko' && msg.senderUsername !== 'toko') return false;
        if (selectedDivision === 'online' && msg.senderUsername !== 'online') return false;
        if (selectedDivision === 'cs' && msg.senderUsername !== 'cs') return false;
      }

      // Status filter for stock alerts
      if (selectedStatus !== 'all') {
        if (!msg.stockAlert) return false;
        if (msg.stockAlert.status !== selectedStatus) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const textMatch = msg.text.toLowerCase().includes(s);
        const senderMatch = msg.senderName.toLowerCase().includes(s);
        const skuMatch = msg.stockAlert?.sku.toLowerCase().includes(s);
        const prodMatch = msg.stockAlert?.productName.toLowerCase().includes(s);
        const noteMatch = msg.stockAlert?.customNote?.toLowerCase().includes(s);
        if (!textMatch && !senderMatch && !skuMatch && !prodMatch && !noteMatch) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });
  }, [messages, selectedChannel, selectedDivision, selectedStatus, searchTerm, sortOrder]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = messages.length;
    const stockAlerts = messages.filter(m => Boolean(m.stockAlert)).length;
    const pending = messages.filter(m => m.stockAlert?.status === 'pending').length;
    const reordered = messages.filter(m => m.stockAlert?.status === 'reordered' || m.stockAlert?.status === 'acknowledged').length;
    return { total, stockAlerts, pending, reordered };
  }, [messages]);

  // Export to CSV
  const handleExportCSV = () => {
    const csvHeaders = ['Timestamp', 'Saluran', 'Pengirim', 'Divisi', 'Lokasi', 'Target', 'Tipe Alert', 'SKU', 'Nama Produk', 'Satuan', 'Status Respon', 'Isi Pesan / Catatan'];
    
    const rows = filteredMessages.map(m => {
      const dateStr = new Date(m.timestamp).toLocaleString('id-ID');
      const channelStr = m.channel === 'empty-product' ? 'Info Produk Kosong' : 'Obrolan Umum';
      const alert = m.stockAlert;
      
      return [
        `"${dateStr}"`,
        `"${channelStr}"`,
        `"${m.senderName}"`,
        `"${m.senderRole}"`,
        `"${m.senderLocation || ''}"`,
        `"${m.targetUser || 'All'}"`,
        `"${alert ? alert.alertType : '-'}"`,
        `"${alert ? alert.sku : '-'}"`,
        `"${alert ? alert.productName.replace(/"/g, '""') : '-'}"`,
        `"${alert ? (alert.unit || 'PCS') : '-'}"`,
        `"${alert ? alert.status : 'Normal'}"`,
        `"${m.text.replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [csvHeaders.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rekaman_chat_inventaris_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Formatted Text Log
  const handleExportFormattedText = () => {
    let output = `====================================================\n`;
    output += `📋 AUDIT LOG REKAMAN CHAT & INFO STOK REAL-TIME\n`;
    output += `Dicetak pada: ${new Date().toLocaleString('id-ID')}\n`;
    output += `Total Log Terekam: ${filteredMessages.length} Entri\n`;
    output += `====================================================\n\n`;

    filteredMessages.forEach((m, idx) => {
      const timeStr = new Date(m.timestamp).toLocaleString('id-ID');
      output += `[${idx + 1}] WAKTU: ${timeStr}\n`;
      output += `    PENGIRIM: ${m.senderName} (${m.senderLocation || 'Gudang/Toko'})\n`;
      output += `    CHANNEL: ${m.channel === 'empty-product' ? '🔴 INFO PRODUK KOSONG' : '💬 OBROLAN UMUM'}\n`;
      if (m.stockAlert) {
        output += `    ALERT STOK: ${m.stockAlert.alertType.toUpperCase()} | SKU: ${m.stockAlert.sku} | ${m.stockAlert.productName}\n`;
        output += `    STATUS: ${m.stockAlert.status.toUpperCase()}\n`;
      }
      output += `    PESAN: ${m.text}\n`;
      output += `----------------------------------------------------\n`;
    });

    const blob = new Blob([output], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_log_chat_${new Date().toISOString().slice(0, 10)}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full z-60 overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]"
      >
        {/* HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl flex items-center justify-center">
              <span className="h-3 w-3 rounded-full bg-red-500 animate-ping absolute"></span>
              <span className="h-2 w-2 rounded-full bg-red-500 relative"></span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black text-white">Rekaman Chat &amp; Log Real-Time</h2>
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  MEREKAM AKTIF
                </span>
              </div>
              <p className="text-xs text-slate-300">Pusat Arsip Seluruh Percakapan &amp; Laporan Stok Kosong Antar Divisi</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadMessages}
              className="p-2 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white rounded-xl transition-colors text-xs font-bold flex items-center space-x-1"
              title="Perbarui data"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white rounded-xl transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* METRICS STRIP */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Pesan Terekam</span>
            <span className="text-lg font-extrabold text-slate-800">{metrics.total} Log</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-amber-600 font-bold uppercase block">Laporan Stok Kosong</span>
            <span className="text-lg font-extrabold text-amber-700">{metrics.stockAlerts} Alert</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-red-600 font-bold uppercase block">Menunggu Tindakan</span>
            <span className="text-lg font-extrabold text-red-700">{metrics.pending} Pending</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-emerald-600 font-bold uppercase block">Sudah Di-Rekap</span>
            <span className="text-lg font-extrabold text-emerald-700">{metrics.reordered} Selesai</span>
          </div>
        </div>

        {/* FILTERS & SEARCH TOOLBAR */}
        <div className="p-4 bg-white border-b border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari SKU, nama barang, isi pesan..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Quick Export Actions */}
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleExportCSV}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors"
                title="Download CSV Spreadsheet"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Download CSV</span>
              </button>

              <button
                onClick={handleExportFormattedText}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors"
                title="Download Laporan Teks"
              >
                <FileText className="h-4 w-4" />
                <span>Download TXT</span>
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Filter:</span>
            
            {/* Channel filter */}
            <select
              value={selectedChannel}
              onChange={(e: any) => setSelectedChannel(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="all">Semua Saluran</option>
              <option value="empty-product">🔴 Info Produk Kosong</option>
              <option value="general">💬 Obrolan Umum</option>
            </select>

            {/* Division filter */}
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="all">Semua Divisi</option>
              <option value="admin">👑 Admin</option>
              <option value="gudang">📦 Bagian Gudang</option>
              <option value="toko">🏪 Admin Toko</option>
              <option value="online">🌐 Admin Online</option>
              <option value="cs">🛒 Purchasing (CS)</option>
            </select>

            {/* Status filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="all">Semua Status Alert</option>
              <option value="pending">⏳ Pending (Menunggu)</option>
              <option value="acknowledged">👁️ Dilihat</option>
              <option value="reordered">📝 Sudah Di-Rekap</option>
            </select>

            {/* Sort order */}
            <button
              onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
              className="ml-auto px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span>{sortOrder === 'newest' ? 'Urutan: Terbaru' : 'Urutan: Terlama'}</span>
            </button>
          </div>
        </div>

        {/* LOG RECORDS LIST */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-3">
          {filteredMessages.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
              <MessageSquare className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-700 text-sm">Tidak ada rekaman chat sesuai filter</p>
              <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter divisi.</p>
            </div>
          ) : (
            filteredMessages.map((msg, index) => {
              const alert = msg.stockAlert;
              const isAlert = Boolean(alert);
              const dateObj = new Date(msg.timestamp);

              return (
                <div
                  key={msg.id}
                  className={"bg-white p-4 rounded-xl border transition-all shadow-2xs " + 
                    (isAlert ? 'border-amber-200/90 hover:border-amber-400' : 'border-slate-200 hover:border-slate-300')}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 mb-2 border-b border-slate-100 gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        #{filteredMessages.length - index}
                      </span>
                      <span className={"px-2 py-0.5 rounded-md text-[10px] font-black " + 
                        (msg.senderUsername === 'gudang' ? 'bg-amber-100 text-amber-800' : 
                         msg.senderUsername === 'admin' ? 'bg-indigo-100 text-indigo-800' : 
                         msg.senderUsername === 'toko' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800')
                      }>
                        {msg.senderName}
                      </span>
                      {msg.senderLocation && (
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          Lokasi: {msg.senderLocation}
                        </span>
                      )}
                      <span className={"text-[10px] font-extrabold px-2 py-0.5 rounded " + 
                        (msg.channel === 'empty-product' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200')
                      }>
                        {msg.channel === 'empty-product' ? '🔴 Laporan Kosong' : '💬 Chat'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{dateObj.toLocaleDateString('id-ID')} {dateObj.toLocaleTimeString('id-ID')}</span>
                    </div>
                  </div>

                  {/* Stock Alert Specific Data if attached */}
                  {isAlert && alert && (
                    <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200/60 mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-amber-950">{alert.productName}</span>
                          <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-amber-200 text-amber-800">
                            SKU: {alert.sku}
                          </span>
                        </div>
                        {alert.customNote && (
                          <p className="text-[11px] text-amber-800">
                            <strong>Catatan:</strong> {alert.customNote}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className={"text-[10px] font-bold px-2 py-0.5 rounded-md " + 
                          (alert.status === 'pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 
                           alert.status === 'acknowledged' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 
                           alert.status === 'reordered' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200')
                        }>
                          Status: {alert.status === 'pending' ? 'Menunggu' : alert.status === 'reordered' ? 'Di-Rekap' : 'Selesai'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Message Text Body */}
                  <p className="text-xs text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                    {msg.text}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Audit Log tersimpan secara aman &amp; otomatis tersinkronisasi antar pengguna.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-colors"
          >
            Tutup Rekaman
          </button>
        </div>
      </motion.div>
    </div>
  );
}
