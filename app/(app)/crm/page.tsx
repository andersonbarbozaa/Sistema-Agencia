'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import ConfirmModal from '@/components/ConfirmModal';
import ModalPortal from '@/components/ModalPortal';
import {
  TrendingUp,
  Plus,
  Search,
  Kanban,
  List,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  History,
  Edit2,
  Trash2,
  DollarSign,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Globe,
  ExternalLink,
  Briefcase,
  FileText,
  Sparkles,
  BarChart3,
  PieChart,
  TrendingDown,
  RotateCcw,
  Filter,
  Users,
  Activity,
  Check,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { DEFAULT_WHATSAPP_TEMPLATES, parseWhatsAppTemplates, formatWhatsAppTemplate } from '@/lib/whatsapp-templates';

function InstagramIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function LinkedinIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function renderPlatformBadge(platform?: string | null) {
  if (!platform) return null;
  const p = platform.trim();
  const lower = p.toLowerCase();

  if (lower.includes('whatsapp') || lower.includes('whats')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
        <MessageCircle size={10} className="text-emerald-600 dark:text-emerald-400" />
        <span>WhatsApp</span>
      </span>
    );
  }
  if (lower.includes('instagram') || lower.includes('insta')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border border-pink-200 dark:border-pink-800 shadow-2xs">
        <InstagramIcon size={10} className="text-pink-600 dark:text-pink-400" />
        <span>Instagram</span>
      </span>
    );
  }
  if (lower.includes('facebook') || lower.includes('face')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs">
        <FacebookIcon size={10} className="text-blue-600 dark:text-blue-400" />
        <span>Facebook</span>
      </span>
    );
  }
  if (lower.includes('linkedin')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shadow-2xs">
        <LinkedinIcon size={10} className="text-sky-600 dark:text-sky-400" />
        <span>LinkedIn</span>
      </span>
    );
  }
  if (lower.includes('tiktok')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-700 shadow-2xs">
        <span>TikTok</span>
      </span>
    );
  }
  if (lower.includes('google') || lower.includes('site') || lower.includes('web')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
        <Globe size={10} className="text-indigo-600 dark:text-indigo-400" />
        <span>{p}</span>
      </span>
    );
  }
  if (lower.includes('liga') || lower.includes('fone') || lower.includes('telefone')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs">
        <Phone size={10} className="text-amber-600 dark:text-amber-400" />
        <span>{p}</span>
      </span>
    );
  }
  if (lower.includes('email') || lower.includes('e-mail')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200 dark:border-violet-800 shadow-2xs">
        <Mail size={10} className="text-violet-600 dark:text-violet-400" />
        <span>E-mail</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-2xs">
      <span>{p}</span>
    </span>
  );
}
import { CRMLead, CRMInteraction, CRMLeadStatus, CRMWhatsAppTemplate } from '@/types';
import { formatDate, formatDateTime, cn } from '@/lib/utils';

const CRM_STATUSES: CRMLeadStatus[] = [
  'Novo',
  'Em andamento',
  'Aguardando resposta',
  'Sem resposta',
  'Finalizado positivo',
  'Finalizado negativo',
];

const SOCIAL_NETWORK_OPTIONS = [
  'Instagram',
  'Facebook',
  'LinkedIn',
  'TikTok',
  'YouTube',
  'Threads',
  'X / Twitter',
  'Pinterest',
  'Behance',
  'WhatsApp',
  'Outro',
];

interface SocialLinkItem {
  network: string;
  value: string;
}

function normalizeWebsiteUrl(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function parseSocialLinks(lead: any): SocialLinkItem[] {
  if (!lead) return [];
  if (lead.social_links) {
    try {
      const parsed = typeof lead.social_links === 'string' ? JSON.parse(lead.social_links) : lead.social_links;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((item: any) => item && item.value && String(item.value).trim());
      }
    } catch {
      // ignore invalid JSON and fallback to legacy columns
    }
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

function buildSocialUrl(network: string, rawValue: string): string {
  const val = (rawValue || '').trim();
  if (!val) return '#';
  if (/^https?:\/\//i.test(val)) return val;
  const cleanHandle = val.replace(/^@/, '');
  const net = (network || '').toLowerCase();

  if (net.includes('instagram')) {
    return val.includes('instagram.com') ? `https://${val}` : `https://instagram.com/${cleanHandle}`;
  }
  if (net.includes('facebook')) {
    return val.includes('facebook.com') ? `https://${val}` : `https://facebook.com/${cleanHandle}`;
  }
  if (net.includes('linkedin')) {
    return val.includes('linkedin.com') ? `https://${val}` : `https://linkedin.com/in/${cleanHandle}`;
  }
  if (net.includes('tiktok')) {
    return val.includes('tiktok.com') ? `https://${val}` : `https://tiktok.com/@${cleanHandle}`;
  }
  if (net.includes('youtube')) {
    return val.includes('youtube.com') ? `https://${val}` : `https://youtube.com/@${cleanHandle}`;
  }
  if (net.includes('threads')) {
    return val.includes('threads.net') ? `https://${val}` : `https://threads.net/@${cleanHandle}`;
  }
  if (net.includes('twitter') || net.startsWith('x ')) {
    return val.includes('x.com') || val.includes('twitter.com') ? `https://${val}` : `https://x.com/${cleanHandle}`;
  }
  if (net.includes('pinterest')) {
    return val.includes('pinterest.com') ? `https://${val}` : `https://pinterest.com/${cleanHandle}`;
  }
  if (net.includes('behance')) {
    return val.includes('behance.net') ? `https://${val}` : `https://behance.net/${cleanHandle}`;
  }
  if (net.includes('whatsapp')) {
    const digits = val.replace(/\D/g, '');
    return digits ? `https://wa.me/${digits}` : `https://${val}`;
  }
  return `https://${val}`;
}

function getFullAddress(lead: { address?: string | null; city?: string | null } | null | undefined): string {
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

function getGoogleMapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function getWazeUrl(query: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`;
}

export default function CRMPage() {
  const [confirmState, setConfirmState] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'report'>('list');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [dateFilterPreset, setDateFilterPreset] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'contact_name' | 'company' | 'status' | 'platform' | 'city' | 'last_activity_at'>('last_activity_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [interactions, setInteractions] = useState<CRMInteraction[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);

  // Drag and Drop State
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const dragStartTimeRef = useRef<number>(0);

  const handleViewModeChange = (mode: 'kanban' | 'list' | 'report') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('crm_view_mode', mode);
      } catch {
        // ignore storage quota errors
      }
    }
  };

  // New lead modal
  const EMPTY_NEW_LEAD = {
    contact_name: '',
    company: '',
    phone: '',
    whatsapp: '',
    email: '',
    city: '',
    address: '',
    platform: 'WhatsApp',
    notes: '',
    website: '',
    facebook: '',
    linkedin: '',
    instagram: '',
    social_links: [] as SocialLinkItem[],
    segment: '',
    description: '',
  };
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLead, setNewLead] = useState(EMPTY_NEW_LEAD);

  useEffect(() => {
    const handler = () => setShowCreateModal(true);
    window.addEventListener('open-new-lead', handler);
    return () => window.removeEventListener('open-new-lead', handler);
  }, []);

  // Unsaved changes prompt modal (when clicking outside or X with modified fields)
  const [unsavedChangesModal, setUnsavedChangesModal] = useState<{
    isOpen: boolean;
    mode: 'edit' | 'create';
  }>({ isOpen: false, mode: 'edit' });

  // WhatsApp sending modal & Pre-configured Templates
  const [whatsAppTemplates, setWhatsAppTemplates] = useState<CRMWhatsAppTemplate[]>(DEFAULT_WHATSAPP_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [whatsAppModal, setWhatsAppModal] = useState<{
    isOpen: boolean;
    lead: CRMLead | null;
    phone: string;
    message: string;
  }>({
    isOpen: false,
    lead: null,
    phone: '',
    message: '',
  });

  const getDefaultWhatsAppMessage = (lead: CRMLead | null): string => {
    if (!lead) return '';
    const firstName = lead.contact_name ? lead.contact_name.trim().split(' ')[0] : '';
    const greeting = firstName ? `Olá, ${firstName}!` : 'Olá!';
    return `${greeting} Tudo bem? Sou da equipe da PixelCraft Studio. Estamos entrando em contato sobre a sua solicitação. Como podemos te ajudar hoje?`;
  };

  const handleOpenWhatsApp = (lead: CRMLead, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const rawNumber = lead.whatsapp || lead.phone || '';
    const digits = rawNumber.replace(/\D/g, '');
    if (!digits) {
      showToast('Este lead não possui número de WhatsApp ou telefone cadastrado.', 'error');
      return;
    }

    const firstTemplate = whatsAppTemplates[0];
    const initialTplId = firstTemplate?.id || '';
    setSelectedTemplateId(initialTplId);

    const initialMessage = firstTemplate
      ? formatWhatsAppTemplate(firstTemplate.message, lead)
      : getDefaultWhatsAppMessage(lead);

    setWhatsAppModal({
      isOpen: true,
      lead,
      phone: digits,
      message: initialMessage,
    });
  };

  const handleSendWhatsApp = () => {
    if (!whatsAppModal.phone) return;
    let fullNumber = whatsAppModal.phone;
    if ((fullNumber.length === 10 || fullNumber.length === 11) && !fullNumber.startsWith('55')) {
      fullNumber = `55${fullNumber}`;
    }
    const encodedMsg = encodeURIComponent(whatsAppModal.message.trim());
    const url = `https://wa.me/${fullNumber}?text=${encodedMsg}`;
    window.open(url, '_blank');
    setWhatsAppModal({ isOpen: false, lead: null, phone: '', message: '' });
  };

  // New interaction form
  const [submittingInteraction, setSubmittingInteraction] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const [newInteraction, setNewInteraction] = useState({
    platform: 'WhatsApp',
    message: '',
    notes: '',
  });

  // Edit lead modal
  const [showEditLeadModal, setShowEditLeadModal] = useState(false);
  const [editLead, setEditLead] = useState({
    contact_name: '',
    company: '',
    phone: '',
    whatsapp: '',
    email: '',
    city: '',
    address: '',
    platform: 'WhatsApp',
    status: 'Novo',
    estimated_value: 0,
    notes: '',
    website: '',
    facebook: '',
    linkedin: '',
    instagram: '',
    social_links: [] as SocialLinkItem[],
    segment: '',
    description: '',
  });
  const [initialEditLead, setInitialEditLead] = useState<typeof editLead | null>(null);

  const openEditLead = (lead: any) => {
    const initialData = {
      contact_name: lead.contact_name || '',
      company: lead.company || '',
      phone: lead.phone || '',
      whatsapp: lead.whatsapp || lead.phone || '',
      email: lead.email || '',
      city: lead.city || '',
      address: lead.address || '',
      platform: lead.platform || lead.source || 'WhatsApp',
      status: lead.status || 'Novo',
      estimated_value: lead.estimated_value || 0,
      notes: lead.notes || '',
      website: lead.website || '',
      facebook: lead.facebook || '',
      linkedin: lead.linkedin || '',
      instagram: lead.instagram || '',
      social_links: parseSocialLinks(lead),
      segment: lead.segment || '',
      description: lead.description || '',
    };
    setEditLead(initialData);
    setInitialEditLead(JSON.parse(JSON.stringify(initialData)));
    setShowEditLeadModal(true);
  };

  const hasEditLeadChanges = () => {
    if (!initialEditLead) return false;
    return JSON.stringify(editLead) !== JSON.stringify(initialEditLead);
  };

  const hasCreateLeadChanges = () => {
    return JSON.stringify(newLead) !== JSON.stringify(EMPTY_NEW_LEAD);
  };

  const handleRequestCloseEditModal = () => {
    if (hasEditLeadChanges()) {
      setUnsavedChangesModal({ isOpen: true, mode: 'edit' });
    } else {
      setShowEditLeadModal(false);
    }
  };

  const handleRequestCloseCreateModal = () => {
    if (hasCreateLeadChanges()) {
      setUnsavedChangesModal({ isOpen: true, mode: 'create' });
    } else {
      setShowCreateModal(false);
    }
  };

  const saveEditLead = async () => {
    if (!selectedLead) return false;
    if (!editLead.contact_name.trim()) {
      showToast('O nome do contato é obrigatório.', 'error');
      return false;
    }

    const cleanSocials = (editLead.social_links || [])
      .map((s) => ({ network: s.network || 'Instagram', value: (s.value || '').trim() }))
      .filter((s) => s.value.length > 0);

    const payload = {
      ...editLead,
      website: normalizeWebsiteUrl(editLead.website),
      social_links: JSON.stringify(cleanSocials),
      instagram: cleanSocials.find((s) => s.network === 'Instagram')?.value || '',
      facebook: cleanSocials.find((s) => s.network === 'Facebook')?.value || '',
      linkedin: cleanSocials.find((s) => s.network === 'LinkedIn')?.value || '',
    };

    try {
      const res = await fetch(`/api/crm/${selectedLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowEditLeadModal(false);
        const updated = await res.json();
        const updatedData = updated.data || { ...selectedLead, ...payload };
        setSelectedLead(updatedData);
        setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? { ...l, ...updatedData } : l)));
        fetchLeads();
        showToast('Alterações salvas com sucesso!', 'success');
        return true;
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao atualizar lead');
        return false;
      }
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveEditLead();
  };

  const handleDeleteLead = async () => {
    if (!selectedLead) return;

    setConfirmState({
      isOpen: true,
      title: 'Confirmar Exclusão',
      message: `Deseja realmente excluir o lead "${selectedLead.contact_name}"?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/crm/${selectedLead.id}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            setShowEditLeadModal(false);
            setSelectedLead(null);
            fetchLeads();
            setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
          } else {
            const err = await res.json();
            alert(err.error || 'Erro ao excluir lead');
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/crm');
      if (res.ok) {
        const d = await res.json();
        setLeads(d.leads || d.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedMode = sessionStorage.getItem('crm_view_mode');
        if (savedMode === 'kanban' || savedMode === 'list' || savedMode === 'report') {
          setViewMode(savedMode);
        }
      } catch {
        // ignore
      }
    }
    fetchLeads();
    // Carrega modelos pré-definidos de mensagens do WhatsApp
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d?.settings?.crm_whatsapp_templates) {
          setWhatsAppTemplates(parseWhatsAppTemplates(d.settings.crm_whatsapp_templates));
        }
      })
      .catch((err) => console.warn('Erro ao carregar templates de WhatsApp:', err));

    const handleOpenCreate = () => setShowCreateModal(true);
    window.addEventListener('open-create-lead', handleOpenCreate);
    window.addEventListener('ai-action-completed', fetchLeads);
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('new') === 'true') {
      setShowCreateModal(true);
    }
    return () => {
      window.removeEventListener('open-create-lead', handleOpenCreate);
      window.removeEventListener('ai-action-completed', fetchLeads);
    };
  }, []);

  const openLeadDetails = async (lead: CRMLead) => {
    setSelectedLead(lead);
    try {
      setLoadingInteractions(true);
      const res = await fetch(`/api/crm/${lead.id}/interactions`);
      if (res.ok) {
        const d = await res.json();
        setInteractions(d.interactions || d.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInteractions(false);
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: CRMLeadStatus) => {
    const previousLeads = leads;
    // Atualização otimista imediata para resposta instantânea ao arrastar
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    if (selectedLead?.id === leadId) {
      setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null);
    }

    try {
      const res = await fetch(`/api/crm/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        setLeads(previousLeads);
        showToast('Não foi possível atualizar o status do lead.', 'error');
      }
    } catch (err) {
      console.error(err);
      setLeads(previousLeads);
      showToast('Erro de conexão ao atualizar status do lead.', 'error');
    }
  };

  const saveCreateLead = async () => {
    if (!newLead.contact_name.trim()) {
      showToast('Preencha o Nome do Contato para salvar o lead.', 'error');
      return false;
    }

    const cleanSocials = (newLead.social_links || [])
      .map((s) => ({ network: s.network || 'Instagram', value: (s.value || '').trim() }))
      .filter((s) => s.value.length > 0);

    const payload = {
      ...newLead,
      website: normalizeWebsiteUrl(newLead.website),
      social_links: JSON.stringify(cleanSocials),
      instagram: cleanSocials.find((s) => s.network === 'Instagram')?.value || '',
      facebook: cleanSocials.find((s) => s.network === 'Facebook')?.value || '',
      linkedin: cleanSocials.find((s) => s.network === 'LinkedIn')?.value || '',
    };

    try {
      const res = await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewLead(EMPTY_NEW_LEAD);
        fetchLeads();
        showToast('Lead cadastrado com sucesso!', 'success');
        return true;
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Erro ao criar lead no CRM.');
        return false;
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro de conexão ao criar lead.');
      return false;
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveCreateLead();
  };

  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    const trimmedMessage = newInteraction.message.trim();
    if (!trimmedMessage) {
      showToast('Por favor, descreva a interação antes de enviar.', 'error');
      return;
    }

    try {
      setSubmittingInteraction(true);
      const res = await fetch(`/api/crm/${selectedLead.id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: newInteraction.platform,
          message: trimmedMessage,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar interação no servidor.');
      }

      // Limpa o campo de texto mantendo a plataforma selecionada
      setNewInteraction((prev) => ({ ...prev, message: '' }));

      // Atualiza a timeline na interface imediatamente com a nova interação
      if (data.data) {
        setInteractions((prev) => [data.data, ...prev.filter((i) => i.id !== data.data.id)]);
      }

      // Sincroniza a timeline com o servidor
      const intRes = await fetch(`/api/crm/${selectedLead.id}/interactions`);
      if (intRes.ok) {
        const d = await intRes.json();
        setInteractions(d.interactions || d.data || []);
      }

      // Atualiza a data de última atividade do Lead
      const nowIso = new Date().toISOString();
      setSelectedLead((prev) => (prev ? { ...prev, last_activity_at: nowIso } : null));
      setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? { ...l, last_activity_at: nowIso } : l)));
      fetchLeads();

      showToast('Interação registrada com sucesso!', 'success');
    } catch (err: any) {
      console.error('Erro ao adicionar interação:', err);
      showToast(err.message || 'Erro ao registrar interação.', 'error');
    } finally {
      setSubmittingInteraction(false);
    }
  };

  const handleSort = (field: 'contact_name' | 'company' | 'status' | 'platform' | 'city' | 'last_activity_at') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'last_activity_at' ? 'desc' : 'asc');
    }
  };

  const isAnyFilterActive =
    statusFilter !== 'all' ||
    cityFilter !== 'all' ||
    segmentFilter !== 'all' ||
    dateFilterPreset !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    searchQuery !== '';

  const handleResetFilters = () => {
    setStatusFilter('all');
    setCityFilter('all');
    setSegmentFilter('all');
    setDateFilterPreset('all');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
  };

  const availableCities = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.city && l.city.trim()) {
        set.add(l.city.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [leads]);

  const availableSegments = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.segment && l.segment.trim()) {
        set.add(l.segment.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads
      .filter((l) => {
        // Status filter
        if (statusFilter !== 'all' && l.status !== statusFilter) return false;

        // City filter
        if (cityFilter !== 'all') {
          const leadCity = (l.city || '').trim().toLowerCase();
          if (leadCity !== cityFilter.trim().toLowerCase()) return false;
        }

        // Segment / Área de atuação filter
        if (segmentFilter !== 'all') {
          const leadSeg = (l.segment || '').trim().toLowerCase();
          if (leadSeg !== segmentFilter.trim().toLowerCase()) return false;
        }

        // Date filter
        if (dateFilterPreset !== 'all') {
          const rawDate = l.first_contact_date || l.created_at;
          if (!rawDate) return false;
          const leadDate = new Date(rawDate);
          if (isNaN(leadDate.getTime())) return false;

          const now = new Date();

          if (dateFilterPreset === 'today') {
            const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            if (leadDate < startToday || leadDate > endToday) return false;
          } else if (dateFilterPreset === '7days') {
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (leadDate < sevenDaysAgo) return false;
          } else if (dateFilterPreset === '30days') {
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (leadDate < thirtyDaysAgo) return false;
          } else if (dateFilterPreset === 'this_month') {
            const startMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            if (leadDate < startMonth || leadDate > endMonth) return false;
          } else if (dateFilterPreset === 'last_month') {
            const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
            const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            if (leadDate < startLastMonth || leadDate > endLastMonth) return false;
          } else if (dateFilterPreset === 'this_year') {
            const startYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            const endYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            if (leadDate < startYear || leadDate > endYear) return false;
          } else if (dateFilterPreset === 'custom') {
            if (dateFrom) {
              const startCustom = new Date(dateFrom + 'T00:00:00');
              if (leadDate < startCustom) return false;
            }
            if (dateTo) {
              const endCustom = new Date(dateTo + 'T23:59:59.999');
              if (leadDate > endCustom) return false;
            }
          }
        }

        // Search Query
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          l.contact_name.toLowerCase().includes(q) ||
          (l.company && l.company.toLowerCase().includes(q)) ||
          (l.city && l.city.toLowerCase().includes(q)) ||
          (l.segment && l.segment.toLowerCase().includes(q)) ||
          (l.platform && l.platform.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortField === 'last_activity_at') {
          const dateA = new Date(a.last_activity_at || '').getTime();
          const dateB = new Date(b.last_activity_at || '').getTime();
          comparison = dateA - dateB;
        } else if (sortField === 'platform') {
          const valA = (a.platform || a.source || '').toLowerCase();
          const valB = (b.platform || b.source || '').toLowerCase();
          comparison = valA.localeCompare(valB, 'pt-BR');
        } else if (sortField === 'city') {
          const valA = (a.city || '').toLowerCase();
          const valB = (b.city || '').toLowerCase();
          comparison = valA.localeCompare(valB, 'pt-BR');
        } else {
          const valA = ((a as any)[sortField] || '').toLowerCase();
          const valB = ((b as any)[sortField] || '').toLowerCase();
          comparison = valA.localeCompare(valB, 'pt-BR');
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [leads, statusFilter, cityFilter, segmentFilter, dateFilterPreset, dateFrom, dateTo, searchQuery, sortField, sortDirection]);

  // RELATÓRIO DO CRM: Dados consolidados e diagnóstico inteligente de situação
  const crmReportData = useMemo(() => {
    const total = filteredLeads.length;
    const novos = filteredLeads.filter((l) => l.status === 'Novo');
    const emAndamento = filteredLeads.filter((l) => l.status === 'Em andamento');
    const aguardando = filteredLeads.filter((l) => l.status === 'Aguardando resposta');
    const semResposta = filteredLeads.filter((l) => l.status === 'Sem resposta');
    const positivo = filteredLeads.filter((l) => l.status === 'Finalizado positivo');
    const negativo = filteredLeads.filter((l) => l.status === 'Finalizado negativo');

    const totalValor = filteredLeads.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);
    const valorGanho = positivo.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);
    const valorEmNegociacao = [...novos, ...emAndamento, ...aguardando].reduce(
      (acc, l) => acc + (Number(l.estimated_value) || 0),
      0
    );

    const concluidos = positivo.length + negativo.length;
    const taxaConversao =
      concluidos > 0
        ? (positivo.length / concluidos) * 100
        : total > 0
        ? (positivo.length / total) * 100
        : 0;
    const taxaPerda = concluidos > 0 ? (negativo.length / concluidos) * 100 : 0;
    const taxaSemResposta = total > 0 ? (semResposta.length / total) * 100 : 0;
    const taxaAtivos =
      total > 0
        ? ((novos.length + emAndamento.length + aguardando.length) / total) * 100
        : 0;

    // Etapas detalhadas do funil
    const stages = [
      {
        status: 'Novo' as CRMLeadStatus,
        label: 'Novos Contatos',
        count: novos.length,
        percentage: total > 0 ? (novos.length / total) * 100 : 0,
        value: novos.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0),
        barColor: 'bg-blue-500',
        badgeBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        description: 'Contatos recém-adicionados que aguardam primeiro contato ou qualificação inicial.',
      },
      {
        status: 'Em andamento' as CRMLeadStatus,
        label: 'Em Andamento',
        count: emAndamento.length,
        percentage: total > 0 ? (emAndamento.length / total) * 100 : 0,
        value: emAndamento.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0),
        barColor: 'bg-amber-500',
        badgeBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        description: 'Contatos em negociação ativa, levantamento de necessidades ou proposta.',
      },
      {
        status: 'Aguardando resposta' as CRMLeadStatus,
        label: 'Aguardando Resposta',
        count: aguardando.length,
        percentage: total > 0 ? (aguardando.length / total) * 100 : 0,
        value: aguardando.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0),
        barColor: 'bg-purple-500',
        badgeBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        description: 'Proposta ou contato enviado ao cliente, aguardando resposta para fechamento.',
      },
      {
        status: 'Sem resposta' as CRMLeadStatus,
        label: 'Sem Resposta',
        count: semResposta.length,
        percentage: total > 0 ? (semResposta.length / total) * 100 : 0,
        value: semResposta.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0),
        barColor: 'bg-gray-400',
        badgeBg: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700',
        description: 'Contatos que não responderam às mensagens ou tentativas de follow-up.',
      },
      {
        status: 'Finalizado positivo' as CRMLeadStatus,
        label: 'Finalizado Positivo (Ganhos)',
        count: positivo.length,
        percentage: total > 0 ? (positivo.length / total) * 100 : 0,
        value: valorGanho,
        barColor: 'bg-emerald-500',
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        description: 'Negócios fechados com sucesso e convertidos em contratos ou clientes.',
      },
      {
        status: 'Finalizado negativo' as CRMLeadStatus,
        label: 'Finalizado Negativo (Perdidos)',
        count: negativo.length,
        percentage: total > 0 ? (negativo.length / total) * 100 : 0,
        value: negativo.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0),
        barColor: 'bg-rose-500',
        badgeBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        description: 'Oportunidades encerradas sem fechamento por preço, timing ou desistência.',
      },
    ];

    // Cidades breakdown
    const cityMap: Record<string, { total: number; positivos: number; valor: number }> = {};
    filteredLeads.forEach((l) => {
      const c = (l.city || 'Não informada').trim();
      if (!cityMap[c]) cityMap[c] = { total: 0, positivos: 0, valor: 0 };
      cityMap[c].total += 1;
      if (l.status === 'Finalizado positivo') cityMap[c].positivos += 1;
      cityMap[c].valor += Number(l.estimated_value) || 0;
    });
    const topCities = Object.entries(cityMap)
      .map(([name, data]) => ({
        name,
        ...data,
        convRate: data.total > 0 ? (data.positivos / data.total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    // Segmentos breakdown (Áreas de atuação)
    const segmentMap: Record<string, { total: number; positivos: number; valor: number }> = {};
    filteredLeads.forEach((l) => {
      const s = (l.segment || 'Não informada').trim();
      if (!segmentMap[s]) segmentMap[s] = { total: 0, positivos: 0, valor: 0 };
      segmentMap[s].total += 1;
      if (l.status === 'Finalizado positivo') segmentMap[s].positivos += 1;
      segmentMap[s].valor += Number(l.estimated_value) || 0;
    });
    const topSegments = Object.entries(segmentMap)
      .map(([name, data]) => ({
        name,
        ...data,
        convRate: data.total > 0 ? (data.positivos / data.total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    // LÓGICA DE SITUAÇÃO DOS CONTATOS (Avalia se estamos indo bem ou mal)
    let situationState: 'excelente' | 'bom' | 'atencao' | 'critico' | 'neutro' = 'neutro';
    let situationTitle = '';
    let situationBadge = '';
    let situationDescription = '';
    let situationTip = '';

    if (total === 0) {
      situationState = 'neutro';
      situationBadge = 'Nenhum Contato no Filtro';
      situationTitle = 'Sem contatos para os critérios selecionados';
      situationDescription =
        'Não há contatos cadastrados que correspondam aos filtros de cidade, área de atuação ou data. Ajuste ou limpe os filtros para visualizar a análise completa.';
      situationTip = 'Dica: Selecione "Todo o Período" ou remova filtros específicos para ver todo o histórico de contatos.';
    } else if (
      (positivo.length > 0 && positivo.length >= negativo.length && taxaSemResposta <= 25) ||
      (taxaConversao >= 40 && positivo.length >= 2)
    ) {
      situationState = 'excelente';
      situationBadge = '🟢 Situação Excelente: Desempenho em Alta';
      situationTitle = 'Estamos indo muito bem! Conversões em ritmo acelerado';
      situationDescription = `O desempenho comercial está excelente! A taxa de conversão positiva está alta, com ${positivo.length} negócio(s) fechado(s) com sucesso${
        valorGanho > 0 ? ` somando R$ ${valorGanho.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em receita estimada` : ''
      }, superando as perdas registradas no período. Além disso, o índice de contatos sem resposta está controlado em ${taxaSemResposta.toFixed(0)}%, o que demonstra que as abordagens iniciais e o atendimento estão muito bem calibrados e despertando o interesse dos clientes.`;
      situationTip = `Recomendação: Temos ${novos.length} novo(s) contato(s) na entrada do funil. Mantenha a velocidade de resposta no primeiro contato para sustentar essa excelente taxa de conversão.`;
    } else if (
      (positivo.length >= negativo.length &&
        novos.length + emAndamento.length >= total * 0.35 &&
        taxaSemResposta <= 40) ||
      (positivo.length > 0 && negativo.length === 0)
    ) {
      situationState = 'bom';
      situationBadge = '🟢 Situação Positiva: Operação Comercial Saudável';
      situationTitle = 'Estamos indo bem! Pipeline aquecido e em movimento';
      situationDescription = `A situação dos contatos é positiva e demonstra boa saúde operacional. Temos ${
        novos.length + emAndamento.length + aguardando.length
      } contato(s) ativos no funil (${novos.length} novo(s), ${emAndamento.length} em andamento e ${aguardando.length} aguardando resposta), com ${
        positivo.length
      } fechamento(s) positivo(s) já concretizado(s). A esteira comercial possui bastante potencial em fase de negociação.`;
      situationTip = `Recomendação: Foque em fazer o acompanhamento dos ${aguardando.length} contato(s) que estão "Aguardando resposta", utilizando mensagens personalizadas para agilizar a decisão de compra.`;
    } else if (
      (taxaSemResposta > 30 && taxaSemResposta <= 50) ||
      aguardando.length + semResposta.length >= total * 0.5 ||
      (novos.length > 0 && emAndamento.length === 0 && positivo.length === 0)
    ) {
      situationState = 'atencao';
      situationBadge = '🟡 Ponto de Atenção: Gargalo de Respostas';
      situationTitle = 'Atenção necessária: Oportunidades correndo risco de esfriar';
      situationDescription = `A situação atual exige atenção: identificamos um gargalo no fluxo de contato. Temos ${
        semResposta.length + aguardando.length
      } contato(s) (${(((semResposta.length + aguardando.length) / total) * 100).toFixed(0)}% da base filtrada) parados sem retorno ou aguardando resposta. Embora existam ${
        novos.length
      } novo(s) contato(s), o avanço para as etapas de proposta e fechamento está lento, o que pode esfriar negociações importantes.`;
      situationTip = `Ação prática: Ative uma régua de reengajamento com as mensagens pré-configuradas de WhatsApp do CRM, oferecendo uma condição especial ou retomando o contato com uma pergunta aberta.`;
    } else if (
      negativo.length > positivo.length * 1.5 ||
      taxaSemResposta > 50 ||
      (concluidos > 0 && positivo.length === 0 && total >= 3)
    ) {
      situationState = 'critico';
      situationBadge = '🔴 Situação Crítica: Alto Volume de Perdas ou Desengajamento';
      situationTitle = 'Estamos indo mal no momento: Ajustes urgentes na abordagem';
      situationDescription = `O diagnóstico indica que o resultado atual está abaixo do esperado: o número de contatos sem resposta (${
        semResposta.length
      } lead(s) - ${taxaSemResposta.toFixed(0)}%) e/ou com fechamento negativo (${
        negativo.length
      } lead(s)) está expressivamente superior às conversões positivas (${
        positivo.length
      }). Isso aponta para possíveis falhas no alinhamento do público-alvo (perfil do cliente), abordagem inicial pouco persuasiva ou demora excessiva no primeiro contato após a entrada do lead.`;
      situationTip = `Plano de correção imediato: Reavalie os canais de captação dos contatos, faça o primeiro contato via WhatsApp em até 10 minutos após o cadastro e investigue o motivo das ${negativo.length} perdas para contornar objeções.`;
    } else {
      situationState = 'neutro';
      situationBadge = '🔵 Situação em Formação: Base Inicial';
      situationTitle = 'Contatos em fase de prospecção e qualificação';
      situationDescription = `O pipeline conta com ${total} contato(s) analisados. Temos ${novos.length} novo(s) contato(s) cadastrados e ${emAndamento.length} em andamento. À medida que o time comercial registrar as interações e os desfechos das propostas, a inteligência trará métricas mais aprofundadas sobre o índice de sucesso.`;
      situationTip = `Continue registrando cada ligação, WhatsApp e reunião na aba do lead para que o diagnóstico identifique com precisão as tendências do funil.`;
    }

    return {
      total,
      novos: novos.length,
      emAndamento: emAndamento.length,
      aguardando: aguardando.length,
      semResposta: semResposta.length,
      positivo: positivo.length,
      negativo: negativo.length,
      totalValor,
      valorGanho,
      valorEmNegociacao,
      concluidos,
      taxaConversao,
      taxaPerda,
      taxaSemResposta,
      taxaAtivos,
      stages,
      topCities,
      topSegments,
      situation: {
        state: situationState,
        badge: situationBadge,
        title: situationTitle,
        description: situationDescription,
        tip: situationTip,
      },
    };
  }, [filteredLeads]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Actions & Filters Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
            >
              <Plus size={16} className="stroke-[2.5]" />
              <span>Adicionar Novo Item</span>
            </button>

            <a
              href="/settings?tab=whatsapp"
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-gray-750 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-gray-700 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-400 border border-gray-200 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-800 rounded-xl text-xs font-semibold shadow-2xs transition-all active:scale-[0.98]"
              title="Abrir configurações de Mensagens CRM"
            >
              <MessageCircle size={15} className="text-emerald-600 dark:text-emerald-400" />
              <span>Mensagens CRM</span>
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle: Kanban | Lista | Relatório */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-750 p-1 rounded-xl border border-gray-200/80 dark:border-gray-700/80">
              <button
                onClick={() => handleViewModeChange('kanban')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                )}
              >
                <Kanban size={14} /> Kanban
              </button>
              <button
                onClick={() => handleViewModeChange('list')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                )}
              >
                <List size={14} /> Lista
              </button>
              <button
                onClick={() => handleViewModeChange('report')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  viewMode === 'report'
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm font-bold'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                )}
              >
                <BarChart3 size={14} /> Relatório
              </button>
            </div>
          </div>
        </div>

        {/* Filtros: Busca, Cidade, Área de Atuação, Status, Datas */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex flex-wrap items-center gap-2 text-xs">
          {/* Busca rápida */}
          <div className="relative min-w-[170px] flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-2 text-gray-400" size={13} />
            <input
              type="text"
              placeholder="Buscar contato ou empresa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtro Cidade */}
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1">
            <MapPin size={13} className="text-gray-400 shrink-0" />
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="bg-transparent border-0 text-gray-700 dark:text-gray-300 font-medium text-xs focus:ring-0 focus:outline-none pr-1"
            >
              <option value="all">Todas as Cidades ({availableCities.length})</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Filtro Área de Atuação */}
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1">
            <Briefcase size={13} className="text-gray-400 shrink-0" />
            <select
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value)}
              className="bg-transparent border-0 text-gray-700 dark:text-gray-300 font-medium text-xs focus:ring-0 focus:outline-none pr-1"
            >
              <option value="all">Todas as Áreas ({availableSegments.length})</option>
              {availableSegments.map((seg) => (
                <option key={seg} value={seg}>{seg}</option>
              ))}
            </select>
          </div>

          {/* Filtro Status */}
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1">
            <span className="text-gray-400 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-0 text-gray-700 dark:text-gray-300 font-medium text-xs focus:ring-0 focus:outline-none pr-1"
            >
              <option value="all">Todos os Status</option>
              {CRM_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Filtro Datas */}
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1">
            <Calendar size={13} className="text-gray-400 shrink-0" />
            <select
              value={dateFilterPreset}
              onChange={(e) => setDateFilterPreset(e.target.value)}
              className="bg-transparent border-0 text-gray-700 dark:text-gray-300 font-medium text-xs focus:ring-0 focus:outline-none pr-1"
            >
              <option value="all">Todo o Período</option>
              <option value="today">Hoje</option>
              <option value="7days">Últimos 7 dias</option>
              <option value="this_month">Este Mês</option>
              <option value="last_month">Mês Anterior</option>
              <option value="30days">Últimos 30 dias</option>
              <option value="this_year">Este Ano</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {/* Inputs de data personalizada se preset for custom */}
          {dateFilterPreset === 'custom' && (
            <div className="flex items-center gap-1 animate-in fade-in">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400 text-xs">até</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Botão Limpar Filtros */}
          {isAnyFilterActive && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 px-2.5 py-1 text-gray-500 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-xs font-semibold transition-all"
              title="Limpar todos os filtros"
            >
              <RotateCcw size={12} />
              <span>Limpar filtros</span>
            </button>
          )}

          <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 font-medium">
            {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'}
          </span>
        </div>
      </div>

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <div className="flex flex-row gap-4 overflow-x-auto pb-6 items-start w-full">
          {CRM_STATUSES.map((status) => {
            const statusLeads = filteredLeads.filter(l => l.status === status);
            const isColumnOver = dragOverColumn === status;

            return (
              <div
                key={status}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverColumn !== status) {
                    setDragOverColumn(status);
                  }
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  if (dragOverColumn === status) {
                    setDragOverColumn(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverColumn(null);
                  const leadId = e.dataTransfer.getData('leadId') || e.dataTransfer.getData('text/plain') || draggedLeadId;
                  if (leadId) {
                    handleUpdateStatus(leadId, status);
                  }
                  setDraggedLeadId(null);
                }}
                className={cn(
                  "w-[280px] min-w-[280px] flex-shrink-0 bg-white rounded-2xl p-3.5 border flex flex-col shadow-sm transition-all duration-150",
                  isColumnOver
                    ? "border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/20"
                    : "border-gray-200"
                )}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
                    {status}
                  </h3>
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full transition-colors",
                    isColumnOver ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                  )}>
                    {statusLeads.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[70vh]">
                  {isColumnOver && draggedLeadId && !statusLeads.some(l => l.id === draggedLeadId) && (
                    <div className="p-3 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/50 text-blue-600 text-center text-xs font-semibold animate-pulse">
                      Soltar lead aqui
                    </div>
                  )}

                  {statusLeads.map((lead) => {
                    const socials = parseSocialLinks(lead);
                    const hasWebsite = Boolean(lead.website && lead.website.trim());
                    const isDraggingThis = draggedLeadId === lead.id;

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('leadId', lead.id);
                          e.dataTransfer.setData('text/plain', lead.id);
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggedLeadId(lead.id);
                          dragStartTimeRef.current = Date.now();
                        }}
                        onDragEnd={() => {
                          setDraggedLeadId(null);
                          setDragOverColumn(null);
                          setTimeout(() => {
                            dragStartTimeRef.current = 0;
                          }, 150);
                        }}
                        onClick={() => {
                          if (dragStartTimeRef.current > 0 && Date.now() - dragStartTimeRef.current < 250) {
                            return;
                          }
                          openLeadDetails(lead);
                        }}
                        className={cn(
                          'p-3.5 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing select-none group bg-white',
                          isDraggingThis && 'opacity-40 scale-[0.98] border-dashed border-blue-400 shadow-none',
                          lead.status === 'Finalizado positivo' ? 'border-emerald-300' :
                          lead.status === 'Finalizado negativo' ? 'border-gray-300 opacity-75' :
                          'border-gray-200'
                        )}
                      >
                        {/* Data da última atualização e Plataforma ACIMA do nome */}
                        <div className="flex items-center justify-between gap-1 text-[10px] text-gray-400 mb-1.5">
                          <span className="truncate">
                            {lead.updated_at || lead.last_activity_at || lead.created_at
                              ? `Atualizado: ${formatDate(lead.updated_at || lead.last_activity_at || lead.created_at)}`
                              : ''}
                          </span>
                          {(lead.platform || lead.source) && (
                            <span className="shrink-0 text-[10px] font-medium text-gray-500" title={`Plataforma: ${lead.platform || lead.source}`}>
                              {lead.platform || lead.source}
                            </span>
                          )}
                        </div>

                        {/* Nome do contato */}
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-bold text-xs text-gray-900 group-hover:text-blue-600 transition-colors">
                            {lead.contact_name}
                          </span>
                        </div>

                        {/* Nome da empresa */}
                        {lead.company && (
                          <p className="text-[11px] text-gray-600 font-medium truncate mb-1">{lead.company}</p>
                        )}

                        {/* Redes sociais e Site ABAIXO do nome da empresa */}
                        {(hasWebsite || socials.length > 0) && (
                          <div className="flex items-center gap-1.5 my-1.5 flex-wrap">
                            {hasWebsite && (
                              <a
                                href={normalizeWebsiteUrl(lead.website!)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 border border-gray-200 rounded-md transition-colors"
                                title={`Website: ${lead.website}`}
                              >
                                <Globe size={11} />
                              </a>
                            )}
                            {socials.map((s, idx) => (
                              <a
                                key={idx}
                                href={buildSocialUrl(s.network, s.value)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 border border-gray-200 rounded-md transition-colors"
                                title={`${s.network}: ${s.value}`}
                              >
                                {s.network.toLowerCase().includes('instagram') ? (
                                  <InstagramIcon size={11} />
                                ) : s.network.toLowerCase().includes('facebook') ? (
                                  <FacebookIcon size={11} />
                                ) : s.network.toLowerCase().includes('linkedin') ? (
                                  <LinkedinIcon size={11} />
                                ) : (
                                  <ExternalLink size={11} />
                                )}
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Alerta de Inatividade - sem renderizar '0' */}
                        {Boolean(lead.is_inactive) && lead.status !== 'Finalizado positivo' && lead.status !== 'Finalizado negativo' && (
                          <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">
                            <Clock size={10} />
                            SEM RESPOSTA (+7d)
                          </div>
                        )}

                        {/* Rodapé: Botão WhatsApp */}
                        <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
                          {(lead.whatsapp || lead.phone) ? (
                            <button
                              type="button"
                              onClick={(e) => handleOpenWhatsApp(lead, e)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md font-semibold transition-colors shadow-2xs"
                              title="Enviar mensagem via WhatsApp"
                            >
                              <MessageCircle size={11} className="text-emerald-600" />
                              <span>WhatsApp</span>
                            </button>
                          ) : (
                            <span className="text-gray-400">Sem WhatsApp</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {statusLeads.length === 0 && (
                    <div className="text-center py-8 text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                      Nenhum lead
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500 uppercase font-semibold text-[11px] tracking-wider select-none">
                <tr>
                  <th
                    onClick={() => handleSort('contact_name')}
                    className="py-3.5 px-4 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Contato</span>
                      {sortField === 'contact_name' ? (
                        sortDirection === 'asc' ? <ChevronUp size={14} className="text-blue-600" /> : <ChevronDown size={14} className="text-blue-600" />
                      ) : (
                        <ArrowUpDown size={12} className="opacity-40" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('company')}
                    className="py-3.5 px-4 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Empresa</span>
                      {sortField === 'company' ? (
                        sortDirection === 'asc' ? <ChevronUp size={14} className="text-blue-600" /> : <ChevronDown size={14} className="text-blue-600" />
                      ) : (
                        <ArrowUpDown size={12} className="opacity-40" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="py-3.5 px-4 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Status</span>
                      {sortField === 'status' ? (
                        sortDirection === 'asc' ? <ChevronUp size={14} className="text-blue-600" /> : <ChevronDown size={14} className="text-blue-600" />
                      ) : (
                        <ArrowUpDown size={12} className="opacity-40" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('platform')}
                    className="py-3.5 px-4 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Plataforma</span>
                      {sortField === 'platform' ? (
                        sortDirection === 'asc' ? <ChevronUp size={14} className="text-blue-600" /> : <ChevronDown size={14} className="text-blue-600" />
                      ) : (
                        <ArrowUpDown size={12} className="opacity-40" />
                      )}
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-gray-500 font-semibold">
                    <span>WhatsApp</span>
                  </th>
                  <th className="py-3.5 px-4 text-gray-500 font-semibold">
                    <span>Localização</span>
                  </th>
                  <th
                    onClick={() => handleSort('last_activity_at')}
                    className="py-3.5 px-4 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Última Atividade</span>
                      {sortField === 'last_activity_at' ? (
                        sortDirection === 'asc' ? <ChevronUp size={14} className="text-blue-600" /> : <ChevronDown size={14} className="text-blue-600" />
                      ) : (
                        <ArrowUpDown size={12} className="opacity-40" />
                      )}
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeads.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => openLeadDetails(l)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-semibold text-gray-900">{l.contact_name}</td>
                    <td className="py-3 px-4 text-gray-600">{l.company || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        l.status === 'Finalizado positivo' ? 'bg-emerald-100 text-emerald-800' :
                        l.status === 'Finalizado negativo' ? 'bg-gray-200 text-gray-700' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {renderPlatformBadge(l.platform || l.source) || (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {(l.whatsapp || l.phone) ? (
                        <button
                          type="button"
                          onClick={(e) => handleOpenWhatsApp(l, e)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors"
                          title="Clique para enviar mensagem via WhatsApp"
                        >
                          <MessageCircle size={13} className="text-emerald-600" />
                          <span>{l.whatsapp || l.phone}</span>
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {(() => {
                        const hasCompleteAddress = Boolean(l.address && l.address.trim().length > 5);
                        if (hasCompleteAddress) {
                          const fullAddr = getFullAddress(l);
                          return (
                            <div className="flex items-center gap-1.5">
                              <a
                                href={getGoogleMapsUrl(fullAddr)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 bg-blue-50 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold"
                                title={`Google Maps: ${fullAddr}`}
                              >
                                <MapPin size={13} />
                                <span>Maps</span>
                              </a>
                              <a
                                href={getWazeUrl(fullAddr)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold"
                                title={`Waze: ${fullAddr}`}
                              >
                                <span>Waze</span>
                              </a>
                            </div>
                          );
                        }

                        // Se não tiver endereço completo, exibe apenas o que estiver escrito (sem ícones)
                        if (l.city || l.address) {
                          return <span className="text-gray-600 font-medium">{l.city || l.address}</span>;
                        }
                        return <span className="text-gray-400">-</span>;
                      })()}
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {formatDate(l.last_activity_at)}
                      {l.is_inactive && (
                        <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                          SEM RESPOSTA
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button className="text-xs text-blue-600 font-semibold px-2 py-1 bg-blue-50 rounded-lg">
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT VIEW */}
      {viewMode === 'report' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* 1. TEXTO DE SITUAÇÃO DOS CONTATOS (Lógica de como andam os contatos: indo bem ou mal) */}
          <div
            className={cn(
              'p-5 sm:p-6 rounded-2xl border transition-all shadow-sm space-y-3.5',
              crmReportData.situation.state === 'excelente' &&
                'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/70 text-emerald-950 dark:text-emerald-100',
              crmReportData.situation.state === 'bom' &&
                'bg-teal-50/70 dark:bg-teal-950/30 border-teal-300 dark:border-teal-800/70 text-teal-950 dark:text-teal-100',
              crmReportData.situation.state === 'atencao' &&
                'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/70 text-amber-950 dark:text-amber-100',
              crmReportData.situation.state === 'critico' &&
                'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/70 text-rose-950 dark:text-rose-100',
              crmReportData.situation.state === 'neutro' &&
                'bg-blue-50/70 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800/70 text-blue-950 dark:text-blue-100'
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-2xs flex items-center gap-1.5',
                    crmReportData.situation.state === 'excelente' &&
                      'bg-emerald-600 text-white dark:bg-emerald-500',
                    crmReportData.situation.state === 'bom' &&
                      'bg-teal-600 text-white dark:bg-teal-500',
                    crmReportData.situation.state === 'atencao' &&
                      'bg-amber-600 text-white dark:bg-amber-500',
                    crmReportData.situation.state === 'critico' &&
                      'bg-rose-600 text-white dark:bg-rose-500',
                    crmReportData.situation.state === 'neutro' &&
                      'bg-blue-600 text-white dark:bg-blue-500'
                  )}
                >
                  <Activity size={13} className="animate-pulse" />
                  <span>{crmReportData.situation.badge}</span>
                </span>
                <span className="text-xs font-semibold opacity-75 hidden sm:inline">
                  Diagnóstico Comercial Automatizado
                </span>
              </div>

              {/* Indicadores rápidos de apoio */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                <span className="px-2.5 py-1 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-black/5 dark:border-white/10 shadow-2xs">
                  Taxa de Conversão: <strong>{crmReportData.taxaConversao.toFixed(1)}%</strong>
                </span>
                <span className="px-2.5 py-1 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-black/5 dark:border-white/10 shadow-2xs">
                  Sem Resposta: <strong>{crmReportData.taxaSemResposta.toFixed(1)}%</strong>
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base sm:text-lg font-bold">
                {crmReportData.situation.title}
              </h2>
              <p className="text-xs sm:text-sm leading-relaxed opacity-90">
                {crmReportData.situation.description}
              </p>
            </div>

            {crmReportData.situation.tip && (
              <div className="p-3 bg-white/70 dark:bg-gray-800/70 border border-black/5 dark:border-white/10 rounded-xl text-xs flex items-start gap-2.5 shadow-2xs">
                <Sparkles size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold">Estratégia Recomendada: </span>
                  <span className="opacity-90">{crmReportData.situation.tip}</span>
                </div>
              </div>
            )}
          </div>

          {/* 2. CARDS DE RESUMO ESTRATÉGICO: Quantos contatos são novos e métricas principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: NOVOS CONTATOS (Requisito chave) */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-2 relative overflow-hidden group">
              <div className="absolute -right-2 -bottom-2 opacity-5 dark:opacity-10 pointer-events-none">
                <Sparkles size={80} className="text-blue-600" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Novos Contatos
                </span>
                <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
                  <Sparkles size={16} />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
                  {crmReportData.novos}
                </span>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                  {crmReportData.total > 0
                    ? `${((crmReportData.novos / crmReportData.total) * 100).toFixed(0)}% do funil`
                    : '0%'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                Leads recém-adicionados que aguardam primeiro contato.
              </p>
            </div>

            {/* Card 2: EM NEGOCIAÇÃO ATIVA */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Em Negociação
                </span>
                <span className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-2xs">
                  <Activity size={16} />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
                  {crmReportData.emAndamento + crmReportData.aguardando}
                </span>
                <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                  Ativos no pipeline
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                {crmReportData.emAndamento} em andamento e {crmReportData.aguardando} aguardando resposta.
              </p>
            </div>

            {/* Card 3: FINALIZADOS POSITIVOS (Ganhos) */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ganhos / Convertidos
                </span>
                <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs">
                  <CheckCircle2 size={16} />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {crmReportData.positivo}
                </span>
                <span className="text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                  {crmReportData.taxaConversao.toFixed(1)}% conversão
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                {crmReportData.valorGanho > 0
                  ? `R$ ${crmReportData.valorGanho.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em valor ganho`
                  : 'Negócios concluídos com sucesso.'}
              </p>
            </div>

            {/* Card 4: SEM RESPOSTA / PERDIDOS */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Sem Resposta / Perdidos
                </span>
                <span className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-2xs">
                  <AlertTriangle size={16} />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
                  {crmReportData.semResposta + crmReportData.negativo}
                </span>
                <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                  {crmReportData.semResposta} sem retorno
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                {crmReportData.negativo} finalizados negativos no período.
              </p>
            </div>
          </div>

          {/* 3. QUANTOS EM CADA ETAPA DO CRM (Funil detalhado) */}
          <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart3 size={18} className="text-blue-600 dark:text-blue-400" />
                  <span>Distribuição por Etapa do CRM</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total de {crmReportData.total} contatos analisados no período filtrado
                </p>
              </div>

              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-750 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
                Valor Total Estimado:{' '}
                <strong className="text-gray-900 dark:text-white">
                  R$ {crmReportData.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            <div className="space-y-3.5">
              {crmReportData.stages.map((stage) => (
                <div
                  key={stage.status}
                  className="p-3.5 bg-gray-50/70 dark:bg-gray-750/50 rounded-xl border border-gray-200/80 dark:border-gray-700/80 space-y-2 transition-all hover:border-gray-300 dark:hover:border-gray-600"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={cn('px-2.5 py-0.5 rounded-md text-[11px] font-bold border', stage.badgeBg)}>
                        {stage.label}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 text-[11px] hidden sm:inline">
                        — {stage.description}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-semibold">
                      <span className="text-gray-900 dark:text-white text-sm">
                        {stage.count} {stage.count === 1 ? 'contato' : 'contatos'}
                      </span>
                      <span className="text-gray-400 font-mono text-xs">
                        ({stage.percentage.toFixed(1)}%)
                      </span>
                      {stage.value > 0 && (
                        <span className="text-emerald-700 dark:text-emerald-400 text-xs">
                          R$ {stage.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barra de Progresso Visual */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', stage.barColor)}
                      style={{ width: `${Math.min(100, Math.max(stage.count > 0 ? 3 : 0, stage.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. VISÃO CRUZADA: DISTRIBUIÇÃO POR CIDADE E POR ÁREA DE ATUAÇÃO */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top Cidades */}
            <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <MapPin size={16} className="text-blue-500" />
                  <span>Distribuição por Cidade</span>
                </h3>
                <span className="text-xs text-gray-400 font-medium">
                  {crmReportData.topCities.length} cidades no filtro
                </span>
              </div>

              {crmReportData.topCities.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-4 text-center">
                  Nenhuma cidade registrada nos contatos filtrados.
                </p>
              ) : (
                <div className="space-y-3">
                  {crmReportData.topCities.map((city) => (
                    <div key={city.name} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                        <span className="font-semibold">{city.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-white">
                            {city.total} {city.total === 1 ? 'lead' : 'leads'}
                          </span>
                          {city.positivos > 0 && (
                            <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                              ({city.positivos} ganhos)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all"
                          style={{
                            width: `${(city.total / (crmReportData.total || 1)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Áreas de Atuação (Segmentos) */}
            <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Briefcase size={16} className="text-emerald-500" />
                  <span>Distribuição por Área de Atuação</span>
                </h3>
                <span className="text-xs text-gray-400 font-medium">
                  {crmReportData.topSegments.length} áreas no filtro
                </span>
              </div>

              {crmReportData.topSegments.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-4 text-center">
                  Nenhuma área de atuação registrada nos contatos filtrados.
                </p>
              ) : (
                <div className="space-y-3">
                  {crmReportData.topSegments.map((seg) => (
                    <div key={seg.name} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                        <span className="font-semibold">{seg.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-white">
                            {seg.total} {seg.total === 1 ? 'lead' : 'leads'}
                          </span>
                          {seg.positivos > 0 && (
                            <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                              ({seg.positivos} ganhos)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{
                            width: `${(seg.total / (crmReportData.total || 1)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 5. TABELA DE CONTATOS DO RELATÓRIO */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden space-y-0">
            <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Contatos Analisados ({filteredLeads.length})
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Clique em um contato para visualizar a timeline, registrar interações ou enviar mensagens.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleViewModeChange('list')}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-all flex items-center gap-1"
                >
                  <List size={14} /> Abrir na Lista
                </button>
                <button
                  onClick={() => handleViewModeChange('kanban')}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all flex items-center gap-1"
                >
                  <Kanban size={14} /> Abrir no Kanban
                </button>
              </div>
            </div>

            {filteredLeads.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <p className="text-gray-500 text-xs font-medium">Nenhum contato encontrado com os filtros aplicados.</p>
                {isAnyFilterActive && (
                  <button
                    onClick={handleResetFilters}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/70 dark:bg-gray-750 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700">
                      <th className="py-3 px-4">Contato / Empresa</th>
                      <th className="py-3 px-4">Cidade</th>
                      <th className="py-3 px-4">Área de Atuação</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Data do Contato</th>
                      <th className="py-3 px-4 text-right">Valor Estimado</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-gray-800 dark:text-gray-200">
                    {filteredLeads.map((lead) => {
                      const displayDate = lead.first_contact_date
                        ? formatDate(lead.first_contact_date)
                        : formatDate(lead.created_at);

                      return (
                        <tr
                          key={lead.id}
                          className="hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedLead(lead)}
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-900 dark:text-white">{lead.contact_name}</div>
                            {lead.company && (
                              <div className="text-[11px] text-gray-500 dark:text-gray-400">{lead.company}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                            {lead.city || '—'}
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                            {lead.segment || '—'}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={cn(
                                'inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs',
                                lead.status === 'Novo' &&
                                  'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
                                lead.status === 'Em andamento' &&
                                  'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
                                lead.status === 'Aguardando resposta' &&
                                  'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
                                lead.status === 'Sem resposta' &&
                                  'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
                                lead.status === 'Finalizado positivo' &&
                                  'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
                                lead.status === 'Finalizado negativo' &&
                                  'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              )}
                            >
                              {lead.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-[11px]">
                            {displayDate}
                          </td>
                          <td className="py-3 px-4 text-right font-medium">
                            {lead.estimated_value && Number(lead.estimated_value) > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                R$ {Number(lead.estimated_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLead(lead);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-all"
                            >
                              Ver
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}


      {/* LEAD DETAILS & TIMELINE MODAL (Requisito 35) */}
      {selectedLead && (
        <ModalPortal>
          <div
            onClick={() => setSelectedLead(null)}
            className="fixed inset-0 !m-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            >
            <div className="shrink-0 p-6 border-b border-gray-200 bg-gray-50 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedLead.contact_name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{selectedLead.company || 'Pessoa Física'} • {selectedLead.city || 'Sem cidade'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditLead(selectedLead)}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Edit2 size={14} />
                  Editar Lead
                </button>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="p-2 text-gray-400 hover:text-gray-700 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Status Selector */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                <span className="font-semibold text-gray-700">Status do Funil:</span>
                <select
                  value={selectedLead.status}
                  onChange={(e) => handleUpdateStatus(selectedLead.id, e.target.value as CRMLeadStatus)}
                  className="px-3 py-1.5 font-bold bg-white border border-gray-300 rounded-lg shadow-sm"
                >
                  {CRM_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400">Telefone Fixo:</span>
                  <p className="font-semibold text-gray-800 mt-1">{selectedLead.phone || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">WhatsApp:</span>
                    {(selectedLead.whatsapp || selectedLead.phone) && (
                      <button
                        type="button"
                        onClick={() => handleOpenWhatsApp(selectedLead)}
                        className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                      >
                        <MessageCircle size={12} />
                        Enviar
                      </button>
                    )}
                  </div>
                  <p className="font-semibold text-gray-800 mt-1">{selectedLead.whatsapp || selectedLead.phone || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400">E-mail:</span>
                  <p className="font-semibold text-gray-800 mt-1 truncate">{selectedLead.email || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400">Plataforma:</span>
                  <p className="font-semibold text-gray-800 mt-1">{selectedLead.platform || selectedLead.source || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl sm:col-span-2">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-gray-400 font-semibold flex items-center gap-1">
                      <MapPin size={12} className="text-blue-600" />
                      Endereço & Localização:
                    </span>
                    {getFullAddress(selectedLead) && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={getGoogleMapsUrl(getFullAddress(selectedLead))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-md text-[10px] font-bold shadow-2xs transition-colors"
                          title="Abrir no Google Maps"
                        >
                          <MapPin size={10} />
                          <span>Google Maps</span>
                          <ExternalLink size={9} />
                        </a>
                        <a
                          href={getWazeUrl(getFullAddress(selectedLead))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-cyan-200 text-cyan-800 hover:bg-cyan-50 rounded-md text-[10px] font-bold shadow-2xs transition-colors"
                          title="Abrir no Waze"
                        >
                          <span>Waze</span>
                          <ExternalLink size={9} />
                        </a>
                      </div>
                    )}
                  </div>
                  <p className="font-semibold text-gray-800">
                    {selectedLead.address ? (
                      <>
                        <span>{selectedLead.address}</span>
                        {selectedLead.city && (
                          <span className="text-gray-500 font-normal"> • {selectedLead.city}</span>
                        )}
                      </>
                    ) : (
                      selectedLead.city || '-'
                    )}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400">Ramo de Atuação:</span>
                  <p className="font-semibold text-gray-800 mt-1">{selectedLead.segment || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400">Valor Estimado:</span>
                  <p className="font-semibold text-emerald-600 mt-1">
                    {selectedLead.estimated_value ? `R$ ${Number(selectedLead.estimated_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                  </p>
                </div>
              </div>

              {/* Social and Web Links */}
              {(selectedLead.website || parseSocialLinks(selectedLead).length > 0) && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400 block mb-2 font-semibold">Links & Redes Sociais:</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedLead.website && (
                      <a
                        href={normalizeWebsiteUrl(selectedLead.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-blue-600 hover:text-blue-700 hover:border-blue-300 font-medium transition-colors"
                      >
                        <Globe size={13} />
                        <span>{selectedLead.website.replace(/^https?:\/\//i, '')}</span>
                        <ExternalLink size={10} className="text-gray-400" />
                      </a>
                    )}
                    {parseSocialLinks(selectedLead).map((item, idx) => {
                      const net = (item.network || '').toLowerCase();
                      const isIg = net.includes('instagram');
                      const isFb = net.includes('facebook');
                      const isIn = net.includes('linkedin');
                      const colorClasses = isIg
                        ? 'text-pink-600 hover:text-pink-700 hover:border-pink-300'
                        : isFb
                        ? 'text-blue-700 hover:text-blue-800 hover:border-blue-400'
                        : isIn
                        ? 'text-sky-700 hover:text-sky-800 hover:border-sky-400'
                        : 'text-gray-700 hover:text-gray-900 hover:border-gray-300';
                      const label = item.value.startsWith('@')
                        ? `${item.network}: ${item.value}`
                        : `${item.network} (${item.value.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0]})`;

                      return (
                        <a
                          key={`${item.network}-${idx}`}
                          href={buildSocialUrl(item.network, item.value)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-medium transition-colors',
                            colorClasses
                          )}
                        >
                          {isIg ? (
                            <InstagramIcon size={13} />
                          ) : isFb ? (
                            <FacebookIcon size={13} />
                          ) : isIn ? (
                            <LinkedinIcon size={13} />
                          ) : (
                            <Globe size={13} />
                          )}
                          <span>{label}</span>
                          <ExternalLink size={10} className="text-gray-400" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Descrição do Cliente */}
              {selectedLead.description && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400 block mb-1 font-semibold">Sobre o Cliente:</span>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedLead.description}</p>
                </div>
              )}

              {selectedLead.notes && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400 block mb-1 font-semibold">Observações Internas:</span>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedLead.notes}</p>
                </div>
              )}

              {/* Interactions Timeline (Requisito 35) */}
              <div>
                <h4 className="font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <History size={14} className="text-blue-600" />
                  Timeline de Contatos & Follow-up
                </h4>

                <div className="space-y-3 mb-4">
                  {loadingInteractions ? (
                    <div className="flex items-center justify-center py-6 text-gray-400 gap-2">
                      <Loader2 size={16} className="animate-spin text-blue-600" />
                      <span>Carregando interações...</span>
                    </div>
                  ) : interactions.length === 0 ? (
                    <p className="text-center text-gray-400 py-4">Nenhuma interação registrada ainda.</p>
                  ) : (
                    interactions.map((int: any) => (
                      <div key={int.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 leading-relaxed">
                        <div className="flex items-center justify-between font-semibold mb-1 text-gray-800">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-600 font-bold">{int.platform}</span>
                            {int.author_name && (
                              <span className="text-[10px] text-gray-400 font-normal">por {int.author_name}</span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 font-normal">{formatDateTime(int.interaction_date)}</span>
                        </div>
                        <p className="text-gray-700">{int.message}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add new interaction */}
                <form onSubmit={handleAddInteraction} className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex gap-2">
                    <select
                      value={newInteraction.platform}
                      onChange={(e) => setNewInteraction({ ...newInteraction, platform: e.target.value })}
                      disabled={submittingInteraction}
                      className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Ligação">Ligação</option>
                      <option value="E-mail">E-mail</option>
                      <option value="Reunião">Reunião</option>
                      <option value="Instagram">Instagram</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Descreva a interação (atualiza a data de última atividade)..."
                      value={newInteraction.message}
                      onChange={(e) => setNewInteraction({ ...newInteraction, message: e.target.value })}
                      disabled={submittingInteraction}
                      className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    <button
                      type="submit"
                      disabled={submittingInteraction || !newInteraction.message.trim()}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold flex items-center gap-1 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title={submittingInteraction ? 'Enviando...' : 'Enviar interação'}
                    >
                      {submittingInteraction ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Send size={13} />
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="shrink-0 p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <ModalPortal>
          <div
            onClick={handleRequestCloseCreateModal}
            className="fixed inset-0 !m-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-xl w-full shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            >
            <div className="shrink-0 px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Cadastrar Lead</h3>
                <p className="text-xs text-gray-500 mt-0.5">Adicione um novo prospecto ao funil de vendas com informações completas.</p>
              </div>
              <button
                type="button"
                onClick={handleRequestCloseCreateModal}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1.5 hover:bg-gray-200/60 transition-colors"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Nome do Contato *</label>
                    <input
                      type="text"
                      placeholder="Ex: Dra. Carolina Lima"
                      value={newLead.contact_name}
                      onChange={(e) => setNewLead({ ...newLead, contact_name: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Empresa / Negócio</label>
                    <input
                      type="text"
                      placeholder="Ex: Clínica Sorriso & Estética"
                      value={newLead.company}
                      onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Telefone Fixo</label>
                    <input
                      type="text"
                      placeholder="(18) 3600-0000"
                      value={newLead.phone}
                      onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">WhatsApp</label>
                    <input
                      type="text"
                      placeholder="(18) 99999-9999"
                      value={newLead.whatsapp}
                      onChange={(e) => setNewLead({ ...newLead, whatsapp: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">E-mail</label>
                    <input
                      type="email"
                      placeholder="contato@empresa.com"
                      value={newLead.email}
                      onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                      <MapPin size={13} className="text-blue-500" />
                      Endereço
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
                      value={newLead.address}
                      onChange={(e) => setNewLead({ ...newLead, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Plataforma</label>
                    <select
                      value={newLead.platform}
                      onChange={(e) => setNewLead({ ...newLead, platform: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Indicação">Indicação</option>
                      <option value="Google">Google</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-gray-700 mb-1">Ramo de Atuação</label>
                    <input
                      type="text"
                      placeholder="Ex: Odontologia, Arquitetura, Varejo de Moda, etc."
                      value={newLead.segment}
                      onChange={(e) => setNewLead({ ...newLead, segment: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Redes Sociais e Links */}
                <div className="pt-2 border-t border-gray-100 space-y-3">
                  <span className="block font-bold text-gray-700">Links & Redes Sociais</span>

                  <div>
                    <label className="block text-gray-600 mb-1 flex items-center gap-1">
                      <Globe size={12} className="text-blue-500" />
                      Site (não precisa digitar http://)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: www.seusite.com.br ou seusite.com.br"
                      value={newLead.website}
                      onChange={(e) => setNewLead({ ...newLead, website: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-gray-600 font-semibold">Redes Sociais</label>
                      <button
                        type="button"
                        onClick={() =>
                          setNewLead((prev) => ({
                            ...prev,
                            social_links: [...prev.social_links, { network: 'Instagram', value: '' }],
                          }))
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-semibold transition-colors"
                      >
                        <Plus size={13} />
                        <span>Adicionar Rede Social</span>
                      </button>
                    </div>

                    {newLead.social_links.length === 0 ? (
                      <p className="text-gray-400 italic text-[11px]">
                        Nenhuma rede social adicionada. Clique em &ldquo;Adicionar Rede Social&rdquo; para incluir.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {newLead.social_links.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <select
                              value={item.network}
                              onChange={(e) => {
                                const updated = [...newLead.social_links];
                                updated[idx] = { ...updated[idx], network: e.target.value };
                                setNewLead({ ...newLead, social_links: updated });
                              }}
                              className="px-2.5 py-2 border border-gray-300 rounded-xl bg-gray-50 font-semibold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                              {SOCIAL_NETWORK_OPTIONS.map((net) => (
                                <option key={net} value={net}>
                                  {net}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              placeholder="@usuario ou link da rede"
                              value={item.value}
                              onChange={(e) => {
                                const updated = [...newLead.social_links];
                                updated[idx] = { ...updated[idx], value: e.target.value };
                                setNewLead({ ...newLead, social_links: updated });
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = newLead.social_links.filter((_, i) => i !== idx);
                                setNewLead({ ...newLead, social_links: updated });
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                              title="Remover rede social"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Descrição sobre o Cliente */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Descrição sobre o Cliente</label>
                  <textarea
                    rows={2}
                    placeholder="Descreva detalhes sobre o cliente, perfil, necessidades ou dores identificadas..."
                    value={newLead.description}
                    onChange={(e) => setNewLead({ ...newLead, description: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Observações Internas */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Observações Internas</label>
                  <textarea
                    rows={2}
                    placeholder="Anotações internas sobre o lead..."
                    value={newLead.notes}
                    onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewLead(EMPTY_NEW_LEAD);
                    setShowCreateModal(false);
                  }}
                  className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-200/70 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm transition-colors"
                >
                  Cadastrar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>
      )}

      {/* EDIT LEAD MODAL */}
      {showEditLeadModal && (
        <ModalPortal>
          <div
            onClick={handleRequestCloseEditModal}
            className="fixed inset-0 !m-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-xl w-full shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col overflow-hidden"
            >
            {/* Cabeçalho Fixo no Topo */}
            <div className="shrink-0 px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Edit2 size={18} className="text-blue-600" />
                Editar Lead
              </h3>
              <button
                type="button"
                onClick={handleRequestCloseEditModal}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1.5 hover:bg-gray-200/60 transition-colors"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateLead} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
              {/* Conteúdo com Rolagem Independente (não sobrepõe cabeçalho nem rodapé) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Nome do Contato *</label>
                    <input
                      type="text"
                      required
                      value={editLead.contact_name}
                      onChange={(e) => setEditLead({ ...editLead, contact_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Empresa / Negócio</label>
                    <input
                      type="text"
                      value={editLead.company}
                      onChange={(e) => setEditLead({ ...editLead, company: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Telefone Fixo</label>
                    <input
                      type="text"
                      placeholder="(18) 3600-0000"
                      value={editLead.phone}
                      onChange={(e) => setEditLead({ ...editLead, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">WhatsApp</label>
                    <input
                      type="text"
                      placeholder="(18) 99999-9999"
                      value={editLead.whatsapp}
                      onChange={(e) => setEditLead({ ...editLead, whatsapp: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">E-mail</label>
                    <input
                      type="email"
                      value={editLead.email}
                      onChange={(e) => setEditLead({ ...editLead, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Status do Funil</label>
                    <select
                      value={editLead.status}
                      onChange={(e) => setEditLead({ ...editLead, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold"
                    >
                      {CRM_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Plataforma</label>
                    <select
                      value={editLead.platform}
                      onChange={(e) => setEditLead({ ...editLead, platform: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Indicação">Indicação</option>
                      <option value="Google">Google</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                      <MapPin size={13} className="text-blue-500" />
                      Endereço
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
                      value={editLead.address}
                      onChange={(e) => setEditLead({ ...editLead, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Ramo de Atuação</label>
                    <input
                      type="text"
                      placeholder="Ex: Odontologia, Moda, etc."
                      value={editLead.segment}
                      onChange={(e) => setEditLead({ ...editLead, segment: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-semibold text-gray-700 mb-1">Valor Estimado (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editLead.estimated_value || ''}
                      onChange={(e) => setEditLead({ ...editLead, estimated_value: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Redes Sociais e Links */}
                <div className="pt-2 border-t border-gray-100 space-y-3">
                  <span className="block font-bold text-gray-700">Links & Redes Sociais</span>

                  <div>
                    <label className="block text-gray-600 mb-1 flex items-center gap-1">
                      <Globe size={12} className="text-blue-500" />
                      Site (não precisa digitar http://)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: www.seusite.com.br ou seusite.com.br"
                      value={editLead.website}
                      onChange={(e) => setEditLead({ ...editLead, website: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-gray-600 font-semibold">Redes Sociais</label>
                      <button
                        type="button"
                        onClick={() =>
                          setEditLead((prev) => ({
                            ...prev,
                            social_links: [...prev.social_links, { network: 'Instagram', value: '' }],
                          }))
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-semibold transition-colors"
                      >
                        <Plus size={13} />
                        <span>Adicionar Rede Social</span>
                      </button>
                    </div>

                    {editLead.social_links.length === 0 ? (
                      <p className="text-gray-400 italic text-[11px]">
                        Nenhuma rede social adicionada. Clique em &ldquo;Adicionar Rede Social&rdquo; para incluir.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {editLead.social_links.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <select
                              value={item.network}
                              onChange={(e) => {
                                const updated = [...editLead.social_links];
                                updated[idx] = { ...updated[idx], network: e.target.value };
                                setEditLead({ ...editLead, social_links: updated });
                              }}
                              className="px-2.5 py-2 border border-gray-300 rounded-xl bg-gray-50 font-semibold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                              {SOCIAL_NETWORK_OPTIONS.map((net) => (
                                <option key={net} value={net}>
                                  {net}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              placeholder="@usuario ou link da rede"
                              value={item.value}
                              onChange={(e) => {
                                const updated = [...editLead.social_links];
                                updated[idx] = { ...updated[idx], value: e.target.value };
                                setEditLead({ ...editLead, social_links: updated });
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = editLead.social_links.filter((_, i) => i !== idx);
                                setEditLead({ ...editLead, social_links: updated });
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                              title="Remover rede social"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Descrição sobre o Cliente */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Descrição sobre o Cliente</label>
                  <textarea
                    rows={2}
                    placeholder="Descreva detalhes sobre o cliente, perfil, necessidades ou dores identificadas..."
                    value={editLead.description}
                    onChange={(e) => setEditLead({ ...editLead, description: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Observações Internas */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Observações Internas</label>
                  <textarea
                    rows={2}
                    value={editLead.notes}
                    onChange={(e) => setEditLead({ ...editLead, notes: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Rodapé Fixo na Base */}
              <div className="shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleDeleteLead}
                  className="px-3 py-2 font-semibold text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 size={14} />
                  Excluir Lead
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditLeadModal(false)}
                    className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-200/70 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm transition-colors"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE ALTERAÇÕES NÃO SALVAS */}
      {unsavedChangesModal.isOpen && (
        <ModalPortal>
          <div
            onClick={() => setUnsavedChangesModal((prev) => ({ ...prev, isOpen: false }))}
            className="fixed inset-0 !m-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200"
            >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Alterações não salvas</h3>
                  <p className="text-xs text-gray-500">Você modificou informações neste formulário.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUnsavedChangesModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1"
                title="Continuar editando"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-5 leading-relaxed">
              Deseja salvar as alterações realizadas ou descartá-las antes de fechar?
            </p>

            <div className="flex items-center justify-end gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setUnsavedChangesModal({ isOpen: false, mode: 'edit' });
                  if (unsavedChangesModal.mode === 'edit') {
                    setShowEditLeadModal(false);
                  } else {
                    setNewLead(EMPTY_NEW_LEAD);
                    setShowCreateModal(false);
                  }
                }}
                className="px-4 py-2 font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
              >
                Descartar Alterações
              </button>
              <button
                type="button"
                onClick={async () => {
                  const mode = unsavedChangesModal.mode;
                  setUnsavedChangesModal({ isOpen: false, mode: 'edit' });
                  if (mode === 'edit') {
                    await saveEditLead();
                  } else {
                    await saveCreateLead();
                  }
                }}
                className="px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-sm transition-colors"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
      )}

      {/* ======================================================== */}
      {/* MODAL: ENVIAR MENSAGEM NO WHATSAPP                        */}
      {/* ======================================================== */}
      {whatsAppModal.isOpen && (
        <ModalPortal>
          <div
            onClick={() => setWhatsAppModal({ isOpen: false, lead: null, phone: '', message: '' })}
            className="fixed inset-0 !m-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95 duration-200"
            >
              <button
                onClick={() => setWhatsAppModal({ isOpen: false, lead: null, phone: '', message: '' })}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <MessageCircle size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Enviar Mensagem no WhatsApp</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Para: <strong className="text-gray-800">{whatsAppModal.lead?.contact_name}</strong> {whatsAppModal.lead?.company ? `(${whatsAppModal.lead.company})` : ''} • {whatsAppModal.phone}
                  </p>
                </div>
              </div>

              <div className="space-y-3.5">
                {/* Seleção de Modelos Pré-configurados */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-amber-500" />
                      <span>Mensagens CRM:</span>
                    </label>
                    <a
                      href="/settings?tab=whatsapp"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 transition-colors"
                      title="Abrir Mensagens CRM em nova aba"
                    >
                      <span>Configurar Mensagens CRM</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-gray-50 border border-gray-200 rounded-xl">
                    {whatsAppTemplates.map((tpl) => {
                      const isSelected = selectedTemplateId === tpl.id;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => {
                            setSelectedTemplateId(tpl.id);
                            const formatted = formatWhatsAppTemplate(tpl.message, whatsAppModal.lead);
                            setWhatsAppModal((prev) => ({ ...prev, message: formatted }));
                          }}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer text-left',
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600'
                              : 'bg-white hover:bg-emerald-50 text-gray-700 border border-gray-200 hover:border-emerald-300'
                          )}
                          title="Clique para aplicar este modelo com os dados do lead"
                        >
                          {tpl.title}
                        </button>
                      );
                    })}
                  </div>

                  {whatsAppModal.lead && (
                    <div className="text-[10px] text-gray-500 bg-gray-50/70 px-2.5 py-1 rounded-lg flex items-center justify-between flex-wrap gap-1">
                      <span>
                        Contato: <strong className="text-gray-800">{whatsAppModal.lead.contact_name}</strong>
                      </span>
                      {whatsAppModal.lead.company && (
                        <span>
                          Empresa: <strong className="text-gray-800">{whatsAppModal.lead.company}</strong>
                        </span>
                      )}
                      <span className="text-emerald-600 font-medium ml-auto">
                        ✓ Variáveis reconhecidas
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Mensagem (você pode editar o texto antes de enviar):
                  </label>
                  <textarea
                    rows={5}
                    value={whatsAppModal.message}
                    onChange={(e) => setWhatsAppModal((prev) => ({ ...prev, message: e.target.value }))}
                    className="w-full p-3 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed text-gray-800 resize-none"
                    placeholder="Digite sua mensagem..."
                  />
                </div>

                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-[11px] text-emerald-800 flex items-start gap-2">
                  <MessageCircle size={14} className="shrink-0 mt-0.5 text-emerald-600" />
                  <span>
                    Ao clicar em <strong>Enviar Mensagem</strong>, o WhatsApp Web ou o aplicativo do WhatsApp no celular será aberto com a conversa iniciada e o texto pronto para envio.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setWhatsAppModal({ isOpen: false, lead: null, phone: '', message: '' })}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-all flex items-center gap-2 active:scale-95"
                  >
                    <Send size={13} />
                    <span>Enviar Mensagem</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState({ ...confirmState, isOpen: false })}
      />
          {/* Toast de Feedback */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold animate-in fade-in slide-in-from-top-3 duration-200 backdrop-blur-md',
            toast.type === 'success'
              ? 'bg-emerald-50/95 text-emerald-800 border-emerald-200 shadow-emerald-500/10'
              : 'bg-rose-50/95 text-rose-800 border-rose-200 shadow-rose-500/10'
          )}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
