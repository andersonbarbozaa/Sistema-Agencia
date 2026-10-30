'use client';

import React from 'react';
import {
  MessageCircle,
  Phone,
  Mail,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { CRMLeadStatus } from '@/types';
import { mapLegacyStatus } from '@/lib/crm-utils';
import { cn } from '@/lib/utils';

export function InstagramIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function FacebookIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

export function LinkedinIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

export function renderChannelIcon(channel?: string | null, size = 12) {
  const ch = (channel || 'WhatsApp').toLowerCase();
  if (ch.includes('whatsapp') || ch.includes('whats')) {
    return <MessageCircle size={size} className="text-emerald-600 dark:text-emerald-400 shrink-0" />;
  }
  if (ch.includes('instagram') || ch.includes('direct')) {
    return <InstagramIcon size={size} className="text-pink-600 dark:text-pink-400 shrink-0" />;
  }
  if (ch.includes('telefone') || ch.includes('liga') || ch.includes('fone')) {
    return <Phone size={size} className="text-amber-600 dark:text-amber-400 shrink-0" />;
  }
  if (ch.includes('email') || ch.includes('mail')) {
    return <Mail size={size} className="text-violet-600 dark:text-violet-400 shrink-0" />;
  }
  return <Globe size={size} className="text-blue-600 dark:text-blue-400 shrink-0" />;
}

export function renderStatusBadge(status: string) {
  const s = mapLegacyStatus(status);
  let bg = 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';

  if (s === 'Novo lead') {
    bg = 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
  } else if (s === 'Em contato') {
    bg = 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800';
  } else if (s === 'Qualificação') {
    bg = 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
  } else if (s === 'Proposta enviada') {
    bg = 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
  } else if (s === 'Em negociação') {
    bg = 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800';
  } else if (s === 'Fechado — ganho') {
    bg = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  } else if (s === 'Perdido') {
    bg = 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
  }

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs', bg)}>
      {s}
    </span>
  );
}

export interface SocialLinkItem {
  network: string;
  value: string;
}

export function parseSocialLinks(lead: any): SocialLinkItem[] {
  if (!lead) return [];
  if (lead.social_links) {
    try {
      const parsed = typeof lead.social_links === 'string' ? JSON.parse(lead.social_links) : lead.social_links;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((item: any) => item && item.value && String(item.value).trim());
      }
    } catch {}
  }
  const legacy: SocialLinkItem[] = [];
  if (lead.instagram && String(lead.instagram).trim()) {
    legacy.push({ network: 'Instagram', value: String(lead.instagram).trim() });
  }
  if (lead.facebook && String(lead.facebook).trim()) {
    legacy.push({ network: 'Facebook', value: String(lead.facebook).trim() });
  }
  if (lead.linkedin && String(lead.linkedin).trim()) {
    legacy.push({ network: 'LinkedIn', value: String(lead.linkedin).trim() });
  }
  return legacy;
}

export function buildSocialUrl(network: string, rawValue: string): string {
  const val = (rawValue || '').trim();
  if (!val) return '#';
  if (/^https?:\/\//i.test(val)) return val;
  const cleanHandle = val.replace(/^@/, '');
  const net = (network || '').toLowerCase();

  if (net.includes('instagram')) return val.includes('instagram.com') ? `https://${val}` : `https://instagram.com/${cleanHandle}`;
  if (net.includes('facebook')) return val.includes('facebook.com') ? `https://${val}` : `https://facebook.com/${cleanHandle}`;
  if (net.includes('linkedin')) return val.includes('linkedin.com') ? `https://${val}` : `https://linkedin.com/in/${cleanHandle}`;
  if (net.includes('tiktok')) return val.includes('tiktok.com') ? `https://${val}` : `https://tiktok.com/@${cleanHandle}`;
  if (net.includes('youtube')) return val.includes('youtube.com') ? `https://${val}` : `https://youtube.com/@${cleanHandle}`;
  if (net.includes('threads')) return val.includes('threads.net') ? `https://${val}` : `https://threads.net/@${cleanHandle}`;
  if (net.includes('twitter') || net.startsWith('x ')) return val.includes('x.com') || val.includes('twitter.com') ? `https://${val}` : `https://x.com/${cleanHandle}`;
  if (net.includes('pinterest')) return val.includes('pinterest.com') ? `https://${val}` : `https://pinterest.com/${cleanHandle}`;
  if (net.includes('behance')) return val.includes('behance.net') ? `https://${val}` : `https://behance.net/${cleanHandle}`;
  if (net.includes('whatsapp')) {
    const digits = val.replace(/\D/g, '');
    return digits ? `https://wa.me/${digits.length <= 11 ? '55' + digits : digits}` : `https://${val}`;
  }
  return `https://${val}`;
}

export function normalizeWebsiteUrl(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function getFullAddress(lead: { address?: string | null; city?: string | null } | null | undefined): string {
  if (!lead) return '';
  const parts: string[] = [];
  if (lead.address && lead.address.trim()) parts.push(lead.address.trim());
  if (lead.city && lead.city.trim()) {
    const cityTrimmed = lead.city.trim();
    if (!lead.address || !lead.address.toLowerCase().includes(cityTrimmed.toLowerCase())) {
      parts.push(cityTrimmed);
    }
  }
  return parts.join(', ');
}

export function getGoogleMapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function getWazeUrl(query: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`;
}
