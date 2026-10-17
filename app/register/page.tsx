'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, UserPlus, Building2, CheckCircle2, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteParam = searchParams.get('invite') || '';
  const emailParam = searchParams.get('email') || '';
  const roleParam = searchParams.get('role') || '';
  const positionIdParam = searchParams.get('position_id') || '';
  const jobTitleParam = searchParams.get('job_title') || '';

  const [inviteWorkspace, setInviteWorkspace] = useState<{ id: string; name: string; description: string | null } | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);

  // Form Fields (Nome *, E-mail *, Telefone opcional, Senha *)
  const [name, setName] = useState('');
  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (emailParam) setEmail(emailParam);
  }, [emailParam]);

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
        job_title: jobTitleParam || (inviteParam ? 'Colaborador' : 'Administrador'),
      };

      if (inviteParam) {
        payload.invite = inviteParam;
        if (roleParam) payload.role = roleParam;
        if (positionIdParam) payload.position_id = positionIdParam;
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

      // Redirecionamento completo para garantir cookies e invalidar cache RSC
      window.location.href = '/dashboard';
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full overflow-y-auto bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md my-auto py-4">
        {/* Header Branding */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-2xl mb-2 shadow-lg shadow-blue-600/30">
            <span className="text-xl font-black text-white">P</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            {inviteWorkspace ? inviteWorkspace.name : 'Criar Conta'}
          </h1>
          <p className="text-gray-500 text-xs mt-0.5">
            {inviteWorkspace
              ? (inviteWorkspace.description || 'Convite para Área de Trabalho')
              : 'Cadastre-se como Administrador do seu painel'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-xl">
          {/* Invite Banner */}
          {inviteWorkspace && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5">
              <Building2 className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-xs font-bold text-blue-900">
                  Você foi convidado para a equipe de <span className="underline">{inviteWorkspace.name}</span>
                </p>
                {jobTitleParam && (
                  <p className="text-[11px] text-blue-700 font-semibold mt-0.5">
                    Cargo atribuído: {jobTitleParam}
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Nome *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                E-mail *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Telefone (Opcional)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Senha *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 pr-9 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-red-700 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <UserPlus size={16} />
              )}
              {loading ? 'Criando Conta...' : (inviteWorkspace ? 'Entrar na Equipe' : 'Criar Conta')}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <p className="text-gray-500 text-xs">
              Já possui uma conta?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-500 font-semibold inline-flex items-center gap-1">
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
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-900">Carregando...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
