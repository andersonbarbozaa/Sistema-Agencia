'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, UserPlus, Building2, CheckCircle2, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteParam = searchParams.get('invite') || '';

  const [inviteWorkspace, setInviteWorkspace] = useState<{ id: string; name: string; description: string | null } | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('PixelCraft Studio');
  const [companyDescription, setCompanyDescription] = useState('Agência Audiovisual & Criativa');
  const [jobTitle, setJobTitle] = useState('Administrador');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If invite link is provided, load workspace info
  useEffect(() => {
    if (!inviteParam) return;
    async function loadInvite() {
      try {
        setLoadingInvite(true);
        const res = await fetch(`/api/workspaces/invite-info?code=${encodeURIComponent(inviteParam)}`);
        if (res.ok) {
          const data = await res.json();
          setInviteWorkspace(data.workspace);
          setJobTitle('Colaborador');
        } else {
          setError('Link de convite inválido ou expirado.');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingInvite(false);
      }
    }
    loadInvite();
  }, [inviteParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload: any = {
        name,
        email,
        password,
        phone,
        job_title: jobTitle,
      };

      if (inviteParam) {
        payload.invite = inviteParam;
      } else {
        payload.company_name = companyName;
        payload.company_description = companyDescription;
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao realizar cadastro.');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-lg">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-3 shadow-lg shadow-blue-600/30">
            <span className="text-2xl font-black text-white">P</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {inviteWorkspace ? inviteWorkspace.name : 'PixelCraft Studio'}
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            {inviteWorkspace ? (inviteWorkspace.description || 'Convite para Área de Trabalho') : 'Sistema de Gestão de Agência Criativa'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 rounded-2xl p-6 sm:p-8 border border-gray-800 shadow-2xl">
          {/* Invite Banner */}
          {inviteWorkspace && (
            <div className="mb-6 p-4 bg-blue-950/60 border border-blue-800/80 rounded-xl flex items-start gap-3">
              <Building2 className="text-blue-400 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-xs font-bold text-blue-200">
                  Você foi convidado para a equipe de <span className="text-white underline">{inviteWorkspace.name}</span>
                </p>
                <p className="text-[11px] text-blue-300/80 mt-0.5">
                  Preencha seus dados abaixo para se juntar automaticamente a esta Área de Trabalho.
                </p>
              </div>
            </div>
          )}

          {!inviteWorkspace && (
            <div className="mb-6 pb-4 border-b border-gray-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-blue-400" />
                Criar Nova Conta Principal & Área de Trabalho
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Você será o Administrador e Dono desta nova agência isolada.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Owner Company Info */}
            {!inviteWorkspace && (
              <div className="space-y-3 p-4 bg-gray-800/40 rounded-xl border border-gray-800">
                <p className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 size={13} />
                  Dados da Empresa (Área 1)
                </p>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: PixelCraft Studio, Agência Alfa..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">Exibido a negrito no topo da barra lateral.</span>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Ramo de Atuação (Descrição Opcional)
                  </label>
                  <input
                    type="text"
                    value={companyDescription}
                    onChange={(e) => setCompanyDescription(e.target.value)}
                    placeholder="Ex: Agência Audiovisual & Criativa"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">Exibido logo abaixo do nome da empresa.</span>
                </div>
              </div>
            )}

            {/* User Personal Info */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Dados do Seu Perfil (Área 2)
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Anderson Silva"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Seu Cargo *
                  </label>
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Ex: Administrador, Diretor Criativo..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  E-mail *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Telefone / WhatsApp (Opcional)
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(18) 99999-9999"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Senha (mínimo 6 caracteres) *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-9 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/40 border border-red-700/60 rounded-xl p-3 text-red-300 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <UserPlus size={16} />
              )}
              {loading ? 'Criando Conta...' : (inviteWorkspace ? 'Entrar na Equipe' : 'Criar Agência & Acessar')}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-800 text-center">
            <p className="text-gray-400 text-xs">
              Já possui uma conta?{' '}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold inline-flex items-center gap-1">
                Fazer Login <ArrowRight size={12} />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Carregando...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
