/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo, FormEvent } from 'react';
import { 
  X, Send, AlertTriangle, PackageX, CheckCircle, Clock, 
  MessageSquare, User, Store, Warehouse, Search, Plus, 
  ArrowRight, Bell, Sparkles, RefreshCw, Filter, Check, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LiveChatMessage, Product, StockAlertInfo, UserSession } from '../types';

interface LiveChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession;
  onSwitchUser: (userKey: string) => void;
  products: Product[];
  headers: string[];
  onAddToRekap: (product: Product, note?: string) => void;
  onAddToRequest: (product: Product, qty?: number) => void;
  onSearchInDatabase: (searchTerm: string) => void;
  preSelectedProductForAlert?: Product | null;
  onClearPreSelectedProduct?: () => void;
  onOpenRecordingCenter?: () => void;
}

const STORAGE_KEY = 'app_live_chat_messages_v2';
const CHANNEL_NAME = 'app_live_chat_channel';

// Initial dummy conversations showing interactive scenario between Gudang and Admin
const INITIAL_MESSAGES: LiveChatMessage[] = [
  {
    id: 'msg-init-1',
    channel: 'empty-product',
    senderUsername: 'gudang',
    senderName: 'Bagian Gudang',
    senderRole: 'store',
    senderLocation: 'Gudang',
    targetUser: 'admin',
    text: 'Halo @admin, produk ini dicek di rak A sudah kosong total ya. Mohon segera di-rekap untuk pemesanan ulang.',
    stockAlert: {
      sku: 'SKU-0012',
      productName: 'Sample Produk Kosong Gudang',
      unit: 'PCS',
      stockLocation: 'Gudang',
      alertType: 'empty',
      customNote: 'Stok fisik di rak A habis, tidak ada sisa cadangan.',
      status: 'pending'
    },
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    readBy: ['gudang']
  },
  {
    id: 'msg-init-2',
    channel: 'empty-product',
    senderUsername: 'admin',
    senderName: 'Admin',
    senderRole: 'store',
    senderLocation: 'Toko Pusat',
    targetUser: 'gudang',
    text: '@gudang Siap, laporan sudah diterima dan sudah dimasukkan ke daftar rekap produk kosong!',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    readBy: ['gudang', 'admin']
  },
  {
    id: 'msg-init-3',
    channel: 'general',
    senderUsername: 'admin',
    senderName: 'Admin',
    senderRole: 'store',
    senderLocation: 'Toko',
    targetUser: 'all',
    text: 'Selamat pagi tim. Pastikan update info stok kosong langsung dikirimkan lewat fitur chat ini agar rekap harian cepat terdata.',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    readBy: ['admin']
  }
];

export default function LiveChatDrawer({
  isOpen,
  onClose,
  currentUser,
  onSwitchUser,
  products,
  headers,
  onAddToRekap,
  onAddToRequest,
  onSearchInDatabase,
  preSelectedProductForAlert,
  onClearPreSelectedProduct,
  onOpenRecordingCenter
}: LiveChatDrawerProps) {
  const [messages, setMessages] = useState<LiveChatMessage[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Error reading live chat storage", e);
      }
    }
    return INITIAL_MESSAGES;
  });

  const [activeChannel, setActiveChannel] = useState<'empty-product' | 'general'>('empty-product');
  const [inputText, setInputText] = useState('');
  const [showStockModal, setShowStockModal] = useState(false);
  
  // Stock alert form state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [alertType, setAlertType] = useState<'empty' | 'low' | 'damaged' | 'reorder'>('empty');
  const [alertLocation, setAlertLocation] = useState('Gudang');
  const [alertNote, setAlertNote] = useState('');
  const [alertTarget, setAlertTarget] = useState('@admin');

  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(true);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  // Play soft chime notification sound using Web Audio
  const playChime = () => {
    if (!notificationSoundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // Audio context might be blocked if no user interaction yet
    }
  };

  // BroadcastChannel and storage sync for real-time multi-tab
  useEffect(() => {
    try {
      const bc = new BroadcastChannel(CHANNEL_NAME);
      broadcastRef.current = bc;
      bc.onmessage = (event) => {
        if (event.data && event.data.type === 'NEW_MESSAGE') {
          setMessages(prev => {
            const exists = prev.some(m => m.id === event.data.message.id);
            if (exists) return prev;
            playChime();
            return [...prev, event.data.message];
          });
        } else if (event.data && event.data.type === 'UPDATE_MESSAGE') {
          setMessages(prev => prev.map(m => m.id === event.data.message.id ? event.data.message : m));
        }
      };
    } catch (e) {
      console.warn("BroadcastChannel not supported", e);
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setMessages(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      broadcastRef.current?.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [notificationSoundEnabled]);

  // Persist messages
  const saveAndBroadcast = (updated: LiveChatMessage[], newMsg?: LiveChatMessage, updatedMsg?: LiveChatMessage) => {
    setMessages(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (broadcastRef.current) {
      if (newMsg) {
        broadcastRef.current.postMessage({ type: 'NEW_MESSAGE', message: newMsg });
      } else if (updatedMsg) {
        broadcastRef.current.postMessage({ type: 'UPDATE_MESSAGE', message: updatedMsg });
      }
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isOpen, messages, activeChannel]);

  // Handle preSelectedProduct passed from external product table (e.g. "Infokan Kosong" button)
  useEffect(() => {
    if (preSelectedProductForAlert) {
      setSelectedProduct(preSelectedProductForAlert);
      setAlertType('empty');
      setAlertLocation(currentUser.username === 'gudang' ? 'Gudang' : 'Toko');
      setAlertTarget('@admin');
      const nameCol = headers.find(h => h.toLowerCase().includes('nama')) || headers[1] || headers[0];
      setAlertNote(`Stok produk "${preSelectedProductForAlert[nameCol] || ''}" habis fisik di lokasi.`);
      setShowStockModal(true);
      if (onClearPreSelectedProduct) onClearPreSelectedProduct();
    }
  }, [preSelectedProductForAlert]);

  // Filtered messages by active channel
  const channelMessages = useMemo(() => {
    return messages.filter(m => m.channel === activeChannel);
  }, [messages, activeChannel]);

  // Unread count per channel
  const unreadAlertsCount = useMemo(() => {
    return messages.filter(m => m.channel === 'empty-product' && (!m.readBy || !m.readBy.includes(currentUser.username))).length;
  }, [messages, currentUser.username]);

  const unreadGeneralCount = useMemo(() => {
    return messages.filter(m => m.channel === 'general' && (!m.readBy || !m.readBy.includes(currentUser.username))).length;
  }, [messages, currentUser.username]);

  // Mark active channel messages as read
  useEffect(() => {
    if (!isOpen) return;
    let hasChanges = false;
    const updated = messages.map(m => {
      if (m.channel === activeChannel && (!m.readBy || !m.readBy.includes(currentUser.username))) {
        hasChanges = true;
        return {
          ...m,
          readBy: [...(m.readBy || []), currentUser.username]
        };
      }
      return m;
    });

    if (hasChanges) {
      saveAndBroadcast(updated);
    }
  }, [isOpen, activeChannel, messages, currentUser.username]);

  // Filter products in stock modal
  const filteredModalProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 15);
    const s = productSearch.toLowerCase();
    return products.filter(p => {
      return Object.values(p).some(val => String(val).toLowerCase().includes(s));
    }).slice(0, 30);
  }, [products, productSearch]);

  // Send regular text message
  const handleSendTextMessage = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: LiveChatMessage = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      channel: activeChannel,
      senderUsername: currentUser.username,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      senderLocation: currentUser.username === 'gudang' ? 'Gudang' : (currentUser.username === 'toko' ? 'Toko' : 'Admin Area'),
      text: inputText.trim(),
      timestamp: new Date().toISOString(),
      readBy: [currentUser.username]
    };

    saveAndBroadcast([...messages, newMsg], newMsg);
    setInputText('');
    playChime();
  };

  // Submit Empty Stock Alert to Chat
  const handleSubmitStockAlert = () => {
    if (!selectedProduct) return;

    const nameCol = headers.find(h => h.toLowerCase().includes('nama')) || headers[1] || headers[0];
    const skuCol = headers.find(h => h.toLowerCase().includes('sku') || h.toLowerCase().includes('kode'));
    const unitCol = headers.find(h => h.toLowerCase().includes('unit'));
    const fotoCol = headers.find(h => h.toLowerCase().includes('foto'));

    const stockAlert: StockAlertInfo = {
      sku: skuCol && selectedProduct[skuCol] ? String(selectedProduct[skuCol]) : 'SKU-N/A',
      productName: String(selectedProduct[nameCol] || 'Produk Tanpa Nama'),
      unit: unitCol && selectedProduct[unitCol] ? String(selectedProduct[unitCol]) : 'PCS',
      photoUrl: fotoCol && selectedProduct[fotoCol] ? String(selectedProduct[fotoCol]).trim() : undefined,
      stockLocation: alertLocation,
      alertType: alertType,
      customNote: alertNote.trim() || undefined,
      status: 'pending'
    };

    const typeDesc = alertType === 'empty' ? 'STOK KOSONG TOTAL' : (alertType === 'low' ? 'STOK MENIPIS' : (alertType === 'damaged' ? 'PRODUK RUSAK' : 'PERLU REORDER'));
    const msgText = `${alertTarget} Laporan ${typeDesc} untuk produk "${stockAlert.productName}". ${alertNote ? `Catatan: ${alertNote}` : ''}`;

    const newMsg: LiveChatMessage = {
      id: 'msg-alert-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      channel: 'empty-product',
      senderUsername: currentUser.username,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      senderLocation: alertLocation,
      targetUser: alertTarget,
      text: msgText,
      stockAlert: stockAlert,
      timestamp: new Date().toISOString(),
      readBy: [currentUser.username]
    };

    saveAndBroadcast([...messages, newMsg], newMsg);
    setShowStockModal(false);
    setSelectedProduct(null);
    setAlertNote('');
    setActiveChannel('empty-product');
    playChime();
    
    setActionSuccessMsg(`Laporan produk kosong "${stockAlert.productName}" berhasil dikirimkan ke Admin!`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // Update Status on Stock Alert (e.g. Admin marks as acknowledged / reordered)
  const handleUpdateAlertStatus = (msgId: string, newStatus: 'acknowledged' | 'reordered' | 'resolved') => {
    const updated = messages.map(m => {
      if (m.id === msgId && m.stockAlert) {
        const updatedMsg: LiveChatMessage = {
          ...m,
          stockAlert: {
            ...m.stockAlert,
            status: newStatus
          }
        };
        saveAndBroadcast(
          messages.map(x => x.id === msgId ? updatedMsg : x),
          undefined,
          updatedMsg
        );
        return updatedMsg;
      }
      return m;
    });

    // Auto-send a quick reply confirmation
    const targetMsg = messages.find(m => m.id === msgId);
    if (targetMsg && targetMsg.stockAlert) {
      const statusText = newStatus === 'acknowledged' ? 'Sudah diterima & dicatat' : (newStatus === 'reordered' ? 'Sudah dimasukkan rekap pemesanan' : 'Selesai');
      const replyMsg: LiveChatMessage = {
        id: 'msg-reply-' + Date.now(),
        channel: 'empty-product',
        senderUsername: currentUser.username,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        senderLocation: currentUser.username === 'gudang' ? 'Gudang' : 'Toko',
        text: `@${targetMsg.senderUsername} ${statusText} untuk SKU ${targetMsg.stockAlert.sku} (${targetMsg.stockAlert.productName}).`,
        timestamp: new Date().toISOString(),
        readBy: [currentUser.username]
      };
      saveAndBroadcast([...updated, replyMsg], replyMsg);
    }
  };

  // Quick reply buttons
  const sendQuickReply = (text: string) => {
    setInputText(text);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col h-full border-l border-slate-200"
        >
          {/* HEADER */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-5 py-4 flex flex-col gap-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold flex items-center space-x-2">
                    <span>Chat &amp; Info Stok</span>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-300 font-medium">Interaksi Langsung Gudang ⇄ Admin ⇄ Toko</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setNotificationSoundEnabled(!notificationSoundEnabled)}
                  className={"p-1.5 rounded-lg text-xs transition-colors " + (notificationSoundEnabled ? 'text-indigo-300 hover:bg-indigo-800/50' : 'text-slate-500 line-through hover:bg-slate-800')}
                  title={notificationSoundEnabled ? 'Suara Notifikasi Aktif' : 'Suara Notifikasi Hening'}
                >
                  <Bell className="h-4 w-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* SENDER USER STATUS & QUICK SWITCH */}
            <div className="bg-white/10 rounded-xl p-2.5 flex items-center justify-between border border-white/10 text-xs">
              <div className="flex items-center space-x-2 overflow-hidden">
                <div className={"h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] " + (currentUser.username === 'gudang' ? 'bg-amber-400 text-amber-950' : (currentUser.username === 'admin' ? 'bg-indigo-400 text-indigo-950' : 'bg-emerald-400 text-emerald-950'))}>
                  {currentUser.username === 'gudang' ? <Warehouse className="h-3.5 w-3.5" /> : (currentUser.username === 'admin' ? <Store className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />)}
                </div>
                <div className="truncate">
                  <span className="text-[10px] text-slate-300 uppercase block font-semibold">Mengirim Sebagai:</span>
                  <span className="font-bold text-white truncate block">{currentUser.name}</span>
                </div>
              </div>

              <div className="flex items-center space-x-1 flex-shrink-0">
                <span className="text-[10px] text-slate-300 mr-1 hidden sm:inline">Ganti:</span>
                <button
                  onClick={() => onSwitchUser('admin')}
                  className={"px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + (currentUser.username === 'admin' ? 'bg-indigo-500 text-white shadow-sm' : 'bg-white/10 text-slate-200 hover:bg-white/20')}
                >
                  Admin
                </button>
                <button
                  onClick={() => onSwitchUser('gudang')}
                  className={"px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + (currentUser.username === 'gudang' ? 'bg-amber-500 text-amber-950 shadow-sm' : 'bg-white/10 text-slate-200 hover:bg-white/20')}
                >
                  Gudang
                </button>
                <button
                  onClick={() => onSwitchUser('toko')}
                  className={"px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + (currentUser.username === 'toko' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white/10 text-slate-200 hover:bg-white/20')}
                >
                  Toko
                </button>
              </div>
            </div>

            {/* CHANNEL TABS & QUICK ACTION */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
              <div className="flex space-x-1 bg-black/20 p-1 rounded-xl">
                <button
                  onClick={() => setActiveChannel('empty-product')}
                  className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 " + (activeChannel === 'empty-product' ? 'bg-indigo-600 text-white shadow' : 'text-slate-300 hover:text-white')}
                >
                  <PackageX className="h-3.5 w-3.5" />
                  <span>Info Produk Kosong</span>
                  {unreadAlertsCount > 0 && (
                    <span className="bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full">
                      {unreadAlertsCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveChannel('general')}
                  className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 " + (activeChannel === 'general' ? 'bg-indigo-600 text-white shadow' : 'text-slate-300 hover:text-white')}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Obrolan Umum</span>
                  {unreadGeneralCount > 0 && (
                    <span className="bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full">
                      {unreadGeneralCount}
                    </span>
                  )}
                </button>
              </div>

              {/* ACTION: REPORT EMPTY PRODUCT */}
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setAlertNote('');
                  setShowStockModal(true);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-md transform active:scale-95 transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Lapor Kosong</span>
                <span className="sm:hidden">Lapor</span>
              </button>
            </div>

            {/* REAL-TIME RECORDING STATUS STRIP */}
            <div className="flex items-center justify-between bg-black/30 px-3 py-1.5 rounded-lg text-[10px] text-slate-300">
              <div className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                <span className="font-bold text-red-400">REC: Terekam Real-Time</span>
                <span className="text-slate-400">({messages.length} log)</span>
              </div>
              {onOpenRecordingCenter && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenRecordingCenter();
                  }}
                  className="text-[10px] text-indigo-300 hover:text-white font-bold underline flex items-center space-x-1 cursor-pointer"
                >
                  <span>Lihat Audit Log</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          </div>

          {/* SUCCESS BANNER */}
          <AnimatePresence>
            {actionSuccessMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-emerald-500 text-white text-xs font-bold px-4 py-2 flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>{actionSuccessMsg}</span>
                </div>
                <button onClick={() => setActionSuccessMsg(null)}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CHAT MESSAGES BODY */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {channelMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="h-14 w-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-3">
                  {activeChannel === 'empty-product' ? (
                    <PackageX className="h-7 w-7 text-amber-500" />
                  ) : (
                    <MessageSquare className="h-7 w-7 text-indigo-500" />
                  )}
                </div>
                <h3 className="font-bold text-slate-700 text-sm">Belum ada pesan di channel ini</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  {activeChannel === 'empty-product' 
                    ? 'Gudang dapat mengklik tombol "Lapor Kosong" di atas untuk menginfokan produk habis ke Admin.'
                    : 'Gunakan obrolan ini untuk koordinasi operasional sehari-hari.'}
                </p>
              </div>
            ) : (
              channelMessages.map((msg) => {
                const isMe = msg.senderUsername === currentUser.username;
                const isAlert = Boolean(msg.stockAlert);
                const alert = msg.stockAlert;
                
                return (
                  <div key={msg.id} className={"flex flex-col " + (isMe ? 'items-end' : 'items-start')}>
                    {/* SENDER INFO & TIME */}
                    <div className="flex items-center space-x-1.5 mb-1 px-1 text-[10px] font-semibold text-slate-500">
                      <span className={"font-bold " + (msg.senderUsername === 'gudang' ? 'text-amber-700' : (msg.senderUsername === 'admin' ? 'text-indigo-700' : 'text-slate-700'))}>
                        {msg.senderName}
                      </span>
                      {msg.senderLocation && (
                        <span className="bg-slate-200/80 px-1.5 py-0.2 rounded text-[9px]">
                          {msg.senderLocation}
                        </span>
                      )}
                      <span>&bull;</span>
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* MESSAGE BUBBLE */}
                    <div className={"max-w-[90%] sm:max-w-[85%] rounded-2xl p-3.5 shadow-sm text-sm " + 
                      (isAlert 
                        ? 'bg-white border-2 border-amber-300 ring-4 ring-amber-500/10' 
                        : (isMe ? 'bg-indigo-600 text-white rounded-br-xs' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs')
                      )}
                    >
                      {/* STRUCTURED PRODUCT ALERT CARD */}
                      {isAlert && alert && (
                        <div className="space-y-3 mb-2">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center space-x-1.5">
                              <span className={"px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center space-x-1 " + 
                                (alert.alertType === 'empty' ? 'bg-red-100 text-red-700' : 
                                 alert.alertType === 'low' ? 'bg-amber-100 text-amber-800' : 
                                 alert.alertType === 'damaged' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800')
                              }>
                                <AlertTriangle className="h-3 w-3" />
                                <span>{alert.alertType === 'empty' ? 'STOK KOSONG' : (alert.alertType === 'low' ? 'STOK MENIPIS' : 'PERLU RESTOCK')}</span>
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                Lokasi: {alert.stockLocation || 'Gudang'}
                              </span>
                            </div>

                            {/* Alert Status Badge */}
                            <span className={"text-[10px] font-extrabold px-2 py-0.5 rounded-md " + 
                              (alert.status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-200 animate-pulse' : 
                               alert.status === 'acknowledged' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 
                               alert.status === 'reordered' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                            }>
                              {alert.status === 'pending' ? '⏳ Menunggu Respon' : 
                               alert.status === 'acknowledged' ? '👁️ Sudah Dilihat' : 
                               alert.status === 'reordered' ? '📝 Di-Rekap' : '✅ Selesai'}
                            </span>
                          </div>

                          {/* Product Details Item */}
                          <div className="flex items-start space-x-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                            {alert.photoUrl ? (
                              <div className="h-12 w-12 rounded-lg overflow-hidden border border-slate-200 bg-white flex-shrink-0">
                                <img
                                  src={`https://lh3.googleusercontent.com/d/${alert.photoUrl}`}
                                  alt={alert.productName}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/100x100/f1f5f9/94a3b8?text=N/A';
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="h-12 w-12 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 font-bold">
                                <PackageX className="h-6 w-6" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-slate-800 text-xs sm:text-sm leading-tight truncate">
                                {alert.productName}
                              </h4>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                  SKU: {alert.sku}
                                </span>
                                {alert.unit && (
                                  <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                    Satuan: {alert.unit}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {alert.customNote && (
                            <div className="text-xs bg-amber-50/70 text-amber-900 p-2 rounded-lg border border-amber-200/50">
                              <span className="font-bold block text-[10px] uppercase text-amber-700">Catatan Gudang:</span>
                              {alert.customNote}
                            </div>
                          )}

                          {/* ACTION BUTTONS FOR ADMIN / RECEIVER */}
                          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                            <button
                              onClick={() => {
                                // Find matching product from database
                                const match = products.find(p => {
                                  const skuCol = headers.find(h => h.toLowerCase().includes('sku') || h.toLowerCase().includes('kode'));
                                  return skuCol && String(p[skuCol]) === alert.sku;
                                }) || {
                                  id: Date.now(),
                                  SKU: alert.sku,
                                  'Nama Produk': alert.productName,
                                  Unit: alert.unit || 'PCS'
                                };
                                onAddToRekap(match, `Info dari ${msg.senderName}: ${alert.customNote || 'Stok Kosong'}`);
                                handleUpdateAlertStatus(msg.id, 'reordered');
                                setActionSuccessMsg(`Produk "${alert.productName}" dimasukkan ke Keranjang Rekap!`);
                                setTimeout(() => setActionSuccessMsg(null), 3000);
                              }}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-xs transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                              <span>+ Rekap</span>
                            </button>

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
                                onAddToRequest(match, 1);
                                handleUpdateAlertStatus(msg.id, 'reordered');
                                setActionSuccessMsg(`Produk "${alert.productName}" dimasukkan ke Request Outlet!`);
                                setTimeout(() => setActionSuccessMsg(null), 3000);
                              }}
                              className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-xs transition-colors"
                            >
                              <Store className="h-3 w-3" />
                              <span>+ Request</span>
                            </button>

                            <button
                              onClick={() => {
                                onSearchInDatabase(alert.sku || alert.productName);
                                onClose();
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors"
                            >
                              <Search className="h-3 w-3" />
                              <span>Cek Database</span>
                            </button>

                            {alert.status === 'pending' && (
                              <button
                                onClick={() => handleUpdateAlertStatus(msg.id, 'acknowledged')}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors ml-auto"
                              >
                                <Check className="h-3 w-3" />
                                <span>Tandai Dilihat</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* TEXT CONTENT */}
                      <p className={"whitespace-pre-wrap leading-relaxed " + (isAlert ? 'text-xs text-slate-600 font-medium' : '')}>
                        {msg.text.split(' ').map((word, i) => {
                          if (word.startsWith('@')) {
                            return (
                              <span key={i} className={"font-bold px-1 rounded-md mx-0.5 " + 
                                (isMe ? 'bg-white/30 text-white' : 'bg-indigo-100 text-indigo-800')
                              }>
                                {word}{' '}
                              </span>
                            );
                          }
                          return word + ' ';
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* QUICK REPLIES BAR */}
          <div className="bg-slate-100/80 px-3 py-2 border-t border-slate-200 overflow-x-auto flex items-center space-x-1.5 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">Cepat:</span>
            <button
              onClick={() => sendQuickReply('@gudang Siap, laporan sudah dicatat dan dimasukkan ke rekap!')}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap shadow-2xs transition-all"
            >
              👍 Siap di-rekap
            </button>
            <button
              onClick={() => sendQuickReply('@gudang Tolong cek fisik di rak atas / cadangan dulu ya')}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap shadow-2xs transition-all"
            >
              🔍 Cek rak atas
            </button>
            <button
              onClick={() => sendQuickReply('@admin Apakah barang ini sudah di-order ke supplier?')}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap shadow-2xs transition-all"
            >
              ❓ Tanya status order
            </button>
          </div>

          {/* INPUT FORM */}
          <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
            <form onSubmit={handleSendTextMessage} className="flex items-center space-x-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={activeChannel === 'empty-product' ? "Ketik pesan / @admin untuk infokan..." : "Ketik pesan obrolan..."}
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </motion.div>
      </div>

      {/* MODAL LAPORKAN PRODUK KOSONG */}
      <AnimatePresence>
        {showStockModal && (
          <div className="fixed inset-0 z-60 overflow-y-auto flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStockModal(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full z-70 overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
            >
              {/* MODAL HEADER */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-4 flex justify-between items-center">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <PackageX className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Infokan Produk Kosong ke Admin</h3>
                    <p className="text-xs text-amber-100">Bagian Gudang mengirimkan notifikasi stok produk habis</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowStockModal(false)}
                  className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* MODAL BODY */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {/* 1. Pilih Produk dari Database */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    1. Cari &amp; Pilih Produk dari Database:
                  </label>
                  
                  {selectedProduct ? (
                    <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="p-2 bg-amber-100 text-amber-800 rounded-lg font-bold text-xs">
                          SKU: {selectedProduct.SKU || selectedProduct[headers[0]]}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {selectedProduct['Nama Produk'] || selectedProduct[headers[1]]}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Unit: {selectedProduct.Unit || 'PCS'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(null)}
                        className="text-xs text-amber-700 font-bold underline hover:text-amber-900 ml-2"
                      >
                        Ganti
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type="text"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Ketik SKU atau Nama Produk..."
                          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                      </div>

                      <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                        {filteredModalProducts.length > 0 ? (
                          filteredModalProducts.map((p, idx) => {
                            const nameCol = headers.find(h => h.toLowerCase().includes('nama')) || headers[1] || headers[0];
                            const skuCol = headers.find(h => h.toLowerCase().includes('sku') || h.toLowerCase().includes('kode'));
                            const unitCol = headers.find(h => h.toLowerCase().includes('unit'));

                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedProduct(p)}
                                className="w-full text-left p-2.5 hover:bg-amber-50 transition-colors flex items-center justify-between text-xs"
                              >
                                <div className="truncate mr-2">
                                  <span className="font-bold text-slate-800 block truncate">{p[nameCol]}</span>
                                  <span className="text-[10px] font-mono text-slate-400">{skuCol ? p[skuCol] : ''}</span>
                                </div>
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                                  Pilih
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-400">
                            Produk tidak ditemukan
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Kondisi / Status Stok */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      2. Status Stok:
                    </label>
                    <select
                      value={alertType}
                      onChange={(e: any) => setAlertType(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="empty">🔴 Habis Total (Stok 0)</option>
                      <option value="low">🟡 Stok Menipis (&lt; 5)</option>
                      <option value="damaged">⚠️ Rusak / Cacat Fisik</option>
                      <option value="reorder">🔄 Perlu Re-order Cepat</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      3. Lokasi Fisik:
                    </label>
                    <select
                      value={alertLocation}
                      onChange={(e) => setAlertLocation(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="Gudang">Gudang Utama</option>
                      <option value="Toko Pusat">Toko Pusat</option>
                      <option value="Online Gudang">Online Gudang</option>
                      <option value="Outlet">Outlet</option>
                    </select>
                  </div>
                </div>

                {/* 4. Target User */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    4. Tag / Beritahu:
                  </label>
                  <div className="flex space-x-2">
                    {['@admin', '@toko', '@semua'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAlertTarget(t)}
                        className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (alertTarget === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Catatan Tambahan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    5. Catatan / Keterangan Gudang:
                  </label>
                  <textarea
                    rows={2}
                    value={alertNote}
                    onChange={(e) => setAlertNote(e.target.value)}
                    placeholder="Contoh: Stok di rak B habis total, pelanggan cari barang ini tadi."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>

                <button
                  type="button"
                  disabled={!selectedProduct}
                  onClick={handleSubmitStockAlert}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Kirim ke Admin Sekarang</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
