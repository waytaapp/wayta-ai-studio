import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Serializes complex error objects into a readable JSON structure.
 * Captures non-enumerable properties like 'message' and 'stack' which are 
 * often missed by standard JSON.stringify.
 */
export function serializeError(err: any): any {
  if (!err) return { message: 'Unknown error' };

  if (typeof err === 'string') return { message: err };

  const result: any = {
    message: err.message || err.statusText || 'No message',
    name: err.name || 'Error',
    stack: err.stack,
    type: err.constructor?.name || typeof err,
  };

  // Extract all keys, including non-enumerable ones for common Error types
  const allKeys = Object.getOwnPropertyNames(err);
  allKeys.forEach(key => {
    try {
      if (typeof err[key] !== 'function' && !['stack'].includes(key)) {
        result[key] = err[key];
      }
    } catch (e) {
      // Ignore properties that might throw on access
    }
  });

  // Handle Firebase specific error structures
  if (err.code) result.code = err.code;
  if (err.details) result.details = err.details;
  if (err.customData) result.customData = err.customData;

  // Handle Socket.io connection errors
  if (err.description) result.description = err.description;
  if (err.context) result.context = err.context;

  return result;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | undefined | null) {
  const value = amount || 0;
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(value).replace('ZAR', 'R');
}

export function cleanForRTDB(obj: any): any {
  if (obj === null || obj === undefined) return null;
  
  // Handle primitives
  if (typeof obj !== 'object') return obj;
  
  // Handle Arrays
  if (Array.isArray(obj)) {
    return obj
      .map(v => cleanForRTDB(v))
      .filter(v => v !== undefined && v !== null);
  }
  
  // Handle Objects
  const cleaned: any = {};
  let hasValidKeys = false;
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = cleanForRTDB(obj[key]);
      // RTDB: skip undefined and null (Firebase set() fails on undefined)
      if (val !== undefined && val !== null) {
        cleaned[key] = val;
        hasValidKeys = true;
      }
    }
  }
  
  // Special case: if we cleaned an entire object and it's now empty, 
  // we might want to return null to avoid creating empty nodes in RTDB
  // BUT only if the original wasn't empty. Let's keep it simple.
  return cleaned;
}

export function showToast(message: string, type: 'warning' | 'success' | 'error', durationMs = 4000) {
  if (typeof document === 'undefined') return;

  let container = document.getElementById('wayta-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'wayta-toast-container';
    container.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-[2000] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'w-full p-4 rounded-2xl shadow-2xl flex items-center justify-center gap-3 border pointer-events-auto transform transition-all duration-300 translate-y-4 opacity-0 scale-95 font-black text-[10px] tracking-widest text-center';

  if (type === 'warning') {
    toast.className += ' bg-amber-500/10 text-amber-500 border-amber-500/20 backdrop-blur-md';
  } else if (type === 'success') {
    toast.className += ' bg-emerald-500/10 text-emerald-500 border-emerald-500/20 backdrop-blur-md';
  } else {
    toast.className += ' bg-red-500/10 text-red-500 border-red-500/20 backdrop-blur-md';
  }

  toast.innerHTML = `<span class="flex-1">${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('translate-y-4', 'opacity-0', 'scale-95');
  }, 10);

  setTimeout(() => {
    toast.classList.add('translate-y-4', 'opacity-0', 'scale-95');
    setTimeout(() => {
      toast.remove();
      if (container && container.childNodes.length === 0) {
        container.remove();
      }
    }, 300);
  }, durationMs);
}
