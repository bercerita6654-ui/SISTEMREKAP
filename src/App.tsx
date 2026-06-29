/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef, MouseEvent } from 'react';
import {
  Search,
  RefreshCw,
  AlertCircle,
  Database,
  Plus,
  Trash2,
  Copy,
  Check,
  ListChecks,
  ChevronLeft,
  ChevronRight,
  Save,
  Download,
  History,
  ShoppingCart,
  FileDown,
  Store,
  ChevronDown,
  User,
  Bell,
  LogOut,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Product, RekapItem, RequestItem, HistorySession, UserSession } from './types';
import {
  parseCSV,
  parseDateSafe,
  generateCopyText,
  generateRequestCopyText,
  downloadCSV,
  getGreeting
} from './utils';

import SetupModal from './components/SetupModal';
import NotifDetailModal from './components/NotifDetailModal';

const LATEST_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzihvW3D5bTHW0mvcTh_cyYBl-0lTuuIqsx1fmQTiZx5bw2vuI29CzsFm0dG3fgbnTw/exec';
const HISTORY_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQcOP2SJiiNjZS7ARP5HPL3Eb1_Ogwjb3L5w0oMHgVgcLdK_uUcejUWFfGUpQcpabJnQSaIr93_p_We/pub?gid=0&single=true&output=csv';
const MASTER_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTCxz1GPm7QU9IS1yBiSjvIdNTLUsvvplOCyT_R3XH4O-LuVbHoY_bXn1LTH5lpnlolJ29BhUgEdnFm/pub?gid=1564332470&single=true&output=csv';

const ADMIN_NAMES = ['Bobby', 'Putri', 'Mayank', 'Winda'];
const DESTINATION_OPTIONS = ['SDK', 'TRK', 'PDS', 'TBN', 'TYA', 'MMG'];
const ITEMS_PER_PAGE = 30;
const HISTORY_ITEMS_PER_PAGE = 10;

export default function App() {
  const [loggedInUser, setLoggedInUser] = useState<UserSession>(() => {
    const saved = localStorage.getItem('loggedInUser');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below
      }
    }
    return {
      username: 'online',
      role: 'store',
      name: 'Admin Online'
    };
  });

  const [data, setData] = useState<Product[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [rekap, setRekap] = useState<RekapItem[]>([]);
  const [copied, setCopied] = useState(false);

  const [requestItems, setRequestItems] = useState<RequestItem[]>([]);
  const [copiedRequestOnly, setCopiedRequestOnly] = useState(false);
  const [copiedRequestSave, setCopiedRequestSave] = useState(false);

  const [requesterLocation, setRequesterLocation] = useState('Gudang');
  const [isCustomLocation, setIsCustomLocation] = useState(false);
  const [customLocation, setCustomLocation] = useState('');

  const [requesterName, setRequesterName] = useState('Bobby');
  const [customName, setCustomName] = useState('');
  const [isCustomName, setIsCustomName] = useState(false);

  const [destinationOutlet, setDestinationOutlet] = useState('SDK');

  const [currentPage, setCurrentPage] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [selectedNotifSession, setSelectedNotifSession] = useState<HistorySession | null>(null);

  const [scriptUrl, setScriptUrl] = useState(() => {
    return localStorage.getItem('gasScriptUrl') || LATEST_SCRIPT_URL;
  });

  const [historyCsvUrl, setHistoryCsvUrl] = useState(() => {
    return localStorage.getItem('gasHistoryCsvUrl') || HISTORY_CSV_URL;
  });

  const [activeTab, setActiveTab] = useState<'database' | 'request' | 'history'>('database');
  const [showInbox, setShowInbox] = useState(false);

  const [readNotifs, setReadNotifs] = useState<string[]>(() => {
    const saved = localStorage.getItem('readNotifs');
    return saved ? JSON.parse(saved) : [];
  });

  const [historyFilterType, setHistoryFilterType] = useState<'rekap' | 'request'>('rekap');
  const [historyFilterMonth, setHistoryFilterMonth] = useState('all');
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [copiedAllId, setCopiedAllId] = useState<string | null>(null);

  const [savedHistory, setSavedHistory] = useState<HistorySession[]>(() => {
    const saved = localStorage.getItem('rekapSavedHistory');
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);

  const userRole = loggedInUser?.role || 'store';

  // Computed Options based on current logged in user
  const currentAdminOptions = useMemo(() => {
    if (!loggedInUser) return [];
    if (loggedInUser.username === 'gudang') return ADMIN_NAMES;
    if (loggedInUser.username === 'toko') return []; // force custom input
    return ADMIN_NAMES;
  }, [loggedInUser]);

  const currentLocationOptions = useMemo(() => {
    if (!loggedInUser) return ['Gudang', 'Toko Pusat'];
    if (loggedInUser.username === 'gudang') return ['Gudang'];
    if (loggedInUser.username === 'toko') return ['Toko Pusat'];
    if (loggedInUser.username === 'online') return ['Online Gudang', 'Online Toko'];
    return ['Gudang', 'Toko Pusat'];
  }, [loggedInUser]);

  // Set default settings upon login
  const handleLoginSuccess = (session: UserSession) => {
    setLoggedInUser(session);
    localStorage.setItem('loggedInUser', JSON.stringify(session));
  };

  // Synchronize settings when loggedInUser changes
  useEffect(() => {
    if (loggedInUser) {
      if (loggedInUser.role === 'store') {
        if (loggedInUser.username === 'gudang') {
          setRequesterName('Bobby');
          setIsCustomName(false);
          setRequesterLocation('Gudang');
          setIsCustomLocation(false);
        } else if (loggedInUser.username === 'toko') {
          setIsCustomName(true);
          setRequesterLocation('Toko Pusat');
          setIsCustomLocation(false);
        } else if (loggedInUser.username === 'online') {
          setRequesterName('Bobby');
          setIsCustomName(false);
          setRequesterLocation('Online Gudang');
          setIsCustomLocation(false);
        } else {
          setRequesterName('Bobby');
          setIsCustomName(false);
          setRequesterLocation('Gudang');
          setIsCustomLocation(false);
        }
      }
    }
  }, [loggedInUser]);

  const handleLogout = () => {
    const defaultUser = {
      username: 'online',
      role: 'store' as const,
      name: 'Admin Online'
    };
    setLoggedInUser(defaultUser);
    localStorage.setItem('loggedInUser', JSON.stringify(defaultUser));
  };

  // Fetch product master and sheet history
  const fetchData = async () => {
    if (!loggedInUser) return;
    setLoading(true);
    setError(null);

    try {
      const cacheBuster = `&t=${new Date().getTime()}`;
      let response: Response;

      try {
        response = await fetch(MASTER_CSV_URL + cacheBuster);
      } catch {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(MASTER_CSV_URL + cacheBuster)}`;
        response = await fetch(proxyUrl);
      }

      if (!response.ok) {
        throw new Error(`Gagal mengambil data master stock: HTTP ${response.status}`);
      }

      const csvText = await response.text();
      if (csvText.trim().toLowerCase().startsWith('<!doctype') || csvText.trim().toLowerCase().startsWith('<html')) {
        throw new Error("Akses ditolak. Pastikan Google Sheet Anda telah 'Dipublikasikan ke web' dengan format 'CSV'.");
      }

      const parsedArray = parseCSV(csvText);
      if (parsedArray.length > 1) {
        const fixedHeaders = ['SKU', 'Nama Produk', 'Unit', 'Merk', 'Foto Produk'];
        const extractedData: Product[] = parsedArray.slice(1).map((row, index) => {
          return {
            id: index,
            'SKU': row[0] ? String(row[0]).trim() : '',
            'Nama Produk': row[2] ? String(row[2]).trim() : '',
            'Unit': row[3] ? String(row[3]).trim() : '',
            'Merk': row[6] ? String(row[6]).trim() : '',
            'Foto Produk': row[21] ? String(row[21]).trim() : ''
          };
        }).filter(row => row['Nama Produk'] !== '' || row['SKU'] !== '');

        setHeaders(fixedHeaders);
        setData(extractedData);
      }

      // Fetch History from online database sheet
      if (historyCsvUrl) {
        try {
          let histRes: Response;
          try {
            histRes = await fetch(historyCsvUrl + cacheBuster);
          } catch {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(historyCsvUrl + cacheBuster)}`;
            histRes = await fetch(proxyUrl);
          }

          if (histRes.ok) {
            const histText = await histRes.text();
            if (!histText.trim().toLowerCase().startsWith('<!doctype') && !histText.trim().toLowerCase().startsWith('<html')) {
              const histRows = parseCSV(histText);
              const groups = new Map<string, HistorySession>();

              histRows.forEach((row, idx) => {
                if (idx === 0 && String(row[0]).toLowerCase().includes('id')) return;
                if (row.length >= 3) {
                  const timeVal = String(row[0]).trim();
                  const typeVal = String(row[1]).trim();
                  const jsonVal = String(row[2]).trim();

                  let chatHistory = [];
                  if (row.length >= 4 && row[3] && String(row[3]).trim().startsWith('[')) {
                    try { chatHistory = JSON.parse(row[3]); } catch {}
                  }

                  let reqNameVal = 'Admin';
                  if (row.length >= 5 && row[4]) {
                    reqNameVal = String(row[4]).trim();
                  }

                  if (jsonVal && jsonVal.startsWith('[')) {
                    try {
                      const items = JSON.parse(jsonVal);
                      if (!groups.has(timeVal)) {
                        groups.set(timeVal, {
                          id: timeVal,
                          date: timeVal,
                          type: typeVal === 'request' ? 'request' : 'save',
                          items: items,
                          text: '',
                          chatHistory: chatHistory,
                          requester: reqNameVal
                        });
                      }
                    } catch {}
                  }
                }
              });

              const sheetHistory = Array.from(groups.values());
              sheetHistory.forEach(session => {
                if (session.type === 'request') {
                  let histDest = 'Outlet';
                  let histReqName = 'Admin';
                  if (session.requester) {
                    let parts = session.requester.split(' ⬅ Outlet: ');
                    if (parts.length === 1) parts = session.requester.split(' ➔ Tujuan: ');
                    histReqName = parts[0];
                    if (parts.length > 1) histDest = parts[1];
                  }
                  session.text = generateRequestCopyText(session.items, histDest, histReqName, ['SKU', 'Nama Produk', 'Unit']);
                } else {
                  session.text = generateCopyText(session.items, ['SKU', 'Nama Produk']);
                }
              });

              setSavedHistory(prev => {
                const localDataMap = new Map<string, HistorySession>();
                prev.forEach(p => {
                  if (p.type === 'copy' || !p.id.includes('ID-')) {
                    localDataMap.set(p.id, p);
                  }
                });

                sheetHistory.forEach(sheetSession => {
                  if (localDataMap.has(sheetSession.id)) {
                    const localSession = localDataMap.get(sheetSession.id)!;
                    if (localSession.chatHistory && localSession.chatHistory.length > sheetSession.chatHistory.length) {
                      sheetSession.chatHistory = localSession.chatHistory;
                    }
                    if (!sheetSession.requester && localSession.requester) {
                      sheetSession.requester = localSession.requester;
                    }
                  }
                  localDataMap.set(sheetSession.id, sheetSession);
                });

                const uniqueCombined = Array.from(localDataMap.values());
                return uniqueCombined.sort((a, b) => {
                  const dateA = parseDateSafe(a.date).getTime();
                  const dateB = parseDateSafe(b.date).getTime();
                  if (!isNaN(dateA) && !isNaN(dateB)) return dateB - dateA;
                  return 0;
                });
              });
            }
          }
        } catch (err) {
          console.error("Gagal menarik riwayat dari Sheets: ", err);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memuat data.');
    } finally {
      setLoading(false);
    }
  };

  // Run auto-fetch on mount/config change
  useEffect(() => {
    if (loggedInUser && scriptUrl && historyCsvUrl) {
      fetchData();
    }
  }, [loggedInUser, scriptUrl, historyCsvUrl]);

  // Adjust default tab for cs (purchasing) role upon login
  useEffect(() => {
    if (userRole === 'purchasing' && activeTab === 'database') {
      setActiveTab('history');
    }
  }, [userRole, activeTab]);

  // Reset pages
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  useEffect(() => {
    setHistoryCurrentPage(1);
  }, [historyFilterType, historyFilterMonth, historySearchTerm]);

  // Notification lists
  const notifications = useMemo(() => {
    if (!loggedInUser) return [];
    const notifs: any[] = [];
    
    savedHistory.forEach(session => {
      if (session.chatHistory && session.chatHistory.length > 0) {
        const lastChat = session.chatHistory[session.chatHistory.length - 1];
        if (lastChat.role !== userRole) {
          const notifId = `${session.id}-chat-${session.chatHistory.length}`;
          notifs.push({
            id: notifId,
            sessionId: session.id,
            title: `Pesan baru dari ${lastChat.sender}`,
            message: lastChat.text,
            date: lastChat.timestamp,
            isRead: readNotifs.includes(notifId)
          });
        }
      }

      if (userRole === 'purchasing') {
        const notifId = `${session.id}-new`;
        notifs.push({
          id: notifId,
          sessionId: session.id,
          title: session.type === 'request' ? 'Request Outlet Baru' : 'Laporan Produk Kosong Baru',
          message: `Terdapat ${session.items?.length || 0} produk dilaporkan.`,
          date: session.date,
          isRead: readNotifs.includes(notifId)
        });
      }
    });

    return notifs.sort((a, b) => {
      const dateA = parseDateSafe(a.date).getTime();
      const dateB = parseDateSafe(b.date).getTime();
      return (!isNaN(dateB) && !isNaN(dateA)) ? dateB - dateA : 0;
    }).slice(0, 50);
  }, [savedHistory, loggedInUser, readNotifs, userRole]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = (notif: any) => {
    if (!notif.isRead) {
      const updatedRead = [...readNotifs, notif.id];
      setReadNotifs(updatedRead);
      localStorage.setItem('readNotifs', JSON.stringify(updatedRead));
    }
    setShowInbox(false);
    
    const sessionToView = savedHistory.find(s => s.id === notif.sessionId);
    if (sessionToView) {
      setSelectedNotifSession(sessionToView);
    } else {
      setActiveTab('history');
    }
  };

  const handleMarkAllRead = (e: MouseEvent) => {
    e.stopPropagation();
    const allIds = notifications.map(n => n.id);
    const combinedRead = Array.from(new Set([...readNotifs, ...allIds]));
    setReadNotifs(combinedRead);
    localStorage.setItem('readNotifs', JSON.stringify(combinedRead));
  };

  const getFinalRequesterName = () => {
    const forceCustomName = currentAdminOptions.length === 0;
    const finalName = (isCustomName || forceCustomName) ? customName : requesterName;
    
    const forceCustomLoc = currentLocationOptions.length === 0;
    const finalLoc = (isCustomLocation || forceCustomLoc) ? customLocation : requesterLocation;

    return `${finalLoc} (${finalName || 'Admin'})`;
  };

  const handleAdd = (item: Product) => {
    if (activeTab === 'database') {
      if (!rekap.some(r => r.id === item.id)) {
        setRekap([...rekap, { ...item, _catatan: '' }]);
      }
    } else if (activeTab === 'request') {
      if (!requestItems.some(r => r.id === item.id)) {
        setRequestItems([...requestItems, { ...item, _qty: 1 }]);
      }
    }
  };

  const handleRemove = (id: number) => {
    if (activeTab === 'database') {
      setRekap(rekap.filter(r => r.id !== id));
    } else if (activeTab === 'request') {
      setRequestItems(requestItems.filter(r => r.id !== id));
    }
  };

  const handleNoteChange = (id: number, noteValue: string) => {
    setRekap(rekap.map(r => r.id === id ? { ...r, _catatan: noteValue } : r));
  };

  const handleQtyChange = (id: number, qtyValue: number) => {
    setRequestItems(requestItems.map(r => r.id === id ? { ...r, _qty: qtyValue } : r));
  };

  const executeCopy = (text: string, setCopiedState: (v: boolean) => void, typeLabel: 'copy' | 'request', items: any[], saveToHistory = true) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);

      if (saveToHistory) {
        const newSessionId = 'ID-' + new Date().toISOString(); 
        const newSession: HistorySession = {
          id: newSessionId,
          date: newSessionId,
          type: typeLabel === 'request' ? 'request' : 'save',
          items: items,
          text: text,
          chatHistory: [],
          requester: typeLabel === 'request' ? `${getFinalRequesterName()} ⬅ Outlet: ${destinationOutlet}` : (loggedInUser?.name || 'Admin')
        };
        const newHistory = [newSession, ...savedHistory];
        setSavedHistory(newHistory);
        localStorage.setItem('rekapSavedHistory', JSON.stringify(newHistory));
      }
    } catch (err) {
      console.error('Gagal menyalin', err);
    }
    document.body.removeChild(textArea);
  };

  const handleCopy = () => {
    if (rekap.length === 0) return;
    const text = generateCopyText(rekap, ['SKU', 'Nama Produk']);
    executeCopy(text, setCopied, 'copy', rekap, true);
  };

  const handleCopyRequest = async (saveToHistory: boolean) => {
    if (requestItems.length === 0) return;
    const text = generateRequestCopyText(requestItems, destinationOutlet, getFinalRequesterName(), ['SKU', 'Nama Produk', 'Unit']);
    
    if (saveToHistory) {
      if (!scriptUrl) {
        setShowSetupModal(true);
        return;
      }

      setCopiedRequestSave(true);
      const newSessionId = 'ID-' + new Date().toISOString(); 
      const finalReqName = `${getFinalRequesterName()} ⬅ Outlet: ${destinationOutlet}`;
      
      try {
        const payload = JSON.stringify({ 
          action: 'save_rekap', 
          sessionId: newSessionId, 
          tipe: 'request',
          requester: finalReqName,
          items: requestItems
        });
        await fetch(scriptUrl, { 
          method: 'POST', 
          mode: 'no-cors', 
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
          body: payload 
        });
      } catch (e) { 
        console.error(e); 
      }
      
      const newSession: HistorySession = {
        id: newSessionId,
        date: newSessionId,
        type: 'request',
        items: requestItems,
        text: text,
        chatHistory: [],
        requester: finalReqName
      };
      const newHistory = [newSession, ...savedHistory];
      setSavedHistory(newHistory);
      localStorage.setItem('rekapSavedHistory', JSON.stringify(newHistory));
      
      // Traditional clipboards
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus(); 
      textArea.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(textArea);

      setTimeout(() => { 
        setCopiedRequestSave(false); 
        setRequestItems([]); 
        fetchData(); 
      }, 2000);
    } else {
      executeCopy(text, setCopiedRequestOnly, 'request', requestItems, false);
    }
  };

  const handleSaveToSheet = async () => {
    if (!scriptUrl) {
      setShowSetupModal(true);
      return;
    }

    setIsSaving(true);
    const newSessionId = 'ID-' + new Date().toISOString();
    const reqName = loggedInUser?.name || 'Admin';
    
    try {
      const payload = JSON.stringify({ 
        action: 'save_rekap', 
        sessionId: newSessionId, 
        tipe: 'save',
        requester: reqName,
        items: rekap
      });
      
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: payload
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      const text = generateCopyText(rekap, ['SKU', 'Nama Produk']);
      const newSession: HistorySession = {
        id: newSessionId,
        date: newSessionId,
        type: 'save',
        items: rekap,
        text: text,
        chatHistory: [],
        requester: reqName
      };
      
      const newHistory = [newSession, ...savedHistory];
      setSavedHistory(newHistory);
      localStorage.setItem('rekapSavedHistory', JSON.stringify(newHistory));
      
      setTimeout(() => {
        fetchData();
      }, 1500);
      
      setRekap([]);
    } catch {
      setError("Gagal mengirim data ke Sheets. Periksa koneksi internet Anda.");
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Interactive Comment handler
  const onSubmitReply = async (sessionId: string, text: string): Promise<boolean> => {
    if (!text.trim() || !scriptUrl) return false;
    
    const sessionIndex = savedHistory.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) return false;
    
    const currentSession = savedHistory[sessionIndex];
    const newChatHistory = [...(currentSession.chatHistory || []), {
      sender: loggedInUser?.name || 'Admin',
      role: loggedInUser?.role || 'store',
      text: text,
      timestamp: 'ID-' + new Date().toISOString()
    }];

    const updatedHistory = [...savedHistory];
    updatedHistory[sessionIndex] = { ...currentSession, chatHistory: newChatHistory };
    
    setSavedHistory(updatedHistory);
    localStorage.setItem('rekapSavedHistory', JSON.stringify(updatedHistory));
    
    try {
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          action: 'add_comment', 
          timestampKey: sessionId, 
          comment: JSON.stringify(newChatHistory) 
        })
      });
      
      setTimeout(() => {
        fetchData();
      }, 1000);
      return true;
    } catch (e) {
      console.error("Gagal mengirim komentar", e);
      return false;
    }
  };

  const handleSetupSave = (newScriptUrl: string, newHistoryCsvUrl: string) => {
    setScriptUrl(newScriptUrl);
    setHistoryCsvUrl(newHistoryCsvUrl);
    localStorage.setItem('gasScriptUrl', newScriptUrl);
    localStorage.setItem('gasHistoryCsvUrl', newHistoryCsvUrl);
    setShowSetupModal(false);
    fetchData();
  };

  // Filters logic
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const lowercasedTerm = searchTerm.toLowerCase();
    return data.filter(row => {
      return headers.some(header => 
        String(row[header]).toLowerCase().includes(lowercasedTerm)
      );
    });
  }, [data, headers, searchTerm]);

  const displayHeaders = useMemo(() => {
    if (headers.length === 0) return [];
    const targets = ['sku', 'nama produk', 'unit', 'stock gudang', 'stock toko'];
    const result: string[] = [];
    
    targets.forEach(target => {
      let match = headers.find(h => h.toLowerCase().trim() === target);
      if (!match) {
        match = headers.find(h => h.toLowerCase().includes(target));
      }
      if (match && !result.includes(match)) {
        result.push(match);
      }
    });
    
    return result.length > 0 ? result : headers;
  }, [headers]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentData = filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // History Filter
  const filteredHistory = useMemo(() => {
    let result = savedHistory;

    if (historyFilterType === 'rekap') {
      result = result.filter(h => h.type === 'save' || h.type === 'copy');
    } else if (historyFilterType === 'request') {
      result = result.filter(h => h.type === 'request');
    }

    if (historyFilterMonth !== 'all') {
      result = result.filter(h => {
        const d = parseDateSafe(h.date);
        if (isNaN(d.getTime())) return false; 
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return monthStr === historyFilterMonth;
      });
    }

    if (historySearchTerm && historySearchTerm.trim() !== '') {
      const term = historySearchTerm.toLowerCase();
      const nameCol = headers.find(h => h.toLowerCase().includes('nama')) || headers[1] || headers[0];
      const skuCol = headers.find(h => h.toLowerCase().includes('sku') || h.toLowerCase().includes('kode'));

      result = result.filter(session => {
        return session.items && session.items.some(item => {
          const name = String(item[nameCol] || '').toLowerCase();
          const sku = skuCol ? String(item[skuCol] || '').toLowerCase() : '';
          return name.includes(term) || sku.includes(term);
        });
      });
    }

    return result;
  }, [savedHistory, historyFilterType, historyFilterMonth, historySearchTerm, headers]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    savedHistory.forEach(h => {
      const d = parseDateSafe(h.date);
      if (!isNaN(d.getTime())) {
        months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    });
    return Array.from(months).sort().reverse().map(m => {
      const [year, month] = m.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
      return {
        value: m,
        label: dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      };
    });
  }, [savedHistory]);

  const groupedHistory = useMemo(() => {
    const groups: Record<string, HistorySession[]> = {};
    filteredHistory.forEach(session => {
      const d = parseDateSafe(session.date);
      let dateKey = 'Tanggal Tidak Diketahui';
      
      if (!isNaN(d.getTime())) {
        dateKey = d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      } else if (session.date) {
        dateKey = String(session.date).split(' ')[0] || 'Tanggal Tidak Diketahui';
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(session);
    });
    return groups;
  }, [filteredHistory]);

  const groupedHistoryEntries = useMemo(() => Object.entries(groupedHistory), [groupedHistory]);
  const totalHistoryPages = Math.ceil(groupedHistoryEntries.length / HISTORY_ITEMS_PER_PAGE);
  const historyStartIndex = (historyCurrentPage - 1) * HISTORY_ITEMS_PER_PAGE;
  const currentGroupedHistory = groupedHistoryEntries.slice(historyStartIndex, historyStartIndex + HISTORY_ITEMS_PER_PAGE);

  const handleCopyAllForDate = (sessions: HistorySession[], dateKey: string) => {
    const nameCol = headers.find(h => h.toLowerCase().includes('nama')) || headers[1] || headers[0];
    const skuCol = headers.find(h => h.toLowerCase().includes('sku') || h.toLowerCase().includes('kode'));
    
    const allItemsMap = new Map<string, any>();
    
    sessions.forEach(session => {
      session.items.forEach(item => {
        const uniqueKey = (skuCol && item[skuCol]) ? item[skuCol] : item[nameCol] || item.id;
        
        if (allItemsMap.has(uniqueKey)) {
          if (historyFilterType === 'request') {
            const existing = allItemsMap.get(uniqueKey);
            existing._qty = (parseInt(existing._qty) || 0) + (parseInt(item._qty) || 0);
          } else {
            const existing = allItemsMap.get(uniqueKey);
            if (item._catatan && !existing._catatan?.includes(item._catatan)) {
              existing._catatan = existing._catatan ? existing._catatan + ' | ' + item._catatan : item._catatan;
            }
          }
        } else {
          allItemsMap.set(uniqueKey, { ...item });
        }
      });
    });

    const mergedItems = Array.from(allItemsMap.values());
    let text = '';
    if (historyFilterType === 'request') {
      let histDest = 'Outlet';
      let histReqName = 'Admin';
      if (sessions[0].requester) {
        let parts = sessions[0].requester.split(' ⬅ Outlet: ');
        if (parts.length === 1) parts = sessions[0].requester.split(' ➔ Tujuan: ');
        histReqName = parts[0];
        if (parts.length > 1) histDest = parts[1];
      }
      text = generateRequestCopyText(mergedItems, histDest, histReqName, ['SKU', 'Nama Produk', 'Unit']);
    } else {
      text = generateCopyText(mergedItems, ['SKU', 'Nama Produk'], dateKey);
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopiedAllId(dateKey);
      setTimeout(() => setCopiedAllId(null), 2000);
    } catch (err) {
      console.error('Gagal menyalin', err);
    }
    document.body.removeChild(textArea);
  };

  const checkCurrentStock = (historyItem: any) => {
    if (!data || data.length === 0 || !headers) return null;

    const skuCol = headers.find(h => h.toLowerCase().includes('sku') || h.toLowerCase().includes('kode'));
    const nameCol = headers.find(h => h.toLowerCase().includes('nama')) || headers[1] || headers[0];
    
    let currentItem = null;
    if (skuCol && historyItem[skuCol]) {
      currentItem = data.find(d => d[skuCol] === historyItem[skuCol]);
    } else if (nameCol && historyItem[nameCol]) {
      currentItem = data.find(d => d[nameCol] === historyItem[nameCol]);
    }

    if (!currentItem) return null;

    const stockGudangCol = headers.find(h => h.toLowerCase().includes('gudang'));
    const stockTokoCol = headers.find(h => h.toLowerCase().includes('toko'));

    let totalStock = 0;
    let stockFound = false;

    if (stockGudangCol && currentItem[stockGudangCol]) {
      const valStr = String(currentItem[stockGudangCol]).replace(/[^0-9.-]+/g,"");
      const val = parseFloat(valStr);
      if (!isNaN(val)) { totalStock += val; stockFound = true; }
    }
    if (stockTokoCol && currentItem[stockTokoCol]) {
      const valStr = String(currentItem[stockTokoCol]).replace(/[^0-9.-]+/g,"");
      const val = parseFloat(valStr);
      if (!isNaN(val)) { totalStock += val; stockFound = true; }
    }

    return stockFound ? totalStock : null;
  };

  const renderMessageWithTags = (text: string, isOwnMsg: boolean, isRequestTab: boolean) => {
    return text.split(' ').map((word, i) => {
      if (word.startsWith('@') && word.length > 1) {
        return (
          <span key={i} className={"font-bold px-1 rounded-md mx-0.5 " + 
            (isOwnMsg 
              ? 'bg-white/30 text-white' 
              : (isRequestTab ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800')
            )}
          >
            {word}
          </span>
        );
      }
      return word + ' ';
    });
  };

  // Re-sync activeModalSession in real-time
  const activeModalSession = selectedNotifSession 
    ? (savedHistory.find(s => s.id === selectedNotifSession.id) || selectedNotifSession) 
    : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-indigo-200">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* TOP HEADER - ROLE & NOTIF */}
          <div className="flex justify-between items-center py-2 border-b border-slate-100 gap-2">
            <div className="flex items-center space-x-2">
              {!(userRole === 'store' && activeTab === 'request') ? (
                <>
                  <span className="text-xs font-bold text-slate-500 px-1">Akses Pengguna:</span>
                  <select
                    value={loggedInUser.username}
                    onChange={(e) => {
                      const users: Record<string, { role: 'store' | 'purchasing'; name: string }> = {
                        toko: { role: 'store', name: 'Admin Toko' },
                        gudang: { role: 'store', name: 'Admin Gudang' },
                        online: { role: 'store', name: 'Admin Online' },
                        sales: { role: 'store', name: 'Admin Sales' },
                        cs: { role: 'purchasing', name: 'Purchasing (CS)' }
                      };
                      const userKey = e.target.value;
                      const u = users[userKey];
                      if (u) {
                        handleLoginSuccess({
                          username: userKey,
                          role: u.role,
                          name: u.name
                        });
                      }
                    }}
                    className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-100 rounded-lg px-2.5 py-1 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-all"
                  >
                    <option value="online">Admin Online</option>
                    <option value="toko">Admin Toko</option>
                    <option value="gudang">Admin Gudang</option>
                    <option value="sales">Admin Sales</option>
                    <option value="cs">Purchasing (CS)</option>
                  </select>
                </>
              ) : (
                <div className="flex items-center space-x-1 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1 select-none">
                  <span>👤</span>
                  <span>{loggedInUser.name}</span>
                </div>
              )}
            </div>
             
            <div className="flex items-center space-x-2 relative">
              {/* NOTIFICATION INBOX */}
              <div className="relative">
                <button 
                  onClick={() => setShowInbox(!showInbox)}
                  className="flex items-center justify-center p-1.5 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 rounded-full transition-all shadow-sm active:scale-95 relative"
                  title="Kotak Masuk"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center border-2 border-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* INBOX DROPDOWN */}
                <AnimatePresence>
                  {showInbox && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowInbox(false)}></div>
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden ring-1 ring-black/5"
                      >
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-bold text-slate-800 text-sm">Notifikasi</h3>
                            {unreadCount > 0 && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">{unreadCount} Baru</span>}
                          </div>
                          {unreadCount > 0 && (
                            <button onClick={handleMarkAllRead} className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 underline">
                              Tandai Dibaca
                            </button>
                          )}
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="px-4 py-6 text-center text-slate-500 text-xs font-medium">Belum ada notifikasi.</div>
                          ) : (
                            <ul className="divide-y divide-slate-50">
                              {notifications.map(notif => (
                                <li 
                                  key={notif.id} 
                                  onClick={() => handleNotificationClick(notif)}
                                  className={"p-3 cursor-pointer transition-colors hover:bg-slate-50 " + (!notif.isRead ? 'bg-indigo-50/30' : '')}
                                >
                                  <div className="flex justify-between items-start mb-1">
                                    <p className={"text-xs font-bold " + (!notif.isRead ? 'text-indigo-700' : 'text-slate-700')}>{notif.title}</p>
                                    {!notif.isRead && <span className="h-2 w-2 rounded-full bg-indigo-500"></span>}
                                  </div>
                                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{notif.message}</p>
                                  <p className="text-[9px] text-slate-400 mt-1.5 font-medium">
                                    {(() => {
                                      const d = parseDateSafe(notif.date);
                                      return !isNaN(d.getTime()) ? d.toLocaleDateString('id-ID', {day: 'numeric', month: 'short', hour:'2-digit', minute:'2-digit'}) : notif.date;
                                    })()}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* SETUP SYSTEM TRIGGER */}
              <button 
                onClick={() => setShowSetupModal(true)}
                className="flex items-center space-x-2 p-1.5 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 rounded-full transition-all shadow-sm active:scale-95"
                title="Pengaturan"
              >
                <span className="text-sm leading-none">⚙️</span>
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-tr from-indigo-600 to-violet-500 p-2 rounded-xl shadow-lg shadow-indigo-200 transform transition-transform hover:scale-105">
                <Store className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-900 to-slate-700 tracking-tight leading-tight">
                  Sistem Rekap
                </h1>
                <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500">{userRole === 'purchasing' ? 'Panel Purchasing' : 'Produk Kosong & Inventaris'}</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={fetchData}
                disabled={loading}
                className="flex items-center space-x-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 rounded-xl transition-all duration-200 shadow-sm hover:shadow active:scale-95 disabled:opacity-50 text-xs sm:text-sm font-semibold"
              >
                <RefreshCw className={"h-4 w-4 " + (loading ? 'animate-spin text-blue-500' : '')} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
          
          <div className="flex justify-center md:justify-start -mb-4 pb-4 mt-2">
            <div className="bg-slate-100/80 p-1.5 rounded-2xl inline-flex space-x-1 shadow-inner border border-slate-200/50 overflow-x-auto max-w-full">
              {userRole === 'store' && (
                <>
                  <button
                    onClick={() => setActiveTab('database')}
                    className={"flex items-center space-x-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap " + (activeTab === 'database' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50')}
                  >
                    <Database className="h-4 w-4" /> 
                    <span>Database &amp; Rekap</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('request')}
                    className={"flex items-center space-x-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap " + (activeTab === 'request' ? 'bg-white text-purple-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50')}
                  >
                    <Store className="h-4 w-4" /> 
                    <span>Request Outlet</span>
                  </button>
                </>
              )}

              <button
                onClick={() => setActiveTab('history')}
                className={"flex items-center space-x-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap " + (activeTab === 'history' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50')}
              >
                <History className="h-4 w-4" /> 
                <span>{userRole === 'purchasing' ? 'Monitor Laporan Outlet' : 'Riwayat'}</span>
                {savedHistory.length > 0 && (
                  <span className={"ml-1 px-2 py-0.5 text-[10px] rounded-full " + (activeTab === 'history' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600')}>
                    {savedHistory.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <AnimatePresence mode="wait">
          {userRole === 'store' && (activeTab === 'database' || activeTab === 'request') && (
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              
              {/* --- DAN KERANJANG REKAP PRODUK KOSONG --- */}
              {activeTab === 'database' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden ring-1 ring-slate-900/5">
                  <div className="bg-gradient-to-r from-indigo-50/50 to-white px-4 sm:px-6 py-4 sm:py-5 border-b border-indigo-100/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                        <ShoppingCart className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-slate-800">Daftar Rekap Produk Kosong</h2>
                        <p className="text-xs font-semibold text-slate-500">{rekap.length} Produk dipilih</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                      <button
                        onClick={handleSaveToSheet}
                        disabled={rekap.length === 0 || isSaving}
                        className={"flex-1 lg:flex-none justify-center flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all duration-200 active:scale-95 text-xs sm:text-sm font-bold shadow-sm " + (saveSuccess ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:border-slate-200 border border-transparent')}
                      >
                        {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : saveSuccess ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                        <span>{isSaving ? 'Mengirim...' : saveSuccess ? 'Terkirim!' : 'Kirim Laporan'}</span>
                      </button>
                      <button
                        onClick={() => downloadCSV(rekap, displayHeaders, 'Rekap_Produk_Kosong')}
                        disabled={rekap.length === 0}
                        className="flex-1 lg:flex-none justify-center flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 rounded-xl transition-all duration-200 shadow-sm hover:shadow active:scale-95 disabled:opacity-50 text-xs sm:text-sm font-bold"
                        title="Download CSV"
                      >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Download CSV</span>
                      </button>
                      <button
                        onClick={handleCopy}
                        disabled={rekap.length === 0}
                        className={"flex-1 lg:flex-none justify-center flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl transition-all duration-200 shadow-sm active:scale-95 text-xs sm:text-sm font-bold " + (copied ? 'text-emerald-600 border-emerald-300 bg-emerald-50 hover:shadow-emerald-100' : 'text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50')}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        <span>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
                      </button>
                    </div>
                  </div>
                
                  <div className="p-4 bg-slate-50/50">
                    {rekap.length === 0 ? (
                      <div className="px-6 py-12 text-center flex flex-col items-center justify-center">
                        <div className="bg-white p-4 rounded-full shadow-sm mb-4 border border-slate-100">
                          <ListChecks className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-semibold text-sm max-w-sm">
                          Keranjang rekap masih kosong. Silakan cari dan tambahkan produk dari database di bawah.
                        </p>
                      </div>
                    ) : (
                      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-1">
                        {rekap.map((item, idx) => {
                          const nameCol = headers.find(h => h.toLowerCase().includes('nama')) || headers[1] || headers[0];
                          const skuCol = headers.find(h => h.toLowerCase().includes('sku') || h.toLowerCase().includes('kode'));
                          const fotoCol = headers.find(h => h.toLowerCase().includes('foto'));
                          const driveId = fotoCol && item[fotoCol] ? String(item[fotoCol]).trim() : '';
                          
                          return (
                            <li key={item.id} className="group flex flex-col justify-between bg-white border border-slate-200/60 p-3.5 rounded-xl hover:shadow-md hover:border-indigo-300 transition-all duration-200 gap-2">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-3 overflow-hidden">
                                  {driveId ? (
                                    <div className="flex-shrink-0 h-9 w-9 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 relative">
                                      <img
                                        src={`https://lh3.googleusercontent.com/d/${driveId}`}
                                        alt={item[nameCol] || 'Foto'}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                          (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/100x100/f1f5f9/94a3b8?text=N/A';
                                        }}
                                      />
                                      <div className="absolute top-0 left-0 bg-black/60 text-white text-[8px] px-1 font-bold rounded-br">
                                        {idx + 1}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                      {idx + 1}
                                    </div>
                                  )}
                                  <div className="truncate">
                                    <p className="text-sm font-bold text-slate-700 truncate">{item[nameCol]}</p>
                                    {skuCol && item[skuCol] && (
                                      <p className="text-xs font-mono text-slate-400 truncate">{item[skuCol]}</p>
                                    )}
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleRemove(item.id)}
                                  className="flex-shrink-0 ml-2 text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                  title="Hapus"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="pl-11">
                                <input
                                  type="text"
                                  placeholder="Tambahkan catatan... (opsional)"
                                  value={item._catatan || ''}
                                  onChange={(e) => handleNoteChange(item.id, e.target.value)}
                                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-colors placeholder-slate-400 bg-slate-50 focus:bg-white"
                                />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* --- DAN KERANJANG REQUEST OUTLET --- */}
              {activeTab === 'request' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden ring-1 ring-slate-900/5">
                  <div className="bg-gradient-to-r from-purple-50/50 to-white px-4 sm:px-6 py-4 sm:py-5 border-b border-purple-100/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex items-center space-x-3 w-full lg:w-auto">
                      <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                        <Store className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-base sm:text-lg font-bold text-slate-800">Daftar Request Outlet</h2>
                        <p className="text-xs font-semibold text-slate-500">{requestItems.length} Produk dimasukkan</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col xl:flex-row items-start lg:items-center gap-3 w-full lg:w-auto">
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full xl:w-auto bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Akses:</span>
                        <div className="relative">
                          <select
                            value={loggedInUser.username}
                            onChange={(e) => {
                              const users: Record<string, { role: 'store' | 'purchasing'; name: string }> = {
                                toko: { role: 'store', name: 'Admin Toko' },
                                gudang: { role: 'store', name: 'Admin Gudang' },
                                online: { role: 'store', name: 'Admin Online' },
                                sales: { role: 'store', name: 'Admin Sales' },
                                cs: { role: 'purchasing', name: 'Purchasing (CS)' }
                              };
                              const userKey = e.target.value;
                              const u = users[userKey];
                              if (u) {
                                handleLoginSuccess({
                                  username: userKey,
                                  role: u.role,
                                  name: u.name
                                });
                              }
                            }}
                            className="appearance-none bg-white border border-slate-200 text-xs font-bold text-indigo-700 px-3 py-1.5 pr-8 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/10 cursor-pointer"
                          >
                            <option value="online">Admin Online</option>
                            <option value="toko">Admin Toko</option>
                            <option value="gudang">Admin Gudang</option>
                            <option value="sales">Admin Sales</option>
                            <option value="cs">Purchasing (CS)</option>
                          </select>
                          <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                        </div>

                        <span className="text-slate-300">|</span>

                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lokasi:</span>
                        
                        {currentLocationOptions.length > 0 ? (
                          <div className="relative">
                            <select
                              value={isCustomLocation ? 'Custom' : requesterLocation}
                              onChange={(e) => {
                                if (e.target.value === 'Custom') {
                                  setIsCustomLocation(true);
                                } else {
                                  setIsCustomLocation(false);
                                  setRequesterLocation(e.target.value);
                                }
                              }}
                              className="appearance-none bg-white border border-slate-200 text-xs font-bold text-slate-700 px-3 py-1.5 pr-8 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/10 cursor-pointer"
                            >
                              {currentLocationOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                              <option value="Custom">Lainnya...</option>
                            </select>
                            <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                          </div>
                        ) : null}

                        {(isCustomLocation || currentLocationOptions.length === 0) && (
                          <input 
                            type="text" 
                            value={customLocation} 
                            onChange={(e) => setCustomLocation(e.target.value)} 
                            placeholder="Ketik Lokasi..."
                            className="w-28 text-xs font-bold px-2 py-1.5 bg-white border border-purple-300 rounded-lg outline-none text-purple-700"
                          />
                        )}
                        
                        <span className="text-slate-300">|</span>
                        
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Admin:</span>
                        {currentAdminOptions.length > 0 ? (
                          <div className="relative">
                            <select
                              value={isCustomName ? 'Custom' : requesterName}
                              onChange={(e) => {
                                if (e.target.value === 'Custom') {
                                  setIsCustomName(true);
                                } else {
                                  setIsCustomName(false);
                                  setRequesterName(e.target.value);
                                }
                              }}
                              className="appearance-none bg-white border border-slate-200 text-xs font-bold text-slate-700 px-3 py-1.5 pr-8 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/10 cursor-pointer"
                            >
                              {currentAdminOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                              <option value="Custom">Lainnya...</option>
                            </select>
                            <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                          </div>
                        ) : null}

                        {(isCustomName || currentAdminOptions.length === 0) && (
                          <input 
                            type="text" 
                            value={customName} 
                            onChange={(e) => setCustomName(e.target.value)} 
                            placeholder="Ketik Nama..."
                            className="w-28 text-xs font-bold px-2 py-1.5 bg-white border border-purple-300 rounded-lg outline-none text-purple-700"
                          />
                        )}

                        <span className="text-slate-300">|</span>

                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tujuan:</span>
                        <div className="relative">
                          <select
                            value={destinationOutlet}
                            onChange={(e) => setDestinationOutlet(e.target.value)}
                            className="appearance-none bg-white border border-slate-200 text-xs font-bold text-slate-700 px-3 py-1.5 pr-8 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/10 cursor-pointer"
                          >
                            {DESTINATION_OPTIONS.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                          </select>
                          <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                        </div>
                      </div>
                      
                      <div className="flex w-full xl:w-auto gap-2">
                        <button
                          onClick={() => handleCopyRequest(false)}
                          disabled={requestItems.length === 0 || ((isCustomName || currentAdminOptions.length === 0) && !customName.trim()) || ((isCustomLocation || currentLocationOptions.length === 0) && !customLocation.trim())}
                          className="w-full sm:w-auto justify-center flex items-center space-x-2 px-4 py-2.5 bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl transition-all duration-200 shadow-sm active:scale-95 text-xs sm:text-sm font-bold disabled:opacity-50"
                        >
                          {copiedRequestOnly ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          <span>{copiedRequestOnly ? 'Tersalin!' : 'Salin Saja'}</span>
                        </button>
                        <button
                          onClick={() => handleCopyRequest(true)}
                          disabled={requestItems.length === 0 || ((isCustomName || currentAdminOptions.length === 0) && !customName.trim()) || ((isCustomLocation || currentLocationOptions.length === 0) && !customLocation.trim())}
                          className="w-full sm:w-auto justify-center flex items-center space-x-2 px-4 py-2.5 bg-purple-600 text-white hover:bg-purple-700 rounded-xl transition-all duration-200 shadow-md active:scale-95 text-xs sm:text-sm font-bold disabled:opacity-50"
                        >
                          {copiedRequestSave ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                          <span>{copiedRequestSave ? 'Tersimpan!' : 'Salin & Simpan'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-slate-50/50">
                    {requestItems.length === 0 ? (
                      <div className="px-6 py-12 text-center flex flex-col items-center justify-center">
                        <div className="bg-white p-4 rounded-full shadow-sm mb-4 border border-slate-100">
                          <Store className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-semibold text-sm max-w-sm">
                          Keranjang request masih kosong. Silakan cari dan tambahkan produk dari database di bawah.
                        </p>
                      </div>
                    ) : (
                      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-1">
                        {requestItems.map((item, idx) => {
                          const nameCol = headers.find(h => h.toLowerCase().includes('nama')) || headers[1] || headers[0];
                          const skuCol = headers.find(h => h.toLowerCase().includes('sku') || h.toLowerCase().includes('kode'));
                          const unitCol = headers.find(h => h.toLowerCase().includes('unit'));
                          const fotoCol = headers.find(h => h.toLowerCase().includes('foto'));
                          const driveId = fotoCol && item[fotoCol] ? String(item[fotoCol]).trim() : '';
                          
                          return (
                            <li key={item.id} className="group flex flex-col justify-between bg-white border border-slate-200/60 p-3.5 rounded-xl hover:shadow-md hover:border-purple-300 transition-all duration-200 gap-2">
                              <div className="flex justify-between items-start">
                                <div className="flex items-start space-x-3 overflow-hidden">
                                  {driveId ? (
                                    <div className="flex-shrink-0 h-9 w-9 mt-0.5 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 relative">
                                      <img
                                        src={`https://lh3.googleusercontent.com/d/${driveId}`}
                                        alt={item[nameCol] || 'Foto'}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                          (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/100x100/f1f5f9/94a3b8?text=N/A';
                                        }}
                                      />
                                      <div className="absolute top-0 left-0 bg-black/60 text-white text-[8px] px-1 font-bold rounded-br">
                                        {idx + 1}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex-shrink-0 h-6 w-6 mt-0.5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[10px] group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                                      {idx + 1}
                                    </div>
                                  )}
                                  <div className="truncate">
                                    <p className="text-sm font-bold text-slate-700 truncate">{item[nameCol]}</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {skuCol && item[skuCol] && (
                                        <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/30">SKU: {item[skuCol]}</span>
                                      )}
                                      {unitCol && item[unitCol] && (
                                        <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/30">Unit: {item[unitCol]}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleRemove(item.id)}
                                  className="flex-shrink-0 ml-2 text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                                  title="Hapus"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                                <span className="text-xs font-bold text-slate-500">Jumlah Diminta:</span>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="number"
                                    min="1"
                                    placeholder="Qty"
                                    value={item._qty || ''}
                                    onChange={(e) => handleQtyChange(item.id, parseInt(e.target.value) || 1)}
                                    className="w-16 text-center text-sm font-bold px-2 py-1 border border-slate-200 rounded-lg outline-none"
                                  />
                                  <span className="text-xs font-bold text-slate-500">{unitCol && item[unitCol] ? item[unitCol] : 'PCS'}</span>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* --- TABEL MASTER DATABASE PRODUK --- */}
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center space-x-2">
                      <Database className={"h-5 w-5 " + (activeTab === 'request' ? 'text-purple-500' : 'text-indigo-500')} />
                      <span>Database Produk Master</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">Menampilkan data real-time dari Google Sheets</p>
                  </div>

                  <div className="w-full sm:max-w-md relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search className={"h-4 w-4 text-slate-400 transition-colors " + (activeTab === 'request' ? 'group-focus-within:text-purple-500' : 'group-focus-within:text-indigo-500')} />
                    </div>
                    <input
                      type="text"
                      className={"block w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-full bg-white placeholder-slate-400 focus:outline-none focus:ring-2 text-sm transition-all shadow-sm " + (activeTab === 'request' ? 'focus:ring-purple-500/20 focus:border-purple-500' : 'focus:ring-indigo-500/20 focus:border-indigo-500')}
                      placeholder="Cari SKU, Nama Produk, atau Unit..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {loading && data.length === 0 ? (
                  <div className="flex flex-col justify-center items-center h-64 bg-white rounded-2xl shadow-sm border border-slate-200/60 ring-1 ring-slate-900/5">
                    <RefreshCw className={"h-10 w-10 animate-spin mb-4 " + (activeTab === 'request' ? 'text-purple-500' : 'text-indigo-500')} />
                    <p className="text-slate-500 font-bold text-sm">Menghubungkan ke Google Sheets...</p>
                  </div>
                ) : error ? (
                  <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl shadow-sm">
                    <div className="flex items-center">
                      <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
                      <h3 className="text-lg font-bold text-red-800">Gagal Memuat Database</h3>
                    </div>
                    <p className="mt-2 text-red-700 text-sm">{error}</p>
                    <button 
                      onClick={fetchData}
                      className="mt-4 px-5 py-2.5 bg-red-100 text-red-800 hover:bg-red-200 rounded-xl transition-colors text-sm font-bold shadow-sm"
                    >
                      Coba Sinkron Ulang
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden ring-1 ring-slate-900/5">
                    <div className="overflow-x-auto">
                      {filteredData.length > 0 ? (
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50/80">
                            <tr>
                              <th className="px-4 sm:px-6 py-4 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider w-24">Aksi</th>
                              <th className="px-4 sm:px-6 py-4 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider w-16">No</th>
                              {displayHeaders.map((header, idx) => (
                                <th key={idx} className="px-4 sm:px-6 py-4 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{header}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-100">
                            {currentData.map((row, rowIndex) => {
                              const isAdded = activeTab === 'database' 
                                ? rekap.some(r => r.id === row.id) 
                                : requestItems.some(r => r.id === row.id);
                              const tabColor = activeTab === 'request' ? 'purple' : 'indigo';
                              
                              return (
                                <tr key={row.id} className={"transition-colors " + (isAdded ? `bg-${tabColor}-50/40` : 'hover:bg-slate-50/50')}>
                                  <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                                    <button
                                      onClick={() => handleAdd(row)}
                                      disabled={isAdded}
                                      className={"flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all " + 
                                        (isAdded 
                                          ? 'bg-slate-100 text-slate-400 border border-slate-200' 
                                          : (activeTab === 'request' 
                                              ? 'bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white border border-purple-100 shadow-sm active:scale-95' 
                                              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-100 shadow-sm active:scale-95'
                                            )
                                        )}
                                    >
                                      {isAdded ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                                      <span className="hidden sm:inline">{isAdded ? 'Masuk' : 'Tambah'}</span>
                                    </button>
                                  </td>
                                  <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-xs sm:text-sm font-semibold text-slate-400">
                                    {startIndex + rowIndex + 1}
                                  </td>
                                  {displayHeaders.map((header, colIndex) => (
                                    <td key={colIndex} className={"px-4 sm:px-6 py-3 text-xs sm:text-sm " + (colIndex === 1 ? 'font-bold text-slate-800' : 'text-slate-600 font-medium')}>
                                      {row[header]}
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div className="flex flex-col justify-center items-center h-64 text-center px-4 bg-white">
                          <div className="bg-slate-50 p-4 rounded-full mb-4 border border-slate-100">
                            <Search className="h-8 w-8 text-slate-300" />
                          </div>
                          <h3 className="text-base font-bold text-slate-800">Tidak ada produk ditemukan</h3>
                          <p className="text-slate-500 mt-1 text-xs max-w-sm">
                            {searchTerm ? `Hasil pencarian untuk "${searchTerm}" nihil.` : "Data master produk kosong."}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {filteredData.length > 0 && (
                      <div className="bg-white px-4 sm:px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-xs sm:text-sm text-slate-500 font-medium text-center sm:text-left">
                          Menampilkan <span className="font-bold text-slate-800">{startIndex + 1}</span> - <span className="font-bold text-slate-800">{Math.min(startIndex + ITEMS_PER_PAGE, filteredData.length)}</span> dari <span className={"font-bold px-2.5 py-0.5 rounded-md " + (activeTab === 'request' ? 'text-purple-600 bg-purple-50' : 'text-indigo-600 bg-indigo-50')}>{filteredData.length}</span> produk
                        </div>
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="flex items-center justify-center p-2 border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-all shadow-sm active:scale-95"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <div className="text-xs sm:text-sm text-slate-600 px-3 py-1.5 font-bold bg-slate-50 rounded-lg border border-slate-100">
                            {currentPage} / {totalPages}
                          </div>
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="flex items-center justify-center p-2 border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-all shadow-sm active:scale-95"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* --- TAB RIWAYAT TERSIMPAN / DATABASE GLOBAL --- */}
          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden ring-1 ring-slate-900/5">
                <div className="bg-slate-50 px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="flex items-center space-x-3 text-slate-800">
                    <div className="bg-white p-2 border border-slate-200 rounded-lg text-slate-500 shadow-sm">
                      <History className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold">
                        {userRole === 'purchasing' ? 'Monitor Laporan Toko (Purchasing)' : 'Riwayat Rekap Sesi'}
                      </h2>
                      <p className="text-xs font-semibold text-slate-500">{filteredHistory.length} Rekaman laporan ditemukan</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3 items-center">
                    {/* Search bar inside history */}
                    <div className="relative w-full sm:w-56">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <input 
                        type="text"
                        value={historySearchTerm}
                        onChange={(e) => setHistorySearchTerm(e.target.value)}
                        placeholder="Cari SKU / Nama Produk..."
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                      />
                    </div>

                    {/* Filter Month */}
                    <div className="relative w-full sm:w-40">
                      <select 
                        value={historyFilterMonth}
                        onChange={(e) => setHistoryFilterMonth(e.target.value)}
                        className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-bold py-2 pl-3 pr-8 rounded-xl outline-none cursor-pointer shadow-sm"
                      >
                        <option value="all">Semua Bulan</option>
                        {availableMonths.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="h-4 w-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                    </div>

                    {historyCsvUrl ? (
                      <span className="w-full sm:w-auto px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs sm:text-sm font-bold shadow-sm flex items-center justify-center space-x-1.5">
                        <Check className="h-4 w-4" /> <span>Sinkron Online</span>
                      </span>
                    ) : (
                      <button 
                        onClick={() => {
                          if (window.confirm('Yakin ingin mereset history lokal?')) {
                            setSavedHistory([]);
                            localStorage.removeItem('rekapSavedHistory');
                          }
                        }}
                        disabled={savedHistory.length === 0}
                        className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95 disabled:opacity-40"
                      >
                        Hapus Lokal
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub category filter tabs */}
                <div className="bg-slate-50/50 border-b border-slate-200 px-4 sm:px-6 py-3 flex space-x-2">
                  <button
                    onClick={() => setHistoryFilterType('rekap')}
                    className={"px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center space-x-1.5 " + (historyFilterType === 'rekap' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50')}
                  >
                    <ListChecks className="h-4 w-4" />
                    <span>Laporan Produk Kosong</span>
                  </button>
                  <button
                    onClick={() => setHistoryFilterType('request')}
                    className={"px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center space-x-1.5 " + (historyFilterType === 'request' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50')}
                  >
                    <Store className="h-4 w-4" />
                    <span>Request Outlet</span>
                  </button>
                </div>
                
                <div className="p-4 sm:p-6 bg-slate-50/30 space-y-6">
                  {groupedHistoryEntries.length > 0 ? (
                    <>
                      {currentGroupedHistory.map(([dateKey, sessions]) => (
                        <div key={dateKey} className="space-y-4">
                          
                          {/* Header Date Frame */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
                            <h3 className="text-sm sm:text-base font-bold text-slate-700 flex items-center space-x-2">
                              <span className={"w-2 h-5 rounded-full " + (historyFilterType === 'request' ? 'bg-purple-400' : 'bg-indigo-400')}></span>
                              <span>{dateKey}</span>
                            </h3>
                            
                            <div className="flex items-center gap-2">
                              <button
                                onClick={fetchData}
                                disabled={loading}
                                className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm"
                              >
                                <RefreshCw className={"h-3.5 w-3.5 " + (loading ? 'animate-spin' : '')} />
                                <span>Sinkron</span>
                              </button>

                              <button
                                onClick={() => handleCopyAllForDate(sessions, dateKey)}
                                className={"flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm " + (historyFilterType === 'request' ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200')}
                              >
                                {copiedAllId === dateKey ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                <span>{copiedAllId === dateKey ? 'Tersalin!' : `Salin Semua Hari Ini`}</span>
                              </button>
                            </div>
                          </div>

                          {/* Sessions lists inside current date */}
                          <div className="space-y-4">
                            {sessions.map((session) => (
                              <div key={session.id} className={"bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow " + (session.type === 'request' ? 'border-purple-200' : 'border-indigo-200')}>
                                <div className={"px-4 sm:px-5 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b gap-3 " + (session.type === 'request' ? 'bg-purple-50/50 border-purple-100' : 'bg-indigo-50/30 border-indigo-100')}>
                                  <div className="flex flex-col">
                                    <span className={"font-bold text-sm " + (session.type === 'request' ? 'text-purple-900' : 'text-indigo-900')}>
                                      {(() => {
                                        const d = parseDateSafe(session.date);
                                        return isNaN(d.getTime()) 
                                          ? session.date 
                                          : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
                                      })()}
                                    </span>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                      <span className={"text-[10px] font-bold px-2 py-0.5 rounded-md " + (session.type === 'request' ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800')}>
                                        {session.type === 'request' ? 'Request Outlet' : 'Laporan'} &bull; {session.items?.length || 0} Item
                                      </span>
                                      {session.requester && (
                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                          Dikirim: {session.requester}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      onClick={() => {
                                        const d = parseDateSafe(session.date);
                                        const dateIso = !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : 'Date_Unknown';
                                        downloadCSV(session.items, displayHeaders, `Riwayat_${session.type}_${dateIso}`);
                                      }}
                                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-bold transition-all shadow-sm"
                                    >
                                      <FileDown className="h-3.5 w-3.5" />
                                      <span>CSV</span>
                                    </button>
                                    <button
                                      onClick={() => setSelectedNotifSession(session)}
                                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                                    >
                                      <Send className="h-3.5 w-3.5" />
                                      <span>Diskusi ({session.chatHistory?.length || 0})</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Items content of session */}
                                <div className="bg-white">
                                  <ul className="divide-y divide-slate-100">
                                    {session.items && session.items.map((item, idx) => {
                                      const nameCol = headers.find(h => h.toLowerCase().includes('nama')) || headers[1] || headers[0];
                                      const skuCol = headers.find(h => h.toLowerCase().includes('sku') || h.toLowerCase().includes('kode'));
                                      const fotoCol = headers.find(h => h.toLowerCase().includes('foto'));
                                      const driveId = fotoCol && item[fotoCol] ? String(item[fotoCol]).trim() : '';
                                      const currentStock = checkCurrentStock(item);
                                      
                                      const term = historySearchTerm.toLowerCase();
                                      const itemName = String(item[nameCol] || '').toLowerCase();
                                      const itemSku = skuCol ? String(item[skuCol] || '').toLowerCase() : '';
                                      const isHighlighted = term && (itemName.includes(term) || itemSku.includes(term));

                                      return (
                                        <li key={idx} className={"p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors " + (isHighlighted ? 'bg-yellow-50/80' : 'hover:bg-slate-50/30')}>
                                          <div className="flex items-start space-x-3">
                                            {driveId ? (
                                              <div className="flex-shrink-0 h-9 w-9 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 relative">
                                                <img
                                                  src={`https://lh3.googleusercontent.com/d/${driveId}`}
                                                  alt={item[nameCol] || 'Foto'}
                                                  className="h-full w-full object-cover"
                                                  loading="lazy"
                                                  referrerPolicy="no-referrer"
                                                  onError={(e) => {
                                                    (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/100x100/f1f5f9/94a3b8?text=N/A';
                                                  }}
                                                />
                                                <div className="absolute top-0 left-0 bg-black/60 text-white text-[8px] px-1 font-bold rounded-br">
                                                  {idx + 1}
                                                </div>
                                              </div>
                                            ) : (
                                              <div className={"flex-shrink-0 mt-0.5 h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] " + (session.type === 'request' ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600')}>
                                                {idx + 1}
                                              </div>
                                            )}
                                            <div>
                                              <p className="text-sm font-bold text-slate-700 leading-tight">{item[nameCol] || 'Produk'}</p>
                                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                                {skuCol && item[skuCol] && (
                                                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                    SKU: {item[skuCol]}
                                                  </span>
                                                )}
                                                {item._qty !== undefined && (
                                                  <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 font-bold">
                                                    Jumlah: {item._qty}
                                                  </span>
                                                )}
                                                {item._catatan && (
                                                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 font-bold">
                                                    Catatan: {item._catatan}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {currentStock !== null && (
                                            currentStock > 0 ? (
                                              <div className="flex-shrink-0 flex items-center space-x-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-lg">
                                                <span className="relative flex h-2 w-2">
                                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                </span>
                                                <span className="text-xs font-bold">Stok: {currentStock}</span>
                                              </div>
                                            ) : (
                                              <span className="text-[11px] font-semibold text-slate-400 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-100">Kosong</span>
                                            )
                                          )}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      
                      {/* --- KONTROL PAGINATION RIWAYAT --- */}
                      {groupedHistoryEntries.length > HISTORY_ITEMS_PER_PAGE && (
                        <div className="bg-white px-4 sm:px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl shadow-sm mt-6">
                          <div className="text-xs sm:text-sm text-slate-500 font-medium text-center sm:text-left">
                            Menampilkan <span className="font-bold text-slate-800">{historyStartIndex + 1}</span> - <span className="font-bold text-slate-800">{Math.min(historyStartIndex + HISTORY_ITEMS_PER_PAGE, groupedHistoryEntries.length)}</span> dari <span className="font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-700">{groupedHistoryEntries.length}</span> tanggal
                          </div>
                          <div className="flex items-center space-x-1 sm:space-x-2">
                            <button
                              onClick={() => setHistoryCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={historyCurrentPage === 1}
                              className="flex items-center justify-center p-2 border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <div className="text-xs sm:text-sm text-slate-600 px-3 py-1.5 font-bold bg-slate-50 rounded-lg border border-slate-100">
                              {historyCurrentPage} / {totalHistoryPages}
                            </div>
                            <button
                              onClick={() => setHistoryCurrentPage(prev => Math.min(prev + 1, totalHistoryPages))}
                              disabled={historyCurrentPage === totalHistoryPages}
                              className="flex items-center justify-center p-2 border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col justify-center items-center h-48 text-center px-4 bg-white">
                      <div className="bg-slate-50 p-4 rounded-full shadow-sm mb-4 border border-slate-100">
                        <History className="h-8 w-8 text-slate-300" />
                      </div>
                      <h3 className="text-base font-bold text-slate-800">Tidak ada riwayat terekam</h3>
                      <p className="text-slate-500 mt-1 text-xs">Belum ada rekap yang tersimpan atau tidak cocok dengan filter pencarian.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* SETUP CONFIG MODAL */}
      <AnimatePresence>
        {showSetupModal && (
          <SetupModal 
            initialScriptUrl={scriptUrl}
            initialHistoryCsvUrl={historyCsvUrl}
            onClose={() => setShowSetupModal(false)}
            onSave={handleSetupSave}
          />
        )}
      </AnimatePresence>

      {/* DISKUSI MODAL DETAILS */}
      <AnimatePresence>
        {activeModalSession && (
          <NotifDetailModal 
            session={activeModalSession}
            onClose={() => setSelectedNotifSession(null)}
            loggedInUser={loggedInUser}
            headers={displayHeaders}
            onSubmitReply={onSubmitReply}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
