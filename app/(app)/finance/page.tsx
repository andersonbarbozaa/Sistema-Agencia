'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Filter,
  CheckCircle,
  Clock,
  Building,
  CreditCard,
  UserCheck,
  Search,
  Trash2,
  Edit2,
  Calendar,
  X,
  PieChart,
  BarChart3,
  Users,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Wallet,
} from 'lucide-react';
import { FinancialTransaction, BankAccount, FinancialCategory } from '@/types';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

export default function FinancePage() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [reportsData, setReportsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportYear, setReportYear] = useState(new Date().getFullYear().toString());

  // Navigation View: 'dashboard' | 'all' | 'entries' | 'exits' | 'partners' | 'reports'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'all' | 'entries' | 'exits' | 'partners' | 'reports'>('dashboard');

  // Filters for Transactions
  const [statusFilter, setStatusFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [searchQuery, setSearchQuery] = useState('');

  // New Transaction Modal
  const [showTransModal, setShowTransModal] = useState(false);
  const [newTrans, setNewTrans] = useState({
    description: '',
    amount: '',
    type: 'Saída',
    category_id: '',
    bank_account_id: '',
    client_id: '',
    partner_id: '',
    due_date: new Date().toISOString().split('T')[0],
    paid_at: '',
    status: 'Pendente',
    notes: '',
  });

  // Edit Transaction Modal
  const [editingTrans, setEditingTrans] = useState<FinancialTransaction | null>(null);
  const [editTransForm, setEditTransForm] = useState({
    description: '',
    amount: '',
    type: 'Saída',
    category_id: '',
    bank_account_id: '',
    client_id: '',
    partner_id: '',
    due_date: '',
    paid_at: '',
    status: 'Pendente',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transRes, accRes, sumRes, catRes, clientRes, usersRes, repRes] = await Promise.all([
        fetch('/api/finance'),
        fetch('/api/bank-accounts'),
        fetch('/api/finance/summary'),
        fetch('/api/finance/categories'),
        fetch('/api/clients'),
        fetch('/api/users'),
        fetch(`/api/finance/reports?year=${reportYear}`),
      ]);

      if (transRes.ok) {
        const d = await transRes.json();
        setTransactions(d.data || d.transactions || []);
      }
      if (accRes.ok) {
        const d = await accRes.json();
        setBankAccounts(d.data || d.accounts || []);
      }
      if (sumRes.ok) {
        const d = await sumRes.json();
        setSummary(d);
      }
      if (catRes.ok) {
        const d = await catRes.json();
        setCategories(d.data || d.categories || []);
      }
      if (clientRes.ok) {
        const d = await clientRes.json();
        setClients(d.clients || d.data || []);
      }
      if (usersRes.ok) {
        const d = await usersRes.json();
        setPartners(d.users || d.data || []);
      }
      if (repRes.ok) {
        const d = await repRes.json();
        setReportsData(d);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [reportYear]);

  useEffect(() => {
    const handleOpenCreate = () => setShowTransModal(true);
    window.addEventListener('open-create-transaction', handleOpenCreate);
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('new') === 'true') {
      setShowTransModal(true);
    }
    return () => window.removeEventListener('open-create-transaction', handleOpenCreate);
  }, []);

  // Create Transaction
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrans.description || !newTrans.amount) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTrans,
          amount: parseFloat(newTrans.amount),
          paid_at: newTrans.status === 'Pago' ? (newTrans.paid_at || newTrans.due_date) : null,
        }),
      });

      if (res.ok) {
        setShowTransModal(false);
        setNewTrans({
          description: '',
          amount: '',
          type: 'Saída',
          category_id: '',
          bank_account_id: '',
          client_id: '',
          partner_id: '',
          due_date: new Date().toISOString().split('T')[0],
          paid_at: '',
          status: 'Pendente',
          notes: '',
        });
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao criar lançamento.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Transaction
  const openEditTransaction = (tx: FinancialTransaction) => {
    setEditingTrans(tx);
    setEditTransForm({
      description: tx.description || '',
      amount: String(tx.amount || ''),
      type: tx.type || 'Saída',
      category_id: tx.category_id || '',
      bank_account_id: tx.bank_account_id || '',
      client_id: tx.client_id || '',
      partner_id: tx.partner_id || '',
      due_date: tx.due_date || '',
      paid_at: tx.paid_at || '',
      status: tx.status || 'Pendente',
      notes: tx.notes || '',
    });
  };

  // Update Transaction
  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrans) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/finance/${editingTrans.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editTransForm,
          amount: parseFloat(editTransForm.amount),
          paid_at: editTransForm.status === 'Pago' ? (editTransForm.paid_at || editTransForm.due_date) : null,
        }),
      });

      if (res.ok) {
        setEditingTrans(null);
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao atualizar lançamento.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async () => {
    if (!editingTrans) return;
    if (!confirm(`Tem certeza que deseja excluir o lançamento "${editingTrans.description}"?`)) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/finance/${editingTrans.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setEditingTrans(null);
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao excluir lançamento.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick toggle status
  const handleToggleStatus = async (tx: FinancialTransaction) => {
    try {
      const newStatus = tx.status === 'Pago' ? 'Pendente' : 'Pago';
      const paidAt = newStatus === 'Pago' ? new Date().toISOString().split('T')[0] : null;

      const res = await fetch(`/api/finance/${tx.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          paid_at: paidAt,
        }),
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Format account balance in its specific currency
  const formatAccountBalance = (balance: number | null | undefined, currency?: string) => {
    const num = Number(balance || 0);
    const curr = currency || 'BRL';
    if (curr === 'USD') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
    }
    if (curr === 'EUR') {
      return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(num);
    }
    return formatCurrency(num);
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    if (activeTab === 'entries' && t.type !== 'Entrada') return false;
    if (activeTab === 'exits' && t.type !== 'Saída') return false;

    if (statusFilter && t.status !== statusFilter) return false;
    if (accountFilter && t.bank_account_id !== accountFilter) return false;
    if (categoryFilter && t.category_id !== categoryFilter) return false;

    if (yearFilter && t.due_date && !t.due_date.startsWith(yearFilter)) return false;
    if (monthFilter && t.due_date) {
      const monthPart = t.due_date.split('-')[1];
      if (monthPart !== monthFilter) return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchClient = t.client_name?.toLowerCase().includes(q);
      const matchCat = t.category_name?.toLowerCase().includes(q);
      if (!matchDesc && !matchClient && !matchCat) return false;
    }
    return true;
  });

  // Calculate totals from summary
  const totalBalance = summary?.bank_balances
    ? summary.bank_balances.reduce((acc: number, b: any) => acc + (b.balance || 0), 0)
    : bankAccounts.reduce((acc, b) => acc + (b.current_balance || b.initial_balance || 0), 0);

  const monthEntries = summary?.total_entries_month || 0;
  const monthExits = summary?.total_exits_month || 0;
  const monthNet = monthEntries - monthExits;

  const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* TOP NAVIGATION TABS (Colocados no topo antes dos cards) */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-2 overflow-x-auto sm:flex-wrap pb-2 sm:pb-2">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all',
            activeTab === 'dashboard'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          )}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Visão Geral / Dashboard
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all',
            activeTab === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          Todos os Lançamentos ({transactions.length})
        </button>

        <button
          onClick={() => setActiveTab('entries')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all',
            activeTab === 'entries'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-700 hover:bg-emerald-50'
          )}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Entradas ({transactions.filter((t) => t.type === 'Entrada').length})
        </button>

        <button
          onClick={() => setActiveTab('exits')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all',
            activeTab === 'exits'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-rose-700 hover:bg-rose-50'
          )}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          Saídas ({transactions.filter((t) => t.type === 'Saída').length})
        </button>

        <button
          onClick={() => setActiveTab('partners')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all',
            activeTab === 'partners'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-purple-700 hover:bg-purple-50'
          )}
        >
          <Users className="w-3.5 h-3.5" />
          Comparativo entre Sócios/Parceiros
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all',
            activeTab === 'reports'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-indigo-700 hover:bg-indigo-50'
          )}
        >
          <FileText className="w-3.5 h-3.5" />
          Relatórios & DRE Anual
        </button>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: DASHBOARD GERAL & GRÁFICO (Requisito usuário)     */}
      {/* ======================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Saldo Geral Consolidado</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-gray-900 tracking-tight">
                  {formatCurrency(totalBalance)}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-gray-400">
                Soma convertida na moeda padrão
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Entradas no Mês</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-emerald-600 tracking-tight">
                  {formatCurrency(monthEntries)}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                A receber pendente: {formatCurrency(summary?.total_pending_receive || 0)}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Saídas no Mês</span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-rose-600 tracking-tight">
                  {formatCurrency(monthExits)}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                A pagar pendente: {formatCurrency(summary?.total_pending_pay || 0)}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Resultado Líquido</span>
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    monthNet >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  {monthNet >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                </div>
              </div>
              <div className="mt-3">
                <span
                  className={`text-2xl font-bold tracking-tight ${
                    monthNet >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {formatCurrency(monthNet)}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-gray-400">
                {monthNet >= 0 ? 'Superávit operacional no mês' : 'Déficit no mês'}
              </div>
            </div>
          </div>

          {/* GRÁFICO FINANCEIRO: QUANTO GASTANDO VS RECEBENDO */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Comparativo Financeiro: Entradas vs Saídas
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Visualização de receitas e despesas ao longo do exercício ({reportYear})
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  Entradas
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-rose-700 ml-3">
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                  Saídas
                </span>
              </div>
            </div>

            {/* Monthly Bar Chart */}
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-4 items-end h-56">
              {monthLabels.map((mName, idx) => {
                const monthKey = String(idx + 1).padStart(2, '0');
                const mData = reportsData?.monthly?.find((m: any) => m.month === monthKey);
                const ent = mData?.entries_paid || 0;
                const ext = mData?.exits_paid || 0;
                const maxVal = Math.max(
                  1,
                  ...((reportsData?.monthly || []).map((m: any) => Math.max(m.entries_paid || 0, m.exits_paid || 0)))
                );

                const entHeight = Math.min(100, Math.round((ent / maxVal) * 100));
                const extHeight = Math.min(100, Math.round((ext / maxVal) * 100));

                return (
                  <div key={mName} className="flex flex-col items-center justify-end h-full group">
                    <div className="w-full flex items-end justify-center gap-1 flex-1 pb-2">
                      {/* Entry Bar */}
                      <div
                        className="w-2.5 sm:w-3.5 bg-emerald-500 rounded-t-sm transition-all group-hover:bg-emerald-600 relative cursor-pointer"
                        style={{ height: `${Math.max(4, entHeight)}%` }}
                        title={`${mName} - Entradas: ${formatCurrency(ent)}`}
                      />
                      {/* Exit Bar */}
                      <div
                        className="w-2.5 sm:w-3.5 bg-rose-500 rounded-t-sm transition-all group-hover:bg-rose-600 relative cursor-pointer"
                        style={{ height: `${Math.max(4, extHeight)}%` }}
                        title={`${mName} - Saídas: ${formatCurrency(ext)}`}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 group-hover:text-blue-600 transition-colors">
                      {mName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contas Bancárias (Apenas exibição, sem edição de saldo) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                Contas Bancárias & Saldos
              </h3>
              <span className="text-xs text-gray-400 font-medium">
                {bankAccounts.length} conta(s) ativa(s)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {bankAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-sm font-bold text-gray-900">
                        {acc.name}
                      </span>
                      <div className="text-xs text-gray-500 mt-0.5">{acc.bank} • {acc.type}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                      {acc.currency || 'BRL'}
                    </span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Saldo da Conta</span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatAccountBalance(acc.current_balance ?? acc.initial_balance ?? 0, acc.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: TRANSAÇÕES (TODOS, ENTRADAS OU SAÍDAS)            */}
      {/* ======================================================== */}
      {(activeTab === 'all' || activeTab === 'entries' || activeTab === 'exits') && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-5 space-y-4">
          {/* Sub-Filters: Mês, Ano, Categorias, Contas, Status */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por descrição, cliente ou categoria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os Meses</option>
                {monthLabels.map((m, idx) => (
                  <option key={m} value={String(idx + 1).padStart(2, '0')}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os Anos</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Status (Todos)</option>
                <option value="Pago">Pago</option>
                <option value="Pendente">Pendente</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Categorias (Todas)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Contas (Todas)</option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 bg-gray-50 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Descrição</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Conta</th>
                  <th className="py-3 px-3">Cliente / Parceiro</th>
                  <th className="py-3 px-3">Vencimento</th>
                  <th className="py-3 px-3 text-right">Valor</th>
                  <th className="py-3 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400">
                      Nenhum lançamento encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      onClick={() => openEditTransaction(tx)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleStatus(tx)}
                          className={cn(
                            'px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-colors',
                            tx.status === 'Pago'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                          )}
                        >
                          {tx.status === 'Pago' ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Pago
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              Pendente
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {tx.description}
                        </div>
                        {tx.notes && (
                          <div className="text-[11px] text-gray-400 line-clamp-1">{tx.notes}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-medium border border-gray-200">
                          {tx.category_name || 'Sem categoria'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        {tx.bank_account_name || '—'}
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        {tx.client_name ? (
                          <span className="font-medium text-gray-800">{tx.client_name}</span>
                        ) : tx.partner_id ? (
                          <span className="text-blue-600 text-[11px] font-medium">Sócio: {tx.partner_id}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        {formatDate(tx.due_date)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={cn(
                            'font-bold text-xs',
                            tx.type === 'Entrada' ? 'text-emerald-600' : 'text-rose-600'
                          )}
                        >
                          {tx.type === 'Entrada' ? '+' : '-'} {formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openEditTransaction(tx)}
                          className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                          title="Editar lançamento"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 3: COMPARATIVO ENTRE SÓCIOS / PARCEIROS             */}
      {/* ======================================================== */}
      {activeTab === 'partners' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Comparativo Financeiro entre Sócios & Parceiros
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Análise factual e transparente de custos, reembolsos e receitas atribuídas a cada sócio (sem ranking competitivo).
              </p>
            </div>
          </div>

          {/* Partner Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reportsData?.by_partner && reportsData.by_partner.length > 0 ? (
              reportsData.by_partner.map((p: any) => {
                const net = (p.total_entries || 0) - (p.total_expenses || 0);
                return (
                  <div
                    key={p.id}
                    className="bg-gray-50 border border-gray-200 rounded-2xl p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                        <div>
                          <span className="text-base font-bold text-gray-900">{p.name}</span>
                          <div className="text-xs text-gray-500">Sócio / Parceiro</div>
                        </div>
                        <span className="px-2 py-0.5 text-[11px] rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200">
                          {p.transaction_count} lançamentos
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500">Despesas / Gastos Atribuídos:</span>
                          <span className="font-semibold text-rose-600">
                            {formatCurrency(p.total_expenses || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500">Receitas / Entradas Geradas:</span>
                          <span className="font-semibold text-emerald-600">
                            {formatCurrency(p.total_entries || 0)}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-xs font-bold">
                          <span className="text-gray-700">Balanço do Parceiro:</span>
                          <span className={net >= 0 ? 'text-emerald-600' : 'text-amber-600'}>
                            {formatCurrency(net)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-8 text-center text-gray-400">
                Nenhum parceiro com transações atribuídas ainda. Para vincular um sócio a uma transação, selecione o parceiro ao cadastrar a despesa.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 4: RELATÓRIOS & DRE ANUAL                            */}
      {/* ======================================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Demonstrativo de Resultado & Desempenho
              </h3>
              <p className="text-xs text-gray-500">
                Evolução mensal de receitas, despesas operacionais e distribuição por cliente e categoria.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Ano de Exercício:</span>
              <select
                value={reportYear}
                onChange={(e) => setReportYear(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>
          </div>

          {/* Monthly Evolution Overview */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Evolução Mensal do Exercício ({reportYear})
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {monthLabels.map((label, idx) => {
                const monthKey = String(idx + 1).padStart(2, '0');
                const mData = reportsData?.monthly?.find((m: any) => m.month === monthKey);
                const ent = mData?.entries_paid || 0;
                const ext = mData?.exits_paid || 0;
                const res = ent - ext;

                return (
                  <div
                    key={monthKey}
                    className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col justify-between"
                  >
                    <span className="text-xs font-bold text-gray-700">{label}</span>
                    <div className="mt-2 space-y-1 text-[11px]">
                      <div className="text-emerald-600 flex justify-between">
                        <span>Rec:</span>
                        <span>{formatCurrency(ent)}</span>
                      </div>
                      <div className="text-rose-600 flex justify-between">
                        <span>Desp:</span>
                        <span>{formatCurrency(ext)}</span>
                      </div>
                      <div className="pt-1 border-t border-gray-200 flex justify-between font-bold">
                        <span className="text-gray-500">Res:</span>
                        <span className={res >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {formatCurrency(res)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Categories and Clients Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Category */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-blue-600" />
                Despesas Pagas por Categoria
              </h4>

              {reportsData?.by_category && reportsData.by_category.length > 0 ? (
                <div className="space-y-3">
                  {reportsData.by_category.map((cat: any) => (
                    <div key={cat.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-gray-700">{cat.name}</span>
                        <span className="font-bold text-gray-900">{formatCurrency(cat.total_amount)}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              (cat.total_amount / (monthExits || 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Nenhuma despesa paga registrada por categoria.</p>
              )}
            </div>

            {/* By Client */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                Faturamento Realizado por Cliente
              </h4>

              {reportsData?.by_client && reportsData.by_client.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500 font-semibold uppercase text-[10px]">
                        <th className="pb-2">Cliente</th>
                        <th className="pb-2 text-right">Recebido</th>
                        <th className="pb-2 text-right">A Receber</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {reportsData.by_client.map((cli: any) => (
                        <tr key={cli.id}>
                          <td className="py-2.5 text-gray-800 font-medium">{cli.name}</td>
                          <td className="py-2.5 text-right font-bold text-emerald-600">
                            {formatCurrency(cli.total_received)}
                          </td>
                          <td className="py-2.5 text-right text-gray-500">
                            {formatCurrency(cli.total_pending)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Nenhum faturamento registrado por cliente.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CRIAR NOVO LANÇAMENTO                              */}
      {/* ======================================================== */}
      {showTransModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowTransModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Novo Lançamento Financeiro
            </h2>

            <form onSubmit={handleCreateTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Descrição do Lançamento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Assinatura Adobe Premiere, Pagamento Cliente XYZ..."
                  value={newTrans.description}
                  onChange={(e) => setNewTrans({ ...newTrans, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo *</label>
                  <select
                    value={newTrans.type}
                    onChange={(e) => setNewTrans({ ...newTrans, type: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Saída">Saída (Despesa)</option>
                    <option value="Entrada">Entrada (Receita)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={newTrans.amount}
                    onChange={(e) => setNewTrans({ ...newTrans, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status *</label>
                  <select
                    value={newTrans.status}
                    onChange={(e) => setNewTrans({ ...newTrans, status: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Pago">Pago</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={newTrans.due_date}
                    onChange={(e) => setNewTrans({ ...newTrans, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Categoria</label>
                  <select
                    value={newTrans.category_id}
                    onChange={(e) => setNewTrans({ ...newTrans, category_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Nenhuma Categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Conta Bancária</label>
                  <select
                    value={newTrans.bank_account_id}
                    onChange={(e) => setNewTrans({ ...newTrans, bank_account_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Nenhuma Conta</option>
                    {bankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.bank})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cliente Vinculado</label>
                  <select
                    value={newTrans.client_id}
                    onChange={(e) => setNewTrans({ ...newTrans, client_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Nenhum Cliente</option>
                    {clients.map((cli) => (
                      <option key={cli.id} value={cli.id}>
                        {cli.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Sócio / Parceiro Responsável
                  </label>
                  <select
                    value={newTrans.partner_id}
                    onChange={(e) => setNewTrans({ ...newTrans, partner_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Nenhum Sócio</option>
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={newTrans.notes}
                  onChange={(e) => setNewTrans({ ...newTrans, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowTransModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-xl text-xs hover:bg-blue-500 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDITAR LANÇAMENTO                                  */}
      {/* ======================================================== */}
      {editingTrans && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setEditingTrans(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-blue-600" />
              Editar Lançamento Financeiro
            </h2>

            <form onSubmit={handleUpdateTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Descrição do Lançamento *
                </label>
                <input
                  type="text"
                  required
                  value={editTransForm.description}
                  onChange={(e) => setEditTransForm({ ...editTransForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo *</label>
                  <select
                    value={editTransForm.type}
                    onChange={(e) => setEditTransForm({ ...editTransForm, type: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Saída">Saída (Despesa)</option>
                    <option value="Entrada">Entrada (Receita)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editTransForm.amount}
                    onChange={(e) => setEditTransForm({ ...editTransForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status *</label>
                  <select
                    value={editTransForm.status}
                    onChange={(e) => setEditTransForm({ ...editTransForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Pago">Pago</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={editTransForm.due_date}
                    onChange={(e) => setEditTransForm({ ...editTransForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Categoria</label>
                  <select
                    value={editTransForm.category_id}
                    onChange={(e) => setEditTransForm({ ...editTransForm, category_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Nenhuma Categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Conta Bancária</label>
                  <select
                    value={editTransForm.bank_account_id}
                    onChange={(e) => setEditTransForm({ ...editTransForm, bank_account_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Nenhuma Conta</option>
                    {bankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.bank})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cliente Vinculado</label>
                  <select
                    value={editTransForm.client_id}
                    onChange={(e) => setEditTransForm({ ...editTransForm, client_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Nenhum Cliente</option>
                    {clients.map((cli) => (
                      <option key={cli.id} value={cli.id}>
                        {cli.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Sócio / Parceiro Responsável
                  </label>
                  <select
                    value={editTransForm.partner_id}
                    onChange={(e) => setEditTransForm({ ...editTransForm, partner_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Nenhum Sócio</option>
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={editTransForm.notes}
                  onChange={(e) => setEditTransForm({ ...editTransForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleDeleteTransaction}
                  disabled={isSubmitting}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTrans(null)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-xl text-xs hover:bg-blue-500 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
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
