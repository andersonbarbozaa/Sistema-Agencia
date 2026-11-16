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
      <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Loader2 size={13} className="animate-spin text-blue-600" />
        <span>Timer...</span>
      </div>
    );
  }

  const liveTotal = totalTime + (activeLog ? elapsedSeconds : 0);

  return (
    <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 rounded-xl px-3 py-2 transition-all">
      {/* Compact Single Bar: Clickable "Timer" title + Total Time + Start/Stop Button */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
          title="Clique para ver a lista detalhada dos tempos"
        >
          <Clock className="text-blue-600 dark:text-blue-400 shrink-0" size={14} />
          <span>Timer</span>
          {expanded ? (
            <ChevronUp size={13} className="text-gray-400" />
          ) : (
            <ChevronDown size={13} className="text-gray-400" />
          )}
        </button>

        <div className="flex items-center gap-2">
          <div className="text-xs font-mono font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700/70 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600/50 flex items-center gap-1.5">
            {activeLog && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
            <span>{formatDuration(liveTotal)}</span>
          </div>

          {activeLog ? (
            <button
              type="button"
              onClick={stopTimer}
              disabled={submitting}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Parar Timer"
            >
              {submitting ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Square size={11} fill="currentColor" />
              )}
              <span>Parar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startTimer}
              disabled={submitting}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Iniciar Timer"
            >
              {submitting ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Play size={11} fill="currentColor" />
              )}
              <span>Iniciar</span>
            </button>
          )}
        </div>
      </div>

      {/* Detailed Time List (Shown when clicking on "Timer") */}
      {expanded && (
        <div className="mt-2.5 pt-2.5 border-t border-gray-200/80 dark:border-gray-700/60 space-y-2 max-h-56 overflow-y-auto pr-1">
          {logs.length === 0 ? (
            <p className="text-[11px] text-gray-400 text-center py-2">
              Nenhum tempo registrado ainda.
            </p>
          ) : (
            logs.map((log) => {
              const isCurrentActive = log.id === activeLog?.id;
              const logDuration = log.duration_seconds
                ? formatDuration(log.duration_seconds)
                : isCurrentActive
                ? formatDuration(elapsedSeconds)
                : 'Em andamento...';

              return (
                <div
                  key={log.id}
                  className="bg-white dark:bg-gray-750/70 p-2.5 rounded-lg border border-gray-200/80 dark:border-gray-700/50"
                >
                  <div className="flex justify-between items-center text-[11px] mb-1">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {log.user_name || 'Usuário'}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-[10px]">
                      {new Date(log.start_time).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] mb-1.5">
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
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Anotação deste período..."
                      value={notes[log.id] || ''}
                      onChange={(e) => setNotes({ ...notes, [log.id]: e.target.value })}
                      className="flex-1 text-[11px] px-2 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => updateNote(log.id)}
                      className="p-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-md transition-colors cursor-pointer"
                      title="Salvar nota"
                    >
                      <Save size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
