/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { X, Check, Send, Loader2, User, Clock, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { HistorySession, UserSession } from '../types';
import { parseDateSafe } from '../utils';

interface NotifDetailModalProps {
  session: HistorySession;
  onClose: () => void;
  loggedInUser: UserSession;
  headers: string[];
  onSubmitReply: (sessionId: string, text: string) => Promise<boolean>;
}

export default function NotifDetailModal({
  session,
  onClose,
  loggedInUser,
  headers,
  onSubmitReply,
}: NotifDetailModalProps) {
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.chatHistory]);

  const handleSend = async () => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    const ok = await onSubmitReply(session.id, replyText);
    setSubmitting(false);
    if (ok) {
      setReplyText('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1000);
    }
  };

  const renderMessageWithTags = (text: string, isOwnMsg: boolean) => {
    return text.split(' ').map((word, i) => {
      if (word.startsWith('@') && word.length > 1) {
        return (
          <span 
            key={i} 
            className={"font-bold px-1 rounded-md mx-0.5 " + 
              (isOwnMsg 
                ? 'bg-white/30 text-white' 
                : (session.type === 'request' ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800')
              )}
          >
            {word}
          </span>
        );
      }
      return word + ' ';
    });
  };

  const userRole = loggedInUser.role;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 ring-1 ring-slate-900/5 transform duration-200 flex flex-col h-[90vh]"
      >
        {/* HEADER MODAL */}
        <div className={"flex justify-between items-center px-6 py-5 border-b border-slate-100 flex-shrink-0 " + 
          (session.type === 'request' ? 'bg-purple-50/50' : 'bg-indigo-50/50')}
        >
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center space-x-2">
              <span className={"w-2.5 h-6 rounded-full " + (session.type === 'request' ? 'bg-purple-500' : 'bg-indigo-500')}></span>
              <span>Detail {session.type === 'request' ? 'Request Outlet' : 'Laporan Produk Kosong'}</span>
            </h3>
            <p className="text-xs font-mono text-slate-400 mt-1">
              ID Sesi: {session.id}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* INFO PENGIRIM */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-2 text-xs sm:text-sm flex-shrink-0 font-medium">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-slate-400" />
            <span className="text-slate-500 font-bold">Dikirim Oleh:</span> 
            <span className="font-bold text-slate-700">{session.requester || 'Admin'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="text-slate-500 font-bold">Waktu:</span> 
            <span className="font-bold text-slate-700">
              {(() => {
                const d = parseDateSafe(session.date);
                return isNaN(d.getTime()) 
                  ? session.date 
                  : d.toLocaleDateString('id-ID', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    }) + ' WIB';
              })()}
            </span>
          </div>
        </div>
        
        {/* DAFTAR ITEM (SCROLLABLE AREA 1) */}
        <div className="px-6 py-4 overflow-y-auto flex-1 min-h-[150px] bg-slate-50/30">
          <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center space-x-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span>Daftar Produk ({session.items?.length || 0})</span>
          </h4>
          <ul className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
            {session.items && session.items.map((item, idx) => {
              const nameCol = headers.find(h => h.toLowerCase().includes('nama')) || headers[1] || headers[0];
              const skuCol = headers.find(h => h.toLowerCase().includes('sku') || h.toLowerCase().includes('kode'));
              const unitCol = headers.find(h => h.toLowerCase().includes('unit'));
              const fotoCol = headers.find(h => h.toLowerCase().includes('foto'));
              const driveId = fotoCol && item[fotoCol] ? String(item[fotoCol]).trim() : '';
               
              return (
                <li key={idx} className="p-4 hover:bg-slate-50/50 transition-colors bg-white">
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
                      <div className={"flex-shrink-0 mt-0.5 h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] " + 
                        (session.type === 'request' ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600')}
                      >
                        {idx + 1}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 leading-tight truncate">{item[nameCol] || 'Produk'}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {skuCol && item[skuCol] && (
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">
                            SKU: {item[skuCol]}
                          </span>
                        )}
                        {item._qty !== undefined && (
                          <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 font-bold">
                            Jumlah: {item._qty} {unitCol && item[unitCol] ? item[unitCol] : 'PCS'}
                          </span>
                        )}
                        {item._catatan && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 font-bold">
                            📝 {item._catatan}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* FITUR CHAT DALAM MODAL (SCROLLABLE AREA 2) */}
        <div className={"px-6 py-4 border-t flex-shrink-0 " + 
          (session.type === 'request' ? 'border-purple-100 bg-purple-50/30' : 'border-indigo-100 bg-indigo-50/30')}
        >
          <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Diskusi Laporan</h4>
          
          <div className="mb-3 space-y-2.5 max-h-40 overflow-y-auto pr-2">
            {session.chatHistory && session.chatHistory.length > 0 ? (
              session.chatHistory.map((msg, i) => {
                const isOwn = msg.role === userRole;
                return (
                  <div key={i} className={"flex flex-col " + (isOwn ? 'items-end' : 'items-start')}>
                    <span className="text-[9px] text-slate-400 font-bold mb-0.5 px-1">
                      {msg.sender} &bull; {(() => {
                        const md = parseDateSafe(msg.timestamp);
                        return !isNaN(md.getTime()) 
                          ? md.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) 
                          : '...';
                      })()}
                    </span>
                    <div className={"px-3.5 py-2 rounded-2xl max-w-[85%] text-xs font-semibold shadow-sm " + 
                      (isOwn 
                        ? (session.type === 'request' ? 'bg-purple-600 text-white' : 'bg-indigo-600 text-white') 
                        : 'bg-white border border-slate-200 text-slate-700'
                      )}
                    >
                      {renderMessageWithTags(msg.text, isOwn)}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 font-medium italic text-center py-4 bg-white/50 border border-dashed border-slate-200 rounded-xl">
                Belum ada tanggapan atau komentar pada rekap ini.
              </p>
            )}
            <div ref={chatEndRef} />
          </div>
          
          <div className="flex items-center space-x-2 mt-2">
            <input 
              type="text" 
              placeholder="Ketik balasan (Gunakan @ untuk Tag orang)..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              className={"flex-1 text-xs px-3.5 py-2.5 border rounded-xl focus:ring-2 outline-none shadow-sm bg-white " + 
                (session.type === 'request' 
                  ? 'border-purple-200 focus:border-purple-500 focus:ring-purple-500/10' 
                  : 'border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                )}
            />
            <button 
              onClick={handleSend}
              disabled={!replyText.trim() || submitting}
              className={"px-4 py-2.5 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-all flex items-center justify-center space-x-1.5 shadow-sm active:scale-95 " + 
                (session.type === 'request' 
                  ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' 
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                )}
            >
              {success ? (
                <Check className="h-4 w-4" />
              ) : submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>Kirim</span>
            </button>
          </div>
        </div>

        {/* FOOTER MODAL */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm active:scale-95"
          >
            Tutup Detail
          </button>
        </div>
      </motion.div>
    </div>
  );
}
