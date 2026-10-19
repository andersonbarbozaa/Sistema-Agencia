'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Square, Clock, ChevronDown, ChevronUp, Save, Loader2 } from 'lucide-react';

export default function TaskTimeTracker({ taskId, currentUser }: { taskId: string; currentUser: any }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [activeLog, setActiveLog] = useState<any>(null);
  const [totalTime, setTotalTime] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [taskId, currentUser?.id]);

  // Live timer tick for active timer
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (activeLog && activeLog.start_time) {
      const calcElapsed = () => {
        const start = new Date(activeLog.start_time).getTime();
        const now = Date.now();
        const diff = Math.max(0, Math.floor((now - start) / 1000));
        setElapsedSeconds(diff);
      };

      calcElapsed();
      timerRef.current = setInterval(calcElapsed, 1000);
    } else {
      setElapsedSeconds(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [activeLog]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tasks/${taskId}/time-logs`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.logs || []);
        setLogs(list);

        let total = 0;
        let active = null;
        const newNotes: { [key: string]: string } = {};

        list.forEach((log: any) => {
          if (log.duration_seconds) {
            total += log.duration_seconds;
          }
          if (!log.end_time) {
            // Check if it belongs to current user or if current user is not loaded yet
            if (log.is_current_user || (currentUser?.id && log.user_id === currentUser.id) || !currentUser) {
              active = log;
            }
          }
          if (log.note) {
            newNotes[log.id] = log.note;
          }
        });

        setTotalTime(total);
        setActiveLog(active);
        setNotes((prev) => ({ ...newNotes, ...prev }));
      }
    } catch (error) {
      console.error('Error fetching time logs', error);
    } finally {
      setLoading(false);
    }
  };

  const startTimer = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/tasks/${taskId}/time-logs/start`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        await fetchLogs();
      } else {
        if (data.error) {
          alert(data.error);
        }
        await fetchLogs();
      }
    } catch (error) {
      console.error('Error starting timer', error);
      alert('Não foi possível iniciar o cronômetro. Verifique sua conexão.');
    } finally {
      setSubmitting(false);
    }
  };

  const stopTimer = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/tasks/${taskId}/time-logs/stop`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setActiveLog(null);
        setElapsedSeconds(0);
        await fetchLogs();
      } else {
        if (data.error) {
          alert(data.error);
        }
        await fetchLogs();
      }
    } catch (error) {
      console.error('Error stopping timer', error);
      alert('Não foi possível parar o cronômetro.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateNote = async (logId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/time-logs/${logId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: notes[logId] || '' }),
      });
      if (res.ok) {
        alert('Nota salva com sucesso!');
        fetchLogs();
      } else {
        alert('Erro ao salvar nota.');
      }
    } catch (error) {
      console.error('Error updating note', error);
      alert('Erro ao salvar nota.');
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading && logs.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/60 rounded-xl p-4 shadow-sm mb-6 flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Loader2 size={14} className="animate-spin text-blue-600" />
        Carregando cronômetro...
      </div>
    );
  }

  const latestLog = logs[0];
  const liveTotal = totalTime + (activeLog ? elapsedSeconds : 0);

  return (
    <div className="bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/70 rounded-xl p-4 shadow-sm mb-6 transition-all">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="text-blue-600 dark:text-blue-400" size={18} />
          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">Time Tracker (Timer)</h4>
        </div>
        <div className="text-sm font-mono font-bold text-gray-800 dark:text-gray-100 bg-gray-100 dark:bg-gray-700/60 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-600/50 flex items-center gap-1.5">
          {activeLog && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
          <span>Total: {formatDuration(liveTotal)}</span>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex flex-col gap-2 mb-4 border-b border-gray-100 dark:border-gray-700/60 pb-4">
        {activeLog ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-3 py-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg text-xs text-red-700 dark:text-red-300">
              <span className="flex items-center gap-2 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                Cronômetro em andamento:
              </span>
              <span className="font-mono text-sm font-extrabold text-red-600 dark:text-red-400">
                {formatDuration(elapsedSeconds)}
              </span>
            </div>
            <button
              onClick={stopTimer}
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Square size={14} fill="currentColor" />
              )}
              PARAR TIMER ({formatDuration(elapsedSeconds)})
            </button>
          </div>
        ) : (
          <button
            onClick={startTimer}
            disabled={submitting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Play size={14} fill="currentColor" />
            )}
            INICIAR TIMER
          </button>
        )}
      </div>

      {/* Latest Record */}
      {latestLog && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Último Registro:</p>
          <div className="text-xs text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-750/70 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700/50 flex justify-between items-center">
            <span className="truncate pr-2">
              {new Date(latestLog.start_time).toLocaleString('pt-BR')} -{' '}
              <strong className="text-gray-900 dark:text-gray-100">{latestLog.user_name || 'Usuário'}</strong>
            </span>
            <span className="font-mono font-bold shrink-0">
              {latestLog.duration_seconds
                ? formatDuration(latestLog.duration_seconds)
                : latestLog.id === activeLog?.id
                ? formatDuration(elapsedSeconds)
                : 'Em andamento'}
            </span>
          </div>
        </div>
      )}

      {/* Expandable History */}
      {logs.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-semibold mt-3 hover:text-blue-800 dark:hover:text-blue-300 transition-colors cursor-pointer"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Ocultar Histórico de Tempos' : `Ver Todo o Histórico (${logs.length})`}
          </button>

          {expanded && (
            <div className="mt-3 space-y-3 max-h-64 overflow-y-auto pr-1">
              {logs.map((log) => {
                const isCurrentActive = log.id === activeLog?.id;
                const logDuration = log.duration_seconds
                  ? formatDuration(log.duration_seconds)
                  : isCurrentActive
                  ? formatDuration(elapsedSeconds)
                  : 'Em andamento...';

                return (
                  <div
                    key={log.id}
                    className="bg-gray-50 dark:bg-gray-750/70 p-3 rounded-lg border border-gray-100 dark:border-gray-700/50"
                  >
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {log.user_name || 'Usuário'}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                        {new Date(log.start_time).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs mb-2">
                      <span className="text-gray-600 dark:text-gray-300 font-medium">
                        Duração:{' '}
                        <strong
                          className={`font-mono ${
                            log.duration_seconds
                              ? 'text-gray-900 dark:text-gray-100'
                              : 'text-emerald-600 dark:text-emerald-400 animate-pulse'
                          }`}
                        >
                          {logDuration}
                        </strong>
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="O que foi feito neste período? (Anotação)"
                        value={notes[log.id] || ''}
                        onChange={(e) => setNotes({ ...notes, [log.id]: e.target.value })}
                        className="flex-1 text-xs px-2.5 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                      <button
                        onClick={() => updateNote(log.id)}
                        className="p-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-lg transition-colors cursor-pointer"
                        title="Salvar nota"
                      >
                        <Save size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
