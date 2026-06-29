/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { AlertCircle, LayoutGrid, KeyRound, UserSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { UserSession } from '../types';

interface LoginProps {
  onLoginSuccess: (session: UserSession) => void;
}

const USERS: Record<string, { password: string; role: 'store' | 'purchasing'; name: string }> = {
  toko: { password: '123', role: 'store', name: 'Admin Toko' },
  gudang: { password: '123', role: 'store', name: 'Admin Gudang' },
  online: { password: '123', role: 'store', name: 'Admin Online' },
  sales: { password: '123', role: 'store', name: 'Admin Sales' },
  cs: { password: '000', role: 'purchasing', name: 'Purchasing (CS)' }
};

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    const userKey = username.toLowerCase().trim();
    const user = USERS[userKey];

    if (user && user.password === password) {
      const loggedInInfo: UserSession = {
        username: userKey,
        role: user.role,
        name: user.name
      };
      onLoginSuccess(loggedInInfo);
      setLoginError('');
    } else {
      setLoginError('Username atau Password salah!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-indigo-200">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sm:mx-auto sm:w-full sm:max-w-md text-center"
      >
        <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl shadow-lg flex items-center justify-center transform transition-transform hover:scale-105">
          <LayoutGrid className="h-8 w-8 text-white" />
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-slate-900 tracking-tight">Sistem Rekap</h2>
        <p className="mt-2 text-sm text-slate-500 font-medium">Masuk untuk mengakses produk kosong &amp; inventaris</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-slate-100 ring-1 ring-slate-900/5">
          <form className="space-y-6" onSubmit={handleLogin}>
            {loginError && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-50 text-red-700 p-3 rounded-lg text-sm font-bold text-center border border-red-100 flex items-center justify-center space-x-2"
              >
                <AlertCircle className="h-4 w-4" />
                <span>{loginError}</span>
              </motion.div>
            )}
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Username</label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <UserSquare className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700 sm:text-sm"
                  placeholder="Contoh: toko, gudang, cs"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700 sm:text-sm"
                  placeholder="••••••"
                />
              </div>
            </div>

            <div>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
              >
                Masuk ke Sistem
              </motion.button>
            </div>
          </form>
          
          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <p className="text-xs text-slate-400 font-medium">Akses terbatas hanya untuk staf berwenang.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
