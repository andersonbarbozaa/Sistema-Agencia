'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Client } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'finance'>('overview');
  const [clientSummary, setClientSummary] = useState<any | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

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
    phone: '',
    whatsapp: '',
    address: '',
    city: '',
    state: '',
    website: '',
    instagram: '',
    notes: '',
  });

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || data.data || []);
      }
    } catch (err) {
      console.error(err);
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

  const openClientDetails = async (client: Client) => {
    setSelectedClient(client);
    setActiveTab('overview');
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
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
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
          phone: '',
          whatsapp: '',
          address: '',
          city: '',
          state: '',
          website: '',
          instagram: '',
          notes: '',
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
  const [editClient, setEditClient] = useState({
    name: '',
    corporate_name: '',
    trade_name: '',
    avatar_url: '',
    document: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    city: '',
    state: '',
    website: '',
    instagram: '',
    status: 'ativo',
    notes: '',
  });

  const openEditModal = (client: any) => {
    setEditClient({
      name: client.name || '',
      corporate_name: client.corporate_name || '',
      trade_name: client.trade_name || '',
      avatar_url: client.avatar_url || '',
      document: client.document || '',
      email: client.email || '',
      phone: client.phone || '',
      whatsapp: client.whatsapp || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      website: client.website || '',
      instagram: client.instagram || '',
      status: client.status || 'ativo',
      notes: client.notes || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !editClient.name) return;

    try {
      const res = await fetch(`/api/clients/${selectedClient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editClient),
      });

      if (res.ok) {
        setShowEditModal(false);
        const updated = await res.json();
        setSelectedClient({ ...selectedClient, ...(updated.data || editClient) });
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
    if (!confirm(`Deseja realmente arquivar o cliente "${selectedClient.name}"?`)) return;

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
    }
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
                    className="w-10 h-10 rounded-xl object-cover border border-gray-200 flex-shrink-0 shadow-xs"
                    onError={(e) => {
                      // Fallback if image fails to load
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base flex-shrink-0">
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
                {client.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-blue-600 font-semibold">
              <span>Abrir Ficha do Cliente</span>
              <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
            </div>
          </div>
        ))}
      </div>

      {/* ======================================================== */}
      {/* CLIENT DETAIL TABS MODAL (Requisito 37)                   */}
      {/* ======================================================== */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                {selectedClient.avatar_url ? (
                  <img
                    src={selectedClient.avatar_url}
                    alt={selectedClient.name}
                    className="w-12 h-12 rounded-2xl object-cover border border-gray-200 shadow-xs flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg flex-shrink-0">
                    {selectedClient.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-gray-900">{selectedClient.name}</h3>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">
                      {selectedClient.status || 'Ativo'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    CNPJ/CPF: {selectedClient.document || 'Não informado'} • {selectedClient.city} - {selectedClient.state}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(selectedClient)}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Edit2 size={14} />
                  Editar
                </button>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg"
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
                      <span className="text-gray-400 font-medium">WhatsApp / Telefone:</span>
                      <p className="font-semibold text-gray-800 mt-1">{selectedClient.whatsapp || selectedClient.phone || '-'}</p>
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
                      <span className="text-gray-400 font-medium">Instagram:</span>
                      <p className="font-semibold text-gray-800 mt-1">{selectedClient.instagram || '-'}</p>
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

              {/* TAB 3: TAREFAS */}
              {activeTab === 'tasks' && (
                <div>
                  <h4 className="font-bold text-gray-800 mb-3">Tarefas deste Cliente</h4>
                  <p className="text-gray-500">Total de tarefas cadastradas: {clientSummary?.total_tasks || 0}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedClient(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CRIAR NOVO CLIENTE                                */}
      {/* ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-1 pr-6">Cadastrar Novo Cliente</h3>
            <p className="text-xs text-gray-500 mb-4">Insira as informações cadastrais da empresa ou cliente.</p>

            <form onSubmit={handleCreateClient} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nome Principal *</label>
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Foto de Perfil / Logo (URL da Imagem)
                </label>
                <div className="flex items-center gap-3">
                  {newClient.avatar_url ? (
                    <img
                      src={newClient.avatar_url}
                      alt="Prévia"
                      className="w-9 h-9 rounded-xl object-cover border border-gray-200 shadow-xs flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-[10px] font-bold flex-shrink-0">
                      Foto
                    </div>
                  )}
                  <input
                    type="url"
                    placeholder="https://exemplo.com/logo.png"
                    value={newClient.avatar_url}
                    onChange={(e) => setNewClient({ ...newClient, avatar_url: e.target.value })}
                    className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(18) 99999-9999"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    placeholder="contato@empresa.com"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Estado</label>
                  <input
                    type="text"
                    placeholder="SP"
                    value={newClient.state}
                    onChange={(e) => setNewClient({ ...newClient, state: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Informações relevantes do cliente..."
                  value={newClient.notes}
                  onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                  className="w-full p-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* EDIT CLIENT MODAL                                         */}
      {/* ======================================================== */}
      {showEditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Edit2 size={18} className="text-blue-600" />
                Editar Cliente
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateClient} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Foto de Perfil / Logo (URL da Imagem)
                  </label>
                  <div className="flex items-center gap-3">
                    {editClient.avatar_url ? (
                      <img
                        src={editClient.avatar_url}
                        alt="Prévia"
                        className="w-10 h-10 rounded-xl object-cover border border-gray-200 shadow-xs flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs font-bold flex-shrink-0">
                        Foto
                      </div>
                    )}
                    <input
                      type="url"
                      placeholder="https://exemplo.com/logo.png"
                      value={editClient.avatar_url}
                      onChange={(e) => setEditClient({ ...editClient, avatar_url: e.target.value })}
                      className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">E-mail Principal</label>
                  <input
                    type="email"
                    value={editClient.email}
                    onChange={(e) => setEditClient({ ...editClient, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={editClient.phone}
                    onChange={(e) => setEditClient({ ...editClient, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={editClient.city}
                    onChange={(e) => setEditClient({ ...editClient, city: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={editClient.state}
                    onChange={(e) => setEditClient({ ...editClient, state: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={editClient.website}
                    onChange={(e) => setEditClient({ ...editClient, website: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Instagram (@)</label>
                  <input
                    type="text"
                    value={editClient.instagram}
                    onChange={(e) => setEditClient({ ...editClient, instagram: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Endereço Completo</label>
                <input
                  type="text"
                  value={editClient.address}
                  onChange={(e) => setEditClient({ ...editClient, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
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

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleArchiveClient}
                  className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Archive size={14} />
                  Arquivar Cliente
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
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
      )}
    </div>
  );
}
