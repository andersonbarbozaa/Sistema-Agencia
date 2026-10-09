'use client';

import { useState, useEffect } from 'react';
import { Play, Square, Clock, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { formatCurrency } from '@/lib/utils'; // Optional if not used

export default function TaskTimeTracker({ taskId, currentUser }: { taskId: string, currentUser: any }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [activeLog, setActiveLog] = useState<any>(null);
  const [totalTime, setTotalTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchLogs();
  }, [taskId]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tasks/${taskId}/time-logs`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
        
        let total = 0;
        let active = null;
        const newNotes: { [key: string]: string } = {};

        data.forEach((log: any) => {
          if (log.duration_seconds) {
            total += log.duration_seconds;
          } else if (!log.end_time && log.user_id === currentUser?.id) {
            active = log;
          }
          if (log.note) {
            newNotes[log.id] = log.note;
          }
        });

        setTotalTime(total);
        setActiveLog(active);
        setNotes(newNotes);
      }
    } catch (error) {
      console.error('Error fetching time logs', error);
    } finally {
      setLoading(false);
    }
  };

  const startTimer = async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/time-logs/start`, { method: 'POST' });
      if (res.ok) {
        fetchLogs();
      }
    } catch (error) {
      console.error('Error starting timer', error);
    }
  };

  const stopTimer = async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/time-logs/stop`, { method: 'POST' });
      if (res.ok) {
        fetchLogs();
      }
    } catch (error) {
      console.error('Error stopping timer', error);
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
      }
    } catch (error) {
      console.error('Error updating note', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="text-xs text-gray-500">Carregando tempos...</div>;

  const latestLog = logs[0];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="text-blue-600" size={18} />
          <h4 className="text-sm font-bold text-gray-800">Time Tracker</h4>
        </div>
        <div className="text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
          Total: {formatDuration(totalTime)}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-4">
        {activeLog ? (
          <button
            onClick={stopTimer}
            className="flex flex-1 items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors"
          >
            <Square size={14} fill="currentColor" /> PARAR TIMER
          </button>
        ) : (
          <button
            onClick={startTimer}
            className="flex flex-1 items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
          >
            <Play size={14} fill="currentColor" /> INICIAR TIMER
          </button>
        )}
      </div>

      {latestLog && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-gray-600 mb-1">Último Registro:</p>
          <div className="text-xs text-gray-800 bg-gray-50 p-2 rounded flex justify-between items-center">
            <span>
              {new Date(latestLog.start_time).toLocaleString()} - {latestLog.user_name}
            </span>
            <span className="font-bold">
              {latestLog.duration_seconds ? formatDuration(latestLog.duration_seconds) : 'Em andamento'}
            </span>
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-blue-600 font-semibold mt-3 hover:text-blue-800"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Ocultar Histórico' : 'Ver Todo o Histórico'}
          </button>

          {expanded && (
            <div className="mt-3 space-y-3 max-h-64 overflow-y-auto pr-1">
              {logs.map(log => (
                <div key={log.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="font-semibold">{log.user_name}</span>
                    <span className="text-gray-500">{new Date(log.start_time).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span>
                      Duração: <strong className={log.duration_seconds ? '' : 'text-emerald-600 animate-pulse'}>
                        {log.duration_seconds ? formatDuration(log.duration_seconds) : 'Em andamento...'}
                      </strong>
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="O que foi feito neste período?"
                      value={notes[log.id] || ''}
                      onChange={(e) => setNotes({ ...notes, [log.id]: e.target.value })}
                      className="flex-1 text-xs px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <button
                      onClick={() => updateNote(log.id)}
                      className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                      title="Salvar nota"
                    >
                      <Save size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
