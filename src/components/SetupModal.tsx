/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { X, Check, Save } from 'lucide-react';
import { motion } from 'motion/react';

interface SetupModalProps {
  initialScriptUrl: string;
  initialHistoryCsvUrl: string;
  onClose: () => void;
  onSave: (scriptUrl: string, historyCsvUrl: string) => void;
}

export default function SetupModal({
  initialScriptUrl,
  initialHistoryCsvUrl,
  onClose,
  onSave,
}: SetupModalProps) {
  const [scriptUrl, setScriptUrl] = useState(initialScriptUrl);
  const [historyCsvUrl, setHistoryCsvUrl] = useState(initialHistoryCsvUrl);

  const handleSave = () => {
    onSave(scriptUrl, historyCsvUrl);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 ring-1 ring-slate-900/5 transform duration-200"
      >
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg sm:text-xl font-bold text-slate-800">Pengaturan Sinkronisasi</h3>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="px-6 py-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Input Web App (Menyimpan) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              1. Google Script Web App URL 
              <span className="text-xs text-blue-600 font-bold px-2 py-0.5 bg-blue-50 rounded-md ml-2">Menyimpan</span>
            </label>
            <p className="text-xs text-slate-500 mb-2 font-medium">Link Web App Google Apps Script untuk menyimpan data rekap produk kosong ke target Spreadsheet.</p>
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-700 shadow-sm text-sm"
              value={scriptUrl}
              onChange={(e) => setScriptUrl(e.target.value)}
            />
          </div>

          <div className="border-t border-slate-100"></div>

          {/* Input CSV (Membaca) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              2. URL CSV Spreadsheet Riwayat 
              <span className="text-xs text-amber-600 font-bold px-2 py-0.5 bg-amber-50 rounded-md ml-2">Membaca / Opsional</span>
            </label>
            <div className="text-xs text-slate-500 mb-2 font-medium leading-relaxed">
              <p className="mb-1">Jika diisi, aplikasi akan menarik riwayat langsung dari Spreadsheet target secara global.</p>
              <p className="bg-slate-50 p-2 rounded-lg border border-slate-200/50 text-[11px] font-semibold text-slate-600">
                <span className="text-indigo-600">Cara dapatkan:</span> Buka File Sheet Target Anda &rarr; Bagikan &rarr; Publikasikan ke Web &rarr; Pilih Tab Sheet Target &rarr; Pilih Format CSV &rarr; Salin Link.
              </p>
            </div>
            <input
              type="url"
              placeholder="https://docs.google.com/spreadsheets/.../pub?output=csv"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-700 shadow-sm text-sm"
              value={historyCsvUrl}
              onChange={(e) => setHistoryCsvUrl(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-5 border-t border-slate-100 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm active:scale-95"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-200 active:scale-95 flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>Simpan &amp; Sinkronkan</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
