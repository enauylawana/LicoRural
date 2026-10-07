import * as Crypto from 'expo-crypto';

export const onlyDigits = (v: string) => v.replace(/\D/g, '');

export function maskCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
}

export function maskCEP(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function maskDate(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export function maskDecimal(v: string) {
  const s = v.replace('.', ',').replace(/[^\d,]/g, '');
  const [int, ...rest] = s.split(',');
  return rest.length ? `${int},${rest.join('').slice(0, 2)}` : int;
}

/** Valida os dígitos verificadores do CPF. */
export function isValidCPF(v: string) {
  const d = onlyDigits(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

export function isValidDate(v: string) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (!m) return false;
  const [dd, mm, yyyy] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(yyyy, mm - 1, dd);
  return date.getFullYear() === yyyy && date.getMonth() === mm - 1 && date.getDate() === dd && date <= new Date();
}

export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${formatDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function isToday(iso: string) {
  return formatDate(iso) === formatDate(new Date().toISOString());
}

export function initials(nome: string) {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function firstName(nome: string) {
  return nome.trim().split(/\s+/)[0] ?? '';
}

/**
 * Identificador gerado no aparelho. Como o cadastro pode acontecer offline,
 * o ID não pode depender de uma sequência do Sheets (P001, P002...).
 */
export function gerarId(prefixo: 'P' | 'F') {
  return `${prefixo}-${Crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
}

export function formatBytes(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
