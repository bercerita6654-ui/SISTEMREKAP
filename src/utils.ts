/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, RekapItem, RequestItem } from './types';

export function parseCSV(str: string): string[][] {
  const arr: string[][] = [];
  let quote = false;
  let row = 0, col = 0;
  
  arr[row] = [];
  arr[row][col] = '';

  for (let c = 0; c < str.length; c++) {
    const cc = str[c];
    const nc = str[c + 1];

    if (cc === '"' && quote && nc === '"') {
      arr[row][col] += cc;
      c++;
      continue;
    }
    if (cc === '"') {
      quote = !quote;
      continue;
    }
    if (cc === ',' && !quote) {
      col++;
      arr[row] = arr[row] || [];
      arr[row][col] = '';
      continue;
    }
    if (cc === '\r' && nc === '\n' && !quote) {
      row++;
      col = 0;
      c++;
      arr[row] = [];
      arr[row][col] = '';
      continue;
    }
    if (cc === '\n' && !quote) {
      row++;
      col = 0;
      arr[row] = [];
      arr[row][col] = '';
      continue;
    }
    if (cc === '\r' && !quote) {
      row++;
      col = 0;
      arr[row] = [];
      arr[row][col] = '';
      continue;
    }

    arr[row][col] += cc;
  }
  return arr;
}

export const parseDateSafe = (dateStr: string | null | undefined): Date => {
  if (!dateStr) return new Date(NaN);
  const cleanStr = String(dateStr).replace(/^ID-/, '').trim();
  let d = new Date(cleanStr);
  if (!isNaN(d.getTime())) return d;
  
  const match = cleanStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2})[\:\.](\d{1,2})(?:[\:\.](\d{1,2}))?)?/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; 
    const year = parseInt(match[3], 10);
    const hours = match[4] ? parseInt(match[4], 10) : 0;
    const minutes = match[5] ? parseInt(match[5], 10) : 0;
    const seconds = match[6] ? parseInt(match[6], 10) : 0;
    d = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(d.getTime())) return d;
  }
  return d;
};

export const generateCopyText = (
  rekapList: RekapItem[], 
  currentHeaders: string[] = ['SKU', 'Nama Produk'], 
  forcedDateStr: string | null = null
): string => {
  let nameCol = 'Nama Produk';
  let skuCol = 'SKU';
  if (currentHeaders && currentHeaders.length > 0) {
    nameCol = currentHeaders.find(h => h.toLowerCase().includes('nama')) || currentHeaders[1] || currentHeaders[0];
    skuCol = currentHeaders.find(h => h.toLowerCase().includes('sku') || h.toLowerCase().includes('kode')) || 'SKU';
  }
  
  const textLines = rekapList.map((item, i) => {
    let str = `${i + 1}. ${item[skuCol] ? `${item[skuCol]} - ` : ''}${item[nameCol] || 'Produk'}`;
    if (item._catatan && item._catatan.trim() !== '') {
      str += `\n   --> Ket : _${item._catatan}_`;
    }
    return str;
  });

  const dateStr = forcedDateStr || new Date().toLocaleDateString('id-ID', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return "*REKAP PRODUK KOSONG*\n" + 
    dateStr + "\n\n" +
    textLines.join('\n');
};

export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 11) return 'pagi';
  if (hour >= 11 && hour < 15) return 'siang';
  if (hour >= 15 && hour < 18) return 'sore';
  return 'malam';
};

export const generateRequestCopyText = (
  itemsList: RequestItem[], 
  dest: string = 'SDK', 
  reqName: string = 'Admin',
  headers: string[] = ['SKU', 'Nama Produk', 'Unit']
): string => {
  const nameCol = headers.find(h => h.toLowerCase().includes('nama')) || headers[1] || headers[0];
  const skuCol = headers.find(h => h.toLowerCase().includes('sku') || h.toLowerCase().includes('kode'));
  const unitCol = headers.find(h => h.toLowerCase().includes('unit'));

  const greeting = getGreeting();
  let text = `Selamat ${greeting} tim ${dest}, minta tolong di bantu siapkan ya kak :\n\n`;

  itemsList.forEach((item, i) => {
    const sku = skuCol && item[skuCol] ? `(${item[skuCol]}) ` : '';
    const name = item[nameCol] || 'Produk';
    const qty = item._qty || '1';
    const unit = unitCol && item[unitCol] ? `${item[unitCol]}` : 'PCS';
    
    text += `${i + 1}. ${sku}${name} = ${qty} ${unit}\n`;
  });

  text += `\ndiminta oleh ${reqName} - terima kasih`;
  return text;
};

export const downloadCSV = (itemsList: any[], headers: string[], filenamePrefix: string): void => {
  if (!itemsList || itemsList.length === 0) return;
  
  const hasQty = itemsList.some(item => item._qty !== undefined);
  const extraCol = hasQty ? "Jumlah_Diminta" : "Catatan";

  const csvHeaders = [...headers, extraCol].join(",");
  const csvRows = itemsList.map(row => {
    const baseCols = headers.map(header => {
      let cell = row[header] === null || row[header] === undefined ? "" : String(row[header]);
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        cell = `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    });
    
    let extraCell = hasQty ? (row._qty || "") : (row._catatan || "");
    const extraCellStr = String(extraCell);
    let escapedExtra = extraCellStr;
    if (extraCellStr.includes(',') || extraCellStr.includes('"') || extraCellStr.includes('\n')) {
      escapedExtra = `"${extraCellStr.replace(/"/g, '""')}"`;
    }
    
    return [...baseCols, escapedExtra].join(",");
  }).join("\n");
  
  const csvContent = "data:text/csv;charset=utf-8," + csvHeaders + "\n" + csvRows;
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filenamePrefix}_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
