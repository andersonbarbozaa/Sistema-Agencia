'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ConfirmModal from '@/components/ConfirmModal';
import {
  Settings,
  Users,
  Briefcase,
  Layers,
  CreditCard,
  Bot,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Save,
  Trash2,
  Edit2,
  X,
  Shield,
  Key,
  User,
  DollarSign,
  TrendingUp,
  Sparkles,
  Lock,
  Globe,
  Ban,
  Building2,
  Copy,
  Check,
  Link as LinkIcon,
} from 'lucide-react';
import { Position, TaskCategory, FinancialCategory, BankAccount } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';

function SettingsContent() {
  const searchParams = useSearchParams();
  const [confirmState, setConfirmState] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const initialTab = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'users' | 'categories' | 'finance' | 'ai'>(
    initialTab && ['profile', 'users', 'categories', 'finance', 'ai'].includes(initialTab)
      ? (initialTab as any)
      : 'overview'
  );
  const [loading, setLoading] = useState(true);

  // Entities
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [taskCategories, setTaskCategories] = useState<TaskCategory[]>([]);
  const [financialCategories, setFinancialCategories] = useState<FinancialCategory[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});

  // MY PROFILE FORM
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    job_title: 'Administrador',
    avatar_url: '',
    company_name: 'PixelCraft Studio',
    company_description: '',
    new_password: '',
    confirm_password: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // USER MODALS
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'COLABORADOR',
    position_id: '',
    client_id: '',
    is_partner: 0,
    status: 'ativo',
  });

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'COLABORADOR',
    position_id: '',
    client_id: '',
    is_partner: 0,
    status: 'ativo',
    new_password: '',
  });

  // POSITION (CARGO) MODALS
  const [newPositionName, setNewPositionName] = useState('');
  const [newPositionDesc, setNewPositionDesc] = useState('');
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [editPosForm, setEditPosForm] = useState({ name: '', description: '' });

  // CATEGORY MODALS
  const [newCatTarget, setNewCatTarget] = useState<'tasks' | 'finance'>('tasks');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6');
  const [newCategoryType, setNewCategoryType] = useState('both');
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [editCatForm, setEditCatForm] = useState({
    target: 'tasks',
    name: '',
    color: '#3b82f6',
    type: 'both',
  });

  // BANK ACCOUNT MODALS
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountForm, setAccountForm] = useState({
    name: '',
    bank: '',
    type: 'Corrente',
    currency: 'BRL',
    initial_balance: '0',
    responsible_partner_id: '',
    status: 'ativo',
  });

  // FINANCIAL SETTINGS (GOAL, CURRENCY, EXCHANGE)
  const [finSettings, setFinSettings] = useState({
    monthly_revenue_goal: '50000',
    default_currency: 'BRL',
    exchange_rate_usd: '5.50',
    exchange_rate_eur: '6.00',
  });
  const [finSaving, setFinSaving] = useState(false);
  const [finSuccess, setFinSuccess] = useState(false);

  // AI SETTINGS
  const [aiSettings, setAiSettings] = useState({
    ai_system_instructions: '',
    ai_require_confirmation: 'true',
  });
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync tab with URL
  useEffect(() => {
    if (initialTab && ['profile', 'users', 'categories', 'finance', 'ai'].includes(initialTab)) {
      setActiveTab(initialTab as any);
    } else if (!initialTab) {
      setActiveTab('overview');
    }
  }, [initialTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [uRes, pRes, cRes, aRes, sRes, cliRes, meRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/positions'),
        fetch('/api/categories?type=all'),
        fetch('/api/bank-accounts'),
        fetch('/api/settings'),
        fetch('/api/clients'),
        fetch('/api/auth/me'),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        const me = meData.user;
        setCurrentUser(me);
        setProfileForm({
          name: me.name || '',
          email: me.email || '',
          phone: me.phone || '',
          job_title: me.job_title || 'Administrador',
          avatar_url: me.avatar_url || '',
          company_name: me.workspace_name || 'PixelCraft Studio',
          company_description: me.workspace_description || '',
          new_password: '',
          confirm_password: '',
        });
      }

      if (uRes.ok) {
        const d = await uRes.json();
        setUsers(d.users || d.data || []);
      }
      if (pRes.ok) {
        const d = await pRes.json();
        setPositions(d.positions || d.data || []);
      }
      if (cRes.ok) {
        const d = await cRes.json();
        setTaskCategories(d.task_categories || []);
        setFinancialCategories(d.financial_categories || []);
      }
      if (aRes.ok) {
        const d = await aRes.json();
        setBankAccounts(d.accounts || d.data || []);
      }
      if (sRes.ok) {
        const d = await sRes.json();
        setSettings(d);
        if (d.settings) {
          setFinSettings({
            monthly_revenue_goal: d.settings.monthly_revenue_goal || '50000',
            default_currency: d.settings.default_currency || 'BRL',
            exchange_rate_usd: d.settings.exchange_rate_usd || '5.50',
            exchange_rate_eur: d.settings.exchange_rate_eur || '6.00',
          });
          setAiSettings({
            ai_system_instructions: d.settings.ai_system_instructions || '',
            ai_require_confirmation: d.settings.ai_require_confirmation || 'true',
          });
        }
      }
      if (cliRes.ok) {
        const d = await cliRes.json();
        setClients(d.clients || d.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update My Profile & Company Data
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (profileForm.new_password && profileForm.new_password !== profileForm.confirm_password) {
      alert('A nova senha e a confirmação não coincidem.');
      return;
    }

    try {
      setProfileSaving(true);
      const userPayload: any = {
        name: profileForm.name,
        phone: profileForm.phone,
        job_title: profileForm.job_title || 'Administrador',
        avatar_url: profileForm.avatar_url,
      };
      if (profileForm.new_password) {
        userPayload.new_password = profileForm.new_password;
      }

      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userPayload),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Erro ao atualizar perfil.');
        return;
      }

      // If user is Admin, also update company details (workspace)
      if (currentUser.role === 'ADMINISTRADOR') {
        if (!profileForm.company_name?.trim()) {
          alert('O Nome da Empresa é obrigatório.');
          return;
        }

        const wsRes = await fetch('/api/workspaces/current', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: profileForm.company_name.trim(),
            description: profileForm.company_description ? profileForm.company_description.trim() : null,
          }),
        });

        if (!wsRes.ok) {
          const err = await wsRes.json();
          alert(err.error || 'Erro ao atualizar dados da empresa.');
          return;
        }
      }

      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setProfileSaving(false);
    }
  };

  // Save Financial Settings
  const handleSaveFinSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFinSaving(true);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finSettings),
      });

      if (res.ok) {
        setFinSuccess(true);
        setTimeout(() => setFinSuccess(false), 3000);
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao salvar configurações.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFinSaving(false);
    }
  };

  // Save AI Settings
  const handleSaveAiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAiSaving(true);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiSettings),
      });

      if (res.ok) {
        setAiSuccess(true);
        setTimeout(() => setAiSuccess(false), 3000);
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao salvar configurações de IA.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiSaving(false);
    }
  };

  // --- USER HANDLERS ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email || !newUser.password) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      if (res.ok) {
        setShowCreateUserModal(false);
        setNewUser({
          name: '',
          email: '',
          password: '',
          phone: '',
          role: 'COLABORADOR',
          position_id: '',
          client_id: '',
          is_partner: 0,
          status: 'ativo',
        });
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao cadastrar usuário.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditUser = (user: any) => {
    setEditingUser(user);
    setEditUserForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'COLABORADOR',
      position_id: user.position_id || '',
      client_id: user.client_id || '',
      is_partner: user.is_partner ? 1 : 0,
      status: user.status || 'ativo',
      new_password: '',
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setIsSubmitting(true);
      const payload: any = {
        name: editUserForm.name,
        phone: editUserForm.phone,
        role: editUserForm.role,
        position_id: editUserForm.position_id || null,
        client_id: editUserForm.client_id || null,
        is_partner: editUserForm.is_partner,
        status: editUserForm.status,
      };
      if (editUserForm.new_password) {
        payload.password = editUserForm.new_password;
      }

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditingUser(null);
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao atualizar usuário.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- POSITION HANDLERS ---
  const handleCreatePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPositionName.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPositionName.trim(), description: newPositionDesc }),
      });

      if (res.ok) {
        setNewPositionName('');
        setNewPositionDesc('');
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao criar cargo.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditPosition = (pos: Position) => {
    setEditingPosition(pos);
    setEditPosForm({ name: pos.name, description: pos.description || '' });
  };

  const handleUpdatePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPosition || !editPosForm.name.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/positions/${editingPosition.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPosForm),
      });

      if (res.ok) {
        setEditingPosition(null);
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao atualizar cargo.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePosition = async () => {
    if (!editingPosition) return;

    setConfirmState({
      isOpen: true,
      title: 'Remover Cargo',
      message: `Deseja realmente remover o cargo "${editingPosition.name}"?`,
      onConfirm: async () => {
        try {
          setIsSubmitting(true);
          const res = await fetch(`/api/positions/${editingPosition.id}`, {
            method: 'DELETE',
          });

          if (res.ok) {
            setEditingPosition(null);
            await fetchData();
          } else {
            const err = await res.json();
            alert(err.error || 'Erro ao excluir cargo.');
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsSubmitting(false);
          setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // --- CATEGORY HANDLERS ---
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/categories?target=${newCatTarget}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          color: newCategoryColor,
          type: newCategoryType,
        }),
      });

      if (res.ok) {
        setNewCategoryName('');
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao cadastrar categoria.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditCategory = (cat: any, target: 'tasks' | 'finance') => {
    setEditingCategory(cat);
    setEditCatForm({
      target,
      name: cat.name,
      color: cat.color || '#3b82f6',
      type: cat.type || 'both',
    });
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCatForm.name.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/categories/${editingCategory.id}?target=${editCatForm.target}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editCatForm.name.trim(),
          color: editCatForm.color,
          type: editCatForm.type,
        }),
      });

      if (res.ok) {
        setEditingCategory(null);
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao atualizar categoria.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!editingCategory) return;

    setConfirmState({
      isOpen: true,
      title: 'Remover Categoria',
      message: `Deseja realmente remover a categoria "${editingCategory.name}"?`,
      onConfirm: async () => {
        try {
          setIsSubmitting(true);
          const res = await fetch(`/api/categories/${editingCategory.id}?target=${editCatForm.target}`, {
            method: 'DELETE',
          });

          if (res.ok) {
            setEditingCategory(null);
            await fetchData();
          } else {
            const err = await res.json();
            alert(err.error || 'Erro ao excluir categoria.');
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsSubmitting(false);
          setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // --- BANK ACCOUNT HANDLERS ---
  const openAccountModal = (acc?: BankAccount) => {
    if (acc) {
      setEditingAccount(acc);
      setAccountForm({
        name: acc.name || '',
        bank: acc.bank || '',
        type: acc.type || 'Corrente',
        currency: acc.currency || 'BRL',
        initial_balance: String(acc.initial_balance || 0),
        responsible_partner_id: acc.responsible_partner_id || '',
        status: acc.status || 'ativo',
      });
    } else {
      setEditingAccount(null);
      setAccountForm({
        name: '',
        bank: '',
        type: 'Corrente',
        currency: 'BRL',
        initial_balance: '0',
        responsible_partner_id: '',
        status: 'ativo',
      });
    }
    setShowAccountModal(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.name || !accountForm.bank) return;

    try {
      setIsSubmitting(true);
      const url = editingAccount ? `/api/bank-accounts/${editingAccount.id}` : '/api/bank-accounts';
      const method = editingAccount ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...accountForm,
          initial_balance: parseFloat(accountForm.initial_balance) || 0,
        }),
      });

      if (res.ok) {
        setShowAccountModal(false);
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao salvar conta bancária.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!editingAccount) return;

    setConfirmState({
      isOpen: true,
      title: 'Excluir Conta',
      message: `Deseja realmente desativar/excluir a conta "${editingAccount.name}"?`,
      onConfirm: async () => {
        try {
          setIsSubmitting(true);
          const res = await fetch(`/api/bank-accounts/${editingAccount.id}`, {
            method: 'DELETE',
          });

          if (res.ok) {
            setShowAccountModal(false);
            await fetchData();
          } else {
            const err = await res.json();
            alert(err.error || 'Erro ao excluir conta.');
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsSubmitting(false);
          setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ======================================================== */}
      {/* OVERVIEW: CARDS DOS SUBMENUS (Requisito usuário)           */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Card 1: Meu Perfil */}
            <div
              onClick={() => setActiveTab('profile')}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  Meu Perfil
                </h3>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                  Altere seus dados pessoais, telefone, avatar de exibição e alteração de senha de acesso.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-blue-600">
                <span>Configurar perfil &rarr;</span>
                <span className="text-[11px] text-gray-400 font-normal truncate max-w-[140px]">{currentUser?.email}</span>
              </div>
            </div>

            {/* Card 2: Usuários & Cargos */}
            <div
              onClick={() => setActiveTab('users')}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">
                  Usuários & Cargos
                </h3>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                  Cadastre membros da equipe, defina níveis de permissão e configure a estrutura de cargos da agência.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-emerald-600">
                <span>Gerenciar equipe &rarr;</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                  {users.length} cadastrados
                </span>
              </div>
            </div>

            {/* Card 3: Categorias do Sistema */}
            <div
              onClick={() => setActiveTab('categories')}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                  Categorias do Sistema
                </h3>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                  Configure os tipos de serviços criativos, cores de status, etapas de produção e categorias gerais.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-purple-600">
                <span>Configurar categorias &rarr;</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[11px] font-bold">
                  {taskCategories.length} categorias
                </span>
              </div>
            </div>

            {/* Card 4: Financeiro */}
            <div
              onClick={() => setActiveTab('finance')}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                  Configurações Financeiras
                </h3>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                  Defina a meta de receita mensal, moeda padrão, cotações de moedas e cadastre contas bancárias.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-amber-600">
                <span>Ajustar finanças &rarr;</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold">
                  {bankAccounts.length} contas
                </span>
              </div>
            </div>

            {/* Card 5: Assistente de IA */}
            <div
              onClick={() => setActiveTab('ai')}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Bot className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  Assistente de IA
                </h3>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                  Personalize o prompt de inteligência artificial, diretrizes da agência e validações de comandos.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                <span>Personalizar IA &rarr;</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold">
                  Gemini API
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs (Exibidas quando dentro de um submenu) */}
      {activeTab !== 'overview' && (
        <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 flex items-center gap-1.5 transition-colors border border-gray-200 bg-gray-50"
            >
              &larr; Voltar aos Submenus
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all',
                activeTab === 'profile'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              )}
            >
              <User className="w-3.5 h-3.5" /> Meu Perfil
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all',
                activeTab === 'users'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              )}
            >
              <Users className="w-3.5 h-3.5" /> Usuários & Cargos ({users.length})
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all',
                activeTab === 'categories'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              )}
            >
              <Layers className="w-3.5 h-3.5" /> Categorias ({taskCategories.length})
            </button>

            <button
              onClick={() => setActiveTab('finance')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all',
                activeTab === 'finance'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              )}
            >
              <CreditCard className="w-3.5 h-3.5" /> Financeiro ({bankAccounts.length})
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all',
                activeTab === 'ai'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              )}
            >
              <Bot className="w-3.5 h-3.5" /> Assistente de IA
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: MEU PERFIL & DADOS DA EMPRESA                       */}
      {/* ======================================================== */}
      {activeTab === 'profile' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm max-w-3xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
              {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Configuração do Meu Perfil</h3>
              <p className="text-xs text-gray-500">Atualize suas informações pessoais, cargo e dados da empresa</p>
            </div>
          </div>

          {profileSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} /> Configurações atualizadas com sucesso!
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {/* Seção 1: Dados da Empresa (Área 1 da Barra Lateral - apenas para Administrador) */}
            {currentUser?.role === 'ADMINISTRADOR' && (
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200/80">
                  <Building2 size={16} className="text-blue-600" />
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Dados da Empresa (Workspace)
                  </h4>
                </div>
                <p className="text-[11px] text-gray-500">
                  Estas informações são exibidas no topo da barra lateral e definem a identidade da sua área de trabalho.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Nome da Empresa *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: PixelCraft Studio"
                      value={profileForm.company_name}
                      onChange={(e) => setProfileForm({ ...profileForm, company_name: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Ramo de Atuação (Descrição Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Audiovisual & Criativo"
                      value={profileForm.company_description}
                      onChange={(e) => setProfileForm({ ...profileForm, company_description: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Link de Convite para Colaboradores */}
                <div className="pt-3 border-t border-gray-200/80">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Link de Convite para Membros & Colaboradores
                  </label>
                  <p className="text-[11px] text-gray-500 mb-2">
                    Envie este link para que novos membros se cadastrem diretamente nesta empresa.
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-600 font-mono select-all truncate">
                      {typeof window !== 'undefined'
                        ? `${window.location.origin}/registo?invite=${currentUser?.workspace_invite_code || currentUser?.workspace_id || ''}`
                        : `/registo?invite=${currentUser?.workspace_invite_code || currentUser?.workspace_id || ''}`}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          const url = `${window.location.origin}/registo?invite=${currentUser?.workspace_invite_code || currentUser?.workspace_id || ''}`;
                          navigator.clipboard.writeText(url);
                          setCopiedInvite(true);
                          setTimeout(() => setCopiedInvite(false), 2500);
                        }
                      }}
                      className={cn(
                        'px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs flex-shrink-0',
                        copiedInvite
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                      )}
                    >
                      {copiedInvite ? (
                        <>
                          <Check size={14} /> Copiado!
                        </>
                      ) : (
                        <>
                          <Copy size={14} /> Copiar Link
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Seção 2: Dados Pessoais do Utilizador */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <User size={15} className="text-blue-600" /> Dados Pessoais & Cargo
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Na barra lateral, o primeiro nome é exibido a negrito e o sobrenome em texto simples.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cargo / Função *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Administrador, Diretor Criativo, etc."
                    value={profileForm.job_title}
                    onChange={(e) => setProfileForm({ ...profileForm, job_title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Exibido abaixo do seu nome na barra lateral.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Foto de Perfil (URL da Imagem)</label>
                <div className="flex items-center gap-3">
                  {profileForm.avatar_url ? (
                    <img
                      src={profileForm.avatar_url}
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
                    placeholder="https://exemplo.com/sua-foto.jpg"
                    value={profileForm.avatar_url}
                    onChange={(e) => setProfileForm({ ...profileForm, avatar_url: e.target.value })}
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    disabled
                    value={profileForm.email}
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(18) 99999-9999"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Seção 3: Alterar Senha */}
            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Lock size={14} className="text-blue-600" /> Alterar Senha (Opcional)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nova Senha</label>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={profileForm.new_password}
                    onChange={(e) => setProfileForm({ ...profileForm, new_password: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    placeholder="Repita a nova senha"
                    value={profileForm.confirm_password}
                    onChange={(e) => setProfileForm({ ...profileForm, confirm_password: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={profileSaving}
                className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl text-xs hover:bg-blue-500 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={14} />
                {profileSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: USUÁRIOS & CARGOS (Requisito usuário)              */}
      {/* ======================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-8">
          {/* Seção 1: Lista de Usuários */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Equipe & Usuários da Agência
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Gerenciamento de contas, cargos e níveis de acesso (Admin, Colaborador, Cliente).
                </p>
              </div>

              <button
                onClick={() => setShowCreateUserModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
              >
                <Plus size={14} />
                Novo Usuário
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 bg-gray-50 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3">Usuário</th>
                    <th className="py-3 px-3">Cargo / Função</th>
                    <th className="py-3 px-3">Nível de Acesso</th>
                    <th className="py-3 px-3">Sócio / Parceiro</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt={u.name}
                              className="w-8 h-8 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-gray-900">{u.name}</div>
                            <div className="text-[11px] text-gray-400">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-gray-600 font-medium">
                        {u.position_name || 'Sem cargo atribuído'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'ADMINISTRADOR'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : u.role === 'CLIENTE'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {u.is_partner ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Sim
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px]">Não</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'inativo'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {u.status || 'Ativo'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => openEditUser(u)}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-xs transition-colors"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Seção 2: Cargos & Especialidades (Abaixo dos usuários) */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="pb-4 border-b border-gray-100 mb-6">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                Cargos & Especialidades Criativas
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Cargos vinculáveis aos colaboradores (ex: Editor de Vídeo, Filmmaker, Designer, Copywriter).
              </p>
            </div>

            {/* Form Novo Cargo */}
            <form onSubmit={handleCreatePosition} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <input
                type="text"
                required
                placeholder="Título do Cargo (ex: Colorista Sênior)..."
                value={newPositionName}
                onChange={(e) => setNewPositionName(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Descrição resumida (opcional)..."
                value={newPositionDesc}
                onChange={(e) => setNewPositionDesc(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm whitespace-nowrap"
              >
                + Adicionar Cargo
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {positions.map((pos) => (
                <div
                  key={pos.id}
                  onClick={() => openEditPosition(pos)}
                  className="bg-gray-50 border border-gray-200 hover:border-blue-400 p-4 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div>
                    <h4 className="font-bold text-xs text-gray-900 group-hover:text-blue-600 transition-colors">
                      {pos.name}
                    </h4>
                    {pos.description && (
                      <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{pos.description}</p>
                    )}
                  </div>
                  <Edit2 size={14} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: CATEGORIAS DO SISTEMA (Exceto financeiras)         */}
      {/* ======================================================== */}
      {activeTab === 'categories' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="pb-4 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Categorias do Sistema (Tarefas, Produção & CRM)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Etiquetas e categorias para organizar tarefas, etapas da esteira criativa e tipos de serviços.
            </p>
          </div>

          {/* Form Nova Categoria de Tarefas */}
          <form onSubmit={handleCreateCategory} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <input
              type="text"
              required
              placeholder="Nome da categoria (ex: Edição de Vídeo, Motion Design, Branding)..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Cor:</span>
              <input
                type="color"
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
                className="w-9 h-9 rounded-xl border border-gray-200 cursor-pointer bg-white p-0.5"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm whitespace-nowrap"
            >
              + Adicionar Categoria
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {taskCategories.map((cat) => (
              <div
                key={cat.id}
                onClick={() => openEditCategory(cat, 'tasks')}
                className="bg-gray-50 border border-gray-200 hover:border-blue-400 p-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color || '#3b82f6' }}
                  />
                  <span className="text-xs font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                    {cat.name}
                  </span>
                </div>
                <Edit2 size={13} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: FINANCEIRO (Contas, Moeda, Meta, Categorias Fin)   */}
      {/* ======================================================== */}
      {activeTab === 'finance' && (
        <div className="space-y-8">
          {/* Seção 1: Contas Bancárias */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  Contas Bancárias da Agência
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure contas, defina a moeda de operação, saldo inicial e parceiro responsável.
                </p>
              </div>

              <button
                onClick={() => openAccountModal()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
              >
                <Plus size={14} />
                Nova Conta Bancária
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {bankAccounts.map((acc) => (
                <div
                  key={acc.id}
                  onClick={() => openAccountModal(acc)}
                  className="bg-gray-50 border border-gray-200 hover:border-blue-400 p-4 rounded-xl cursor-pointer transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">
                        {acc.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">{acc.bank} • {acc.type}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      {acc.currency || 'BRL'}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Saldo Atual:</span>
                    <span className="text-sm font-bold text-gray-900">
                      {acc.currency === 'USD' ? '$ ' : acc.currency === 'EUR' ? '€ ' : 'R$ '}
                      {(acc.current_balance ?? acc.initial_balance ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seção 2: Moeda Padrão & Meta de Receita */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="pb-4 border-b border-gray-100 mb-6">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                Parâmetros Financeiros Globais
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Defina a moeda padrão do sistema (onde todas as outras são convertidas) e a meta mensal.
              </p>
            </div>

            {finSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} /> Parâmetros financeiros salvos com sucesso!
              </div>
            )}

            <form onSubmit={handleSaveFinSettings} className="space-y-4 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Meta de Receita Mensal (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={finSettings.monthly_revenue_goal}
                    onChange={(e) => setFinSettings({ ...finSettings, monthly_revenue_goal: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Exibida no Dashboard com barra de progresso</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Moeda Padrão do Sistema
                  </label>
                  <select
                    value={finSettings.default_currency}
                    onChange={(e) => setFinSettings({ ...finSettings, default_currency: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="BRL">Real Brasileiro (BRL)</option>
                    <option value="USD">Dólar Americano (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Cotação Dólar (USD / BRL)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={finSettings.exchange_rate_usd}
                    onChange={(e) => setFinSettings({ ...finSettings, exchange_rate_usd: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Cotação Euro (EUR / BRL)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={finSettings.exchange_rate_eur}
                    onChange={(e) => setFinSettings({ ...finSettings, exchange_rate_eur: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={finSaving}
                  className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-xl text-xs hover:bg-blue-500 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  <Save size={14} />
                  {finSaving ? 'Salvando...' : 'Salvar Parâmetros'}
                </button>
              </div>
            </form>
          </div>

          {/* Seção 3: Categorias Financeiras */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="pb-4 border-b border-gray-100 mb-6">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                Categorias Financeiras (Plano de Contas)
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Classificação para receitas e despesas da agência.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {financialCategories.map((c) => (
                <div
                  key={c.id}
                  onClick={() => openEditCategory(c, 'finance')}
                  className="bg-gray-50 border border-gray-200 hover:border-blue-400 p-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.type?.toLowerCase() === 'entrada' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {c.type}
                    </span>
                    <span className="text-xs font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                      {c.name}
                    </span>
                  </div>
                  <Edit2 size={13} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: ASSISTENTE DE IA (Configurações)                   */}
      {/* ======================================================== */}
      {activeTab === 'ai' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6 max-w-2xl">
          <div className="pb-4 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-600" />
              Configurações do Assistente de IA
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Personalize o comportamento, modelo e instruções personalizadas do Gemini.
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="text-xs text-blue-900">
              <span className="font-bold">Status do Gemini: </span>
              {settings.gemini_configured ? (
                <span className="text-emerald-700 font-bold">Ativo & Conectado (Chave API configurada)</span>
              ) : (
                <span className="text-amber-700 font-bold">Aguardando chave GEMINI_API_KEY no arquivo .env</span>
              )}
            </div>
          </div>

          {aiSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} /> Configurações de IA salvas com sucesso!
            </div>
          )}

          <form onSubmit={handleSaveAiSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Instruções Personalizadas do Sistema (System Prompt)
              </label>
              <textarea
                rows={4}
                placeholder="Ex: A agência atende principalmente produtoras e clientes B2B. Ao interpretar pedidos de tarefas ou leads, sempre priorize prazos de 3 dias..."
                value={aiSettings.ai_system_instructions}
                onChange={(e) => setAiSettings({ ...aiSettings, ai_system_instructions: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Exigir confirmação antes de gravar no banco de dados?
              </label>
              <select
                value={aiSettings.ai_require_confirmation}
                onChange={(e) => setAiSettings({ ...aiSettings, ai_require_confirmation: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="true">Sim (Sempre mostrar prévia estruturada para aprovar)</option>
                <option value="false">Não (Gravação direta quando a IA tiver certeza)</option>
              </select>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={aiSaving}
                className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl text-xs hover:bg-blue-500 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={14} />
                {aiSaving ? 'Salvando...' : 'Salvar Configurações de IA'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CRIAR NOVO USUÁRIO                                 */}
      {/* ======================================================== */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowCreateUserModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1"
            >
              <X size={20} />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Cadastrar Novo Usuário
            </h2>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">E-mail *</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Senha *</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nível de Acesso *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="COLABORADOR">Colaborador</option>
                    <option value="ADMINISTRADOR">Administrador</option>
                    <option value="CLIENTE">Cliente (Portal do Cliente)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cargo / Especialidade</label>
                  <select
                    value={newUser.position_id}
                    onChange={(e) => setNewUser({ ...newUser, position_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Nenhum cargo</option>
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {newUser.role === 'CLIENTE' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cliente Vinculado *</label>
                  <select
                    value={newUser.client_id}
                    onChange={(e) => setNewUser({ ...newUser, client_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione o cliente</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_partner_check"
                  checked={newUser.is_partner === 1}
                  onChange={(e) => setNewUser({ ...newUser, is_partner: e.target.checked ? 1 : 0 })}
                  className="rounded border-gray-300 text-blue-600"
                />
                <label htmlFor="is_partner_check" className="text-xs font-semibold text-gray-700">
                  Este usuário é Sócio / Parceiro da agência?
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-xl text-xs hover:bg-blue-500 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDITAR USUÁRIO                                    */}
      {/* ======================================================== */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1"
            >
              <X size={20} />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-blue-600" />
              Editar Usuário: {editingUser.name}
            </h2>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={editUserForm.name}
                  onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nível de Acesso *</label>
                  <select
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="COLABORADOR">Colaborador</option>
                    <option value="ADMINISTRADOR">Administrador</option>
                    <option value="CLIENTE">Cliente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status da Conta</label>
                  <select
                    value={editUserForm.status}
                    onChange={(e) => setEditUserForm({ ...editUserForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo / Bloqueado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cargo / Especialidade</label>
                  <select
                    value={editUserForm.position_id}
                    onChange={(e) => setEditUserForm({ ...editUserForm, position_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Nenhum cargo</option>
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={editUserForm.phone}
                    onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit_is_partner"
                  checked={editUserForm.is_partner === 1}
                  onChange={(e) => setEditUserForm({ ...editUserForm, is_partner: e.target.checked ? 1 : 0 })}
                  className="rounded border-gray-300 text-blue-600"
                />
                <label htmlFor="edit_is_partner" className="text-xs font-semibold text-gray-700">
                  Este usuário é Sócio / Parceiro da agência?
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Redefinir Senha (Deixe em branco para manter a atual)
                </label>
                <input
                  type="password"
                  placeholder="Nova senha..."
                  value={editUserForm.new_password}
                  onChange={(e) => setEditUserForm({ ...editUserForm, new_password: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-xl text-xs hover:bg-blue-500 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDITAR CARGO                                       */}
      {/* ======================================================== */}
      {editingPosition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setEditingPosition(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1"
            >
              <X size={20} />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              Editar Cargo
            </h2>

            <form onSubmit={handleUpdatePosition} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nome do Cargo *</label>
                <input
                  type="text"
                  required
                  value={editPosForm.name}
                  onChange={(e) => setEditPosForm({ ...editPosForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={editPosForm.description}
                  onChange={(e) => setEditPosForm({ ...editPosForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleDeletePosition}
                  disabled={isSubmitting}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} /> Excluir
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPosition(null)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-xl text-xs hover:bg-blue-500 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDITAR CATEGORIA                                   */}
      {/* ======================================================== */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setEditingCategory(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1"
            >
              <X size={20} />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Editar Categoria
            </h2>

            <form onSubmit={handleUpdateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nome da Categoria *</label>
                <input
                  type="text"
                  required
                  value={editCatForm.name}
                  onChange={(e) => setEditCatForm({ ...editCatForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {editCatForm.target === 'tasks' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cor da Categoria</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={editCatForm.color}
                      onChange={(e) => setEditCatForm({ ...editCatForm, color: e.target.value })}
                      className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer bg-white p-0.5"
                    />
                    <span className="text-xs text-gray-600 font-mono">{editCatForm.color}</span>
                  </div>
                </div>
              )}

              {editCatForm.target === 'finance' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo Financeiro</label>
                  <select
                    value={editCatForm.type}
                    onChange={(e) => setEditCatForm({ ...editCatForm, type: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Entrada">Entrada (Receita)</option>
                    <option value="Saída">Saída (Despesa)</option>
                    <option value="both">Ambas</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleDeleteCategory}
                  disabled={isSubmitting}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} /> Excluir
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-xl text-xs hover:bg-blue-500 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CRIAR OU EDITAR CONTA BANCÁRIA                      */}
      {/* ======================================================== */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowAccountModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1"
            >
              <X size={20} />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              {editingAccount ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
            </h2>

            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nome da Conta / Identificação *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Nubank Agência, Itaú Principal..."
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Banco / Instituição *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Nubank, Itaú..."
                    value={accountForm.bank}
                    onChange={(e) => setAccountForm({ ...accountForm, bank: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de Conta</label>
                  <select
                    value={accountForm.type}
                    onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Corrente">Corrente</option>
                    <option value="Poupança">Poupança</option>
                    <option value="Investimento">Investimento</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Moeda da Conta *</label>
                  <select
                    value={accountForm.currency}
                    onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="BRL">Real (BRL - R$)</option>
                    <option value="USD">Dólar (USD - $)</option>
                    <option value="EUR">Euro (EUR - €)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={accountForm.status}
                    onChange={(e) => setAccountForm({ ...accountForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ativo">Ativa</option>
                    <option value="inativo">Bloqueada / Inativa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Saldo Inicial</label>
                <input
                  type="number"
                  step="0.01"
                  value={accountForm.initial_balance}
                  onChange={(e) => setAccountForm({ ...accountForm, initial_balance: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Sócio Responsável (Opcional)
                </label>
                <select
                  value={accountForm.responsible_partner_id}
                  onChange={(e) => setAccountForm({ ...accountForm, responsible_partner_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Conta Coletiva da Agência</option>
                  {users.filter(u => u.is_partner).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                {editingAccount ? (
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={isSubmitting}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={14} /> Excluir
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAccountModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-xl text-xs hover:bg-blue-500 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar Conta'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
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

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Carregando configurações...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
