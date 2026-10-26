'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, Users, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientOptions, setClientOptions] = useState<any[] | null>(null);
  const [selectingClient, setSelectingClient] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlEmail = params.get('email');
      if (urlEmail) setEmail(urlEmail);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao realizar login.');
        return;
      }

      // If multiple client companies are tied to this email, display profile selector
      if (data.multipleClients && data.multipleClients.length > 1) {
        setClientOptions(data.multipleClients);
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

  const handleSelectClient = async (clientId: string) => {
    try {
      setSelectingClient(true);
      await fetch('/api/auth/switch-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      });
      window.location.href = '/dashboard';
    } catch {
      window.location.href = '/dashboard';
    } finally {
      setSelectingClient(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/20">
            <span className="text-2xl font-bold text-white">P</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">PixelCraft Studio</h1>
          <p className="text-gray-500 text-sm mt-1">Sistema de Gestão Criativa</p>
        </div>

        {/* Form or Account Selector */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg">
          {clientOptions && clientOptions.length > 1 ? (
            <div className="animate-in fade-in duration-200">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto mb-2 shadow-inner">
                  <Users size={24} />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Selecione sua Conta</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Identificamos mais de uma empresa vinculada ao seu e-mail. Escolha qual deseja acessar:
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3.5 my-5">
                {clientOptions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={selectingClient}
                    onClick={() => handleSelectClient(c.id)}
                    className="flex flex-col items-center p-4 rounded-2xl border-2 border-gray-100 hover:border-indigo-600 hover:bg-indigo-50/50 bg-white transition-all group text-center shadow-xs active:scale-95"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 group-hover:border-indigo-600 shadow-sm flex items-center justify-center bg-gray-50 mb-2.5 transition-colors">
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-bold text-indigo-600">
                          {c.name?.charAt(0).toUpperCase() || 'C'}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-gray-900 group-hover:text-indigo-700 line-clamp-2 leading-tight">
                      {c.name}
                    </span>
                    {c.corporate_name && (
                      <span className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{c.corporate_name}</span>
                    )}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setClientOptions(null)}
                className="w-full text-xs text-gray-400 hover:text-gray-600 font-semibold py-2 transition-colors text-center"
              >
                Voltar e entrar com outro e-mail
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Entrar na sua conta</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 pr-10 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-200 text-center">
            <p className="text-gray-500 text-xs">
              Ainda não tem conta?{' '}
              <a href="/register" className="text-blue-600 hover:text-blue-500 font-semibold inline-flex items-center gap-1">
                Criar agência ou entrar com convite &rarr;
              </a>
            </p>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
