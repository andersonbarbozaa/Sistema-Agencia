'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ConfirmModal from '@/components/ConfirmModal';
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck2,
  Trash2,
  X,
} from 'lucide-react';
import { Notification } from '@/types';
import { formatDateTime, cn } from '@/lib/utils';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'3days' | 'all' | 'unread'>('3days');
  const [confirmState, setConfirmState] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const d = await res.json();
        setNotifications(d.notifications || d.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', { method: 'PATCH' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkSingleRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSingle = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    setConfirmState({
      isOpen: true,
      title: 'Confirmar Ação',
      message: 'Deseja realmente limpar todas as notificações?',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/notifications', { method: 'DELETE' });
          if (res.ok) {
            setNotifications([]);
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.read_at) {
      try {
        await fetch(`/api/notifications/${n.id}`, { method: 'PATCH' });
        setNotifications(prev =>
          prev.map(item => (item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item))
        );
      } catch (err) {
        console.error(err);
      }
    }

    if (n.reference_module === 'tasks' && n.reference_id) {
      router.push(`/tasks?id=${n.reference_id}`);
    } else if (n.reference_module === 'tasks') {
      router.push('/tasks');
    } else if (n.reference_module === 'finance') {
      router.push('/finance');
    } else if (n.reference_module === 'crm') {
      router.push('/crm');
    } else if (n.reference_module === 'calendar') {
      router.push('/agenda');
    }
  };

  // Filter calculation
  const threeDaysAgoTime = Date.now() - 3 * 24 * 60 * 60 * 1000;

  const filtered = notifications.filter(n => {
    if (activeFilter === 'unread') return !n.read_at;
    if (activeFilter === '3days') {
      if (!n.created_at) return true;
      const notifTime = new Date(n.created_at).getTime();
      return notifTime >= threeDaysAgoTime;
    }
    return true; // 'all'
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <ConfirmModal 
        isOpen={confirmState.isOpen} 
        onCancel={() => setConfirmState({ ...confirmState, isOpen: false })}
        onConfirm={() => {
          confirmState.onConfirm();
          setConfirmState({ ...confirmState, isOpen: false });
        }}
        title={confirmState.title}
        message={confirmState.message}
      />
      {/* Filter tabs & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveFilter('3days')}
            className={`px-3.5 py-2 rounded-xl transition-all ${activeFilter === '3days' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            Últimos 3 dias ({notifications.filter(n => !n.created_at || new Date(n.created_at).getTime() >= threeDaysAgoTime).length})
          </button>
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-2 rounded-xl transition-all ${activeFilter === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            Todas ({notifications.length})
          </button>
          <button
            onClick={() => setActiveFilter('unread')}
            className={`px-3.5 py-2 rounded-xl transition-all ${activeFilter === 'unread' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            Não Lidas ({notifications.filter(n => !n.read_at).length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {notifications.some(n => !n.read_at) && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold rounded-xl transition-colors border border-blue-200"
              title="Marcar todas como lidas"
            >
              <CheckCircle2 size={14} />
              Marcar Todas como Lidas
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold rounded-xl transition-colors border border-red-200"
              title="Limpar todas as notificações"
            >
              <Trash2 size={14} />
              Limpar Notificações
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400">
            Carregando notificações...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">
            {activeFilter === '3days'
              ? 'Nenhuma notificação recebida nos últimos 3 dias.'
              : activeFilter === 'unread'
              ? 'Nenhuma notificação não lida.'
              : 'Nenhuma notificação encontrada.'}
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={cn(
                'p-4 hover:bg-blue-50/30 transition-colors flex items-start justify-between gap-4 text-xs cursor-pointer group',
                !n.read_at ? 'bg-blue-50/20' : ''
              )}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className={`p-2.5 rounded-xl flex-shrink-0 mt-0.5 ${
                  n.type === 'client_approval' ? 'bg-emerald-100 text-emerald-700' :
                  n.type === 'change_request' ? 'bg-amber-100 text-amber-700' :
                  n.type === 'bill_due' ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {n.type === 'client_approval' ? <FileCheck2 size={17} /> :
                   n.type === 'change_request' ? <AlertTriangle size={17} /> :
                   n.type === 'bill_due' ? <Clock size={17} /> :
                   <Bell size={17} />}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn('text-gray-900 text-sm', !n.read_at ? 'font-bold' : 'font-semibold')}>
                      {n.title}
                    </p>
                    {!n.read_at && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-gray-600 mt-1 leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-gray-400 mt-2">{formatDateTime(n.created_at)}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {!n.read_at && (
                  <button
                    onClick={(e) => handleMarkSingleRead(e, n.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold whitespace-nowrap px-2 py-1 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Marcar lida
                  </button>
                )}
                <button
                  onClick={(e) => handleDeleteSingle(e, n.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remover notificação"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
