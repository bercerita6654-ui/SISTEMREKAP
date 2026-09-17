/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: number;
  SKU: string;
  'Nama Produk': string;
  Unit: string;
  'Merk'?: string;
  'Foto Produk'?: string;
  'Stock Gudang'?: string;
  'Stock Toko'?: string;
  [key: string]: any; // Allow indexing
}

export interface RekapItem extends Product {
  _catatan?: string;
}

export interface RequestItem extends Product {
  _qty?: number;
}

export interface StockAlertInfo {
  sku: string;
  productName: string;
  unit?: string;
  photoUrl?: string;
  stockLocation?: string;
  alertType: 'empty' | 'low' | 'damaged' | 'reorder';
  customNote?: string;
  status: 'pending' | 'acknowledged' | 'reordered' | 'resolved';
}

export interface LiveChatMessage {
  id: string;
  channel: 'empty-product' | 'general';
  senderUsername: string;
  senderName: string;
  senderRole: string;
  senderLocation?: string;
  targetUser?: string;
  text: string;
  stockAlert?: StockAlertInfo;
  timestamp: string;
  readBy?: string[];
}

export interface ChatMessage {
  sender: string;
  role: string; // 'store' | 'purchasing'
  text: string;
  timestamp: string;
}

export interface HistorySession {
  id: string;
  date: string;
  type: 'save' | 'copy' | 'request';
  items: any[];
  text: string;
  chatHistory: ChatMessage[];
  requester?: string;
}

export interface UserSession {
  username: string;
  role: 'store' | 'purchasing';
  name: string;
}
