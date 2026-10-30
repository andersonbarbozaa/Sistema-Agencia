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
  RotateCcw,
  Activity,
  PhoneCall,
  RefreshCw,
} from 'lucide-react';
import {
  CRM_STATUSES,
  CRM_CHANNELS,
  CRMChannel,
  mapLegacyStatus,
  getFollowUpInfo,
  getChannelTarget,
} from '@/lib/crm-utils';
import { DEFAULT_WHATSAPP_TEMPLATES, parseWhatsAppTemplates, formatWhatsAppTemplate } from '@/lib/whatsapp-templates';
import { CRMLead, CRMInteraction, CRMLeadStatus, CRMWhatsAppTemplate } from '@/types';
import { formatDate, formatDateTime, cn } from '@/lib/utils';
import {
  InstagramIcon,
  FacebookIcon,
  LinkedinIcon,
  renderChannelIcon,
  renderStatusBadge,
  SocialLinkItem,
  parseSocialLinks,
  buildSocialUrl,
  normalizeWebsiteUrl,
} from '@/components/crm/CRMIcons';
import { CRMLeadCard } from '@/components/crm/CRMLeadCard';
import { CRMLeadRow } from '@/components/crm/CRMLeadRow';
import { CRMLeadDetailModal } from '@/components/crm/CRMLeadDetailModal';
import { CRMQuickContactModal } from '@/components/crm/CRMQuickContactModal';
import { CRMMissingDataModal } from '@/components/crm/CRMMissingDataModal';
import { CRMReactivateModal } from '@/components/crm/CRMReactivateModal';
import { CRMReportView } from '@/components/crm/CRMReportView';

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

export default function CRMPage() {
  const [confirmState, setConfirmState] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'report'>('kanban');
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [followUpFilter, setFollowUpFilter] = useState<string>('all'); // all, green, yellow, red, none, closed
  const [dateFilterPreset, setDateFilterPreset] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Ordenação
  const [sortField, setSortField] = useState<'contact_name' | 'company' | 'status' | 'primary_channel' | 'city' | 'last_activity_at'>('last_activity_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modais de detalhe e ações
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [quickContactLead, setQuickContactLead] = useState<CRMLead | null>(null);
  const [missingDataLead, setMissingDataLead] = useState<CRMLead | null>(null);
  const [reactivateModalLead, setReactivateModalLead] = useState<CRMLead | null>(null);

  // Drag and Drop State
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const dragStartTimeRef = useRef<number>(0);

  // WhatsApp Templates Modal
  const [whatsAppModalLead, setWhatsAppModalLead] = useState<CRMLead | null>(null);
  const [whatsAppTemplates, setWhatsAppTemplates] = useState<CRMWhatsAppTemplate[]>(DEFAULT_WHATSAPP_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(DEFAULT_WHATSAPP_TEMPLATES[0].id);
  const [whatsAppCustomText, setWhatsAppCustomText] = useState<string>('');
  const [profileForm, setProfileForm] = useState({ company_name: '' });

  // Toast
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  const handleViewModeChange = (mode: 'kanban' | 'list' | 'report') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('crm_view_mode', mode);
      } catch {}
    }
  };

  // ============================================================
  // NOVO LEAD MODAL & FORM STATE
  // ============================================================
  const EMPTY_NEW_LEAD = {
    contact_name: '',
    company: '',
    phone: '',
    whatsapp: '',
    email: '',
    city: '',
    address: '',
    primary_channel: 'WhatsApp' as CRMChannel,
    platform: 'WhatsApp',
    notes: '',
    website: '',
    facebook: '',
    linkedin: '',
    instagram: '',
    social_links: [] as SocialLinkItem[],
    segment: '',
    description: '',
    estimated_value: 0,
  };
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLead, setNewLead] = useState(EMPTY_NEW_LEAD);

  // ============================================================
  // EDIT LEAD MODAL & FORM STATE
  // ============================================================
  const EMPTY_EDIT_LEAD = {
    id: '',
    contact_name: '',
    company: '',
    phone: '',
    whatsapp: '',
    email: '',
    city: '',
    address: '',
    primary_channel: 'WhatsApp' as CRMChannel,
    platform: 'WhatsApp',
    status: 'Novo lead' as CRMLeadStatus,
    notes: '',
    website: '',
    facebook: '',
    linkedin: '',
    instagram: '',
    social_links: [] as SocialLinkItem[],
    segment: '',
    description: '',
    estimated_value: 0,
  };
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLead, setEditLead] = useState(EMPTY_EDIT_LEAD);

  // ============================================================
  // FETCH LEADS
  // ============================================================
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/crm?limit=500');
      if (res.ok) {
        const d = await res.json();
        const raw = d.data || d.leads || [];
        setLeads(raw);
        if (selectedLead) {
          const updated = raw.find((l: CRMLead) => l.id === selectedLead.id);
          if (updated) setSelectedLead(updated);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedMode = sessionStorage.getItem('crm_view_mode') as any;
        if (savedMode === 'kanban' || savedMode === 'list' || savedMode === 'report') {
          setViewMode(savedMode);
        }
      } catch {}
    }
    fetchLeads();

    // Carrega modelos pré-definidos de mensagens do WhatsApp e dados da agência
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d?.settings?.crm_whatsapp_templates) {
          const parsed = parseWhatsAppTemplates(d.settings.crm_whatsapp_templates);
          if (parsed && parsed.length > 0) {
            setWhatsAppTemplates(parsed);
            setSelectedTemplateId(parsed[0].id);
          }
        }
        if (d?.settings?.agency_name || d?.settings?.company_name) {
          setProfileForm({ company_name: d.settings.agency_name || d.settings.company_name });
        }
      })
      .catch(() => {});

    const handler = () => setShowCreateModal(true);
    window.addEventListener('open-new-lead', handler);
    return () => window.removeEventListener('open-new-lead', handler);
  }, []);

  // ============================================================
  // HANDLERS DE AÇÕES
  // ============================================================

  // Atualização persistente de status (Requisito 2)
  const handleUpdateStatus = async (leadId: string, newStatus: CRMLeadStatus, notes?: string) => {
    const previousLeads = leads;
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    try {
      const res = await fetch(`/api/crm/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          status_change_notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        setLeads(previousLeads);
        showToast('Não foi possível atualizar o status do lead.', 'error');
        return;
      }

      showToast(`Lead movido para "${newStatus}".`, 'success');
      fetchLeads();
    } catch (err) {
      console.error(err);
      setLeads(previousLeads);
      showToast('Erro de conexão ao atualizar status do lead.', 'error');
    }
  };

  // Alteração direta do canal principal (Requisito 5)
  const handleChangePrimaryChannel = async (leadId: string, channel: string) => {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, primary_channel: channel as any } : l)));
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, primary_channel: channel as any } : null));
    }

    try {
      await fetch(`/api/crm/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary_channel: channel }),
      });
      showToast(`Canal principal definido como ${channel}.`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  // Clique no botão do canal principal no card (Requisito 5)
  const handleExecutePrimaryChannel = (lead: CRMLead, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const ch = (lead.primary_channel || 'WhatsApp').toLowerCase();

    // Se for WhatsApp com dados, abre o modal integrado de templates
    if (ch.includes('whatsapp') || ch.includes('whats')) {
      if (lead.whatsapp || lead.phone) {
        handleOpenWhatsApp(lead, e);
        return;
      }
    }

    const target = getChannelTarget(lead.primary_channel, lead);
    if (target.hasData && target.url) {
      window.open(target.url, '_blank');
    } else {
      // Abre modal rápido para preencher o dado faltante
      setMissingDataLead(lead);
    }
  };

  // Abre modal de WhatsApp
  const handleOpenWhatsApp = (lead: CRMLead, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWhatsAppModalLead(lead);

    const defaultTpl = whatsAppTemplates[0] || DEFAULT_WHATSAPP_TEMPLATES[0];
    setSelectedTemplateId(defaultTpl.id);

    const initialFormatted = formatWhatsAppTemplate(
      defaultTpl.message,
      lead,
      profileForm.company_name || 'PixelCraft Studio'
    );
    setWhatsAppCustomText(initialFormatted);
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tpl = whatsAppTemplates.find((t) => t.id === templateId);
    if (tpl && whatsAppModalLead) {
      const formatted = formatWhatsAppTemplate(
        tpl.message,
        whatsAppModalLead,
        profileForm.company_name || 'PixelCraft Studio'
      );
      setWhatsAppCustomText(formatted);
    }
  };

  const handleSendWhatsApp = () => {
    if (!whatsAppModalLead) return;
    const phone = whatsAppModalLead.whatsapp || whatsAppModalLead.phone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    const encodedText = encodeURIComponent(whatsAppCustomText);
    const url = `https://wa.me/${phoneWithCountry}?text=${encodedText}`;
    window.open(url, '_blank');
    setWhatsAppModalLead(null);
  };

  // ============================================================
  // CRIAÇÃO E EDIÇÃO DE LEADS
  // ============================================================
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.contact_name.trim()) {
      showToast('Preencha o Nome do Contato para salvar o lead.', 'error');
      return;
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
        showToast('Novo lead cadastrado com sucesso!', 'success');
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || 'Erro ao cadastrar lead.', 'error');
      }
    } catch {
      showToast('Erro de conexão ao criar lead.', 'error');
    }
  };

  const openEditLead = (lead: CRMLead) => {
    setEditLead({
      id: lead.id,
      contact_name: lead.contact_name || '',
      company: lead.company || '',
      phone: lead.phone || '',
      whatsapp: lead.whatsapp || '',
      email: lead.email || '',
      city: lead.city || '',
      address: lead.address || '',
      primary_channel: (lead.primary_channel as any) || 'WhatsApp',
      platform: lead.platform || 'WhatsApp',
      status: mapLegacyStatus(lead.status),
      notes: lead.notes || '',
      website: lead.website || '',
      facebook: lead.facebook || '',
      linkedin: lead.linkedin || '',
      instagram: lead.instagram || '',
      social_links: parseSocialLinks(lead),
      segment: lead.segment || '',
      description: lead.description || '',
      estimated_value: lead.estimated_value || 0,
    });
    setShowEditModal(true);
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLead.id || !editLead.contact_name.trim()) {
      showToast('Nome do contato é obrigatório.', 'error');
      return;
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
      const res = await fetch(`/api/crm/${editLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowEditModal(false);
        fetchLeads();
        showToast('Lead atualizado com sucesso!', 'success');
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || 'Erro ao atualizar lead.', 'error');
      }
    } catch {
      showToast('Erro de conexão ao atualizar lead.', 'error');
    }
  };

  const handleDeleteLead = (lead: CRMLead) => {
    setConfirmState({
      isOpen: true,
      title: 'Excluir Lead',
      message: `Deseja realmente excluir permanentemente o lead "${lead.contact_name}"? Todo o histórico de contatos e movimentações será removido.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/crm/${lead.id}`, { method: 'DELETE' });
          if (res.ok) {
            setLeads((prev) => prev.filter((l) => l.id !== lead.id));
            if (selectedLead?.id === lead.id) setSelectedLead(null);
            showToast('Lead excluído com sucesso!', 'success');
          }
        } catch {
          showToast('Erro ao excluir lead.', 'error');
        }
      },
    });
  };

  // ============================================================
  // FILTRAGEM E ORDENAÇÃO DINÂMICA (Requisitos 4, 6)
  // ============================================================
  const isAnyFilterActive =
    statusFilter !== 'all' ||
    cityFilter !== 'all' ||
    segmentFilter !== 'all' ||
    followUpFilter !== 'all' ||
    dateFilterPreset !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    searchQuery !== '';

  const handleResetFilters = () => {
    setStatusFilter('all');
    setCityFilter('all');
    setSegmentFilter('all');
    setFollowUpFilter('all');
    setDateFilterPreset('all');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
  };

  const availableCities = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.city && l.city.trim()) set.add(l.city.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [leads]);

  const availableSegments = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.segment && l.segment.trim()) set.add(l.segment.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads
      .filter((l) => {
        // Status filter
        if (statusFilter !== 'all' && l.status !== statusFilter) return false;

        // Follow-up status filter (Requisito 4)
        if (followUpFilter !== 'all') {
          const fu = getFollowUpInfo(l);
          if (fu.status !== followUpFilter) return false;
        }

        // City filter
        if (cityFilter !== 'all') {
          const leadCity = (l.city || '').trim().toLowerCase();
          if (leadCity !== cityFilter.trim().toLowerCase()) return false;
        }

        // Segment filter
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
        } else if (sortField === 'primary_channel') {
          const valA = (a.primary_channel || 'WhatsApp').toLowerCase();
          const valB = (b.primary_channel || 'WhatsApp').toLowerCase();
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
  }, [leads, statusFilter, followUpFilter, cityFilter, segmentFilter, dateFilterPreset, dateFrom, dateTo, searchQuery, sortField, sortDirection]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Toast de Notificação */}
      {toast.show && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-5',
            toast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-rose-600 text-white border-rose-500'
          )}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* BARRA DE AÇÕES & FILTROS GERAIS */}
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
            >
              <Plus size={16} className="stroke-[2.5]" />
              <span>Adicionar Novo Lead</span>
            </button>

            <a
              href="/settings?tab=whatsapp"
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-gray-750 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-gray-700 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-400 border border-gray-200 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-800 rounded-xl text-xs font-semibold shadow-2xs transition-all active:scale-[0.98]"
              title="Abrir configurações de Mensagens CRM"
            >
              <MessageCircle size={15} className="text-emerald-600 dark:text-emerald-400" />
              <span>Mensagens WhatsApp</span>
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
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm font-bold'
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
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm font-bold'
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
                <BarChart3 size={14} /> Relatório & Funil
              </button>
            </div>
          </div>
        </div>

        {/* Linha de Filtros: Follow-up, Etapas, Cidades, Ramos, Datas, Busca */}
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

          {/* Requisito 4: Filtro por Cor de Indicador de Acompanhamento */}
          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1">
            <Clock size={13} className="text-gray-400 shrink-0" />
            <select
              value={followUpFilter}
              onChange={(e) => setFollowUpFilter(e.target.value)}
              className="bg-transparent border-0 text-gray-700 dark:text-gray-300 font-semibold text-xs focus:ring-0 focus:outline-none pr-1"
            >
              <option value="all">Todos os Acompanhamentos</option>
              <option value="green">🟢 Em dia (até 2 dias úteis)</option>
              <option value="yellow">🟡 Atenção (3-4 dias úteis)</option>
              <option value="red">🔴 Atrasado (5+ dias úteis)</option>
              <option value="none">⚪ Sem contato registrado</option>
              <option value="closed">⚪ Encerrados</option>
            </select>
          </div>

          {/* Filtro por Etapa do Funil (Requisito 1) */}
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1">
            <span className="text-gray-400 font-medium">Etapa:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-0 text-gray-700 dark:text-gray-300 font-semibold text-xs focus:ring-0 focus:outline-none pr-1"
            >
              <option value="all">Todas as Etapas</option>
              {CRM_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
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

          <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 font-semibold">
            {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'}
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. KANBAN VIEW COM AS 7 ETAPAS (Requisito 1) */}
      {/* ============================================================ */}
      {viewMode === 'kanban' && (
        <div className="flex flex-row gap-4 overflow-x-auto pb-6 items-start w-full">
          {CRM_STATUSES.map((status) => {
            const statusLeads = filteredLeads.filter((l) => l.status === status);
            const isColumnOver = dragOverColumn === status;

            return (
              <div
                key={status}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverColumn !== status) setDragOverColumn(status);
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  if (dragOverColumn === status) setDragOverColumn(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverColumn(null);
                  const leadId = e.dataTransfer.getData('leadId') || e.dataTransfer.getData('text/plain') || draggedLeadId;
                  if (leadId) {
                    const leadObj = leads.find((l) => l.id === leadId);
                    if (leadObj && leadObj.status !== status) {
                      handleUpdateStatus(leadObj.id, status);
                    }
                  }
                  setDraggedLeadId(null);
                }}
                className={cn(
                  'w-[300px] min-w-[300px] flex-shrink-0 bg-white dark:bg-gray-800 rounded-3xl p-3.5 border flex flex-col shadow-xs transition-all duration-150',
                  isColumnOver
                    ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/20 dark:bg-blue-950/20'
                    : 'border-gray-200 dark:border-gray-700'
                )}
              >
                {/* Cabeçalho da Coluna */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full',
                        status === 'Novo lead' && 'bg-blue-500',
                        status === 'Em contato' && 'bg-sky-500',
                        status === 'Qualificação' && 'bg-purple-500',
                        status === 'Proposta enviada' && 'bg-amber-500',
                        status === 'Em negociação' && 'bg-orange-500',
                        status === 'Fechado — ganho' && 'bg-emerald-500',
                        status === 'Perdido' && 'bg-rose-500'
                      )}
                    />
                    <h3 className="font-bold text-xs text-gray-800 dark:text-gray-200 tracking-wide">
                      {status}
                    </h3>
                  </div>
                  <span
                    className={cn(
                      'text-xs font-bold px-2 py-0.5 rounded-full transition-colors',
                      isColumnOver
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 dark:bg-gray-750 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    {statusLeads.length}
                  </span>
                </div>

                {/* Cards da Coluna */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[72vh] pr-0.5">
                  {isColumnOver && draggedLeadId && !statusLeads.some((l) => l.id === draggedLeadId) && (
                    <div className="p-3.5 rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50/50 text-blue-600 text-center text-xs font-semibold animate-pulse">
                      Soltar lead em &ldquo;{status}&rdquo;
                    </div>
                  )}

                  {statusLeads.map((lead) => (
                    <CRMLeadCard
                      key={lead.id}
                      lead={lead}
                      isDraggingThis={draggedLeadId === lead.id}
                      onDragStart={(e, l) => {
                        e.dataTransfer.setData('leadId', l.id);
                        e.dataTransfer.setData('text/plain', l.id);
                        e.dataTransfer.effectAllowed = 'move';
                        setDraggedLeadId(l.id);
                        dragStartTimeRef.current = Date.now();
                      }}
                      onDragEnd={() => {
                        setDraggedLeadId(null);
                        setDragOverColumn(null);
                        setTimeout(() => {
                          dragStartTimeRef.current = 0;
                        }, 150);
                      }}
                      onClick={(l) => {
                        if (dragStartTimeRef.current > 0 && Date.now() - dragStartTimeRef.current < 250) {
                          return;
                        }
                        setSelectedLead(l);
                      }}
                      onOpenWhatsApp={handleOpenWhatsApp}
                      onQuickContact={(l) => setQuickContactLead(l)}
                      onExecutePrimaryChannel={handleExecutePrimaryChannel}
                      onChangePrimaryChannel={handleChangePrimaryChannel}
                      onReactivate={(l) => setReactivateModalLead(l)}
                    />
                  ))}

                  {statusLeads.length === 0 && (
                    <div className="text-center py-8 text-xs text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                      Nenhum lead nesta etapa
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. LIST VIEW COM AS NOVAS ETAPAS E SELETORES */}
      {/* ============================================================ */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/70 dark:bg-gray-750 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-150 dark:border-gray-700">
                  <th className="py-3.5 px-4">Acompanhamento</th>
                  <th className="py-3.5 px-4">Contato / Empresa</th>
                  <th className="py-3.5 px-4">Cidade</th>
                  <th className="py-3.5 px-4">Área de Atuação</th>
                  <th className="py-3.5 px-4">Etapa do Funil</th>
                  <th className="py-3.5 px-4">Canal Principal</th>
                  <th className="py-3.5 px-4 text-right">Valor Estimado</th>
                  <th className="py-3.5 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-gray-800 dark:text-gray-200">
                {filteredLeads.map((lead) => (
                  <CRMLeadRow
                    key={lead.id}
                    lead={lead}
                    onClick={(l) => setSelectedLead(l)}
                    onOpenWhatsApp={handleOpenWhatsApp}
                    onQuickContact={(l) => setQuickContactLead(l)}
                    onExecutePrimaryChannel={handleExecutePrimaryChannel}
                    onChangePrimaryChannel={handleChangePrimaryChannel}
                    onReactivate={(l) => setReactivateModalLead(l)}
                  />
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      Nenhum lead encontrado com os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. REPORT VIEW COM OS INDICADORES DO FUNIL (Requisito 6) */}
      {/* ============================================================ */}
      {viewMode === 'report' && (
        <CRMReportView
          filteredLeads={filteredLeads}
          onSelectLead={(l) => setSelectedLead(l)}
          onViewModeChange={handleViewModeChange}
          isAnyFilterActive={isAnyFilterActive}
          onResetFilters={handleResetFilters}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL 1: DETALHES DO LEAD, LINHA DO TEMPO & CONTATOS */}
      {/* ============================================================ */}
      {selectedLead && (
        <CRMLeadDetailModal
          lead={selectedLead}
          isOpen={Boolean(selectedLead)}
          onClose={() => setSelectedLead(null)}
          onEditLead={(l) => {
            setSelectedLead(null);
            openEditLead(l);
          }}
          onUpdateStatus={handleUpdateStatus}
          onOpenWhatsApp={handleOpenWhatsApp}
          onExecutePrimaryChannel={handleExecutePrimaryChannel}
          onChangePrimaryChannel={handleChangePrimaryChannel}
          onReactivate={(l) => setReactivateModalLead(l)}
          showToast={showToast}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL 2: AÇÃO RÁPIDA "REGISTRAR CONTATO" (Requisito 3) */}
      {/* ============================================================ */}
      {quickContactLead && (
        <CRMQuickContactModal
          lead={quickContactLead}
          isOpen={Boolean(quickContactLead)}
          onClose={() => setQuickContactLead(null)}
          onSuccess={() => {
            fetchLeads();
            showToast('Contato registrado com sucesso!', 'success');
          }}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL 3: CADASTRAR DADO FALTANTE DO CANAL PRINCIPAL (Requisito 5) */}
      {/* ============================================================ */}
      {missingDataLead && (
        <CRMMissingDataModal
          lead={missingDataLead}
          isOpen={Boolean(missingDataLead)}
          onClose={() => setMissingDataLead(null)}
          onSuccess={() => {
            fetchLeads();
            showToast('Dados cadastrados com sucesso!', 'success');
          }}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL 4: REATIVAÇÃO EXPLÍCITA DE LEADS FECHADOS (Requisito 1) */}
      {/* ============================================================ */}
      {reactivateModalLead && (
        <CRMReactivateModal
          lead={reactivateModalLead}
          isOpen={Boolean(reactivateModalLead)}
          onClose={() => setReactivateModalLead(null)}
          onSuccess={(leadId, newStatus) => {
            fetchLeads();
            showToast(`Oportunidade reativada em "${newStatus}".`, 'success');
          }}
        />
      )}


      {/* ============================================================ */}
      {/* MODAL 6: WHATSAPP COM TEMPLATES DINÂMICOS */}
      {/* ============================================================ */}
      {whatsAppModalLead && (
        <ModalPortal>
          <div
            onClick={() => setWhatsAppModalLead(null)}
            className="fixed inset-0 !m-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-3xl max-w-lg w-full shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-700"
            >
              <div className="shrink-0 px-6 py-4 border-b border-gray-150 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <MessageCircle size={16} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Mensagem de WhatsApp
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Para: {whatsAppModalLead.contact_name} ({whatsAppModalLead.whatsapp || whatsAppModalLead.phone || 'Sem número'})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setWhatsAppModalLead(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                {/* Seleção de Template Pré-configurado */}
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                    <span>Modelos de Mensagem:</span>
                    <a
                      href="/settings?tab=whatsapp"
                      target="_blank"
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-normal"
                    >
                      Configurar modelos
                    </a>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {whatsAppTemplates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSelectTemplate(t.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-xl font-semibold text-xs transition-all border',
                          selectedTemplateId === t.id
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-gray-50 dark:bg-gray-750 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                        )}
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Caixa de Texto da Mensagem */}
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Texto Personalizado (com variáveis preenchidas):
                  </label>
                  <textarea
                    rows={5}
                    value={whatsAppCustomText}
                    onChange={(e) => setWhatsAppCustomText(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setWhatsAppModalLead(null)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    disabled={!whatsAppCustomText.trim()}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                  >
                    <Send size={14} />
                    <span>Abrir WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ============================================================ */}
      {/* MODAL 7: CADASTRAR LEAD (Requisito 1: entra em "Novo lead") */}
      {/* ============================================================ */}
      {showCreateModal && (
        <ModalPortal>
          <div
            onClick={() => setShowCreateModal(false)}
            className="fixed inset-0 !m-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-3xl max-w-xl w-full shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-700"
            >
              <div className="shrink-0 px-6 py-4 border-b border-gray-150 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Cadastrar Novo Lead
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Entrará automaticamente na etapa <strong>&ldquo;Novo lead&rdquo;</strong> do funil comercial.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg p-1.5"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateLead} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Nome do Contato *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Dra. Carolina Lima"
                        value={newLead.contact_name}
                        onChange={(e) => setNewLead({ ...newLead, contact_name: e.target.value })}
                        required
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Empresa / Marca
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Clínica Odontológica Lima"
                        value={newLead.company}
                        onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Canal Principal de Contato (Requisito 5)
                      </label>
                      <select
                        value={newLead.primary_channel}
                        onChange={(e) => setNewLead({ ...newLead, primary_channel: e.target.value as any })}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        {CRM_CHANNELS.map((ch) => (
                          <option key={ch} value={ch}>{ch}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        WhatsApp / Celular
                      </label>
                      <input
                        type="text"
                        placeholder="(11) 98765-4321"
                        value={newLead.whatsapp}
                        onChange={(e) => setNewLead({ ...newLead, whatsapp: e.target.value, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        E-mail
                      </label>
                      <input
                        type="email"
                        placeholder="contato@cliente.com"
                        value={newLead.email}
                        onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Cidade
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: São Paulo"
                        value={newLead.city}
                        onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Ramo de Atuação
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Odontologia, Arquitetura, Varejo"
                        value={newLead.segment}
                        onChange={(e) => setNewLead({ ...newLead, segment: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Valor Estimado (R$)
                      </label>
                      <input
                        type="number"
                        placeholder="0,00"
                        value={newLead.estimated_value || ''}
                        onChange={(e) => setNewLead({ ...newLead, estimated_value: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Observações Iniciais
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Informações relevantes sobre a demanda do prospecto..."
                      value={newLead.notes}
                      onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="shrink-0 p-4 border-t border-gray-150 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-150 dark:hover:bg-gray-700 rounded-xl font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-xs"
                  >
                    Salvar Lead
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ============================================================ */}
      {/* MODAL 8: EDITAR LEAD */}
      {/* ============================================================ */}
      {showEditModal && (
        <ModalPortal>
          <div
            onClick={() => setShowEditModal(false)}
            className="fixed inset-0 !m-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-3xl max-w-xl w-full shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-700"
            >
              <div className="shrink-0 px-6 py-4 border-b border-gray-150 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Editar Lead
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Atualize os dados cadastrais do prospecto.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg p-1.5"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateLead} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Nome do Contato *
                      </label>
                      <input
                        type="text"
                        value={editLead.contact_name}
                        onChange={(e) => setEditLead({ ...editLead, contact_name: e.target.value })}
                        required
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Empresa / Marca
                      </label>
                      <input
                        type="text"
                        value={editLead.company}
                        onChange={(e) => setEditLead({ ...editLead, company: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Etapa do Funil
                      </label>
                      <select
                        value={editLead.status}
                        onChange={(e) => setEditLead({ ...editLead, status: e.target.value as CRMLeadStatus })}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        {CRM_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Canal Principal de Contato (Requisito 5)
                      </label>
                      <select
                        value={editLead.primary_channel}
                        onChange={(e) => setEditLead({ ...editLead, primary_channel: e.target.value as any })}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        {CRM_CHANNELS.map((ch) => (
                          <option key={ch} value={ch}>{ch}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        WhatsApp / Celular
                      </label>
                      <input
                        type="text"
                        value={editLead.whatsapp}
                        onChange={(e) => setEditLead({ ...editLead, whatsapp: e.target.value, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        E-mail
                      </label>
                      <input
                        type="email"
                        value={editLead.email}
                        onChange={(e) => setEditLead({ ...editLead, email: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Cidade
                      </label>
                      <input
                        type="text"
                        value={editLead.city}
                        onChange={(e) => setEditLead({ ...editLead, city: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Ramo de Atuação
                      </label>
                      <input
                        type="text"
                        value={editLead.segment}
                        onChange={(e) => setEditLead({ ...editLead, segment: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Valor Estimado (R$)
                      </label>
                      <input
                        type="number"
                        value={editLead.estimated_value || ''}
                        onChange={(e) => setEditLead({ ...editLead, estimated_value: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Observações Internas
                    </label>
                    <textarea
                      rows={2}
                      value={editLead.notes}
                      onChange={(e) => setEditLead({ ...editLead, notes: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="shrink-0 p-4 border-t border-gray-150 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const l = leads.find((x) => x.id === editLead.id);
                      if (l) {
                        setShowEditModal(false);
                        handleDeleteLead(l);
                      }
                    }}
                    className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 size={13} />
                    <span>Excluir Lead</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-150 dark:hover:bg-gray-700 rounded-xl font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-xs"
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

      {/* Confirmação de exclusão */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev: any) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
