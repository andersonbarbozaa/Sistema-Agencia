'use client';

import { useState, useEffect } from 'react';
import ConfirmModal from '@/components/ConfirmModal';
import SafeModalBackdrop from '@/components/SafeModalBackdrop';
import FinancialSummaryDashboard from '@/components/finance/FinancialSummaryDashboard';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Filter,
  CheckCircle,
  CheckCircle2,
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
  ArrowRight,
  ArrowUpDown,
  Trophy,
  AlertTriangle,
  Scale,
  Receipt,
  History,
  Banknote,
} from 'lucide-react';

const FULL_MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
import { FinancialTransaction, BankAccount, FinancialCategory, Debt, DebtPayment } from '@/types';
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

  const [reportMonth, setReportMonth] = useState<string>(String(new Date().getMonth() + 1));

  // Navigation View: 'dashboard' | 'all' | 'entries' | 'exits' | 'comparative' | 'debts' | 'reports'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'all' | 'entries' | 'exits' | 'comparative' | 'debts' | 'reports'>('dashboard');

  // Filters for Transactions
  const [statusFilter, setStatusFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handler = () => setShowTransModal(true);
    window.addEventListener('open-new-transaction', handler);
    return () => window.removeEventListener('open-new-transaction', handler);
  }, []);

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

  const [newTransCategoryInput, setNewTransCategoryInput] = useState('');
  const [editTransCategoryInput, setEditTransCategoryInput] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmState, setConfirmState] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // ==========================================
  // ESTADOS PARA DÍVIDAS
  // ==========================================
  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtMetrics, setDebtMetrics] = useState({
    total_amount: 0,
    remaining_amount: 0,
    paid_amount: 0,
    total_count: 0,
    active_count: 0,
    paid_count: 0,
  });
  const [loadingDebts, setLoadingDebts] = useState(false);
  const [debtStatusFilter, setDebtStatusFilter] = useState<'todos' | 'aberto' | 'paga'>('aberto');
  const [debtUserFilter, setDebtUserFilter] = useState<string>('todos');
  const [debtSearchQuery, setDebtSearchQuery] = useState('');

  // Modais de Dívida
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [debtForm, setDebtForm] = useState({
    title: '',
    total_amount: '',
    due_date: new Date().toISOString().split('T')[0],
    company_name: '',
    user_id: '',
    total_installments: '1',
    notes: '',
  });

  // Modal de Pagamento / Amortização
  const [showPayModal, setShowPayModal] = useState(false);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [payForm, setPayForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'PIX',
    notes: '',
    create_transaction: true,
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Modal de Histórico de Pagamentos
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyDebt, setHistoryDebt] = useState<Debt | null>(null);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const isNewTransDirty = Boolean(
    newTrans.description.trim() ||
    newTrans.amount ||
    newTrans.client_id ||
    newTrans.category_id ||
    newTrans.notes.trim()
  );

  const handleCloseNewTransModal = () => {
    if (isNewTransDirty) {
      const ok = window.confirm('Você possui dados preenchidos no lançamento. Deseja realmente descartar e fechar?');
      if (!ok) return;
    }
    setShowTransModal(false);
  };

  const handleCloseEditTransModal = () => {
    if (editingTrans) {
      const ok = window.confirm('Deseja realmente fechar a edição do lançamento? Alterações não salvas serão perdidas.');
      if (!ok) return;
    }
    setEditingTrans(null);
  };

  const isDebtDirty = Boolean(
    debtForm.title.trim() ||
    debtForm.total_amount ||
    debtForm.company_name.trim() ||
    debtForm.user_id ||
    debtForm.notes.trim()
  );

  const handleCloseDebtModal = () => {
    if (isDebtDirty) {
      const ok = window.confirm('Você possui dados preenchidos na dívida. Deseja realmente descartar e fechar?');
      if (!ok) return;
    }
    setShowDebtModal(false);
    setEditingDebt(null);
  };

  const isPayDirty = Boolean(payForm.amount || payForm.notes.trim());

  const handleClosePayModal = () => {
    if (isPayDirty) {
      const ok = window.confirm('Você possui dados preenchidos no pagamento. Deseja realmente descartar e fechar?');
      if (!ok) return;
    }
    setShowPayModal(false);
    setPayingDebt(null);
  };

  const fetchDebts = async () => {
    try {
      setLoadingDebts(true);
      const params = new URLSearchParams();
      if (debtStatusFilter) params.append('status', debtStatusFilter);
      if (debtUserFilter) params.append('user_id', debtUserFilter);
      if (debtSearchQuery) params.append('search', debtSearchQuery);

      const res = await fetch(`/api/finance/debts?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setDebts(json.debts || []);
        if (json.metrics) {
          setDebtMetrics(json.metrics);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar dívidas:', err);
    } finally {
      setLoadingDebts(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transRes, accRes, sumRes, catRes, clientRes, usersRes, repRes] = await Promise.all([
        fetch('/api/finance'),
        fetch('/api/bank-accounts'),
        fetch('/api/finance/summary'),
        fetch('/api/categories?type=finance'),
        fetch('/api/clients'),
        fetch('/api/users'),
        fetch(`/api/reports?year=${reportYear}&month=${reportMonth}`),
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
        setSummary(d.data || d);
      }
      if (catRes.ok) {
        const d = await catRes.json();
        setCategories(d.financial_categories || d.data || d.categories || []);
      }
      if (clientRes.ok) {
        const d = await clientRes.json();
        setClients(d.clients || d.data || []);
      }
      if (usersRes.ok) {
        const d = await usersRes.json();
        const loadedUsers = d.users || d.data || [];
        setPartners(loadedUsers);
        setNewTrans((prev) => ({
          ...prev,
          partner_id: prev.partner_id || loadedUsers[0]?.id || '',
        }));
      }
      if (repRes.ok) {
        const d = await repRes.json();
        setReportsData(d);
      }
      fetchDebts();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [reportYear, reportMonth]);

  useEffect(() => {
    fetchDebts();
  }, [debtStatusFilter, debtUserFilter]);

  const openCreateDebtModal = () => {
    setEditingDebt(null);
    setDebtForm({
      title: '',
      total_amount: '',
      due_date: new Date().toISOString().split('T')[0],
      company_name: '',
      user_id: partners[0]?.id || '',
      total_installments: '1',
      notes: '',
    });
    setShowDebtModal(true);
  };

  const openEditDebtModal = (d: Debt) => {
    setEditingDebt(d);
    setDebtForm({
      title: d.title || '',
      total_amount: String(d.total_amount || ''),
      due_date: d.due_date ? d.due_date.split('T')[0] : '',
      company_name: d.company_name || '',
      user_id: d.user_id || '',
      total_installments: String(d.total_installments || '1'),
      notes: d.notes || '',
    });
    setShowDebtModal(true);
  };

  const handleSaveDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtForm.title || !debtForm.total_amount) {
      alert('Preencha a descrição/título e o valor total da dívida.');
      return;
    }

    try {
      setIsSubmitting(true);
      const url = editingDebt ? `/api/finance/debts/${editingDebt.id}` : '/api/finance/debts';
      const method = editingDebt ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(debtForm),
      });

      if (res.ok) {
        setShowDebtModal(false);
        setEditingDebt(null);
        fetchDebts();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Erro ao salvar dívida.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao salvar dívida.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDebt = (d: Debt) => {
    setConfirmState({
      isOpen: true,
      title: 'Excluir Dívida',
      message: `Tem certeza que deseja excluir a dívida "${d.title}"? Todo o histórico de pagamentos dela também será removido.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/finance/debts/${d.id}`, { method: 'DELETE' });
          if (res.ok) {
            fetchDebts();
          } else {
            const err = await res.json().catch(() => ({}));
            alert(err.error || 'Erro ao excluir dívida.');
          }
        } catch (err) {
          console.error(err);
        } finally {
          setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const openPayModal = (d: Debt) => {
    setPayingDebt(d);
    // Sugestão de parcela
    let suggestedAmount = d.remaining_amount;
    if (d.total_installments > 1 && d.total_amount > 0) {
      const perInstallment = Math.round((d.total_amount / d.total_installments) * 100) / 100;
      suggestedAmount = Math.min(d.remaining_amount, perInstallment);
    }

    setPayForm({
      amount: String(suggestedAmount > 0 ? suggestedAmount : d.remaining_amount),
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'PIX',
      notes: '',
      create_transaction: true,
    });
    setShowPayModal(true);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebt || !payForm.amount) return;

    const val = Number(payForm.amount);
    if (isNaN(val) || val <= 0) {
      alert('Informe um valor válido maior que zero.');
      return;
    }

    try {
      setSubmittingPayment(true);
      const res = await fetch(`/api/finance/debts/${payingDebt.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payForm),
      });

      if (res.ok) {
        setShowPayModal(false);
        setPayingDebt(null);
        fetchDebts();
        fetchData(); // Atualiza saldo geral do caixa
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Erro ao registrar pagamento.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar pagamento.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const openHistoryModal = async (d: Debt) => {
    setHistoryDebt(d);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/finance/debts/${d.id}`);
      if (res.ok) {
        const json = await res.json();
        setDebtPayments(json.payments || []);
        if (json.debt) {
          setHistoryDebt(json.debt);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeletePayment = (paymentId: string) => {
    if (!historyDebt) return;
    setConfirmState({
      isOpen: true,
      title: 'Estornar Pagamento',
      message: 'Deseja estornar este pagamento? O valor será somado de volta ao saldo devedor da dívida.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/finance/debts/${historyDebt.id}/payments/${paymentId}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            const json = await res.json();
            if (json.debt) setHistoryDebt(json.debt);
            setDebtPayments((prev) => prev.filter((p) => p.id !== paymentId));
            fetchDebts();
            fetchData();
          } else {
            const err = await res.json().catch(() => ({}));
            alert(err.error || 'Erro ao estornar pagamento.');
          }
        } catch (err) {
          console.error(err);
        } finally {
          setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  useEffect(() => {
    const handleOpenCreate = () => {
      setShowTransModal(true);
      if (partners.length > 0) {
        setNewTrans((prev) => ({
          ...prev,
          partner_id: prev.partner_id || partners[0]?.id || '',
        }));
      }
    };
    window.addEventListener('open-create-transaction', handleOpenCreate);
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('new') === 'true') {
      setShowTransModal(true);
      if (partners.length > 0) {
        setNewTrans((prev) => ({
          ...prev,
          partner_id: prev.partner_id || partners[0]?.id || '',
        }));
      }
    }
    return () => window.removeEventListener('open-create-transaction', handleOpenCreate);
  }, [partners]);

  // Quick create category on the fly
  const handleQuickCreateCategory = async (catName: string, isEdit = false): Promise<string | null> => {
    const cleanName = catName.trim();
    if (!cleanName) return null;

    const existing = categories.find((c) => c.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      if (isEdit) {
        setEditTransForm((prev) => ({ ...prev, category_id: existing.id }));
        setEditTransCategoryInput(existing.name);
      } else {
        setNewTrans((prev) => ({ ...prev, category_id: existing.id }));
        setNewTransCategoryInput(existing.name);
      }
      return existing.id;
    }

    try {
      setCreatingCat(true);
      const res = await fetch('/api/categories?target=finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          type: isEdit ? editTransForm.type : newTrans.type,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newCat = {
          id: data.id,
          name: cleanName,
          type: isEdit ? editTransForm.type : newTrans.type,
          is_active: 1,
        };
        setCategories((prev) => [...prev, newCat as any]);
        if (isEdit) {
          setEditTransForm((prev) => ({ ...prev, category_id: data.id }));
          setEditTransCategoryInput(cleanName);
        } else {
          setNewTrans((prev) => ({ ...prev, category_id: data.id }));
          setNewTransCategoryInput(cleanName);
        }
        return data.id;
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao criar categoria.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingCat(false);
    }
    return null;
  };

  // Create Transaction
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrans.description || !newTrans.amount) return;

    try {
      setIsSubmitting(true);

      let finalCatId = newTrans.category_id;
      if (newTransCategoryInput.trim() && !finalCatId) {
        finalCatId = (await handleQuickCreateCategory(newTransCategoryInput, false)) || '';
      }

      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTrans,
          category_id: finalCatId || null,
          category_name: newTransCategoryInput.trim() || null,
          partner_id: newTrans.partner_id || (partners[0]?.id || null),
          amount: parseFloat(newTrans.amount),
          paid_at: newTrans.status === 'Pago' ? (newTrans.paid_at || new Date().toISOString().split('T')[0]) : null,
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
          partner_id: partners[0]?.id || '',
          due_date: new Date().toISOString().split('T')[0],
          paid_at: '',
          status: 'Pendente',
          notes: '',
        });
        setNewTransCategoryInput('');
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
    const existingCat = categories.find((c) => c.id === tx.category_id);
    setEditTransCategoryInput(existingCat ? existingCat.name : '');
    setEditTransForm({
      description: tx.description || '',
      amount: String(tx.amount || ''),
      type: tx.type || 'Saída',
      category_id: tx.category_id || '',
      bank_account_id: tx.bank_account_id || '',
      client_id: tx.client_id || '',
      partner_id: tx.partner_id || partners[0]?.id || '',
      due_date: tx.due_date || '',
      paid_at: tx.paid_at ? tx.paid_at.split('T')[0] : (tx.status === 'Pago' ? (tx.due_date || new Date().toISOString().split('T')[0]) : ''),
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

      let finalCatId = editTransForm.category_id;
      if (editTransCategoryInput.trim() && !finalCatId) {
        finalCatId = (await handleQuickCreateCategory(editTransCategoryInput, true)) || '';
      }

      const res = await fetch(`/api/finance/${editingTrans.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editTransForm,
          category_id: finalCatId || null,
          partner_id: editTransForm.partner_id || (partners[0]?.id || null),
          amount: parseFloat(editTransForm.amount),
          paid_at: editTransForm.status === 'Pago' ? (editTransForm.paid_at || new Date().toISOString().split('T')[0]) : null,
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

    setConfirmState({
      isOpen: true,
      title: 'Confirmar Exclusão',
      message: `Tem certeza que deseja excluir o lançamento "${editingTrans.description}"?`,
      onConfirm: async () => {
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
      }
    });
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
      <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap sm:flex-nowrap items-center gap-2 pb-2">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={cn(
            'flex items-center justify-center flex-1 sm:flex-none gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all',
            activeTab === 'dashboard'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          )}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Geral
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            'flex items-center justify-center flex-1 sm:flex-none gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all',
            activeTab === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          Todos ({transactions.length})
        </button>

        <button
          onClick={() => setActiveTab('entries')}
          className={cn(
            'flex items-center justify-center flex-1 sm:flex-none gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all',
            activeTab === 'entries'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-700 hover:bg-emerald-50'
          )}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Renda ({transactions.filter((t) => t.type === 'Entrada').length})
        </button>

        <button
          onClick={() => setActiveTab('exits')}
          className={cn(
            'flex items-center justify-center flex-1 sm:flex-none gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all',
            activeTab === 'exits'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-rose-700 hover:bg-rose-50'
          )}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          Despesas ({transactions.filter((t) => t.type === 'Saída').length})
        </button>

        <button
          onClick={() => setActiveTab('comparative')}
          className={cn(
            'flex items-center justify-center flex-1 sm:flex-none gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all',
            activeTab === 'comparative'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/40'
          )}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          Comparativo
        </button>

        <button
          onClick={() => setActiveTab('debts')}
          className={cn(
            'flex items-center justify-center flex-1 sm:flex-none gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all',
            activeTab === 'debts'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-amber-800 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40'
          )}
        >
          <Receipt className="w-3.5 h-3.5" />
          Dívidas {debtMetrics.active_count > 0 ? `(${debtMetrics.active_count})` : ''}
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={cn(
            'flex items-center justify-center flex-1 sm:flex-none gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all',
            activeTab === 'reports'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40'
          )}
        >
          <FileText className="w-3.5 h-3.5" />
          Relatório
        </button>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: DASHBOARD GERAL & GRÁFICO (Requisito usuário)     */}
      {/* ======================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <FinancialSummaryDashboard />

          {/* GRÁFICO FINANCEIRO: QUANTO GASTANDO VS RECEBENDO */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Comparativo Financeiro: Renda vs Despesas
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Visualização de receitas e despesas ao longo do exercício ({reportYear})
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  Renda
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-rose-700 ml-3">
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                  Despesas
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
                        title={`${mName} - Renda: ${formatCurrency(ent)}`}
                      />
                      {/* Exit Bar */}
                      <div
                        className="w-2.5 sm:w-3.5 bg-rose-500 rounded-t-sm transition-all group-hover:bg-rose-600 relative cursor-pointer"
                        style={{ height: `${Math.max(4, extHeight)}%` }}
                        title={`${mName} - Despesas: ${formatCurrency(ext)}`}
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
              <thead className="hidden md:table-header-group">
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
              <tbody className="divide-y divide-gray-100 flex flex-col md:table-row-group">
                {filteredTransactions.length === 0 ? (
                  <tr className="block md:table-row">
                    <td colSpan={8} className="py-8 text-center text-gray-400 block md:table-cell">
                      Nenhum lançamento encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      onClick={() => openEditTransaction(tx)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer group flex flex-col md:table-row border-b border-gray-100 md:border-0 p-4 md:p-0"
                    >
                      {/* MOBILE VIEW */}
                      <td className="md:hidden flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col items-start gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleStatus(tx); }}
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
                            <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {tx.description}
                            </span>
                          </div>
                          <span
                            className={cn(
                              'font-bold text-xs',
                              tx.type === 'Entrada' ? 'text-emerald-600' : 'text-rose-600'
                            )}
                          >
                            {tx.type === 'Entrada' ? '+' : '-'} {formatCurrency(tx.amount)}
                          </span>
                        </div>
                        <div className="flex justify-between items-end">
                          <div className="text-[11px] text-gray-500">
                            {tx.status === 'Pago' ? (
                              <span className="text-emerald-700 font-medium">
                                Pago em: {formatDate(tx.paid_at || tx.due_date)}
                              </span>
                            ) : (
                              <span>Vencimento: {formatDate(tx.due_date)}</span>
                            )}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditTransaction(tx); }}
                            className="p-1 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* DESKTOP VIEW */}
                      <td className="hidden md:table-cell py-3 px-3" onClick={(e) => e.stopPropagation()}>
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
                      <td className="hidden md:table-cell py-3 px-3">
                        <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {tx.description}
                        </div>
                        {tx.notes && (
                          <div className="text-[11px] text-gray-400 line-clamp-1">{tx.notes}</div>
                        )}
                      </td>
                      <td className="hidden md:table-cell py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-medium border border-gray-200">
                          {tx.category_name || 'Sem categoria'}
                        </span>
                      </td>
                      <td className="hidden md:table-cell py-3 px-3 text-gray-600">
                        {tx.bank_account_name || '—'}
                      </td>
                      <td className="hidden md:table-cell py-3 px-3 text-gray-600">
                        {tx.client_name ? (
                          <span className="font-medium text-gray-800">{tx.client_name}</span>
                        ) : tx.partner_id ? (
                          <span className="text-blue-600 text-[11px] font-medium">Sócio: {tx.partner_id}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="hidden md:table-cell py-3 px-3 text-gray-600">
                        {tx.status === 'Pago' ? (
                          <div className="flex flex-col">
                            <span className="text-emerald-700 font-medium">
                              Pago: {formatDate(tx.paid_at || tx.due_date)}
                            </span>
                            {tx.paid_at && tx.due_date && (
                              <span className="text-[10px] text-gray-400">Venc: {formatDate(tx.due_date)}</span>
                            )}
                          </div>
                        ) : (
                          formatDate(tx.due_date)
                        )}
                      </td>
                      <td className="hidden md:table-cell py-3 px-3 text-right">
                        <span
                          className={cn(
                            'font-bold text-xs',
                            tx.type === 'Entrada' ? 'text-emerald-600' : 'text-rose-600'
                          )}
                        >
                          {tx.type === 'Entrada' ? '+' : '-'} {formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="hidden md:table-cell py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
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
      {/* ======================================================== */}
      {/* VIEW 3: COMPARATIVO ENTRE USUÁRIOS / PARCEIROS (CONJUNTA) */}
      {/* ======================================================== */}
      {activeTab === 'comparative' && (
        <div className="space-y-6">
          {/* Header e Filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-800">
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                Conjunta
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Comparativo de gastos e receitas entre usuários
              </p>
            </div>

            {/* Filtros de Mês e Ano */}
            <div className="flex items-center gap-2">
              <select
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs cursor-pointer"
              >
                <option value="all">Todos os meses</option>
                {FULL_MONTH_NAMES.map((mName, idx) => (
                  <option key={idx + 1} value={String(idx + 1)}>
                    {mName}
                  </option>
                ))}
              </select>

              <select
                value={reportYear}
                onChange={(e) => setReportYear(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs cursor-pointer"
              >
                <option value="2027">2027</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>
          </div>

          {/* CARD: Comparativo por usuário */}
          <div className="bg-white dark:bg-[#0d121d] border border-gray-200 dark:border-gray-800/80 rounded-2xl p-5 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
              <ArrowUpDown className="w-4 h-4 text-blue-500 shrink-0" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Comparativo por usuário
              </h3>
            </div>

            <div className="space-y-6">
              {reportsData?.comparative?.users && reportsData.comparative.users.length > 0 ? (
                reportsData.comparative.users.map((u: any) => {
                  const total = u.total_received + u.total_spent;
                  const recPct = total > 0 ? Math.round((u.total_received / total) * 100) : 0;
                  const expPct = total > 0 ? 100 - recPct : 0;

                  return (
                    <div key={u.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {u.name}
                        </span>
                        <span
                          className={cn(
                            'text-sm font-bold',
                            u.net_balance >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          )}
                        >
                          {u.net_balance < 0 ? '-' : '+'}
                          {formatCurrency(Math.abs(u.net_balance))}
                        </span>
                      </div>

                      {/* Legenda dos valores */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          Recebeu: <span className="font-bold">{formatCurrency(u.total_received)}</span>
                        </span>
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          Gastou: <span className="font-bold">{formatCurrency(u.total_spent)}</span>
                        </span>
                      </div>

                      {/* Barra de Progresso Bicolor */}
                      <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
                        {u.total_received > 0 && (
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${recPct}%` }}
                            title={`Recebido: ${formatCurrency(u.total_received)} (${recPct}%)`}
                          />
                        )}
                        {u.total_spent > 0 && (
                          <div
                            className="h-full bg-rose-500"
                            style={{ width: `${expPct}%` }}
                            title={`Gasto: ${formatCurrency(u.total_spent)} (${expPct}%)`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-400 py-4 text-center">Nenhum dado de usuário para este período.</p>
              )}
            </div>
          </div>

          {/* Grid 2 Cards Destaque: Quem mais recebeu & Quem mais gastou */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quem mais recebeu */}
            <div className="bg-white dark:bg-[#0d121d] border border-gray-200 dark:border-gray-800/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Quem mais recebeu
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate">
                {reportsData?.comparative?.top_receiver?.name || '—'}
              </p>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">
                {formatCurrency(reportsData?.comparative?.top_receiver?.amount || 0)}
              </p>
            </div>

            {/* Quem mais gastou */}
            <div className="bg-white dark:bg-[#0d121d] border border-gray-200 dark:border-gray-800/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Quem mais gastou
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 truncate">
                {reportsData?.comparative?.top_spender?.name || '—'}
              </p>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">
                {formatCurrency(reportsData?.comparative?.top_spender?.amount || 0)}
              </p>
            </div>
          </div>

          {/* Grid 2 Cards com Ranking e Subtítulo Usuário · Categoria */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Maiores gastos */}
            <div className="bg-white dark:bg-[#0d121d] border border-gray-200 dark:border-gray-800/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                  <TrendingDown className="w-4 h-4 text-rose-500 shrink-0" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    Maiores gastos
                  </h3>
                </div>

                <div className="space-y-3.5">
                  {reportsData?.comparative?.top_expenses && reportsData.comparative.top_expenses.length > 0 ? (
                    reportsData.comparative.top_expenses.map((item: any, idx: number) => (
                      <div key={item.id || idx} className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 w-5 shrink-0 mt-0.5">
                            {idx + 1}º
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-800 dark:text-gray-200 truncate">
                              {item.description}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                              {item.user_name || '—'} · {item.category_name || 'Despesa'}
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-rose-600 dark:text-rose-400 shrink-0 whitespace-nowrap">
                          -{formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 py-6 text-center">Nenhum gasto registrado neste período.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Maiores retornos */}
            <div className="bg-white dark:bg-[#0d121d] border border-gray-200 dark:border-gray-800/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                  <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    Maiores retornos
                  </h3>
                </div>

                <div className="space-y-3.5">
                  {reportsData?.comparative?.top_revenues && reportsData.comparative.top_revenues.length > 0 ? (
                    reportsData.comparative.top_revenues.map((item: any, idx: number) => (
                      <div key={item.id || idx} className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 w-5 shrink-0 mt-0.5">
                            {idx + 1}º
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-800 dark:text-gray-200 truncate">
                              {item.description}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                              {item.user_name || '—'} · {item.category_name || 'Receita'}
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0 whitespace-nowrap">
                          +{formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 py-6 text-center">Nenhum retorno registrado neste período.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 4: RELATÓRIO (SAÚDE FINANCEIRA E PROJEÇÕES)         */}
      {/* ======================================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Header e Filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-800">
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                Relatório
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Saúde financeira e projeções
              </p>
            </div>

            {/* Filtros de Mês e Ano */}
            <div className="flex items-center gap-2">
              <select
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs cursor-pointer"
              >
                <option value="all">Todos os meses</option>
                {FULL_MONTH_NAMES.map((mName, idx) => (
                  <option key={idx + 1} value={String(idx + 1)}>
                    {mName}
                  </option>
                ))}
              </select>

              <select
                value={reportYear}
                onChange={(e) => setReportYear(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs cursor-pointer"
              >
                <option value="2027">2027</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>
          </div>

          {/* Grid 2 Cards: Maiores gastos (geral) & Maiores retornos (geral) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CARD: Maiores gastos (geral) */}
            <div className="bg-white dark:bg-[#0d121d] border border-gray-200 dark:border-gray-800/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                  <TrendingDown className="w-4 h-4 text-rose-500 shrink-0" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    Maiores gastos (geral)
                  </h3>
                </div>

                <div className="space-y-3">
                  {reportsData?.report?.top_expenses && reportsData.report.top_expenses.length > 0 ? (
                    reportsData.report.top_expenses.map((item: any, idx: number) => (
                      <div key={item.id || idx} className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 w-5 shrink-0">
                            {idx + 1}º
                          </span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {item.description}
                          </span>
                        </div>
                        <span className="font-bold text-rose-600 dark:text-rose-400 shrink-0 whitespace-nowrap">
                          -{formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 py-6 text-center">Nenhum gasto registrado neste período.</p>
                  )}
                </div>
              </div>
            </div>

            {/* CARD: Maiores retornos (geral) */}
            <div className="bg-white dark:bg-[#0d121d] border border-gray-200 dark:border-gray-800/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                  <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    Maiores retornos (geral)
                  </h3>
                </div>

                <div className="space-y-3">
                  {reportsData?.report?.top_revenues && reportsData.report.top_revenues.length > 0 ? (
                    reportsData.report.top_revenues.map((item: any, idx: number) => (
                      <div key={item.id || idx} className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 w-5 shrink-0">
                            {idx + 1}º
                          </span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {item.description}
                          </span>
                        </div>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0 whitespace-nowrap">
                          +{formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 py-6 text-center">Nenhum retorno registrado neste período.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CARD: Comparativo Atual vs Anterior */}
          <div className="bg-white dark:bg-[#0d121d] border border-gray-200 dark:border-gray-800/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
              <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {reportsData?.report?.comparison?.title || 'Comparativo'}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* RECEITAS */}
              <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-1">
                  RECEITAS
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(reportsData?.report?.comparison?.entries || 0)}
                  </span>
                  {reportsData?.report?.comparison?.entries_var_pct !== undefined && (
                    <span
                      className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5',
                        reportsData.report.comparison.entries_var_pct >= 0
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                      )}
                    >
                      {reportsData.report.comparison.entries_var_pct >= 0 ? '↑' : '↓'}{' '}
                      {Math.abs(reportsData.report.comparison.entries_var_pct)}%
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
                  Anterior: {formatCurrency(reportsData?.report?.comparison?.entries_previous || 0)}
                </p>
              </div>

              {/* DESPESAS */}
              <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-1">
                  DESPESAS
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
                    {formatCurrency(reportsData?.report?.comparison?.exits || 0)}
                  </span>
                  {reportsData?.report?.comparison?.exits_var_pct !== undefined && (
                    <span
                      className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5',
                        reportsData.report.comparison.exits_var_pct <= 0
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                      )}
                    >
                      {reportsData.report.comparison.exits_var_pct >= 0 ? '↑' : '↓'}{' '}
                      {Math.abs(reportsData.report.comparison.exits_var_pct)}%
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
                  Anterior: {formatCurrency(reportsData?.report?.comparison?.exits_previous || 0)}
                </p>
              </div>

              {/* SALDO */}
              <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-1">
                  SALDO
                </span>
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      'text-xl sm:text-2xl font-black',
                      (reportsData?.report?.comparison?.balance || 0) >= 0
                        ? 'text-gray-900 dark:text-white'
                        : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {formatCurrency(reportsData?.report?.comparison?.balance || 0)}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
                  Anterior: {formatCurrency(reportsData?.report?.comparison?.balance_previous || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* CARD: Previsão Próximo Período */}
          <div className="bg-white dark:bg-[#0d121d] border border-gray-200 dark:border-gray-800/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-start gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
              <ArrowRight className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {reportsData?.report?.prediction?.title || 'Previsão'}
                </h3>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  {reportsData?.report?.prediction?.subtitle || 'Baseado na média dos últimos 3 meses'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* ENTRADA PREVISTA */}
              <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                  ENTRADA PREVISTA
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 block">
                  {formatCurrency(reportsData?.report?.prediction?.projected_revenue || 0)}
                </span>
              </div>

              {/* SAÍDA PREVISTA */}
              <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
                  SAÍDA PREVISTA
                </span>
                <span className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400 block">
                  {formatCurrency(reportsData?.report?.prediction?.projected_expenses || 0)}
                </span>
              </div>

              {/* SALDO PREVISTO */}
              <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                  SALDO PREVISTO
                </span>
                <span
                  className={cn(
                    'text-xl sm:text-2xl font-black block',
                    (reportsData?.report?.prediction?.projected_balance || 0) >= 0
                      ? 'text-gray-900 dark:text-white'
                      : 'text-rose-600 dark:text-rose-400'
                  )}
                >
                  {formatCurrency(reportsData?.report?.prediction?.projected_balance || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW: DÍVIDAS E AMORTIZAÇÕES                           */}
      {/* ======================================================== */}
      {activeTab === 'debts' && (
        <div className="space-y-6">
          {/* Header & Métricas de Dívidas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Saldo Devedor Restante */}
            <div className="bg-white border border-amber-200/80 rounded-2xl p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Saldo Devedor</span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-700 mt-2">
                {formatCurrency(debtMetrics.remaining_amount)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Valor pendente para quitação</p>
            </div>

            {/* Total Amortizado / Já Pago */}
            <div className="bg-white border border-emerald-200/80 rounded-2xl p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Total Amortizado</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2">
                {formatCurrency(debtMetrics.paid_amount)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total de parcelas já pagas</p>
            </div>

            {/* Total Original em Dívidas */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total em Dívidas</span>
                <div className="p-2 rounded-xl bg-gray-100 text-gray-600">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-2">
                {formatCurrency(debtMetrics.total_amount)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Soma de todas as dívidas cadastradas</p>
            </div>

            {/* Quitação & Status */}
            <div className="bg-white border border-blue-200/80 rounded-2xl p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Progresso de Quitação</span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-blue-700 mt-2">
                {debtMetrics.total_amount > 0
                  ? `${Math.round((debtMetrics.paid_amount / debtMetrics.total_amount) * 100)}%`
                  : '0%'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {debtMetrics.active_count} em aberto • {debtMetrics.paid_count} quitadas
              </p>
            </div>
          </div>

          {/* Barra de Ações & Filtros */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openCreateDebtModal}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                <Plus size={16} className="stroke-[2.5]" />
                <span>Cadastrar Nova Dívida</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Campo de Busca */}
              <div className="relative flex-1 sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar dívida ou empresa..."
                  value={debtSearchQuery}
                  onChange={(e) => setDebtSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') fetchDebts();
                  }}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filtro de Status */}
              <select
                value={debtStatusFilter}
                onChange={(e: any) => setDebtStatusFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 font-semibold px-2.5 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="aberto">Em Aberto / Pendentes</option>
                <option value="todos">Todas as Dívidas</option>
                <option value="paga">Apenas Quitadas</option>
              </select>

              {/* Filtro de Usuário */}
              <select
                value={debtUserFilter}
                onChange={(e) => setDebtUserFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 font-semibold px-2.5 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[160px]"
              >
                <option value="todos">Todos os Usuários</option>
                {partners.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>

              {(debtSearchQuery || debtStatusFilter !== 'aberto' || debtUserFilter !== 'todos') && (
                <button
                  type="button"
                  onClick={() => {
                    setDebtSearchQuery('');
                    setDebtStatusFilter('aberto');
                    setDebtUserFilter('todos');
                  }}
                  className="text-xs text-gray-500 hover:text-gray-800 underline px-1"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Grid de Dívidas */}
          {loadingDebts ? (
            <div className="p-12 text-center text-xs text-gray-500 bg-white rounded-2xl border border-gray-200">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Carregando dívidas...
            </div>
          ) : debts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
              <Receipt size={40} className="mx-auto text-gray-400 mb-2" />
              <h4 className="font-bold text-sm text-gray-800">Nenhuma dívida encontrada</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                {debtSearchQuery || debtStatusFilter !== 'aberto' || debtUserFilter !== 'todos'
                  ? 'Nenhuma dívida corresponde aos filtros aplicados.'
                  : 'Cadastre dívidas, parcelas ou compromissos financeiros para acompanhar amortizações e saldos devedores.'}
              </p>
              <button
                type="button"
                onClick={openCreateDebtModal}
                className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <Plus size={16} />
                <span>Cadastrar Dívida</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {debts.map((d) => {
                const isPaid = d.status === 'paga' || d.remaining_amount <= 0;
                const pctPaid = d.total_amount > 0 ? Math.min(100, Math.round((d.paid_amount / d.total_amount) * 100)) : 0;

                return (
                  <div
                    key={d.id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Topo do Card: Empresa/Credor & Status */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        {d.company_name ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold max-w-[70%] truncate">
                            <Building size={12} className="text-gray-500 shrink-0" />
                            <span className="truncate">{d.company_name}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400 font-medium">Empresa não especificada</span>
                        )}

                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0',
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : d.paid_amount > 0
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          )}
                        >
                          {isPaid ? 'Quitada' : d.paid_amount > 0 ? 'Em Pagamento' : 'Pendente'}
                        </span>
                      </div>

                      {/* Título da Dívida */}
                      <h3 className="font-bold text-base text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">
                        {d.title}
                      </h3>

                      {/* De qual usuário é essa dívida */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium mt-1">
                        <Users size={12} className="text-gray-400 shrink-0" />
                        <span className="text-gray-400 font-normal">Usuário:</span>
                        <span className="font-semibold text-gray-800 truncate">
                          {d.user_name || 'Usuário não vinculado'}
                        </span>
                      </div>

                      {/* Barra de Progresso de Amortização */}
                      <div className="mt-4 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold">
                          <span className="text-gray-500">Progresso</span>
                          <span className={cn(isPaid ? 'text-emerald-700' : 'text-blue-600')}>
                            {pctPaid}% pago
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full transition-all duration-300',
                              isPaid ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                            )}
                            style={{ width: `${pctPaid}%` }}
                          />
                        </div>
                      </div>

                      {/* Grade de Valores: Restante, Total, Pago */}
                      <div className="grid grid-cols-3 gap-2 mt-4 p-3 bg-gray-50 rounded-xl text-center">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            Saldo Restante
                          </span>
                          <span
                            className={cn(
                              'text-xs sm:text-sm font-black block mt-0.5 truncate',
                              isPaid ? 'text-emerald-600' : 'text-rose-600'
                            )}
                          >
                            {formatCurrency(d.remaining_amount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            Total
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-gray-800 block mt-0.5 truncate">
                            {formatCurrency(d.total_amount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            Já Pago
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-emerald-600 block mt-0.5 truncate">
                            {formatCurrency(d.paid_amount)}
                          </span>
                        </div>
                      </div>

                      {/* Informações de Parcelas & Vencimento */}
                      <div className="mt-3 flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1">
                          <Receipt size={13} className="text-gray-400" />
                          <span>
                            {d.total_installments > 1
                              ? `Parcela ${d.paid_installments} de ${d.total_installments}`
                              : 'Pagamento único'}
                          </span>
                        </div>
                        {d.due_date && (
                          <div className="flex items-center gap-1 font-medium text-gray-600">
                            <Calendar size={13} className="text-gray-400" />
                            <span>Venc: {formatDate(d.due_date)}</span>
                          </div>
                        )}
                      </div>

                      {/* Notas / Observações */}
                      {d.notes && (
                        <p className="mt-2.5 text-[11px] text-gray-500 italic line-clamp-2 bg-gray-50/70 p-2 rounded-lg border border-gray-100">
                          {d.notes}
                        </p>
                      )}
                    </div>

                    {/* Rodapé de Ações do Card */}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-1">
                        {!isPaid && (
                          <button
                            type="button"
                            onClick={() => openPayModal(d)}
                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-[0.98] cursor-pointer flex-1"
                            title="Amortizar ou pagar uma parcela desta dívida"
                          >
                            <CreditCard size={14} />
                            <span>Pagar Parcela</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openHistoryModal(d)}
                          className={cn(
                            'flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer',
                            isPaid ? 'flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200' : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
                          )}
                          title="Ver histórico de parcelas e amortizações pagas"
                        >
                          <History size={13} />
                          <span>Histórico</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditDebtModal(d)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar informações da dívida"
                        >
                          <Edit2 size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteDebt(d)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Excluir dívida"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: CRIAR NOVO LANÇAMENTO                              */}
      {/* ======================================================== */}
      {showTransModal && (
        <SafeModalBackdrop
          onClose={handleCloseNewTransModal}
          isDirty={isNewTransDirty}
          confirmMessage="Você possui dados preenchidos no lançamento. Deseja realmente descartar e fechar?"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
          >
            <button
              type="button"
              onClick={handleCloseNewTransModal}
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
                    onChange={(e) => {
                      const nextStatus = e.target.value;
                      setNewTrans({
                        ...newTrans,
                        status: nextStatus,
                        paid_at: nextStatus === 'Pago' ? (newTrans.paid_at || new Date().toISOString().split('T')[0]) : '',
                      });
                    }}
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

              {newTrans.status === 'Pago' && (
                <div>
                  <label className="block text-xs font-semibold text-emerald-700 mb-1">Data do Pagamento *</label>
                  <input
                    type="date"
                    required
                    value={newTrans.paid_at || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setNewTrans({ ...newTrans, paid_at: e.target.value })}
                    className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">Categoria</label>
                    <span className="text-[10px] text-gray-400">Enter para criar</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      list="finance-new-categories-datalist"
                      placeholder="Selecione ou digite nova categoria..."
                      value={newTransCategoryInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewTransCategoryInput(val);
                        const match = categories.find((c) => c.name.toLowerCase() === val.trim().toLowerCase());
                        if (match) {
                          setNewTrans({ ...newTrans, category_id: match.id });
                        } else {
                          setNewTrans({ ...newTrans, category_id: '' });
                        }
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          await handleQuickCreateCategory(newTransCategoryInput, false);
                        }
                      }}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <datalist id="finance-new-categories-datalist">
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.type ? `(${c.type})` : ''}
                        </option>
                      ))}
                    </datalist>
                    {newTransCategoryInput.trim() &&
                      !categories.some((c) => c.name.toLowerCase() === newTransCategoryInput.trim().toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => handleQuickCreateCategory(newTransCategoryInput, false)}
                          className="mt-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Criar categoria &quot;{newTransCategoryInput.trim()}&quot;
                        </button>
                      )}
                  </div>
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
                        {cli.company_name || cli.trade_name || cli.corporate_name || cli.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Responsável *
                  </label>
                  <select
                    required={partners.length > 0}
                    value={newTrans.partner_id}
                    onChange={(e) => setNewTrans({ ...newTrans, partner_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {partners.length === 0 && <option value="">Usuário Atual</option>}
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
        </SafeModalBackdrop>
      )}

      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* MODAL: EDITAR LANÇAMENTO                                  */}
      {/* ======================================================== */}
      {editingTrans && (
        <SafeModalBackdrop
          onClose={handleCloseEditTransModal}
          isDirty={true}
          confirmMessage="Deseja realmente fechar a edição do lançamento? Alterações não salvas serão perdidas."
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
          >
            <button
              type="button"
              onClick={handleCloseEditTransModal}
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
                    onChange={(e) => {
                      const nextStatus = e.target.value;
                      setEditTransForm({
                        ...editTransForm,
                        status: nextStatus,
                        paid_at: nextStatus === 'Pago' ? (editTransForm.paid_at || new Date().toISOString().split('T')[0]) : '',
                      });
                    }}
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

              {editTransForm.status === 'Pago' && (
                <div>
                  <label className="block text-xs font-semibold text-emerald-700 mb-1">Data do Pagamento *</label>
                  <input
                    type="date"
                    required
                    value={editTransForm.paid_at ? editTransForm.paid_at.split('T')[0] : new Date().toISOString().split('T')[0]}
                    onChange={(e) => setEditTransForm({ ...editTransForm, paid_at: e.target.value })}
                    className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">Categoria</label>
                    <span className="text-[10px] text-gray-400">Enter para criar</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      list="finance-edit-categories-datalist"
                      placeholder="Selecione ou digite nova categoria..."
                      value={editTransCategoryInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditTransCategoryInput(val);
                        const match = categories.find((c) => c.name.toLowerCase() === val.trim().toLowerCase());
                        if (match) {
                          setEditTransForm({ ...editTransForm, category_id: match.id });
                        } else {
                          setEditTransForm({ ...editTransForm, category_id: '' });
                        }
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          await handleQuickCreateCategory(editTransCategoryInput, true);
                        }
                      }}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <datalist id="finance-edit-categories-datalist">
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.type ? `(${c.type})` : ''}
                        </option>
                      ))}
                    </datalist>
                    {editTransCategoryInput.trim() &&
                      !categories.some((c) => c.name.toLowerCase() === editTransCategoryInput.trim().toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => handleQuickCreateCategory(editTransCategoryInput, true)}
                          className="mt-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Criar categoria &quot;{editTransCategoryInput.trim()}&quot;
                        </button>
                      )}
                  </div>
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
                        {cli.company_name || cli.trade_name || cli.corporate_name || cli.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Responsável *
                  </label>
                  <select
                    required
                    value={editTransForm.partner_id}
                    onChange={(e) => setEditTransForm({ ...editTransForm, partner_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {partners.length === 0 && <option value="">Nenhum usuário cadastrado</option>}
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
        </SafeModalBackdrop>
      )}

      {/* ======================================================== */}
      {/* MODAL: CADASTRAR OU EDITAR DÍVIDA                        */}
      {/* ======================================================== */}
      {showDebtModal && (
        <SafeModalBackdrop
          onClose={handleCloseDebtModal}
          isDirty={isDebtDirty}
          confirmMessage="Você possui dados preenchidos na dívida. Deseja realmente descartar e fechar?"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
          >
            <button
              type="button"
              onClick={handleCloseDebtModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-600" />
              {editingDebt ? 'Editar Dívida' : 'Cadastrar Nova Dívida'}
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              {editingDebt
                ? 'Atualize os dados e condições desta dívida.'
                : 'Cadastre uma nova dívida ou compromisso financeiro para controle de amortização.'}
            </p>

            <form onSubmit={handleSaveDebt} className="space-y-4">
              {/* Título / Descrição */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Título / Descrição da Dívida *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Empréstimo Bancário, Compra de Câmeras, Cartão..."
                  value={debtForm.title}
                  onChange={(e) => setDebtForm({ ...debtForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Valor Total e Parcelas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Valor Total da Dívida (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0,00"
                    value={debtForm.total_amount}
                    onChange={(e) => setDebtForm({ ...debtForm, total_amount: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Número de Parcelas
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={debtForm.total_installments}
                    onChange={(e) => setDebtForm({ ...debtForm, total_installments: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">1 para pagamento único</span>
                </div>
              </div>

              {/* Usuário Responsável */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  De qual usuário é essa dívida? *
                </label>
                <select
                  required
                  value={debtForm.user_id}
                  onChange={(e) => setDebtForm({ ...debtForm, user_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">Selecione o usuário responsável...</option>
                  {partners.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.job_title || u.role || 'Membro'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Empresa / Credor com livre digitação ou sugestão de clientes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Qual empresa / credor?
                </label>
                <input
                  type="text"
                  list="debt-company-list"
                  placeholder="Ex: Banco Santander, Apple, Fornecedor X (livre digitação)..."
                  value={debtForm.company_name}
                  onChange={(e) => setDebtForm({ ...debtForm, company_name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="debt-company-list">
                  {clients.map((c) => (
                    <option key={c.id} value={c.company_name || c.name}>
                      {c.company_name || c.name} (Cliente Cadastrado)
                    </option>
                  ))}
                </datalist>
                <p className="text-[10px] text-gray-400 mt-1">
                  Não precisa ser uma empresa cadastrada. Você pode digitar apenas o nome que desejar.
                </p>
              </div>

              {/* Data de Vencimento */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Data de Vencimento / Prazo
                </label>
                <input
                  type="date"
                  value={debtForm.due_date}
                  onChange={(e) => setDebtForm({ ...debtForm, due_date: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Observações / Detalhes
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais, taxa de juros, chave pix, etc..."
                  value={debtForm.notes}
                  onChange={(e) => setDebtForm({ ...debtForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Rodapé com Botões */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseDebtModal}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-xl text-xs hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {isSubmitting ? 'Salvando...' : editingDebt ? 'Salvar Alterações' : 'Cadastrar Dívida'}
                </button>
              </div>
            </form>
          </div>
        </SafeModalBackdrop>
      )}

      {/* ======================================================== */}
      {/* MODAL: PAGAR PARCELA OU AMORTIZAR DÍVIDA                 */}
      {/* ======================================================== */}
      {showPayModal && payingDebt && (
        <SafeModalBackdrop
          onClose={handleClosePayModal}
          isDirty={isPayDirty}
          confirmMessage="Você possui dados preenchidos no pagamento. Deseja realmente descartar e fechar?"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
          >
            <button
              type="button"
              onClick={handleClosePayModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              Pagar Parcela / Amortizar Dívida
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Ao registrar este pagamento, o saldo devedor da dívida será automaticamente reduzido.
            </p>

            {/* Resumo da Dívida */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900 text-sm">{payingDebt.title}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-emerald-700 border border-emerald-200">
                  {payingDebt.total_installments > 1
                    ? `Parcela ${Number(payingDebt.paid_installments) + 1} de ${payingDebt.total_installments}`
                    : 'Pagamento'}
                </span>
              </div>
              {payingDebt.company_name && (
                <p className="text-xs text-gray-600 flex items-center gap-1.5">
                  <Building size={12} className="text-emerald-700" />
                  <span>{payingDebt.company_name}</span>
                </p>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-emerald-200/60 text-xs">
                <span className="text-gray-600">Saldo Devedor Atual:</span>
                <span className="font-black text-rose-600 text-sm">
                  {formatCurrency(payingDebt.remaining_amount)}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4">
              {/* Valor a Pagar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Valor a Pagar / Amortizar (R$) *
                  </label>
                  <div className="flex items-center gap-1">
                    {payingDebt.total_installments > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const perInstallment = Math.round((payingDebt.total_amount / payingDebt.total_installments) * 100) / 100;
                          const val = Math.min(payingDebt.remaining_amount, perInstallment);
                          setPayForm({ ...payForm, amount: String(val) });
                        }}
                        className="text-[10px] font-semibold text-blue-600 hover:underline px-1"
                      >
                        Parcela Sugerida
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPayForm({ ...payForm, amount: String(payingDebt.remaining_amount) })}
                      className="text-[10px] font-semibold text-emerald-700 hover:underline px-1"
                    >
                      Quitar Total ({formatCurrency(payingDebt.remaining_amount)})
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={payingDebt.remaining_amount}
                  required
                  placeholder="0,00"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 font-black focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Data e Forma de Pagamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Data do Pagamento *
                  </label>
                  <input
                    type="date"
                    required
                    value={payForm.payment_date}
                    onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={payForm.payment_method}
                    onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Boleto">Boleto Bancário</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Transferência">Transferência Bancária</option>
                    <option value="Dinheiro">Dinheiro em Espécie</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              {/* Checkbox para sincronizar com fluxo de caixa como despesa */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={payForm.create_transaction}
                  onChange={(e) => setPayForm({ ...payForm, create_transaction: e.target.checked })}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-gray-800 block">
                    Registrar saída no fluxo de caixa geral
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Gera automaticamente um lançamento de despesa paga na aba Despesas da agência.
                  </span>
                </div>
              </label>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Comprovante / Observações
                </label>
                <input
                  type="text"
                  placeholder="Ex: Comprovante Itaú nº 981273, chave pix..."
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Rodapé com Botões */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleClosePayModal}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2 bg-emerald-600 text-white font-semibold rounded-xl text-xs hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {submittingPayment ? 'Registrando...' : 'Confirmar Pagamento'}
                </button>
              </div>
            </form>
          </div>
        </SafeModalBackdrop>
      )}

      {/* ======================================================== */}
      {/* MODAL: HISTÓRICO DE PAGAMENTOS DA DÍVIDA                */}
      {/* ======================================================== */}
      {showHistoryModal && historyDebt && (
        <SafeModalBackdrop
          onClose={() => {
            setShowHistoryModal(false);
            setHistoryDebt(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-xl shadow-2xl relative max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200"
          >
            <button
              type="button"
              onClick={() => {
                setShowHistoryModal(false);
                setHistoryDebt(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                Histórico de Pagamentos
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Dívida: <strong className="text-gray-800">{historyDebt.title}</strong>
                {historyDebt.company_name ? ` • ${historyDebt.company_name}` : ''}
              </p>
            </div>

            {/* Resumo do Saldo */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-xl mb-4 text-center shrink-0">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Dívida</span>
                <span className="text-xs sm:text-sm font-bold text-gray-800 block mt-0.5">
                  {formatCurrency(historyDebt.total_amount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Pago</span>
                <span className="text-xs sm:text-sm font-bold text-emerald-600 block mt-0.5">
                  {formatCurrency(historyDebt.paid_amount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Saldo Restante</span>
                <span className="text-xs sm:text-sm font-black text-rose-600 block mt-0.5">
                  {formatCurrency(historyDebt.remaining_amount)}
                </span>
              </div>
            </div>

            {/* Lista com rolagem dos pagamentos */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px]">
              {loadingHistory ? (
                <div className="py-8 text-center text-xs text-gray-500">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Carregando histórico...
                </div>
              ) : debtPayments.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  <Receipt size={32} className="mx-auto text-gray-300 mb-2" />
                  Nenhum pagamento registrado ainda para esta dívida.
                </div>
              ) : (
                debtPayments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">
                          {p.installment_number ? `Parcela ${p.installment_number}` : 'Pagamento'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-semibold">
                          {p.payment_method || 'PIX'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {formatDate(p.payment_date)}
                        {p.notes ? ` • ${p.notes}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-emerald-600">
                        - {formatCurrency(p.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeletePayment(p.id)}
                        className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Estornar pagamento (o saldo devedor será recalculado)"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowHistoryModal(false);
                  setHistoryDebt(null);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </SafeModalBackdrop>
      )}

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={() => {
          confirmState.onConfirm();
          setConfirmState({ ...confirmState, isOpen: false });
        }}
        onCancel={() => setConfirmState({ ...confirmState, isOpen: false })}
      />
    </div>
  );
}
