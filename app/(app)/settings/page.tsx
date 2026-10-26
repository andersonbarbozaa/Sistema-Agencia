'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ConfirmModal from '@/components/ConfirmModal';
import ProfileAvatarUpload from '@/components/ProfileAvatarUpload';
import {
  Settings,
  Smartphone,
  Download,
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
  Sun,
  Moon,
  Laptop,
  Highlighter,
  Type,
  Camera,
  Mail,
  Send,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Zap,
  Crown,
} from 'lucide-react';
import { Position, TaskCategory, FinancialCategory, BankAccount } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { TextFormatPreset, DEFAULT_TEXT_PRESETS } from '@/components/RichTextEditor';

const VALID_SETTINGS_TABS = ['overview', 'profile', 'company', 'users', 'categories', 'finance', 'ai', 'appearance', 'formatting', 'plans'] as const;
type SettingsTab = (typeof VALID_SETTINGS_TABS)[number];

const SUBSCRIPTION_PLANS = [
  {
    id: 'individual',
    name: 'Plano Individual',
    popular: false,
    price: 'R$ 15,90',
    period: '/mês',
    summary: 'Ideal para profissionais independentes',
    badge: null,
    benefits: [
      '1 profissional / uso individual',
      'Sincronização em tempo real',
      'Controle financeiro completo e fluxo de caixa',
      'Agenda inteligente',
      'CRM de clientes',
    ],
  },
  {
    id: 'pro',
    name: 'Equipe Pro',
    popular: true,
    price: 'R$ 59,90',
    period: '/mês',
    summary: 'Perfeito para pequenos times e estúdios',
    badge: 'Mais Popular',
    benefits: [
      'Até 5 usuários inclusos',
      'Agendas individuais e visão em grupo',
      'Financeiro integrado com controle do time',
      'CRM com histórico compartilhado',
    ],
  },
  {
    id: 'corporativo',
    name: 'Corporativo',
    popular: false,
    price: 'R$ 119,90',
    period: '/mês',
    summary: 'Gestão completa para agências maiores',
    badge: null,
    benefits: [
      'Até 10 usuários inclusos',
      'Múltiplas agendas e controle simultâneo',
      'Gestão financeira avançada',
      'Permissões de acesso por profissional',
      'CRM ilimitado e Suporte prioritário',
    ],
  },
];

async function compressImageFile(file: File, maxSize = 256): Promise<string> {
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
        // Center crop square
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

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [confirmState, setConfirmState] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const initialTab = searchParams.get('tab');

  const [activeTab, setActiveTabState] = useState<SettingsTab>(
    initialTab && VALID_SETTINGS_TABS.includes(initialTab as any)
      ? (initialTab as SettingsTab)
      : 'overview'
  );

  const setActiveTab = (tab: SettingsTab) => {
    setActiveTabState(tab);
    router.push(`/settings?tab=${tab}`, { scroll: false });
  };

  const [loading, setLoading] = useState(true);

  const profileFileInputRef = useRef<HTMLInputElement>(null);
  const companyFileInputRef = useRef<HTMLInputElement>(null);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else if (isIOS) {
      alert('Para instalar no iPhone, toque no ícone de Compartilhar do Safari e escolha "Adicionar à Tela Inicial".');
    } else {
      alert('Seu navegador não suporta a instalação via botão ou o aplicativo já está instalado.');
    }
  };

  // FONT SIZE (Aparência)
  const [appFontSize, setAppFontSize] = useState<'small' | 'medium' | 'large'>('medium');

  useEffect(() => {
    try {
      const savedSize = (localStorage.getItem('agency_app_font_size') as any) || 'medium';
      setAppFontSize(savedSize);
    } catch (e) {}
  }, []);

  const changeFontSize = (newSize: 'small' | 'medium' | 'large') => {
    setAppFontSize(newSize);
    try {
      localStorage.setItem('agency_app_font_size', newSize);
      const root = document.documentElement;
      root.setAttribute('data-font-size', newSize);
      if (newSize === 'small') {
        root.style.fontSize = '14px';
      } else if (newSize === 'large') {
        root.style.fontSize = '18px';
      } else {
        root.style.fontSize = '16px';
      }
      window.dispatchEvent(new CustomEvent('app-font-size-changed', { detail: { fontSize: newSize } }));
    } catch (e) {}
  };

  // THEME (Aparência)
  const [appTheme, setAppTheme] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    try {
      const savedTheme = (localStorage.getItem('agency_app_theme') as any) || 'system';
      setAppTheme(savedTheme);
    } catch (e) {}
  }, []);

  const changeTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setAppTheme(newTheme);
    try {
      localStorage.setItem('agency_app_theme', newTheme);
      const isDark =
        newTheme === 'dark' ||
        (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      const root = document.documentElement;
      if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        root.style.colorScheme = 'light';
      }
      window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: newTheme } }));
    } catch (e) {}
  };

  // TEXT FORMATTING PRESETS
  const [formattingPresets, setFormattingPresets] = useState<TextFormatPreset[]>(DEFAULT_TEXT_PRESETS);
  const [editingPreset, setEditingPreset] = useState<TextFormatPreset | null>(null);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetForm, setPresetForm] = useState<TextFormatPreset>({
    id: '',
    name: '',
    tag: 'p',
    fontSize: 'base',
    textColor: '#111827',
    highlightColor: '',
    bold: false,
    italic: false,
    underline: false,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('agency_text_formatting_presets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFormattingPresets(parsed);
        }
      }
    } catch (e) {}
  }, []);

  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetForm.name.trim()) return;

    let updated: TextFormatPreset[];
    if (editingPreset) {
      updated = formattingPresets.map((p) => (p.id === editingPreset.id ? { ...presetForm, id: editingPreset.id } : p));
    } else {
      const newP: TextFormatPreset = {
        ...presetForm,
        id: 'preset_' + Math.random().toString(36).substring(2, 9),
      };
      updated = [...formattingPresets, newP];
    }

    setFormattingPresets(updated);
    try {
      localStorage.setItem('agency_text_formatting_presets', JSON.stringify(updated));
    } catch (e) {}
    setShowPresetModal(false);
    setEditingPreset(null);
  };

  const handleDeletePreset = (id: string) => {
    const updated = formattingPresets.filter((p) => p.id !== id);
    setFormattingPresets(updated);
    try {
      localStorage.setItem('agency_text_formatting_presets', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleResetPresets = () => {
    setFormattingPresets(DEFAULT_TEXT_PRESETS);
    try {
      localStorage.setItem('agency_text_formatting_presets', JSON.stringify(DEFAULT_TEXT_PRESETS));
    } catch (e) {}
  };

  // Entities
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [taskCategories, setTaskCategories] = useState<TaskCategory[]>([]);
  const [financialCategories, setFinancialCategories] = useState<FinancialCategory[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});

  // Subscription & Plans state
  const [workspaceData, setWorkspaceData] = useState<any>(null);
  const [subscribingPlan, setSubscribingPlan] = useState<string | null>(null);
  const [subscriptionSuccess, setSubscriptionSuccess] = useState<string | null>(null);
  const [expandedMobilePlan, setExpandedMobilePlan] = useState<string>('pro');

  // MY PROFILE & COMPANY FORM
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    job_title: 'Administrador',
    avatar_url: '',
    company_name: 'PixelCraft Studio',
    company_description: '',
    company_logo: '',
    new_password: '',
    confirm_password: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);
  const [companySuccess, setCompanySuccess] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // INVITE MODAL STATE
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'COLABORADOR',
    position_id: '',
  });
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ message: string; invite_url: string; email_sent: boolean } | null>(null);

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
  const [newFinCategoryName, setNewFinCategoryName] = useState('');
  const [newFinCategoryType, setNewFinCategoryType] = useState('Saída');
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
    if (initialTab && VALID_SETTINGS_TABS.includes(initialTab as any)) {
      setActiveTabState(initialTab as SettingsTab);
    } else if (!initialTab) {
      setActiveTabState('overview');
    }
  }, [initialTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [uRes, pRes, cRes, aRes, sRes, cliRes, meRes, wsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/positions'),
        fetch('/api/categories?type=all'),
        fetch('/api/bank-accounts'),
        fetch('/api/settings'),
        fetch('/api/clients'),
        fetch('/api/auth/me'),
        fetch('/api/workspaces/current'),
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
          company_logo: me.workspace_logo || '',
          new_password: '',
          confirm_password: '',
        });
      }

      if (wsRes.ok) {
        const wsData = await wsRes.json();
        setWorkspaceData(wsData.workspace || null);
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

  const handleSubscribeTrial = async (planType: string) => {
    try {
      setSubscribingPlan(planType);
      const res = await fetch('/api/workspaces/current/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_type: planType }),
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspaceData(data.workspace);
        const planName = planType === 'pro' ? 'Equipe Pro' : planType === 'corporativo' ? 'Corporativo' : 'Individual';
        setSubscriptionSuccess(`Plano ${planName} ativado com sucesso! Você tem 30 dias de teste grátis sem custos.`);
        setTimeout(() => setSubscriptionSuccess(null), 5000);
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao ativar assinatura.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao ativar assinatura.');
    } finally {
      setSubscribingPlan(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProfileAvatarChange = async (dataUrl: string) => {
    setProfileForm((prev) => ({ ...prev, avatar_url: dataUrl }));
    if (currentUser?.id) {
      try {
        await fetch(`/api/users/${currentUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: profileForm.name || currentUser.name,
            phone: profileForm.phone,
            job_title: profileForm.job_title,
            avatar_url: dataUrl,
          }),
        });
        window.dispatchEvent(
          new CustomEvent('user-updated', {
            detail: { avatar_url: dataUrl },
          })
        );
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
        await fetchData();
      } catch (err) {
        console.error('Erro ao salvar imagem de perfil:', err);
      }
    }
  };

  const handleCompanyLogoChange = async (dataUrl: string) => {
    setProfileForm((prev) => ({ ...prev, company_logo: dataUrl }));
    if (currentUser?.role === 'ADMINISTRADOR') {
      try {
        const companyName = profileForm.company_name?.trim() || currentUser.workspace_name || 'Empresa';
        const companyDesc = profileForm.company_description ? profileForm.company_description.trim() : null;
        await fetch('/api/workspaces/current', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: companyName,
            description: companyDesc,
            logo_url: dataUrl,
          }),
        });
        window.dispatchEvent(
          new CustomEvent('workspace-updated', {
            detail: {
              workspace_name: companyName,
              workspace_description: companyDesc,
              workspace_logo: dataUrl,
            },
          })
        );
        setCompanySuccess(true);
        setTimeout(() => setCompanySuccess(false), 3000);
        await fetchData();
      } catch (err) {
        console.error('Erro ao salvar logo da empresa:', err);
      }
    }
  };

  // Update My Personal Profile
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

      window.dispatchEvent(
        new CustomEvent('user-updated', {
          detail: {
            name: profileForm.name,
            job_title: profileForm.job_title || 'Administrador',
            avatar_url: profileForm.avatar_url,
          },
        })
      );

      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setProfileSaving(false);
    }
  };

  // Update Company Profile (Workspace)
  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'ADMINISTRADOR') return;

    if (!profileForm.company_name?.trim()) {
      alert('O Nome da Empresa é obrigatório.');
      return;
    }

    try {
      setCompanySaving(true);
      const cleanName = profileForm.company_name.trim();
      const cleanDesc = profileForm.company_description ? profileForm.company_description.trim() : null;
      const cleanLogo = profileForm.company_logo || null;

      const wsRes = await fetch('/api/workspaces/current', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          description: cleanDesc,
          logo_url: cleanLogo,
        }),
      });

      if (!wsRes.ok) {
        const err = await wsRes.json();
        alert(err.error || 'Erro ao atualizar dados da empresa.');
        return;
      }

      window.dispatchEvent(
        new CustomEvent('workspace-updated', {
          detail: {
            workspace_name: cleanName,
            workspace_description: cleanDesc,
            workspace_logo: cleanLogo,
          },
        })
      );

      setCompanySuccess(true);
      setTimeout(() => setCompanySuccess(false), 3000);
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setCompanySaving(false);
    }
  };

  // Send Invitation Email
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email.trim()) return;

    try {
      setInviteSending(true);
      setInviteResult(null);
      const selectedPos = positions.find((p) => p.id === inviteForm.position_id);
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteForm.email.trim(),
          role: inviteForm.role,
          position_id: inviteForm.position_id || null,
          job_title: selectedPos?.name || (inviteForm.role === 'ADMINISTRADOR' ? 'Administrador' : inviteForm.role === 'CLIENTE' ? 'Cliente' : 'Colaborador'),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao enviar convite.');
        return;
      }

      if (data.invite_url && typeof navigator !== 'undefined' && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(data.invite_url);
        } catch {}
      }

      setInviteResult({
        message: data.message,
        invite_url: data.invite_url,
        email_sent: data.email_sent,
      });
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar convite.');
    } finally {
      setInviteSending(false);
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

  const handleCreateFinCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFinCategoryName.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/categories?target=finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFinCategoryName.trim(),
          type: newFinCategoryType,
        }),
      });

      if (res.ok) {
        setNewFinCategoryName('');
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao cadastrar categoria financeira.');
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
        <div className="space-y-6 max-w-4xl">
          {/* Banner Horizontal: Instalar App no Celular */}
          <div
            onClick={handleInstallClick}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 sm:p-5 shadow-sm text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 cursor-pointer hover:shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white tracking-tight truncate">
                  Instalar App no Celular
                </h4>
                <p className="text-xs text-blue-100 truncate">
                  Acesse em tela cheia adicionando o sistema à tela inicial do seu dispositivo
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3.5 py-2 bg-white/20 group-hover:bg-white/30 rounded-xl text-xs font-bold text-white transition-colors shrink-0 self-start sm:self-auto">
              <span>Instalar Agora</span>
              <Download size={14} />
            </div>
          </div>

          {/* GRUPO 1: Minha Conta */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-1">
              Minha Conta
            </h3>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xs overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/60">
              {/* Meu Perfil */}
              <div
                onClick={() => setActiveTab('profile')}
                className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-gray-50/80 dark:hover:bg-gray-750 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <User className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Meu Perfil
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-xs text-gray-400 font-medium truncate max-w-[160px] sm:max-w-xs">
                    {currentUser?.email}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

              {/* Assinaturas & Planos */}
              <div
                onClick={() => setActiveTab('plans')}
                className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-gray-50/80 dark:hover:bg-gray-750 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Assinaturas & Planos
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider hidden sm:inline-block">
                    30 Dias Grátis
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-xs font-semibold capitalize">
                    {workspaceData?.plan_type === 'corporativo' ? 'Corporativo' : workspaceData?.plan_type === 'pro' ? 'Equipe Pro' : 'Individual'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </div>
          </div>

          {/* GRUPO 2: Agência / Empresa */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-1">
              Agência / Empresa
            </h3>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xs overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/60">
              {/* Perfil da Empresa */}
              <div
                onClick={() => setActiveTab('company')}
                className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-gray-50/80 dark:hover:bg-gray-750 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Perfil da Empresa
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate max-w-[150px] sm:max-w-xs">
                    {profileForm.company_name || 'Configurar'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

              {/* Usuários & Cargos */}
              <div
                onClick={() => setActiveTab('users')}
                className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-gray-50/80 dark:hover:bg-gray-750 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Usuários & Cargos
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                    {users.length} cadastrados
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </div>
          </div>

          {/* GRUPO 3: Configurações do Sistema */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-1">
              Configurações do Sistema
            </h3>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xs overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/60">
              {/* Aparência & Tema */}
              <div
                onClick={() => setActiveTab('appearance')}
                className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-gray-50/80 dark:hover:bg-gray-750 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {appTheme === 'dark' ? <Moon className="w-5 h-5" /> : appTheme === 'light' ? <Sun className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                  </div>
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    Aparência & Tema
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 text-xs font-semibold capitalize">
                    {appTheme === 'dark' ? 'Escuro' : appTheme === 'light' ? 'Claro' : 'Sistema'} • Fonte {appFontSize === 'small' ? 'Menor' : appFontSize === 'large' ? 'Maior' : 'Média'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

              {/* Categorias do Sistema */}
              <div
                onClick={() => setActiveTab('categories')}
                className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-gray-50/80 dark:hover:bg-gray-750 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    Categorias do Sistema
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 text-xs font-semibold">
                    {taskCategories.length} categorias
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

              {/* Categoria Financeiro & Contas */}
              <div
                onClick={() => setActiveTab('finance')}
                className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-gray-50/80 dark:hover:bg-gray-750 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    Categoria Financeiro & Contas
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                    {financialCategories.length} categorias
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </div>
          </div>

          {/* GRUPO 4: Ferramentas & IA */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-1">
              Ferramentas & IA
            </h3>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xs overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/60">
              {/* Assistente de IA */}
              <div
                onClick={() => setActiveTab('ai')}
                className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-gray-50/80 dark:hover:bg-gray-750 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Bot className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    Assistente de IA
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 text-xs font-semibold">
                    Gemini API
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

              {/* Padrões de Roteiro */}
              <div
                onClick={() => setActiveTab('formatting')}
                className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-gray-50/80 dark:hover:bg-gray-750 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Highlighter className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    Padrões de Roteiro
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                    {formattingPresets.length} modelos
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: MEU PERFIL (PESSOAL)                                */}
      {/* ======================================================== */}
      {activeTab === 'profile' && (
        <div className="w-full space-y-6">
          <div className="flex items-center gap-4 pb-5 border-b border-gray-200">
            <ProfileAvatarUpload
              value={profileForm.avatar_url}
              fallbackText={currentUser?.name || 'U'}
              alt={profileForm.name || 'Perfil'}
              size="lg"
              onChange={handleProfileAvatarChange}
            />

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900">Meu Perfil Pessoal</h3>
              <p className="text-xs text-gray-500">
                Atualize suas informações pessoais, cargo, telefone e senha de acesso.
              </p>
            </div>
          </div>

          {profileSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} /> Dados do seu perfil atualizados com sucesso!
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-6">
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
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cargo / Função *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Administrador, Diretor Criativo, etc."
                    value={profileForm.job_title}
                    onChange={(e) => setProfileForm({ ...profileForm, job_title: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Alterar Senha */}
            <div className="pt-4 border-t border-gray-200">
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
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    placeholder="Repita a nova senha"
                    value={profileForm.confirm_password}
                    onChange={(e) => setProfileForm({ ...profileForm, confirm_password: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                {profileSaving ? 'Salvando...' : 'Salvar Meu Perfil'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1B: PERFIL DA EMPRESA (WORKSPACE)                      */}
      {/* ======================================================== */}
      {activeTab === 'company' && (
        <div className="w-full space-y-6">
          <div className="flex items-center gap-4 pb-5 border-b border-gray-200">
            <ProfileAvatarUpload
              value={profileForm.company_logo}
              fallbackText={profileForm.company_name || 'E'}
              alt={profileForm.company_name || 'Empresa'}
              size="lg"
              onChange={handleCompanyLogoChange}
            />

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900">Perfil da Empresa</h3>
              <p className="text-xs text-gray-500">
                Configure a foto de perfil da empresa, nome da empresa e ramo de atuação exibidos no sistema.
              </p>
            </div>
          </div>

          {companySuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} /> Dados da empresa atualizados com sucesso!
            </div>
          )}

          <form onSubmit={handleUpdateCompany} className="space-y-6">
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
                  Ramo de Atuação / Descrição
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

            {/* Convite de Membros */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-900">
                    Convidar Novos Usuários para a Empresa
                  </label>
                  <p className="text-[11px] text-gray-500">
                    Envie um convite por e-mail já com o cargo selecionado ou copie o link de convite.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setInviteResult(null);
                    setShowInviteModal(true);
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs flex-shrink-0"
                >
                  <Mail size={14} /> Convidar por E-mail
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-gray-200/80">
                <div className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-600 font-mono select-all truncate">
                  {typeof window !== 'undefined'
                    ? `${window.location.origin}/register?invite=${currentUser?.workspace_invite_code || currentUser?.workspace_id || ''}`
                    : `/register?invite=${currentUser?.workspace_invite_code || currentUser?.workspace_id || ''}`}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      const url = `${window.location.origin}/register?invite=${currentUser?.workspace_invite_code || currentUser?.workspace_id || ''}`;
                      navigator.clipboard.writeText(url);
                      setCopiedInvite(true);
                      setTimeout(() => setCopiedInvite(false), 2500);
                    }
                  }}
                  className={cn(
                    'px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs flex-shrink-0',
                    copiedInvite
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
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

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={companySaving}
                className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl text-xs hover:bg-blue-500 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={14} />
                {companySaving ? 'Salvando...' : 'Salvar Dados da Empresa'}
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
                  Usuários
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Gerenciamento de contas, cargos e níveis de acesso (Admin, Colaborador, Cliente).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInviteResult(null);
                    setShowInviteModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
                >
                  <Mail size={14} />
                  Convidar
                </button>
                <button
                  onClick={() => setShowCreateUserModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
                >
                  <Plus size={14} />
                  Novo Usuário
                </button>
              </div>
            </div>

            {/* Versão Mobile: Lista em Cards Clicáveis */}
            <div className="md:hidden space-y-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  onClick={() => openEditUser(u)}
                  className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-blue-400 active:scale-[0.99] transition-all cursor-pointer flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {u.avatar_url ? (
                        <img
                          src={u.avatar_url}
                          alt={u.name}
                          className="w-11 h-11 rounded-full object-cover border border-gray-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-gray-900 truncate">{u.name}</p>
                        <p className="text-xs text-gray-600 font-medium truncate mt-0.5">
                          {u.position_name || u.job_title || 'Sem cargo atribuído'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 capitalize ${
                        u.status === 'inativo'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {u.status || 'Ativo'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-gray-200 gap-2">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <span className="text-[10px] text-gray-400 font-semibold uppercase">Nível:</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'ADMINISTRADOR'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : u.role === 'CLIENTE'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {u.role}
                      </span>
                      {u.is_partner ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Sócio
                        </span>
                      ) : null}
                    </div>

                    <span className="text-[11px] font-semibold text-blue-600 flex items-center gap-1 flex-shrink-0">
                      <Edit2 size={12} /> Editar
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Versão Desktop: Tabela Completa */}
            <div className="hidden md:block overflow-x-auto">
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
                    <tr
                      key={u.id}
                      onClick={() => openEditUser(u)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
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
                        {u.position_name || u.job_title || 'Sem cargo atribuído'}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditUser(u);
                          }}
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
      {/* TAB 3: CATEGORIAS DO SISTEMA (Apenas Tarefas/Sistema)      */}
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

            {/* Form Nova Categoria Financeira */}
            <form onSubmit={handleCreateFinCategory} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
              <input
                type="text"
                required
                placeholder="Nome da categoria financeira (ex: Softwares, Marketing, Serviços, Impostos)..."
                value={newFinCategoryName}
                onChange={(e) => setNewFinCategoryName(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Tipo:</span>
                <select
                  value={newFinCategoryType}
                  onChange={(e) => setNewFinCategoryType(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Saída">Saída (Despesa)</option>
                  <option value="Entrada">Entrada (Receita)</option>
                  <option value="both">Ambas (Entrada & Saída)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm whitespace-nowrap"
              >
                + Adicionar Categoria
              </button>
            </form>

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

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
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
            {settings.gemini_model && (
              <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                {settings.gemini_model}
              </span>
            )}
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
      {/* TAB 6: APARÊNCIA & TEMA DO APP                            */}
      {/* ======================================================== */}
      {activeTab === 'appearance' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6 max-w-2xl">
          <div className="pb-4 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Moon className="w-5 h-5 text-purple-600" />
              Tema do Aplicativo
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Escolha o estilo visual da plataforma para o seu navegador e celular.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Opção 1: Tema Claro */}
            <div
              onClick={() => changeTheme('light')}
              className={cn(
                'border-2 rounded-2xl p-5 cursor-pointer transition-all flex flex-col items-center text-center gap-3 relative',
                appTheme === 'light'
                  ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
                <Sun className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900">Tema Claro</h4>
                <p className="text-[11px] text-gray-500 mt-1">Fundo claro e alto contraste para ambientes iluminados.</p>
              </div>
              {appTheme === 'light' && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                  Ativo
                </span>
              )}
            </div>

            {/* Opção 2: Tema Escuro */}
            <div
              onClick={() => changeTheme('dark')}
              className={cn(
                'border-2 rounded-2xl p-5 cursor-pointer transition-all flex flex-col items-center text-center gap-3 relative',
                appTheme === 'dark'
                  ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shadow-xs">
                <Moon className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900">Tema Escuro</h4>
                <p className="text-[11px] text-gray-500 mt-1">Descanso para os olhos com tons escuros e modernos.</p>
              </div>
              {appTheme === 'dark' && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                  Ativo
                </span>
              )}
            </div>

            {/* Opção 3: Padrão do Sistema */}
            <div
              onClick={() => changeTheme('system')}
              className={cn(
                'border-2 rounded-2xl p-5 cursor-pointer transition-all flex flex-col items-center text-center gap-3 relative',
                appTheme === 'system'
                  ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
                <Laptop className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900">Padrão do Sistema</h4>
                <p className="text-[11px] text-gray-500 mt-1">Identifica e mantém automaticamente o tema do seu dispositivo.</p>
              </div>
              {appTheme === 'system' && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                  Ativo
                </span>
              )}
            </div>
          </div>
        
          {/* Seção Tamanho da Fonte */}
          <div className="pt-6 border-t border-gray-100">
            <div className="pb-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Type className="w-5 h-5 text-blue-600" />
                Tamanho da Fonte
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Escolha a escala de texto do aplicativo. A preferência será mantida salva no seu navegador e celular.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Opção 1: Menor */}
              <div
                onClick={() => changeFontSize('small')}
                className={cn(
                  'border-2 rounded-2xl p-5 cursor-pointer transition-all flex flex-col items-center text-center gap-3 relative',
                  appFontSize === 'small'
                    ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                  <span className="text-xs font-black">Aa</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">Menor</h4>
                  <p className="text-[11px] text-gray-500 mt-1">Mais conteúdo visível simultaneamente na tela.</p>
                </div>
                {appFontSize === 'small' && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                    Ativo
                  </span>
                )}
              </div>

              {/* Opção 2: Média (Padrão atual) */}
              <div
                onClick={() => changeFontSize('medium')}
                className={cn(
                  'border-2 rounded-2xl p-5 cursor-pointer transition-all flex flex-col items-center text-center gap-3 relative',
                  appFontSize === 'medium'
                    ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
                  <span className="text-base font-black">Aa</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">Média (Padrão)</h4>
                  <p className="text-[11px] text-gray-500 mt-1">Tamanho original equilibrado do sistema.</p>
                </div>
                {appFontSize === 'medium' && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                    Ativo
                  </span>
                )}
              </div>

              {/* Opção 3: Maior */}
              <div
                onClick={() => changeFontSize('large')}
                className={cn(
                  'border-2 rounded-2xl p-5 cursor-pointer transition-all flex flex-col items-center text-center gap-3 relative',
                  appFontSize === 'large'
                    ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                <div className="w-12 h-12 rounded-full bg-blue-200 text-blue-900 flex items-center justify-center shadow-xs">
                  <span className="text-xl font-black">Aa</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">Maior</h4>
                  <p className="text-[11px] text-gray-500 mt-1">Textos maiores para maior conforto visual e leitura facilitada.</p>
                </div>
                {appFontSize === 'large' && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                    Ativo
                  </span>
                )}
              </div>
            </div>
          </div>
</div>
      )}

      {/* ======================================================== */}
      {/* TAB 7: PADRÕES DE FORMATAÇÃO (ROTEIRO & DESCRIÇÃO)        */}
      {/* ======================================================== */}
      {activeTab === 'formatting' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Highlighter className="w-5 h-5 text-amber-600" />
                Padrões de Formatação de Roteiro & Descrição
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Configure estilos pré-definidos que aparecem como botões rápidos na caixa de texto de tarefas.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetPresets}
                className="px-3 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                title="Restaurar lista de padrões recomendados"
              >
                Restaurar Padrões
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingPreset(null);
                  setPresetForm({
                    id: '',
                    name: '',
                    tag: 'p',
                    fontSize: 'base',
                    textColor: '#111827',
                    highlightColor: '',
                    bold: false,
                    italic: false,
                    underline: false,
                  });
                  setShowPresetModal(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Plus size={14} /> Novo Padrão
              </button>
            </div>
          </div>

          {/* Lista dos Padrões Cadastrados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formattingPresets.map((preset) => (
              <div
                key={preset.id}
                className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex flex-col justify-between hover:border-blue-300 transition-all gap-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-gray-900">{preset.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-500 font-semibold uppercase">
                      {preset.tag === 'note' ? 'Nota / Callout' : preset.tag === 'h2' ? 'Título' : 'Texto Inline'}
                    </span>
                  </div>

                  {/* Preview do Texto */}
                  <div className="bg-white border border-gray-200 rounded-lg p-3 min-h-[44px] flex items-center">
                    {preset.tag === 'note' ? (
                      <div
                        className="w-full text-xs rich-note-callout m-0"
                        style={{
                          backgroundColor: preset.highlightColor || '#fef3c7',
                          color: preset.textColor || '#92400e',
                          borderLeftColor: preset.textColor || '#f59e0b',
                        }}
                      >
                        Exemplo de nota formatada para a equipe de vídeo e roteiro.
                      </div>
                    ) : (
                      <span
                        className="text-xs truncate block w-full"
                        style={{
                          color: preset.textColor || undefined,
                          backgroundColor: preset.highlightColor || undefined,
                          padding: preset.highlightColor ? '2px 6px' : undefined,
                          borderRadius: '4px',
                          fontWeight: preset.bold ? 'bold' : 'normal',
                          fontStyle: preset.italic ? 'italic' : 'normal',
                          textDecoration: preset.underline ? 'underline' : 'none',
                          fontSize: preset.fontSize === 'xl' ? '16px' : preset.fontSize === 'lg' ? '15px' : preset.fontSize === 'sm' ? '11px' : '13px',
                        }}
                      >
                        Exemplo de texto com a formatação "{preset.name}"
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 text-xs">
                  <div className="flex items-center gap-2 text-[11px] text-gray-400">
                    {preset.bold && <span>Negrito</span>}
                    {preset.italic && <span>Itálico</span>}
                    {preset.highlightColor && <span>Marca-texto</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPreset(preset);
                        setPresetForm({ ...preset });
                        setShowPresetModal(true);
                      }}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
                      title="Editar Padrão"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePreset(preset.id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                      title="Excluir Padrão"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 9: ASSINATURAS E PLANOS (Responsivo)                  */}
      {/* ======================================================== */}
      {activeTab === 'plans' && (
        <div className="w-full space-y-6">
          {/* Header da Seção */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-200">
            <div>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-blue-600 mb-2 transition-colors"
              >
                &larr; Voltar para Configurações
              </button>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                Assinaturas e Planos
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Escolha o melhor plano para a sua operação. Todos os planos incluem 30 dias de teste grátis sem necessidade de cartão de crédito.
              </p>
            </div>

            {/* Status Atual do Workspace */}
            {workspaceData && (
              <div className="flex items-center gap-2.5 px-3.5 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs">
                <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <span className="text-gray-500 text-[11px] block">Plano Atual:</span>
                  <span className="font-bold text-gray-900 capitalize">
                    {workspaceData.plan_type === 'corporativo'
                      ? 'Corporativo'
                      : workspaceData.plan_type === 'pro'
                      ? 'Equipe Pro'
                      : 'Plano Individual'}
                  </span>
                  {workspaceData.trial_ends_at && (
                    <span className="text-[11px] text-blue-700 font-medium block">
                      Teste ativo até {new Date(workspaceData.trial_ends_at).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Feedback de Ativação */}
          {subscriptionSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{subscriptionSuccess}</span>
            </div>
          )}

          {/* Aviso Global: 30 Dias de Teste Grátis */}
          <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200/80 rounded-2xl flex items-start gap-3.5 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                Garantia de 30 Dias de Teste Grátis
              </h4>
              <p className="text-xs text-blue-800/90 leading-relaxed">
                Todos os planos possuem <strong>30 dias de teste grátis</strong> sem necessidade de informar cartão de crédito no momento do cadastro. Experimente todas as funcionalidades da plataforma e potencialize o trabalho da sua equipe com tranquilidade.
              </p>
            </div>
          </div>

          {/* VISUALIZAÇÃO DESKTOP: Cards lado a lado totalmente expandidos */}
          <div className="hidden md:grid md:grid-cols-3 gap-6 items-stretch pt-2">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isCurrent = workspaceData?.plan_type === plan.id;
              const isPopular = plan.popular;

              return (
                <div
                  key={plan.id}
                  className={cn(
                    'bg-white border rounded-2xl p-6 transition-all flex flex-col justify-between relative',
                    isPopular
                      ? 'border-2 border-blue-600 shadow-md ring-4 ring-blue-500/10'
                      : 'border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md'
                  )}
                >
                  {/* Selo de Mais Popular */}
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-full shadow-sm flex items-center gap-1">
                      <Sparkles size={11} /> Mais Popular
                    </div>
                  )}

                  <div>
                    {/* Header do Card */}
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          Atual
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 min-h-[34px] leading-relaxed">
                      {plan.summary}
                    </p>

                    {/* Preço */}
                    <div className="mt-4 pb-4 border-b border-gray-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                          {plan.price}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">{plan.period}</span>
                      </div>
                      <span className="inline-block mt-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        30 dias grátis para testar
                      </span>
                    </div>

                    {/* Lista de Benefícios */}
                    <div className="py-5 space-y-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Benefícios inclusos:
                      </p>
                      <ul className="space-y-2.5">
                        {plan.benefits.map((benefit, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-700">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span className="leading-snug">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Botão de Ação Desktop */}
                  <div className="pt-4 border-t border-gray-100 mt-2">
                    {isCurrent ? (
                      <button
                        type="button"
                        onClick={() => handleSubscribeTrial(plan.id)}
                        disabled={subscribingPlan === plan.id}
                        className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Check size={14} /> Plano Ativo (30 Dias Grátis)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSubscribeTrial(plan.id)}
                        disabled={subscribingPlan === plan.id}
                        className={cn(
                          'w-full py-3 px-4 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50',
                          isPopular
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                            : 'bg-gray-900 hover:bg-gray-800 text-white'
                        )}
                      >
                        {subscribingPlan === plan.id ? (
                          'Ativando teste...'
                        ) : (
                          <>
                            <Zap size={13} /> Testar 30 Dias Grátis
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* VISUALIZAÇÃO MOBILE: Formato Accordion / Dropdown */}
          <div className="flex flex-col gap-3.5 md:hidden pt-1">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isExpanded = expandedMobilePlan === plan.id;
              const isCurrent = workspaceData?.plan_type === plan.id;
              const isPopular = plan.popular;

              return (
                <div
                  key={plan.id}
                  className={cn(
                    'border rounded-2xl bg-white shadow-sm transition-all overflow-hidden',
                    isPopular ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-gray-200',
                    isExpanded ? 'shadow-md' : ''
                  )}
                >
                  {/* Cabeçalho do Card Retraído (Sempre visível no mobile) */}
                  <div
                    onClick={() => setExpandedMobilePlan(isExpanded ? '' : plan.id)}
                    className="p-4 cursor-pointer flex flex-col gap-2.5 active:bg-gray-50/70 select-none"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-gray-900">{plan.name}</h3>
                        {isPopular && (
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-extrabold uppercase tracking-wider rounded-full">
                            Mais Popular
                          </span>
                        )}
                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-full">
                            Atual
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-gray-400">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>

                    {/* Resumo do Diferencial */}
                    <p className="text-xs text-gray-500 leading-relaxed">{plan.summary}</p>

                    {/* Preço no estado retraído */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-extrabold text-gray-900">{plan.price}</span>
                        <span className="text-[11px] text-gray-500 font-medium">{plan.period}</span>
                      </div>
                      <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-0.5">
                        {isExpanded ? 'Ocultar detalhes' : 'Ver benefícios & testar'}
                      </span>
                    </div>
                  </div>

                  {/* Área Expandida (Empurra os outros itens para baixo) */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 pt-3 space-y-4 bg-gray-50/50 animate-in slide-in-from-top-2 duration-150">
                      {/* Lista de Benefícios */}
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                          Benefícios inclusos no plano:
                        </p>
                        <ul className="space-y-2">
                          {plan.benefits.map((benefit, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                              <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                              <span className="leading-snug">{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Botão de Ação no Mobile Expandido */}
                      <div className="pt-2">
                        {isCurrent ? (
                          <button
                            type="button"
                            onClick={() => handleSubscribeTrial(plan.id)}
                            disabled={subscribingPlan === plan.id}
                            className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Check size={14} /> Plano Ativo (30 Dias Grátis)
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSubscribeTrial(plan.id)}
                            disabled={subscribingPlan === plan.id}
                            className={cn(
                              'w-full py-3 px-4 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50',
                              isPopular
                                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                : 'bg-gray-900 hover:bg-gray-800 text-white'
                            )}
                          >
                            {subscribingPlan === plan.id ? (
                              'Ativando teste...'
                            ) : (
                              <>
                                <Zap size={13} /> Testar 30 Dias Grátis
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CRIAR / EDITAR PADRÃO DE FORMATAÇÃO               */}
      {/* ======================================================== */}
      {showPresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowPresetModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1"
            >
              <X size={20} />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Highlighter className="w-5 h-5 text-amber-600" />
              {editingPreset ? 'Editar Padrão de Formatação' : 'Novo Padrão de Formatação'}
            </h2>
            <p className="text-xs text-gray-500 mb-5">
              Defina o estilo que será aplicado no texto selecionado dentro da tarefa.
            </p>

            <form onSubmit={handleSavePreset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nome do Padrão *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fala do Narrador, Corte de Câmera, Nota de Produção..."
                  value={presetForm.name}
                  onChange={(e) => setPresetForm({ ...presetForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tipo de Bloco
                  </label>
                  <select
                    value={presetForm.tag}
                    onChange={(e) => setPresetForm({ ...presetForm, tag: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="p">Texto Comum / Inline</option>
                    <option value="h2">Título de Seção (H2)</option>
                    <option value="note">Bloco de Nota / Callout</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tamanho da Fonte
                  </label>
                  <select
                    value={presetForm.fontSize || 'base'}
                    onChange={(e) => setPresetForm({ ...presetForm, fontSize: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="sm">Pequeno (12px)</option>
                    <option value="base">Normal (14px)</option>
                    <option value="lg">Médio (16px)</option>
                    <option value="xl">Grande (18px)</option>
                  </select>
                </div>
              </div>

              {/* Opções de Estilo (Negrito, Itálico, Sublinhado) */}
              <div className="flex items-center gap-5 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={presetForm.bold}
                    onChange={(e) => setPresetForm({ ...presetForm, bold: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Negrito (Bold)</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={presetForm.italic}
                    onChange={(e) => setPresetForm({ ...presetForm, italic: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Itálico</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={presetForm.underline}
                    onChange={(e) => setPresetForm({ ...presetForm, underline: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Sublinhado</span>
                </label>
              </div>

              {/* Cores */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Cor do Texto
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={presetForm.textColor || '#111827'}
                      onChange={(e) => setPresetForm({ ...presetForm, textColor: e.target.value })}
                      className="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0.5"
                    />
                    <span className="text-xs font-mono text-gray-600">{presetForm.textColor || '#111827'}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Marca-texto (Grifo)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={presetForm.highlightColor || '#fef08a'}
                      onChange={(e) => setPresetForm({ ...presetForm, highlightColor: e.target.value })}
                      className="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0.5"
                    />
                    {presetForm.highlightColor ? (
                      <button
                        type="button"
                        onClick={() => setPresetForm({ ...presetForm, highlightColor: '' })}
                        className="text-[11px] text-red-600 hover:underline"
                      >
                        Sem grifo
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">Nenhum</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview em tempo real */}
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">
                  Visualização em Tempo Real:
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 min-h-[50px] flex items-center">
                  {presetForm.tag === 'note' ? (
                    <div
                      className="w-full text-xs rich-note-callout m-0"
                      style={{
                        backgroundColor: presetForm.highlightColor || '#fef3c7',
                        color: presetForm.textColor || '#92400e',
                        borderLeftColor: presetForm.textColor || '#f59e0b',
                      }}
                    >
                      Exemplo de bloco de nota formatado com este padrão.
                    </div>
                  ) : (
                    <span
                      style={{
                        color: presetForm.textColor || undefined,
                        backgroundColor: presetForm.highlightColor || undefined,
                        padding: presetForm.highlightColor ? '2px 6px' : undefined,
                        borderRadius: '4px',
                        fontWeight: presetForm.bold ? 'bold' : 'normal',
                        fontStyle: presetForm.italic ? 'italic' : 'normal',
                        textDecoration: presetForm.underline ? 'underline' : 'none',
                        fontSize: presetForm.fontSize === 'xl' ? '17px' : presetForm.fontSize === 'lg' ? '15px' : presetForm.fontSize === 'sm' ? '11px' : '13px',
                      }}
                    >
                      {presetForm.name || 'Texto de Demonstração'}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowPresetModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm"
                >
                  Salvar Padrão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONVIDAR USUÁRIO POR E-MAIL                        */}
      {/* ======================================================== */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1"
            >
              <X size={20} />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Convidar Novo Usuário
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Informe o e-mail e selecione o cargo. A pessoa receberá o link para se cadastrar na sua equipe.
            </p>

            {inviteResult ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                    <span>{inviteResult.message}</span>
                  </div>
                  <div className="p-2 bg-white border border-emerald-200 rounded-lg font-mono text-[11px] text-gray-700 break-all select-all">
                    {inviteResult.invite_url}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                  <a
                    href={`mailto:${encodeURIComponent(inviteForm.email)}?subject=${encodeURIComponent(`Convite para ${profileForm.company_name}`)}&body=${encodeURIComponent(`Olá! Você foi convidado para fazer parte da equipe de ${profileForm.company_name}.\n\nAcesse o link abaixo para criar sua conta:\n${inviteResult.invite_url}`)}`}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Mail size={14} /> Abrir no E-mail
                  </a>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(inviteResult.invite_url);
                        setCopiedInvite(true);
                        setTimeout(() => setCopiedInvite(false), 2500);
                      }}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                    >
                      {copiedInvite ? <Check size={14} /> : <Copy size={14} />}
                      {copiedInvite ? 'Copiado!' : 'Copiar Link'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInviteResult(null);
                        setInviteForm({ email: '', role: 'COLABORADOR', position_id: '' });
                        setShowInviteModal(false);
                      }}
                      className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    E-mail do Convidado *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="pessoa@email.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nível de Acesso *
                  </label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="COLABORADOR">Colaborador</option>
                    <option value="ADMINISTRADOR">Administrador</option>
                    <option value="CLIENTE">Cliente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Cargo / Especialidade
                  </label>
                  <select
                    value={inviteForm.position_id}
                    onChange={(e) => setInviteForm({ ...inviteForm, position_id: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Cargo padrão ({inviteForm.role === 'ADMINISTRADOR' ? 'Administrador' : inviteForm.role === 'CLIENTE' ? 'Cliente' : 'Colaborador'})</option>
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={inviteSending}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Send size={14} />
                    {inviteSending ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              </form>
            )}
          </div>
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
