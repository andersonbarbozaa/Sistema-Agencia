'use client';

import { useState, useEffect } from 'react';
import ConfirmModal from '@/components/ConfirmModal';
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
} from 'lucide-react';

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
import { CRMLead, CRMInteraction, CRMLeadStatus } from '@/types';
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

export default function CRMPage() {
  const [confirmState, setConfirmState] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'contact_name' | 'company' | 'status' | 'platform' | 'city' | 'last_activity_at'>('last_activity_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [interactions, setInteractions] = useState<CRMInteraction[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);

  const handleViewModeChange = (mode: 'kanban' | 'list') => {
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

  // Unsaved changes prompt modal (when clicking outside or X with modified fields)
  const [unsavedChangesModal, setUnsavedChangesModal] = useState<{
    isOpen: boolean;
    mode: 'edit' | 'create';
  }>({ isOpen: false, mode: 'edit' });

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
        if (savedMode === 'kanban' || savedMode === 'list') {
          setViewMode(savedMode);
        }
      } catch {
        // ignore
      }
    }
    fetchLeads();
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
    try {
      const res = await fetch(`/api/crm/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
        if (selectedLead?.id === leadId) {
          setSelectedLead({ ...selectedLead, status: newStatus });
        }
      }
    } catch (err) {
      console.error(err);
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

  const filteredLeads = leads
    .filter(l => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return l.contact_name.toLowerCase().includes(q) || (l.company && l.company.toLowerCase().includes(q));
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Actions & Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
        >
          <Plus size={16} className="stroke-[2.5]" />
          <span>Adicionar Novo Item</span>
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-700 font-semibold px-2.5 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os Status</option>
              {CRM_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <span className="text-xs text-gray-400 font-medium">
            {filteredLeads.length} leads
          </span>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => handleViewModeChange('kanban')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              )}
            >
              <Kanban size={14} /> Kanban
            </button>
            <button
              onClick={() => handleViewModeChange('list')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              )}
            >
              <List size={14} /> Lista
            </button>
          </div>
        </div>
      </div>

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <div className="flex flex-row gap-4 overflow-x-auto pb-6 items-start w-full">
          {CRM_STATUSES.map((status) => {
            const statusLeads = filteredLeads.filter(l => l.status === status);

            return (
              <div
                key={status}
                className="w-[280px] min-w-[280px] flex-shrink-0 bg-white rounded-2xl p-3.5 border border-gray-200 flex flex-col shadow-sm"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
                    {status}
                  </h3>
                  <span className="text-xs bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-full">
                    {statusLeads.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[70vh]">
                  {statusLeads.map((lead) => {
                    return (
                      <div
                        key={lead.id}
                        onClick={() => openLeadDetails(lead)}
                        className={cn(
                          'p-3.5 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer group bg-white',
                          lead.status === 'Finalizado positivo' ? 'border-emerald-300' :
                          lead.status === 'Finalizado negativo' ? 'border-gray-300 opacity-75' :
                          'border-gray-200'
                        )}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-xs text-gray-900 group-hover:text-blue-600 transition-colors">
                            {lead.contact_name}
                          </span>
                        </div>

                        {lead.company && (
                          <p className="text-[11px] text-gray-600 font-medium truncate">{lead.company}</p>
                        )}

                        {/* Inactivity Alert (>7 days - Requisito 34) */}
                        {lead.is_inactive && lead.status !== 'Finalizado positivo' && lead.status !== 'Finalizado negativo' && (
                          <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">
                            <Clock size={10} />
                            SEM RESPOSTA (+7d)
                          </div>
                        )}

                        <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                          <span>{lead.platform || 'WhatsApp'}</span>
                          <span>{lead.city || ''}</span>
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
                  <th
                    onClick={() => handleSort('city')}
                    className="py-3.5 px-4 cursor-pointer hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Cidade</span>
                      {sortField === 'city' ? (
                        sortDirection === 'asc' ? <ChevronUp size={14} className="text-blue-600" /> : <ChevronDown size={14} className="text-blue-600" />
                      ) : (
                        <ArrowUpDown size={12} className="opacity-40" />
                      )}
                    </div>
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
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
                        {l.platform || l.source || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700 font-medium">
                      {l.city || '-'}
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

      {/* LEAD DETAILS & TIMELINE MODAL (Requisito 35) */}
      {selectedLead && (
        <div
          onClick={() => setSelectedLead(null)}
          className="fixed inset-0 !mt-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
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
                  <span className="text-gray-400">Telefone / WhatsApp:</span>
                  <p className="font-semibold text-gray-800 mt-1">{selectedLead.whatsapp || selectedLead.phone || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400">E-mail:</span>
                  <p className="font-semibold text-gray-800 mt-1 truncate">{selectedLead.email || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400">Origem / Plataforma:</span>
                  <p className="font-semibold text-gray-800 mt-1">{selectedLead.platform || selectedLead.source || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400">Cidade:</span>
                  <p className="font-semibold text-gray-800 mt-1">{selectedLead.city || '-'}</p>
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
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div
          onClick={handleRequestCloseCreateModal}
          className="fixed inset-0 !mt-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
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
                    <label className="block font-semibold text-gray-700 mb-1">WhatsApp / Telefone</label>
                    <input
                      type="text"
                      placeholder="(18) 99999-9999"
                      value={newLead.whatsapp}
                      onChange={(e) => setNewLead({ ...newLead, whatsapp: e.target.value, phone: e.target.value })}
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

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Cidade</label>
                    <input
                      type="text"
                      placeholder="Ex: Araçatuba"
                      value={newLead.city}
                      onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Plataforma de Origem</label>
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
      )}

      {/* EDIT LEAD MODAL */}
      {showEditLeadModal && (
        <div
          onClick={handleRequestCloseEditModal}
          className="fixed inset-0 !mt-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
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
                    <label className="block font-semibold text-gray-700 mb-1">WhatsApp / Telefone</label>
                    <input
                      type="text"
                      value={editLead.phone}
                      onChange={(e) => setEditLead({ ...editLead, phone: e.target.value, whatsapp: e.target.value })}
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
                    <label className="block font-semibold text-gray-700 mb-1">Plataforma de Origem</label>
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

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={editLead.city}
                      onChange={(e) => setEditLead({ ...editLead, city: e.target.value })}
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
      )}

      {/* MODAL DE CONFIRMAÇÃO DE ALTERAÇÕES NÃO SALVAS */}
      {unsavedChangesModal.isOpen && (
        <div
          onClick={() => setUnsavedChangesModal((prev) => ({ ...prev, isOpen: false }))}
          className="fixed inset-0 !mt-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
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
