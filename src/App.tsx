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
  Send,
  MessageSquare,
  PackageX,
  Warehouse,
  LayoutDashboard,
  Activity,
  FileSpreadsheet,
  Menu,
  Clock,
  ArrowRight,
  X
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
import LiveChatDrawer from './components/LiveChatDrawer';
import DivisionDashboard from './components/DivisionDashboard';
import ChatRecordingCenter from './components/ChatRecordingCenter';

const LATEST_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzihvW3D5bTHW0mvcTh_cyYBl-0lTuuIqsx1fmQTiZx5bw2vuI29CzsFm0dG3fgbnTw/exec';
const HISTORY_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQcOP2SJiiNjZS7ARP5HPL3Eb1_Ogwjb3L5w0oMHgVgcLdK_uUcejUWFfGUpQcpabJnQSaIr93_p_We/pub?gid=0&single=true&output=csv';
const MASTER_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTCxz1GPm7QU9IS1yBiSjvIdNTLUsvvplOCyT_R3XH4O-LuVbHoY_bXn1LTH5lpnlolJ29BhUgEdnFm/pub?gid=1564332470&single=true&output=csv';

const ADMIN_NAMES = ['Bobby', 'Putri', 'Mishell', 'Winda'];
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
  const [copiedHistoryId, setCopiedHistoryId] = useState<string | null>(null);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);

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

  const [activeTab, setActiveTab] = useState<'request' | 'history'>('request');
  const [showInbox, setShowInbox] = useState(false);
  const [isRecordingCenterOpen, setIsRecordingCenterOpen] = useState(false);

  const [readNotifs, setReadNotifs] = useState<string[]>(() => {
    const saved = localStorage.getItem('readNotifs');
    return saved ? JSON.parse(saved) : [];
  });

  const [historyFilterType, setHistoryFilterType] = useState<'request'>('request');
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

  // Live Chat state
  const [isLiveChatOpen, setIsLiveChatOpen] = useState(false);
  const [preSelectedProductForAlert, setPreSelectedProductForAlert] = useState<Product | null>(null);
  const [liveChatUnreadCount, setLiveChatUnreadCount] = useState(0);

  const userRole = loggedInUser?.role || 'store';

  // Calculate live chat unread messages for current user
  useEffect(() => {
    const checkUnread = () => {
      try {
        const saved = localStorage.getItem('app_live_chat_messages_v2');
        if (saved) {
          const msgs = JSON.parse(saved);
          if (Array.isArray(msgs)) {
            const unread = msgs.filter(m => !m.readBy || !m.readBy.includes(loggedInUser.username)).length;
            setLiveChatUnreadCount(unread);
          }
        }
      } catch {}
    };

    checkUnread();
    const interval = setInterval(checkUnread, 3000);
    window.addEventListener('storage', checkUnread);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkUnread);
    };
  }, [loggedInUser.username, isLiveChatOpen]);

  // Computed Options based on current logged in user
  const currentAdminOptions = useMemo(() => {
    if (!loggedInUser) return ADMIN_NAMES;
    if (loggedInUser.username === 'admin') return ADMIN_NAMES;
    if (loggedInUser.username === 'gudang') return ADMIN_NAMES;
    if (loggedInUser.username === 'online') return ADMIN_NAMES;
    if (loggedInUser.username === 'toko') return []; // force custom input
    return ADMIN_NAMES;
  }, [loggedInUser]);

  const currentLocationOptions = useMemo(() => {
    if (!loggedInUser) return ['Gudang', 'Toko Pusat', 'Online Gudang', 'Online Toko'];
    if (loggedInUser.username === 'admin') return ['Gudang', 'Toko Pusat', 'Online Gudang', 'Online Toko'];
    if (loggedInUser.username === 'gudang') return ['Gudang'];
    if (loggedInUser.username === 'toko') return ['Toko Pusat', 'Toko'];
    if (loggedInUser.username === 'online') return ['Online Gudang', 'Online Toko'];
    return ['Gudang', 'Toko Pusat'];
  }, [loggedInUser]);

  // Set default settings upon login
  const handleLoginSuccess = (session: UserSession) => {
    setLoggedInUser(session);
    localStorage.setItem('loggedInUser', JSON.stringify(session));
  };

  const handleSwitchUser = (userKey: string) => {
    const users: Record<string, { role: 'store' | 'purchasing'; name: string }> = {
      admin: { role: 'store', name: 'Admin' },
      gudang: { role: 'store', name: 'Bagian Gudang' },
      toko: { role: 'store', name: 'Admin Toko' },
      online: { role: 'store', name: 'Admin Online' },
      sales: { role: 'store', name: 'Admin Sales' },
      cs: { role: 'purchasing', name: 'Purchasing (CS)' }
    };
    const u = users[userKey];
    if (u) {
      handleLoginSuccess({
        username: userKey,
        role: u.role,
        name: u.name
      });
    }
  };

  // Synchronize settings when loggedInUser changes
  useEffect(() => {
    if (loggedInUser) {
      if (loggedInUser.role === 'store') {
        if (loggedInUser.username === 'admin') {
          setRequesterName('Bobby');
          setIsCustomName(false);
          setRequesterLocation('Gudang');
          setIsCustomLocation(false);
        } else if (loggedInUser.username === 'gudang') {
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

  // Direct helpers for Live Chat interaction
  const handleAddToRekapFromChat = (product: Product, note?: string) => {
    setRekap(prev => {
      const exists = prev.find(item => item.id === product.id);
      if (exists) {
        return prev.map(item => item.id === product.id ? { ...item, _catatan: note || item._catatan } : item);
      }
      return [...prev, { ...product, _catatan: note || '' }];
    });
  };

  const handleAddToRequestFromChat = (product: Product, qty: number = 1) => {
    setRequestItems(prev => {
      const exists = prev.find(item => item.id === product.id);
      if (exists) {
        return prev.map(item => item.id === product.id ? { ...item, _qty: (item._qty || 1) + qty } : item);
      }
      return [...prev, { ...product, _qty: qty }];
    });
  };

  const handleSearchInDatabase = (term: string) => {
    setSearchTerm(term);
    setActiveTab('database');
  };

  const handleOpenAlertForProduct = (prod: Product, e?: MouseEvent) => {
    if (e) e.stopPropagation();
    setPreSelectedProductForAlert(prod);
    setIsLiveChatOpen(true);
  };

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
        const fixedHeaders = ['SKU', 'Nama Produk', 'Unit', 'Stok', 'Foto Produk'];
        const extractedData: Product[] = parsedArray.slice(1).map((row, index) => {
          const stokVal = row[14] !== undefined ? String(row[14]).trim() : '';
          return {
            id: index,
            'SKU': row[0] ? String(row[0]).trim() : '',
            'Nama Produk': row[2] ? String(row[2]).trim() : '',
            'Unit': row[3] ? String(row[3]).trim() : '',
            'Merk': row[6] ? String(row[6]).trim() : '',
            'Stok': stokVal || '0',
            'Qty': stokVal || '0',
            'Foto Produk': row[21] ? String(row[21]).trim() : (row[23] ? String(row[23]).trim() : '')
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
    if (!requestItems.some(r => r.id === item.id)) {
      setRequestItems([...requestItems, { ...item, _qty: 1 }]);
    }
  };

  const handleRemove = (id: number) => {
    setRequestItems(requestItems.filter(r => r.id !== id));
  };

  const handleNoteChange = (id: number, noteValue: string) => {
    setRekap(rekap.map(r => r.id === id ? { ...r, _catatan: noteValue } : r));
  };

  const handleQtyChange = (id: number, qtyValue: number) => {
    setRequestItems(requestItems.map(r => r.id === id ? { ...r, _qty: qtyValue } : r));
  };

  const copyTextToClipboard = async (text: string): Promise<boolean> => {
    if (!text) return false;
    let copied = false;
    
    // 1. Try modern navigator.clipboard
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch (e) {
        console.warn('navigator.clipboard failed, fallback to execCommand', e);
      }
    }

    // 2. Fallback to execCommand with offscreen textarea
    if (!copied) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.top = "0";
        textArea.style.left = "-9999px";
        textArea.style.opacity = "0";
        textArea.setAttribute("readonly", "");
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (err) {
        console.error('execCommand copy failed:', err);
      }
    }
    return copied;
  };

  const executeCopy = async (text: string, setCopiedState: (v: boolean) => void, typeLabel: 'copy' | 'request', items: any[], saveToHistory = true) => {
    await copyTextToClipboard(text);
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
  };

  const handleCopy = () => {
    if (rekap.length === 0) return;
    const text = generateCopyText(rekap, ['SKU', 'Nama Produk']);
    executeCopy(text, setCopied, 'copy', rekap, true);
  };

  const handleCopyRequest = async (saveToHistory: boolean) => {
    if (requestItems.length === 0) return;
    const text = generateRequestCopyText(requestItems, destinationOutlet, getFinalRequesterName(), ['SKU', 'Nama Produk', 'Unit']);
    
    // 1. Immediately copy to clipboard so browser user gesture is preserved
    await copyTextToClipboard(text);

    if (saveToHistory) {
      setCopiedRequestSave(true);
      const newSessionId = 'ID-' + new Date().toISOString(); 
      const finalReqName = `${getFinalRequesterName()} ⬅ Outlet: ${destinationOutlet}`;
      
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

      // Asynchronous background sync to Google Apps Script if URL is configured
      if (scriptUrl) {
        try {
          const payload = JSON.stringify({ 
            action: 'save_rekap', 
            sessionId: newSessionId, 
            tipe: 'request',
            requester: finalReqName,
            items: requestItems
          });
          fetch(scriptUrl, { 
            method: 'POST', 
            mode: 'no-cors', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
            body: payload 
          }).catch(e => console.error('Background sync failed', e));
        } catch (e) { 
          console.error(e); 
        }
      }

      setTimeout(() => { 
        setCopiedRequestSave(false); 
        setRequestItems([]); 
        fetchData(); 
      }, 2000);
    } else {
      setCopiedRequestOnly(true);
      setTimeout(() => setCopiedRequestOnly(false), 2000);
    }
  };

  const handleCopyHistorySessionMessage = async (session: HistorySession) => {
    let textToCopy = session.text;
    if (!textToCopy) {
      let dest = 'Outlet';
      let req = session.requester || 'Admin';
      if (session.requester) {
        if (session.requester.includes(' ⬅ Outlet: ')) {
          const parts = session.requester.split(' ⬅ Outlet: ');
          req = parts[0];
          dest = parts[1] || 'Outlet';
        } else if (session.requester.includes(' ➔ Tujuan: ')) {
          const parts = session.requester.split(' ➔ Tujuan: ');
          req = parts[0];
          dest = parts[1] || 'Outlet';
        }
      }
      textToCopy = generateRequestCopyText(session.items, dest, req, ['SKU', 'Nama Produk', 'Unit']);
    }

    await copyTextToClipboard(textToCopy);
    setCopiedHistoryId(session.id);
    setTimeout(() => {
      setCopiedHistoryId(null);
    }, 2000);
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

    const preferredOrder = [
      headers.find(h => h.toLowerCase() === 'sku' || h.toLowerCase() === 'code' || h.toLowerCase().includes('kode')),
      headers.find(h => h.toLowerCase().includes('desc') || h.toLowerCase().includes('nama')),
      headers.find(h => h.toLowerCase().includes('unit') || h.toLowerCase().includes('satuan')),
      headers.find(h => h.toLowerCase() === 'stok' || h.toLowerCase() === 'qty' || h.toLowerCase().includes('stok') || h.toLowerCase().includes('stock')),
    ].filter((h): h is string => Boolean(h));

    const result = Array.from(new Set(preferredOrder));
    return result.length > 0 ? result : headers.filter(h => !h.toLowerCase().includes('foto'));
  }, [headers]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentData = filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // History Filter (Request Outlet)
  const filteredHistory = useMemo(() => {
    let result = savedHistory.filter(h => h.type === 'request');

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
    const generalStockCol = headers.find(h => h.toLowerCase() === 'stok' || h.toLowerCase() === 'qty' || h.toLowerCase().includes('stock'));

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
    if (!stockFound && generalStockCol && currentItem[generalStockCol] !== undefined && currentItem[generalStockCol] !== '') {
      const valStr = String(currentItem[generalStockCol]).replace(/[^0-9.-]+/g,"");
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
                    onChange={(e) => handleSwitchUser(e.target.value)}
                    className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-100 rounded-lg px-2.5 py-1 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-all"
                  >
                    <option value="admin">👑 Admin (Gudang / Toko)</option>
                    <option value="gudang">📦 Bagian Gudang</option>
                    <option value="toko">🏪 Admin Toko</option>
                    <option value="online">🌐 Admin Online</option>
                    <option value="sales">💼 Admin Sales</option>
                    <option value="cs">🛒 Purchasing (CS)</option>
                  </select>
                </>
              ) : (
                <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1 select-none">
                  <span>👤</span>
                  <span>{loggedInUser.name}</span>
                </div>
              )}
            </div>
             
            <div className="flex items-center space-x-2 relative">
              {/* REAL-TIME RECORDING AUDIT LOG BUTTON */}
              <button
                onClick={() => setIsRecordingCenterOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
                title="Buka Log Rekaman Chat & Alert Real-Time"
              >
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                <span className="hidden sm:inline">Log Rekaman</span>
                <span className="sm:hidden">Log</span>
              </button>

              {/* LIVE CHAT & STOCK ALERTS BUTTON */}
              <button
                onClick={() => setIsLiveChatOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all relative"
                title="Buka Chat & Info Stok Antar User"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Chat &amp; Info Stok</span>
                <span className="sm:hidden">Chat</span>
                {liveChatUnreadCount > 0 && (
                  <span className="bg-amber-400 text-amber-950 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full border border-white animate-pulse">
                    {liveChatUnreadCount}
                  </span>
                )}
              </button>

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
                <h1 className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-900 to-indigo-800 tracking-tight leading-tight">
                  Request Outlet
                </h1>
                <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500">Formulir &amp; Riwayat Request Outlet</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="bg-slate-100/90 p-1 rounded-xl inline-flex items-center space-x-1 border border-slate-200/60 shadow-inner">
                {/* TAB 1: REQUEST OUTLET */}
                <button
                  onClick={() => setActiveTab('request')}
                  className={"flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap " + 
                    (activeTab === 'request' 
                      ? 'bg-purple-600 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-purple-700 hover:bg-slate-200/50'
                    )}
                >
                  <Store className="h-4 w-4" /> 
                  <span>Request Outlet</span>
                  {requestItems.length > 0 && (
                    <span className={"ml-1 px-1.5 py-0.5 text-[10px] font-extrabold rounded-full " + 
                      (activeTab === 'request' ? 'bg-purple-800 text-purple-100' : 'bg-purple-100 text-purple-700')
                    }>
                      {requestItems.length}
                    </span>
                  )}
                </button>

                {/* TAB 2: RIWAYAT REQUEST OUTLET */}
                <button
                  onClick={() => {
                    setActiveTab('history');
                  }}
                  className={"flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap " + 
                    (activeTab === 'history' 
                      ? 'bg-purple-600 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-purple-700 hover:bg-slate-200/50'
                    )}
                >
                  <History className="h-4 w-4" /> 
                  <span>Riwayat Request Outlet</span>
                  {savedHistory.filter(h => h.type === 'request').length > 0 && (
                    <span className={"ml-1 px-1.5 py-0.5 text-[10px] font-extrabold rounded-full " + 
                      (activeTab === 'history' ? 'bg-purple-800 text-purple-100' : 'bg-slate-200 text-slate-700')
                    }>
                      {savedHistory.filter(h => h.type === 'request').length}
                    </span>
                  )}
                </button>
              </div>

              <button 
                onClick={fetchData}
                disabled={loading}
                className="flex items-center space-x-1.5 px-3 py-2 sm:px-4 sm:py-2 bg-white border border-slate-200 text-slate-700 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50 rounded-xl transition-all duration-200 shadow-xs hover:shadow active:scale-95 disabled:opacity-50 text-xs sm:text-sm font-semibold"
                title="Refresh Data Master"
              >
                <RefreshCw className={"h-4 w-4 " + (loading ? 'animate-spin text-purple-500' : '')} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <AnimatePresence mode="wait">
          {activeTab === 'request' && (
            <motion.div 
              key="request"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* --- TOP GRID: FORM REQUEST (KIRI) & RIWAYAT TERSALIN/TERSIMPAN (KANAN) --- */}
              <div className={showHistorySidebar ? "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" : "w-full space-y-4"}>
                
                {/* KOLOM KIRI: DAFTAR REQUEST OUTLET (KERANJANG AKTIF) */}
                <div className={showHistorySidebar ? "lg:col-span-7 flex flex-col space-y-4" : "w-full flex flex-col space-y-4"}>
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden ring-1 ring-slate-900/5">
                  <div className="bg-gradient-to-r from-purple-50/60 to-white p-4 sm:p-5 border-b border-purple-100/60 flex flex-col gap-3.5">
                    {/* Top Row: Title + Toggle Riwayat + Salin & Simpan Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div className="bg-purple-100 p-2.5 rounded-xl text-purple-600 shadow-xs shrink-0">
                          <Store className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-base sm:text-lg font-bold text-slate-800">Daftar Request Outlet</h2>
                          <p className="text-xs font-semibold text-slate-500">{requestItems.length} Produk dimasukkan</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowHistorySidebar(!showHistorySidebar)}
                          className="shrink-0 whitespace-nowrap flex items-center space-x-1.5 px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs"
                          title={showHistorySidebar ? 'Sembunyikan panel riwayat di samping' : 'Buka panel riwayat di samping'}
                        >
                          <History className="h-4 w-4 shrink-0 text-purple-600" />
                          <span>{showHistorySidebar ? 'Sembunyikan Riwayat' : 'Buka Riwayat'}</span>
                        </button>

                        <button
                          onClick={() => handleCopyRequest(true)}
                          disabled={requestItems.length === 0 || ((isCustomName || currentAdminOptions.length === 0) && !customName.trim()) || ((isCustomLocation || currentLocationOptions.length === 0) && !customLocation.trim())}
                          className="shrink-0 whitespace-nowrap flex items-center justify-center space-x-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl shadow-md hover:shadow-lg active:scale-95 text-xs sm:text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {copiedRequestSave ? <Check className="h-4 w-4 shrink-0" /> : <Save className="h-4 w-4 shrink-0" />}
                          <span className="whitespace-nowrap">{copiedRequestSave ? 'Tersimpan & Tersalin!' : 'Salin & Simpan'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Bottom Row: Clean 4-Column Controls Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs text-xs">
                      {/* Akses */}
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Akses:</span>
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
                            className="w-full appearance-none bg-white border border-slate-200 text-xs font-bold text-indigo-700 py-1.5 pl-2.5 pr-6 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer truncate"
                          >
                            <option value="online">Admin Online</option>
                            <option value="toko">Admin Toko</option>
                            <option value="gudang">Admin Gudang</option>
                            <option value="sales">Admin Sales</option>
                            <option value="cs">Purchasing (CS)</option>
                          </select>
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
                        </div>
                      </div>

                      {/* Lokasi / Pengirim */}
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pengirim:</span>
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
                              className="w-full appearance-none bg-white border border-slate-200 text-xs font-bold text-slate-700 py-1.5 pl-2.5 pr-6 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer truncate"
                            >
                              {currentLocationOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                              <option value="Custom">Lainnya...</option>
                            </select>
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
                          </div>
                        ) : null}
                        {(isCustomLocation || currentLocationOptions.length === 0) && (
                          <input 
                            type="text" 
                            value={customLocation} 
                            onChange={(e) => setCustomLocation(e.target.value)} 
                            placeholder="Ketik Lokasi..."
                            className="w-full text-xs font-bold px-2 py-1 bg-white border border-purple-300 rounded-lg outline-none text-purple-700 mt-1"
                          />
                        )}
                      </div>

                      {/* Admin */}
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Admin:</span>
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
                              className="w-full appearance-none bg-white border border-slate-200 text-xs font-bold text-slate-700 py-1.5 pl-2.5 pr-6 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer truncate"
                            >
                              {currentAdminOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                              <option value="Custom">Lainnya...</option>
                            </select>
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
                          </div>
                        ) : null}
                        {(isCustomName || currentAdminOptions.length === 0) && (
                          <input 
                            type="text" 
                            value={customName} 
                            onChange={(e) => setCustomName(e.target.value)} 
                            placeholder="Ketik Nama..."
                            className="w-full text-xs font-bold px-2 py-1 bg-white border border-purple-300 rounded-lg outline-none text-purple-700 mt-1"
                          />
                        )}
                      </div>

                      {/* Tujuan */}
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tujuan:</span>
                        <div className="relative">
                          <select
                            value={destinationOutlet}
                            onChange={(e) => setDestinationOutlet(e.target.value)}
                            className="w-full appearance-none bg-white border border-slate-200 text-xs font-bold text-slate-700 py-1.5 pl-2.5 pr-6 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer truncate"
                          >
                            {DESTINATION_OPTIONS.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                          </select>
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
                        </div>
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
                          const nameCol = headers.find(h => h.toLowerCase().includes('nama') || h.toLowerCase().includes('desc')) || headers[2] || headers[1] || headers[0];
                          const skuCol = headers.find(h => h.toLowerCase().includes('sku') || h.toLowerCase().includes('kode') || h.toLowerCase() === 'code');
                          const unitCol = headers.find(h => h.toLowerCase().includes('unit'));
                          const stockCol = headers[14] || headers.find(h => h.toLowerCase() === 'qty' || h.toLowerCase().includes('stok') || h.toLowerCase().includes('stock'));
                          const fotoCol = headers.find(h => h.toLowerCase().includes('foto'));
                          const driveId = fotoCol && item[fotoCol] ? String(item[fotoCol]).trim() : '';
                          
                          return (
                            <li key={item.id} className="group flex flex-col justify-between bg-white border border-slate-200/60 p-3.5 rounded-xl hover:shadow-md hover:border-purple-300 transition-all duration-200 gap-2">
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex items-start space-x-3 flex-1 min-w-0">
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
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 leading-snug break-words">{item[nameCol]}</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {skuCol && item[skuCol] && (
                                        <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/30">SKU: {item[skuCol]}</span>
                                      )}
                                      {unitCol && item[unitCol] && (
                                        <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/30">Unit: {item[unitCol]}</span>
                                      )}
                                      {stockCol && item[stockCol] !== undefined && item[stockCol] !== '' && (
                                        <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">Stok: {item[stockCol]}</span>
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
              </div>

              {/* KOLOM KANAN (5 Cols): RIWAYAT REQUEST OUTLET (TERSIMPAN & TERSALIN) - HIDEABLE */}
              {showHistorySidebar && (
                <div className="lg:col-span-5 flex flex-col space-y-4">
                  <div className="bg-white rounded-2xl shadow-sm border border-purple-200/80 overflow-hidden ring-1 ring-purple-900/5">
                    {/* Header Panel Riwayat */}
                    <div className="bg-gradient-to-r from-purple-50/80 via-purple-50/40 to-white px-4 py-3.5 border-b border-purple-100 flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                          <History className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <h2 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-1.5">
                            <span>Riwayat Request</span>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                              {filteredHistory.length}
                            </span>
                          </h2>
                          <p className="text-[11px] font-medium text-slate-500">List tersalin & tersimpan</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={fetchData}
                          disabled={loading}
                          className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          title="Sinkron / Refresh Riwayat"
                        >
                          <RefreshCw className={"h-4 w-4 " + (loading ? 'animate-spin text-purple-600' : '')} />
                        </button>
                        <button
                          onClick={() => setShowHistorySidebar(false)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Sembunyikan Panel Riwayat"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                  {/* Filter & Search Bar Ringkas */}
                  <div className="p-2.5 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <Search className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        value={historySearchTerm}
                        onChange={(e) => setHistorySearchTerm(e.target.value)}
                        placeholder="Cari SKU / nama di riwayat..."
                        className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      />
                    </div>
                    <div className="relative w-full sm:w-36">
                      <select
                        value={historyFilterMonth}
                        onChange={(e) => setHistoryFilterMonth(e.target.value)}
                        className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-semibold py-1.5 pl-2.5 pr-7 rounded-lg outline-none cursor-pointer"
                      >
                        <option value="all">Semua Bulan</option>
                        {availableMonths.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Feed List Sesi Tersimpan */}
                  <div className="p-3 bg-slate-50/40 max-h-[440px] overflow-y-auto space-y-3">
                    {filteredHistory.length === 0 ? (
                      <div className="py-10 px-4 text-center flex flex-col items-center justify-center">
                        <div className="bg-white p-3.5 rounded-full shadow-xs mb-3 border border-purple-100">
                          <History className="h-6 w-6 text-purple-300" />
                        </div>
                        <p className="text-xs font-bold text-slate-700">Belum Ada Riwayat Tersimpan</p>
                        <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                          Setiap kali Anda menekan tombol <strong className="text-purple-600">Salin & Simpan</strong>, daftar request akan otomatis tercatat dan muncul di sini.
                        </p>
                      </div>
                    ) : (
                      filteredHistory.map((session) => {
                        const isCopied = copiedHistoryId === session.id;
                        const d = parseDateSafe(session.date);
                        const timeStr = isNaN(d.getTime()) 
                          ? session.date 
                          : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
                        
                        let routeOrigin = 'Gudang';
                        let routeTarget = 'SDK';
                        let adminName = session.requester || 'Admin';

                        if (session.requester) {
                          if (session.requester.includes(' ⬅ Outlet: ')) {
                            const p = session.requester.split(' ⬅ Outlet: ');
                            adminName = p[0];
                            routeTarget = p[1] || 'SDK';
                          } else if (session.requester.includes(' ➔ Tujuan: ')) {
                            const p = session.requester.split(' ➔ Tujuan: ');
                            adminName = p[0];
                            routeTarget = p[1] || 'SDK';
                          }
                        }

                        return (
                          <div
                            key={session.id}
                            className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs hover:border-purple-300 hover:shadow-xs transition-all space-y-2.5"
                          >
                            {/* Header Card */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <div className="flex items-center space-x-1.5 text-slate-600">
                                <Clock className="h-3.5 w-3.5 text-purple-500" />
                                <span className="text-[11px] font-bold text-slate-700">{timeStr}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/50">
                                  {routeOrigin} <span className="text-purple-400">➔</span> {routeTarget}
                                </span>
                              </div>
                            </div>

                            {/* Admin & Total Info */}
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span>Oleh: <strong className="text-slate-700 font-semibold">{adminName}</strong></span>
                              <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[10px]">
                                {session.items?.length || 0} Produk
                              </span>
                            </div>

                            {/* Item preview */}
                            <div className="bg-slate-50/70 rounded-lg p-2 space-y-1.5 border border-slate-100">
                              {session.items && session.items.slice(0, 3).map((item: any, itIdx: number) => {
                                const nameCol = headers.find(h => h.toLowerCase().includes('nama') || h.toLowerCase().includes('desc')) || headers[2] || headers[1] || headers[0];
                                const unitCol = headers.find(h => h.toLowerCase().includes('unit'));
                                return (
                                  <div key={itIdx} className="flex items-center justify-between text-[11px] gap-2">
                                    <div className="text-slate-700 font-medium break-words leading-snug flex-1 min-w-0">
                                      • {item[nameCol] || 'Produk'}
                                      {item._catatan && <span className="text-slate-400 italic text-[10px] ml-1">({item._catatan})</span>}
                                    </div>
                                    <span className="flex-shrink-0 font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] border border-emerald-200/60">
                                      {item._qty || 1} {unitCol && item[unitCol] ? item[unitCol] : 'PCS'}
                                    </span>
                                  </div>
                                );
                              })}
                              {session.items && session.items.length > 3 && (
                                <p className="text-[10px] text-slate-400 italic pt-0.5 text-center">
                                  + {session.items.length - 3} produk lainnya...
                                </p>
                              )}
                            </div>

                            {/* Actions footer */}
                            <div className="flex items-center justify-between pt-1 gap-2">
                              <button
                                onClick={() => handleCopyHistorySessionMessage(session)}
                                className={"flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs " + 
                                  (isCopied 
                                    ? 'bg-emerald-600 text-white' 
                                    : 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95'
                                  )}
                                title="Salin ulang format teks request untuk WA"
                              >
                                {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                <span>{isCopied ? 'Tersalin!' : 'Salin Teks WA'}</span>
                              </button>

                              <div className="flex items-center space-x-1.5">
                                <button
                                  onClick={() => {
                                    const dObj = parseDateSafe(session.date);
                                    const dateIso = !isNaN(dObj.getTime()) ? dObj.toISOString().slice(0, 10) : 'Date_Unknown';
                                    downloadCSV(session.items, displayHeaders, `Request_${routeTarget}_${dateIso}`);
                                  }}
                                  className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-purple-600 rounded-lg text-xs font-bold transition-colors shadow-2xs"
                                  title="Download CSV"
                                >
                                  <FileDown className="h-3.5 w-3.5" />
                                </button>

                                <button
                                  onClick={() => setSelectedNotifSession(session)}
                                  className="p-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                                  title="Buka Catatan / Diskusi"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer Riwayat Link */}
                  <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500">Tersinkron dengan spreadsheet</span>
                    <button
                      onClick={() => setActiveTab('history')}
                      className="text-purple-700 hover:text-purple-900 font-bold text-[11px] flex items-center space-x-1 hover:underline"
                    >
                      <span>Lihat Layar Penuh</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            </div>

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
                              {displayHeaders.map((header, idx) => {
                                const isStock = header.toLowerCase() === 'stok' || header.toLowerCase() === 'qty' || header.toLowerCase().includes('stok') || header.toLowerCase().includes('stock');
                                return (
                                  <th key={idx} className="px-4 sm:px-6 py-4 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                    {header} {isStock && <span className="text-emerald-600 font-extrabold normal-case text-[11px] ml-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">(Kolom 15)</span>}
                                  </th>
                                );
                              })}
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
                                    <div className="flex items-center space-x-1.5">
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
                                    </div>
                                  </td>
                                  <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-xs sm:text-sm font-semibold text-slate-400">
                                    {startIndex + rowIndex + 1}
                                  </td>
                                  {displayHeaders.map((header, colIndex) => {
                                    const isStock = header.toLowerCase() === 'stok' || header.toLowerCase() === 'qty' || header.toLowerCase().includes('stok') || header.toLowerCase().includes('stock');
                                    const isDesc = header.toLowerCase().includes('desc') || header.toLowerCase().includes('nama');
                                    const isCode = header.toLowerCase() === 'code' || header.toLowerCase().includes('sku');
                                    
                                    return (
                                      <td key={colIndex} className={"px-4 sm:px-6 py-3 text-xs sm:text-sm " + (isDesc ? 'font-bold text-slate-800' : isCode ? 'font-mono text-slate-700' : 'text-slate-600 font-medium')}>
                                        {isStock ? (
                                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                                            {row[header] !== undefined && row[header] !== '' ? row[header] : '0'}
                                          </span>
                                        ) : (
                                          row[header]
                                        )}
                                      </td>
                                    );
                                  })}
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
                    <div className="bg-white p-2 border border-purple-200 rounded-lg text-purple-600 shadow-sm">
                      <History className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-800">
                        Riwayat Request Outlet
                      </h2>
                      <p className="text-xs font-semibold text-slate-500">{filteredHistory.length} Rekaman request outlet ditemukan</p>
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
                
                <div className="p-4 sm:p-6 bg-slate-50/30 space-y-6">
                  {groupedHistoryEntries.length > 0 ? (
                    <>
                      {currentGroupedHistory.map(([dateKey, sessions]) => (
                        <div key={dateKey} className="space-y-4">
                          
                          {/* Header Date Frame */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
                            <h3 className="text-sm sm:text-base font-bold text-slate-700 flex items-center space-x-2">
                              <span className="w-2 h-5 rounded-full bg-purple-500"></span>
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

      {/* FLOATING ACTION CHAT TRIGGER */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsLiveChatOpen(true)}
          className="flex items-center space-x-2.5 px-4 py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-full shadow-2xl hover:shadow-indigo-500/30 border border-white/20 transition-all group"
        >
          <div className="relative">
            <MessageSquare className="h-5 w-5" />
            {liveChatUnreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-amber-950 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full border border-white animate-bounce">
                {liveChatUnreadCount}
              </span>
            )}
          </div>
          <span className="text-xs font-bold tracking-wide pr-1">Chat &amp; Info Stok</span>
        </motion.button>
      </div>

      {/* LIVE CHAT DRAWER & EMPTY PRODUCT ALERTS */}
      <AnimatePresence>
        {isLiveChatOpen && (
          <LiveChatDrawer
            isOpen={isLiveChatOpen}
            onClose={() => setIsLiveChatOpen(false)}
            currentUser={loggedInUser}
            onSwitchUser={handleSwitchUser}
            products={data}
            headers={headers}
            onAddToRekap={handleAddToRekapFromChat}
            onAddToRequest={handleAddToRequestFromChat}
            onSearchInDatabase={handleSearchInDatabase}
            preSelectedProductForAlert={preSelectedProductForAlert}
            onClearPreSelectedProduct={() => setPreSelectedProductForAlert(null)}
            onOpenRecordingCenter={() => setIsRecordingCenterOpen(true)}
          />
        )}
      </AnimatePresence>

      {/* REAL-TIME CHAT RECORDING & AUDIT CENTER MODAL */}
      <AnimatePresence>
        {isRecordingCenterOpen && (
          <ChatRecordingCenter
            isOpen={isRecordingCenterOpen}
            onClose={() => setIsRecordingCenterOpen(false)}
            currentUser={loggedInUser}
          />
        )}
      </AnimatePresence>

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
