import { translate, type Lang } from './i18n';

export function usd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Riel is quoted rounded to the nearest 100, as shops in Cambodia do. */
export function khr(amountUsd: number, rate: number): string {
  const riel = Math.round((amountUsd * rate) / 100) * 100;
  return `${riel.toLocaleString('en-US')}៛`;
}

export function timeAgo(iso: string, lang: Lang = 'en'): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return translate(lang, 's_justNow');
  if (mins < 60) return translate(lang, 's_minAgo', { n: mins });
  return translate(lang, 's_hoursAgo', { h: Math.floor(mins / 60), m: mins % 60 });
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export const STATUS_LABEL: Record<string, string> = {
  new: 'Sent to kitchen',
  preparing: 'Preparing',
  served: 'Served',
  cancelled: 'Cancelled',
};

/** Base URL of this site, used to build QR links (hash routing keeps it host-agnostic). */
export function siteBase(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

export function tableUrl(token: string): string {
  return `${siteBase()}#/t/${token}`;
}

export function menuUrl(slug: string): string {
  return `${siteBase()}#/r/${slug}`;
}
