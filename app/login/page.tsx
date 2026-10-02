'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (type: 'admin' | 'colaborador' | 'cliente') => {
    const demos = {
      admin: { email: 'anderson@agencia.com', password: 'admin123' },
      colaborador: { email: 'joao@agencia.com', password: 'admin123' },
      cliente: { email: 'contato@santacasa.com', password: 'admin123' },
    };
    setEmail(demos[type].email);
    setPassword(demos[type].password);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <span className="text-2xl font-bold text-white">P</span>
          </div>
          <h1 className="text-2xl font-bold text-white">PixelCraft Studio</h1>
          <p className="text-gray-400 text-sm mt-1">Sistema de Gestão Criativa</p>
        </div>

        {/* Form */}
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-6">Entrar na sua conta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3.5 py-2.5 pr-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-lg px-3.5 py-2.5 text-red-400 text-sm">
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

          {/* Demo accounts */}
          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-xs text-gray-500 text-center mb-3">Acesso rápido para demonstração</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => fillDemo('admin')}
                className="text-xs bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800/50 text-blue-300 rounded-lg py-2 px-1 transition-colors"
              >
                Administrador
              </button>
              <button
                onClick={() => fillDemo('colaborador')}
                className="text-xs bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-800/50 text-emerald-300 rounded-lg py-2 px-1 transition-colors"
              >
                Colaborador
              </button>
              <button
                onClick={() => fillDemo('cliente')}
                className="text-xs bg-violet-900/30 hover:bg-violet-900/50 border border-violet-800/50 text-violet-300 rounded-lg py-2 px-1 transition-colors"
              >
                Cliente
              </button>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-gray-800 text-center">
            <p className="text-gray-400 text-xs">
              Ainda não tem conta?{' '}
              <a href="/register" className="text-blue-400 hover:text-blue-300 font-semibold inline-flex items-center gap-1">
                Criar agência ou entrar com convite &rarr;
              </a>
            </p>
          </div>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Todos os dados são de demonstração. Senha: <span className="text-gray-400">admin123</span>
        </p>
      </div>
    </div>
  );
}
