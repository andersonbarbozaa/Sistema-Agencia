'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Users,
  Plus,
  Search,
  Building,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  FileText,
  DollarSign,
  CheckSquare,
  FolderOpen,
  Calendar,
  X,
  Edit2,
  Archive,
  TrendingUp,
  Camera,
  Key,
  ShieldCheck,
  Copy,
  Check,
  Share2,
  Send,
  Eye,
  EyeOff,
  RefreshCw,
  Lock,
  MessageCircle,
  Trash2,
} from 'lucide-react';
import { Client } from '@/types';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import ConfirmModal from '@/components/ConfirmModal';
import ProfileAvatarUpload from '@/components/ProfileAvatarUpload';
import ModalPortal from '@/components/ModalPortal';

async function compressClientImage(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(ev.target?.result as string);
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, maxSize, maxSize);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = ev.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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

function parseSocialLinks(client: any): SocialLinkItem[] {
  if (!client) return [];
  if (client.social_links) {
    try {
      const parsed = typeof client.social_links === 'string' ? JSON.parse(client.social_links) : client.social_links;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((item: any) => item && item.value && String(item.value).trim());
      }
    } catch {
      // ignore
    }
  }
  const legacy: SocialLinkItem[] = [];
  if (client.instagram && String(client.instagram).trim()) {
    legacy.push({ network: 'Instagram', value: String(client.instagram).trim() });
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
  if (net.includes('twitter') || net.includes('x /') || net === 'x') {
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
    return digits ? `https://wa.me/${digits.length <= 11 ? '55' + digits : digits}` : `https://${val}`;
  }
  return `https://${val}`;
}

function getWhatsAppUrl(rawPhone: string): string {
  const digits = (rawPhone || '').replace(/\D/g, '');
  if (!digits) return '';
  return `https://wa.me/${digits.length <= 11 ? '55' + digits : digits}`;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'finance' | 'portal'>('overview');
  const [showPortalUserModal, setShowPortalUserModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [savingPortalUser, setSavingPortalUser] = useState(false);
  const [portalUserForm, setPortalUserForm] = useState({
    client_id: '',
    name: '',
    email: '',
    password: '',
    phone: '',
  });
  const [createdPortalUser, setCreatedPortalUser] = useState<any | null>(null);
  const [portalUsers, setPortalUsers] = useState<Record<string, any[]>>({});
  const [loadingPortalUsers, setLoadingPortalUsers] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [clientSummary, setClientSummary] = useState<any | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [confirmState, setConfirmState] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const createAvatarInputRef = useRef<HTMLInputElement>(null);
  const editAvatarInputRef = useRef<HTMLInputElement>(null);
  const detailAvatarInputRef = useRef<HTMLInputElement>(null);

  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'date_desc' | 'date_asc'>('name_asc');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'inativo' | 'arquivado'>('todos');

  // New Client Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    corporate_name: '',
    trade_name: '',
    avatar_url: '',
    document: '',
    email: '',
    password: '',
    phone: '',
    whatsapp: '',
    address: '',
    city: '',
    website: '',
    notes: '',
    social_links: [] as SocialLinkItem[],
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      // Fetch clients and users simultaneously to guarantee any client created in Usuários appears immediately
      const [clientsRes, usersRes] = await Promise.all([
        fetch('/api/clients').catch(() => null),
        fetch('/api/users?role=CLIENTE').catch(() => null),
      ]);

      let clientList: any[] = [];
      if (clientsRes && clientsRes.ok) {
        const data = await clientsRes.json();
        clientList = data.clients || data.data || [];
      }

      if (usersRes && usersRes.ok) {
        const uData = await usersRes.json();
        const clientUsers = (uData.users || uData.data || []).filter(
          (u: any) => String(u.role || '').toUpperCase() === 'CLIENTE'
        );
        for (const u of clientUsers) {
          const alreadyInList = clientList.some(
            (c) =>
              (u.client_id && c.id === u.client_id) ||
              (c.email && u.email && c.email.toLowerCase() === u.email.toLowerCase()) ||
              (c.name && u.name && c.name.toLowerCase() === u.name.toLowerCase())
          );
          if (!alreadyInList) {
            clientList.push({
              id: u.client_id || ('cli_' + u.id.replace(/^usr_/, '')),
              name: u.name,
              email: u.email,
              phone: u.phone,
              whatsapp: u.phone,
              avatar_url: u.avatar_url,
              status: u.status || 'ativo',
              created_at: u.created_at || new Date().toISOString(),
              updated_at: u.updated_at || new Date().toISOString(),
            });
          }
        }
      }

      setClients(clientList);
    } catch (err) {
      console.error('fetchClients error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    const handleOpenCreate = () => setShowCreateModal(true);
    window.addEventListener('open-create-client', handleOpenCreate);
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('new') === 'true') {
      setShowCreateModal(true);
    }
    return () => window.removeEventListener('open-create-client', handleOpenCreate);
  }, []);

  const fetchPortalUsers = async (clientId: string) => {
    try {
      setLoadingPortalUsers(true);
      const res = await fetch('/api/clients/portal-user?client_id=' + clientId);
      if (res.ok) {
        const json = await res.json();
        setPortalUsers((prev) => ({ ...prev, [clientId]: json.users || [] }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPortalUsers(false);
    }
  };

  const openCreatePortalUserModal = (clientId?: string) => {
    const targetClient = clientId
      ? clients.find((c) => c.id === clientId)
      : (selectedClient || (clients.length > 0 ? clients[0] : null));
    const randomPass = Math.random().toString(36).slice(-8) + 'A1!';
    setPortalUserForm({
      client_id: targetClient?.id || '',
      name: targetClient?.name ? 'Contato - ' + targetClient.name : '',
      email: targetClient?.email || '',
      password: randomPass,
      phone: targetClient?.whatsapp || targetClient?.phone || '',
    });
    setShowPassword(false);
    setShowPortalUserModal(true);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPortalUserForm((prev) => ({ ...prev, password: pwd }));
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleCreatePortalUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalUserForm.client_id || !portalUserForm.email || !portalUserForm.password) {
      alert('Preencha o cliente, e-mail e senha.');
      return;
    }
    try {
      setSavingPortalUser(true);
      const res = await fetch('/api/clients/portal-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portalUserForm),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao criar acesso de cliente.');
        return;
      }
      setCreatedPortalUser(data);
      setShowPortalUserModal(false);
      if (portalUserForm.client_id) {
        fetchPortalUsers(portalUserForm.client_id);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao processar requisição.');
    } finally {
      setSavingPortalUser(false);
    }
  };

  const openClientDetails = async (client: Client) => {
    setSelectedClient(client);
    setActiveTab('overview');
    fetchPortalUsers(client.id);
    try {
      setLoadingSummary(true);
      const res = await fetch(`/api/clients/${client.id}/summary`);
      if (res.ok) {
        const json = await res.json();
        const d = json.data || json;
        setClientSummary({
          ...d,
          total_revenue: d.revenue?.total ?? d.total_revenue ?? 0,
          received_revenue: Math.max(0, (d.revenue?.total ?? 0) - (d.revenue?.pending ?? 0)),
          pending_revenue: d.revenue?.pending ?? d.pending_revenue ?? 0,
          active_contracts_count: d.active_contracts?.length ?? d.active_contracts_count ?? 0,
          total_tasks: d.tasks?.total ?? d.total_tasks ?? 0,
          pending_tasks: d.tasks?.pending ?? d.pending_tasks ?? 0,
          completed_tasks: d.tasks?.completed ?? d.completed_tasks ?? 0,
          active_projects: d.projects?.active ?? d.active_projects ?? 0,
          recent_transactions: d.recent_transactions ?? [],
          active_contracts: d.active_contracts ?? [],
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name) return;

    try {
      const payload: any = {
        ...newClient,
        social_links: JSON.stringify(newClient.social_links),
      };
      const firstIg = newClient.social_links.find((s) => s.network.toLowerCase().includes('instagram'));
      if (firstIg) payload.instagram = firstIg.value;

      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewClient({
          name: '',
          corporate_name: '',
          trade_name: '',
          avatar_url: '',
          document: '',
          email: '',
          password: '',
          phone: '',
          whatsapp: '',
          address: '',
          city: '',
          website: '',
          notes: '',
          social_links: [],
        });
        fetchClients();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Erro ao criar cliente. Verifique se você tem permissões de administrador.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro de conexão ao criar cliente.');
    }
  };

  // Edit Client Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editClient, setEditClient] = useState({
    name: '',
    corporate_name: '',
    trade_name: '',
    avatar_url: '',
    document: '',
    email: '',
    password: '',
    phone: '',
    whatsapp: '',
    address: '',
    city: '',
    website: '',
    status: 'ativo',
    notes: '',
    social_links: [] as SocialLinkItem[],
  });

  const openEditModal = (client: any) => {
    setEditClient({
      name: client.name || '',
      corporate_name: client.corporate_name || '',
      trade_name: client.trade_name || '',
      avatar_url: client.avatar_url || '',
      document: client.document || '',
      email: client.email || '',
      password: '',
      phone: client.phone || '',
      whatsapp: client.whatsapp || '',
      address: client.address || '',
      city: client.city || '',
      website: client.website || '',
      status: client.status || 'ativo',
      notes: client.notes || '',
      social_links: parseSocialLinks(client),
    });
    setShowEditPassword(false);
    setShowEditModal(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !editClient.name) return;

    try {
      const payload: any = {
        ...editClient,
        social_links: JSON.stringify(editClient.social_links),
      };
      const firstIg = editClient.social_links.find((s) => s.network.toLowerCase().includes('instagram'));
      if (firstIg) payload.instagram = firstIg.value;

      const res = await fetch(`/api/clients/${selectedClient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowEditModal(false);
        const updated = await res.json();
        setSelectedClient({ ...selectedClient, ...(updated.data || payload) });
        fetchClients();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao atualizar cliente.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchiveClient = async () => {
    if (!selectedClient) return;
    
    setConfirmState({
      isOpen: true,
      title: 'Arquivar Cliente',
      message: `Deseja realmente arquivar o cliente "${selectedClient.name}"?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/clients/${selectedClient.id}`, {
            method: 'DELETE',
          });

          if (res.ok) {
            setShowEditModal(false);
            setSelectedClient(null);
            fetchClients();
          } else {
            const err = await res.json();
            alert(err.error || 'Erro ao arquivar cliente.');
          }
        } catch (err) {
          console.error(err);
        } finally {
          setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const filteredClients = clients
    .filter((c) => {
      if (statusFilter !== 'todos') {
        const clientStatus = (c.status || 'ativo').toLowerCase();
        if (clientStatus !== statusFilter) return false;
      }
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.trade_name && c.trade_name.toLowerCase().includes(q)) ||
        (c.corporate_name && c.corporate_name.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'pt-BR');
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name, 'pt-BR');
      if (sortBy === 'date_desc') {
        return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
      }
      return 0;
    });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Search & Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, razão social ou cidade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-700 font-semibold px-2.5 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="arquivado">Arquivado</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium">Organizar por:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-700 font-semibold px-2.5 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name_asc">Nome (A-Z)</option>
              <option value="name_desc">Nome (Z-A)</option>
              <option value="date_desc">Mais recente</option>
              <option value="date_asc">Mais antigo</option>
            </select>
          </div>

          <span className="text-xs text-gray-400 font-medium ml-2">
            {filteredClients.length} cadastrados
          </span>
        </div>
      </div>

      {/* Clients Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-gray-500 bg-white rounded-2xl border border-gray-200">
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Carregando clientes...
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <Users size={36} className="mx-auto text-gray-400 mb-2" />
          <h4 className="font-bold text-sm text-gray-800">Nenhum cliente cadastrado</h4>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Cadastre um novo cliente ou adicione usuários com perfil de Cliente em Usuários para exibi-los aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              onClick={() => openClientDetails(client)}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  {client.avatar_url ? (
                    <img
                      src={client.avatar_url}
                      alt={client.name}
                      className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0 shadow-xs"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base flex-shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    client.status === 'inativo'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : client.status === 'arquivado'
                      ? 'bg-gray-100 text-gray-600 border-gray-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {client.status || 'Ativo'}
                  </span>
                </div>

                <h3 className="font-bold text-base text-gray-900 group-hover:text-blue-600 transition-colors">
                  {client.name}
                </h3>
                {client.corporate_name && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{client.corporate_name}</p>
                )}

                <div className="mt-4 space-y-1.5 text-xs text-gray-600">
                  {client.city && (
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                      <span>{client.city}{client.state ? ` - ${client.state}` : ''}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-gray-400 flex-shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.whatsapp && (
                    <div className="flex items-center gap-2">
                      <MessageCircle size={13} className="text-emerald-500 flex-shrink-0" />
                      <a
                        href={getWhatsAppUrl(client.whatsapp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="hover:underline text-emerald-700 font-medium"
                        title="Abrir WhatsApp para enviar mensagem"
                      >
                        {client.whatsapp}
                      </a>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={13} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* CLIENT DETAIL TABS MODAL (Requisito 37)                   */}
      {/* ======================================================== */}
      {selectedClient && (
        <ModalPortal>
          <div
            onClick={() => setSelectedClient(null)}
            className="fixed inset-0 !m-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <ProfileAvatarUpload
                    value={selectedClient.avatar_url}
                    fallbackText={selectedClient.name}
                    alt={selectedClient.name}
                    size="md"
                    onChange={async (dataUrl) => {
                      try {
                        const res = await fetch(`/api/clients/${selectedClient.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ avatar_url: dataUrl }),
                        });
                        if (res.ok) {
                          setSelectedClient({ ...selectedClient, avatar_url: dataUrl });
                          fetchClients();
                        }
                      } catch (err) {
                        console.error('Erro ao atualizar foto do cliente:', err);
                      }
                    }}
                  />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedClient.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      CNPJ/CPF: {selectedClient.document || 'Não informado'} • {selectedClient.city} - {selectedClient.state}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {selectedClient.email && (
                    <button
                      type="button"
                      onClick={() => {
                        const url = window.location.origin + '/login?portal=cliente';
                        handleCopy(url, 'modalLoginLink');
                      }}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Copiar link direto para o cliente fazer login no portal"
                    >
                      <Key size={13} />
                      <span>{copiedText === 'modalLoginLink' ? 'Link Copiado!' : 'Link de Login'}</span>
                    </button>
                  )}
                  <span
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-bold capitalize',
                      (selectedClient.status || 'Ativo').toLowerCase() === 'bloqueado'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : (selectedClient.status || 'Ativo').toLowerCase() === 'inativo'
                        ? 'bg-gray-100 text-gray-700 border border-gray-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    )}
                  >
                    {selectedClient.status || 'Ativo'}
                  </span>
                  <button
                    onClick={() => setSelectedClient(null)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Fechar"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 px-6 gap-6 bg-white text-xs font-semibold">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 border-b-2 transition-colors ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
              >
                Visão Geral
              </button>
              <button
                onClick={() => setActiveTab('finance')}
                className={`py-3 border-b-2 transition-colors ${activeTab === 'finance' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
              >
                Faturamento & Financeiro
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`py-3 border-b-2 transition-colors ${activeTab === 'tasks' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
              >
                Tarefas
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-6 overflow-y-auto flex-1 text-xs">
              {/* TAB 1: VISÃO GERAL */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 font-medium">Nome Fantasia:</span>
                      <p className="font-semibold text-gray-800 mt-1">{selectedClient.trade_name || selectedClient.name}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 font-medium">Telefone:</span>
                      <p className="font-semibold text-gray-800 mt-1">{selectedClient.phone || '-'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 font-medium">WhatsApp:</span>
                      {selectedClient.whatsapp ? (
                        <div className="flex items-center gap-2 mt-1">
                          <p className="font-semibold text-gray-800">{selectedClient.whatsapp}</p>
                          <a
                            href={getWhatsAppUrl(selectedClient.whatsapp)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold text-[11px] transition-colors"
                            title="Abrir WhatsApp para enviar mensagem"
                          >
                            <MessageCircle size={12} />
                            <span>Conversar</span>
                          </a>
                        </div>
                      ) : (
                        <p className="font-semibold text-gray-800 mt-1">-</p>
                      )}
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 font-medium">E-mail Comercial:</span>
                      <p className="font-semibold text-gray-800 mt-1 truncate">{selectedClient.email || '-'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 font-medium">Endereço:</span>
                      <p className="font-semibold text-gray-800 mt-1">{selectedClient.address || '-'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 font-medium">Website:</span>
                      <p className="font-semibold text-blue-600 mt-1 truncate">
                        {selectedClient.website ? (
                          <a href={selectedClient.website} target="_blank" rel="noreferrer" className="hover:underline">
                            {selectedClient.website}
                          </a>
                        ) : '-'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl col-span-2 sm:col-span-3">
                      <span className="text-gray-400 font-medium block mb-1">Redes Sociais:</span>
                      {parseSocialLinks(selectedClient).length === 0 ? (
                        <p className="font-semibold text-gray-400 italic">Nenhuma rede social configurada</p>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {parseSocialLinks(selectedClient).map((social, sIdx) => (
                            <a
                              key={sIdx}
                              href={buildSocialUrl(social.network, social.value)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 hover:border-blue-400 rounded-lg text-xs font-semibold text-gray-700 hover:text-blue-600 transition-colors shadow-2xs"
                            >
                              <ExternalLink size={11} className="text-gray-400" />
                              <span className="text-gray-500 font-medium">{social.network}:</span>
                              <span>{social.value}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedClient.notes && (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <span className="font-bold text-gray-700 uppercase tracking-wider block mb-1">Observações do Cliente:</span>
                      <p className="text-gray-600 leading-relaxed">{selectedClient.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: FINANCEIRO (Requisito 30) */}
              {activeTab === 'finance' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 font-medium">Faturamento Total:</span>
                      <p className="text-base font-bold text-gray-900 mt-1">
                        {formatCurrency(clientSummary?.total_revenue || 0)}
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl">
                      <span className="text-emerald-700 font-medium">Total Recebido:</span>
                      <p className="text-base font-bold text-emerald-700 mt-1">
                        {formatCurrency(clientSummary?.received_revenue || 0)}
                      </p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl">
                      <span className="text-amber-700 font-medium">Pendente:</span>
                      <p className="text-base font-bold text-amber-700 mt-1">
                        {formatCurrency(clientSummary?.pending_revenue || 0)}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <span className="text-blue-700 font-medium">Contratos Ativos:</span>
                      <p className="text-base font-bold text-blue-700 mt-1">
                        {clientSummary?.active_contracts_count || 0}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-800 mb-2">Últimas Transações Financeiras</h4>
                    <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                      {!clientSummary?.recent_transactions || clientSummary.recent_transactions.length === 0 ? (
                        <p className="p-4 text-center text-gray-400">Nenhuma transação recente encontrada.</p>
                      ) : (
                        clientSummary.recent_transactions.map((tr: any) => (
                          <div key={tr.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                            <div>
                              <p className="font-semibold text-gray-800">{tr.description}</p>
                              <p className="text-[11px] text-gray-400">Vencimento: {formatDate(tr.due_date)}</p>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${tr.type === 'Entrada' ? 'text-emerald-600' : 'text-red-600'}`}>
                                {formatCurrency(tr.amount)}
                              </p>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tr.status === 'Pago' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {tr.status}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: ACESSO AO PORTAL */}
              {activeTab === 'portal' && (
                <div className="space-y-5">
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-indigo-600 text-white rounded-lg">
                          <ShieldCheck size={16} />
                        </span>
                        <h4 className="font-bold text-sm text-gray-900">Portal Exclusivo do Cliente</h4>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 max-w-xl">
                        Os usuários cadastrados abaixo possuem login próprio e permissão restrita para visualizar, aprovar, reprovar, solicitar alterações e comentar nas tarefas vinculadas a <strong>{selectedClient.name}</strong>.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openCreatePortalUserModal(selectedClient.id)}
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex-shrink-0"
                    >
                      <Plus size={14} />
                      <span>Novo Acesso</span>
                    </button>
                  </div>

                  {loadingPortalUsers ? (
                    <div className="p-8 text-center text-xs text-gray-500">
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Carregando acessos do portal...
                    </div>
                  ) : !portalUsers[selectedClient.id] || portalUsers[selectedClient.id].length === 0 ? (
                    <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center">
                      <Key size={32} className="mx-auto text-gray-400 mb-2" />
                      <h5 className="font-bold text-sm text-gray-800">Nenhum acesso criado ainda</h5>
                      <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                        Crie um login com e-mail e senha para que seu cliente possa acompanhar entregas e aprovar conteúdos diretamente pelo portal.
                      </p>
                      <button
                        type="button"
                        onClick={() => openCreatePortalUserModal(selectedClient.id)}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all"
                      >
                        <Plus size={14} />
                        <span>Cadastrar Primeiro Acesso</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Usuários com Acesso ({portalUsers[selectedClient.id].length})
                        </span>
                      </div>

                      <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden bg-white">
                        {portalUsers[selectedClient.id].map((user: any) => (
                          <div key={user.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                                {user.name?.charAt(0).toUpperCase() || 'C'}
                              </div>
                              <div>
                                <h5 className="font-bold text-sm text-gray-900">{user.name}</h5>
                                <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                  <span>{user.email}</span>
                                  {user.phone && <span>• {user.phone}</span>}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                              <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-[10px] font-bold">
                                CLIENTE (Portal)
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const url = window.location.origin + '/login?portal=cliente';
                                  handleCopy(url, 'link-' + user.id);
                                }}
                                className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                title="Copiar link direto de login"
                              >
                                {copiedText === ('link-' + user.id) ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                <span>{copiedText === ('link-' + user.id) ? 'Copiado!' : 'Copiar Link'}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: TAREFAS */}
              {activeTab === 'tasks' && (
                <div>
                  <h4 className="font-bold text-gray-800 mb-3">Tarefas deste Cliente</h4>
                  <p className="text-gray-500">Total de tarefas cadastradas: {clientSummary?.total_tasks || 0}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-xs transition-colors"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => openEditModal(selectedClient)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <Edit2 size={15} />
                <span>Editar Cliente</span>
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
      )}

      {/* ======================================================== */}
      {/* MODAL: CRIAR NOVO CLIENTE                                */}
      {/* ======================================================== */}
      {showCreateModal && (
        <ModalPortal>
          <div
            onClick={() => setShowCreateModal(false)}
            className="fixed inset-0 !m-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            >
              {/* Header Fixo */}
              <div className="shrink-0 p-5 border-b border-gray-100 flex items-center justify-between bg-white">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Users size={18} className="text-blue-600" />
                    Cadastrar Novo Cliente
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Insira as informações cadastrais e dados de acesso do cliente.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form com Corpo Rolável e Rodapé Fixo */}
              <form onSubmit={handleCreateClient} className="flex flex-col flex-1 overflow-hidden min-h-0">
                {/* Corpo Rolável */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {/* Foto / Avatar Circular */}
                  <div className="flex items-center gap-3.5 pb-2 border-b border-gray-100">
                    <ProfileAvatarUpload
                      value={newClient.avatar_url}
                      fallbackText={newClient.name}
                      alt={newClient.name || 'Cliente'}
                      size="md"
                      onChange={(dataUrl) => setNewClient((prev) => ({ ...prev, avatar_url: dataUrl }))}
                    />
                    <div>
                      <p className="text-xs font-semibold text-gray-800">Foto / Logo do Cliente</p>
                      <p className="text-[11px] text-gray-400">Clique na câmera para enviar uma imagem de identificação.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Nome Principal / Fantasia *</label>
                      <input
                        type="text"
                        placeholder="Ex: Conscape Construtora"
                        value={newClient.name}
                        onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                        required
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Razão Social</label>
                      <input
                        type="text"
                        placeholder="Ex: Conscape Construções LTDA"
                        value={newClient.corporate_name}
                        onChange={(e) => setNewClient({ ...newClient, corporate_name: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">CPF ou CNPJ</label>
                      <input
                        type="text"
                        placeholder="00.000.000/0001-00"
                        value={newClient.document}
                        onChange={(e) => setNewClient({ ...newClient, document: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">E-mail Comercial / Login</label>
                      <input
                        type="email"
                        placeholder="contato@empresa.com"
                        value={newClient.email}
                        onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Utilizado para login no portal e listado em Usuários.</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-gray-700">Senha de Acesso ao Portal</label>
                        <button
                          type="button"
                          onClick={() => {
                            const pass = Math.random().toString(36).slice(-8) + 'A1!';
                            setNewClient((prev) => ({ ...prev, password: pass }));
                            setShowCreatePassword(true);
                          }}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                        >
                          <RefreshCw size={11} />
                          <span>Gerar Senha</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showCreatePassword ? 'text' : 'password'}
                          value={newClient.password}
                          onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
                          placeholder="Digite ou gere uma senha para o cliente"
                          className="w-full pl-3 pr-10 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCreatePassword(!showCreatePassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                        >
                          {showCreatePassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">O cliente é cadastrado automaticamente com a permissão CLIENTE.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Telefone</label>
                      <input
                        type="text"
                        placeholder="(18) 3333-3333"
                        value={newClient.phone}
                        onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">WhatsApp</label>
                      <input
                        type="text"
                        placeholder="(18) 99999-9999"
                        value={newClient.whatsapp}
                        onChange={(e) => setNewClient({ ...newClient, whatsapp: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Cidade</label>
                      <input
                        type="text"
                        placeholder="Araçatuba"
                        value={newClient.city}
                        onChange={(e) => setNewClient({ ...newClient, city: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Endereço</label>
                      <input
                        type="text"
                        placeholder="Rua Exemplo, 123 - Centro"
                        value={newClient.address}
                        onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Website</label>
                      <input
                        type="text"
                        placeholder="https://exemplo.com.br"
                        value={newClient.website}
                        onChange={(e) => setNewClient({ ...newClient, website: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Redes Sociais Dinâmicas */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold text-gray-700">Redes Sociais</label>
                      <button
                        type="button"
                        onClick={() =>
                          setNewClient((prev) => ({
                            ...prev,
                            social_links: [...prev.social_links, { network: 'Instagram', value: '' }],
                          }))
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-semibold text-xs transition-colors"
                      >
                        <Plus size={13} />
                        <span>Adicionar Rede Social</span>
                      </button>
                    </div>

                    {newClient.social_links.length === 0 ? (
                      <p className="text-gray-400 italic text-[11px] bg-gray-50 p-3 rounded-xl border border-dashed border-gray-200">
                        Nenhuma rede social adicionada. Clique em &ldquo;Adicionar Rede Social&rdquo; para incluir.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {newClient.social_links.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <select
                              value={item.network}
                              onChange={(e) => {
                                const updated = [...newClient.social_links];
                                updated[idx] = { ...updated[idx], network: e.target.value };
                                setNewClient({ ...newClient, social_links: updated });
                              }}
                              className="px-2.5 py-2 border border-gray-300 rounded-xl bg-gray-50 font-semibold text-gray-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none shrink-0"
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
                                const updated = [...newClient.social_links];
                                updated[idx] = { ...updated[idx], value: e.target.value };
                                setNewClient({ ...newClient, social_links: updated });
                              }}
                              className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = newClient.social_links.filter((_, i) => i !== idx);
                                setNewClient({ ...newClient, social_links: updated });
                              }}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                              title="Remover rede social"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Observações Internas</label>
                    <textarea
                      rows={2}
                      placeholder="Informações relevantes do cliente..."
                      value={newClient.notes}
                      onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                      className="w-full p-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Rodapé Fixo */}
                <div className="shrink-0 p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm transition-colors"
                  >
                    Salvar Cliente
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ======================================================== */}
      {/* EDIT CLIENT MODAL                                         */}
      {/* ======================================================== */}
      {showEditModal && (
        <ModalPortal>
          <div
            onClick={() => setShowEditModal(false)}
            className="fixed inset-0 !m-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            >
              {/* Header Fixo */}
              <div className="shrink-0 p-5 border-b border-gray-100 flex items-center justify-between bg-white">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Edit2 size={18} className="text-blue-600" />
                  Editar Cliente
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form com Corpo Rolável e Rodapé Fixo */}
              <form onSubmit={handleUpdateClient} className="flex flex-col flex-1 overflow-hidden min-h-0">
                {/* Corpo Rolável */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {/* Foto / Logo do Cliente */}
                  <div className="flex items-center gap-4 pb-2 border-b border-gray-100">
                    <ProfileAvatarUpload
                      value={editClient.avatar_url}
                      fallbackText={editClient.name}
                      alt={editClient.name || 'Cliente'}
                      size="md"
                      onChange={(dataUrl) => setEditClient((prev) => ({ ...prev, avatar_url: dataUrl }))}
                    />
                    <div>
                      <p className="text-xs font-semibold text-gray-800">Foto / Logo do Perfil do Cliente</p>
                      <p className="text-[11px] text-gray-400">Clique na câmera para alterar a foto do perfil.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Nome Fantasia / Principal *</label>
                      <input
                        type="text"
                        required
                        value={editClient.name}
                        onChange={(e) => setEditClient({ ...editClient, name: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Razão Social</label>
                      <input
                        type="text"
                        value={editClient.corporate_name}
                        onChange={(e) => setEditClient({ ...editClient, corporate_name: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">CPF ou CNPJ</label>
                      <input
                        type="text"
                        value={editClient.document}
                        onChange={(e) => setEditClient({ ...editClient, document: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                      <select
                        value={editClient.status}
                        onChange={(e) => setEditClient({ ...editClient, status: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                        <option value="arquivado">Arquivado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">E-mail de Login do Cliente</label>
                      <input
                        type="email"
                        value={editClient.email}
                        onChange={(e) => setEditClient({ ...editClient, email: e.target.value })}
                        placeholder="email@cliente.com"
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Utilizado para login no portal e listado em Usuários.</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-gray-700">Senha de Acesso ao Portal</label>
                        <button
                          type="button"
                          onClick={() => {
                            const pass = Math.random().toString(36).slice(-8) + 'A1!';
                            setEditClient((prev) => ({ ...prev, password: pass }));
                            setShowEditPassword(true);
                          }}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                        >
                          <RefreshCw size={11} />
                          <span>Gerar Senha</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showEditPassword ? 'text' : 'password'}
                          value={editClient.password}
                          onChange={(e) => setEditClient({ ...editClient, password: e.target.value })}
                          placeholder="Deixe em branco para manter a atual"
                          className="w-full pl-3 pr-10 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                        >
                          {showEditPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Ao definir senha, ela é sincronizada automaticamente em Usuários.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Telefone</label>
                      <input
                        type="text"
                        placeholder="(18) 3333-3333"
                        value={editClient.phone}
                        onChange={(e) => setEditClient({ ...editClient, phone: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">WhatsApp</label>
                      <input
                        type="text"
                        placeholder="(18) 99999-9999"
                        value={editClient.whatsapp}
                        onChange={(e) => setEditClient({ ...editClient, whatsapp: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Cidade</label>
                      <input
                        type="text"
                        placeholder="Araçatuba"
                        value={editClient.city}
                        onChange={(e) => setEditClient({ ...editClient, city: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Endereço</label>
                      <input
                        type="text"
                        placeholder="Rua Exemplo, 123 - Centro"
                        value={editClient.address}
                        onChange={(e) => setEditClient({ ...editClient, address: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Website</label>
                      <input
                        type="text"
                        placeholder="https://exemplo.com.br"
                        value={editClient.website}
                        onChange={(e) => setEditClient({ ...editClient, website: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Redes Sociais Dinâmicas */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold text-gray-700">Redes Sociais</label>
                      <button
                        type="button"
                        onClick={() =>
                          setEditClient((prev) => ({
                            ...prev,
                            social_links: [...prev.social_links, { network: 'Instagram', value: '' }],
                          }))
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-semibold text-xs transition-colors"
                      >
                        <Plus size={13} />
                        <span>Adicionar Rede Social</span>
                      </button>
                    </div>

                    {editClient.social_links.length === 0 ? (
                      <p className="text-gray-400 italic text-[11px] bg-gray-50 p-3 rounded-xl border border-dashed border-gray-200">
                        Nenhuma rede social adicionada. Clique em &ldquo;Adicionar Rede Social&rdquo; para incluir.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {editClient.social_links.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <select
                              value={item.network}
                              onChange={(e) => {
                                const updated = [...editClient.social_links];
                                updated[idx] = { ...updated[idx], network: e.target.value };
                                setEditClient({ ...editClient, social_links: updated });
                              }}
                              className="px-2.5 py-2 border border-gray-300 rounded-xl bg-gray-50 font-semibold text-gray-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none shrink-0"
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
                                const updated = [...editClient.social_links];
                                updated[idx] = { ...updated[idx], value: e.target.value };
                                setEditClient({ ...editClient, social_links: updated });
                              }}
                              className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = editClient.social_links.filter((_, i) => i !== idx);
                                setEditClient({ ...editClient, social_links: updated });
                              }}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                              title="Remover rede social"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Observações Internas</label>
                    <textarea
                      rows={2}
                      value={editClient.notes}
                      onChange={(e) => setEditClient({ ...editClient, notes: e.target.value })}
                      className="w-full p-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Rodapé Fixo */}
                <div className="shrink-0 p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleArchiveClient}
                    className="px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-100/70 rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <Archive size={14} />
                    Arquivar Cliente
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm transition-colors"
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

      {/* MODAL: CRIAR ACESSO AO PORTAL */}
      {showPortalUserModal && (
        <ModalPortal>
          <div
            onClick={() => setShowPortalUserModal(false)}
            className="fixed inset-0 !m-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Key size={16} className="text-indigo-600" />
                    Novo Acesso ao Portal
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Crie credenciais de login para seu cliente.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPortalUserModal(false)}
                  className="text-gray-400 hover:text-gray-600 rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreatePortalUser} className="p-5 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nome do Contato</label>
                  <input
                    type="text"
                    value={portalUserForm.name}
                    onChange={(e) => setPortalUserForm({ ...portalUserForm, name: e.target.value })}
                    placeholder="Ex: João da Silva"
                    required
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">E-mail de Login *</label>
                  <input
                    type="email"
                    value={portalUserForm.email}
                    onChange={(e) => setPortalUserForm({ ...portalUserForm, email: e.target.value })}
                    placeholder="cliente@empresa.com"
                    required
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">Senha Provisória *</label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                    >
                      <RefreshCw size={11} />
                      <span>Gerar Senha</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={portalUserForm.password}
                      onChange={(e) => setPortalUserForm({ ...portalUserForm, password: e.target.value })}
                      required
                      className="w-full pl-3 pr-10 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">WhatsApp / Telefone</label>
                  <input
                    type="text"
                    value={portalUserForm.phone}
                    onChange={(e) => setPortalUserForm({ ...portalUserForm, phone: e.target.value })}
                    placeholder="(18) 99999-9999"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowPortalUserModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingPortalUser}
                    className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-sm"
                  >
                    {savingPortalUser ? 'Criando...' : 'Criar Acesso'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL: SUCESSO AO CRIAR ACESSO */}
      {createdPortalUser && (
        <ModalPortal>
          <div
            onClick={() => setCreatedPortalUser(null)}
            className="fixed inset-0 !m-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Check size={24} />
              </div>
              <h4 className="font-bold text-base text-gray-900">Acesso Criado com Sucesso!</h4>
              <p className="text-xs text-gray-500 mt-1">
                Compartilhe as credenciais abaixo com o cliente para que ele possa acessar o portal.
              </p>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-left space-y-2.5 mt-4 text-xs font-mono">
                <div>
                  <span className="text-gray-400 font-sans block text-[11px]">Link de Acesso:</span>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-indigo-600 truncate">{typeof window !== 'undefined' ? window.location.origin : ''}/login?portal=cliente</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(window.location.origin + '/login?portal=cliente', 'createdLink')}
                      className="text-gray-500 hover:text-indigo-600 font-sans text-[11px] font-semibold flex items-center gap-1 shrink-0"
                    >
                      {copiedText === 'createdLink' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      <span>{copiedText === 'createdLink' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-gray-400 font-sans block text-[11px]">E-mail:</span>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-gray-800">{createdPortalUser.credentials?.email}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(createdPortalUser.credentials?.email || '', 'createdEmail')}
                      className="text-gray-500 hover:text-indigo-600 font-sans text-[11px] font-semibold flex items-center gap-1 shrink-0"
                    >
                      {copiedText === 'createdEmail' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      <span>{copiedText === 'createdEmail' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-gray-400 font-sans block text-[11px]">Senha:</span>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-gray-800">{createdPortalUser.credentials?.password}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(createdPortalUser.credentials?.password || '', 'createdPass')}
                      className="text-gray-500 hover:text-indigo-600 font-sans text-[11px] font-semibold flex items-center gap-1 shrink-0"
                    >
                      {copiedText === 'createdPass' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      <span>{copiedText === 'createdPass' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-5">
                {createdPortalUser.invite_message && (
                  <button
                    type="button"
                    onClick={() => handleCopy(createdPortalUser.invite_message, 'createdInvite')}
                    className="flex-1 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Share2 size={13} />
                    <span>{copiedText === 'createdInvite' ? 'Mensagem Copiada!' : 'Copiar Convite'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCreatedPortalUser(null)}
                  className="py-2 px-4 bg-gray-900 hover:bg-black text-white font-semibold rounded-xl text-xs transition-colors"
                >
                  Concluir
                </button>
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
        onCancel={() => setConfirmState((prev: any) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
