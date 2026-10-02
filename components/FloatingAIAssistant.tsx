'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Mic,
  MicOff,
  Send,
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  CheckSquare,
  DollarSign,
  TrendingUp,
  Calendar,
  Loader2,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { User } from '@/types';

interface FloatingAIAssistantProps {
  user: User;
}

export default function FloatingAIAssistant({ user }: FloatingAIAssistantProps) {
  // Only admins have access to AI operations
  if (user.role !== 'ADMINISTRADOR') return null;

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [currentInterpretation, setCurrentInterpretation] = useState<any | null>(null);
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; interpretation?: any }>>([
    {
      sender: 'ai',
      text: 'Olá! Sou seu assistente de inteligência artificial. Como posso ajudar? Você pode me pedir para criar tarefas, registrar despesas ou receitas, cadastrar leads ou agendar reuniões por texto ou voz.',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Setup Web Speech API for voice commands
  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Reconhecimento de voz não é suportado pelo seu navegador. Por favor use Chrome ou Edge.');
      return;
    }

    try {
      setError('');
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInputText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          setError('Permissão de microfone negada no navegador.');
        } else {
          setError('Erro ao capturar áudio. Tente falar novamente.');
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error(err);
      setError('Não foi possível iniciar o microfone.');
      setIsRecording(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend || loading) return;

    setInputText('');
    setError('');
    setLoading(true);

    // Add user message to timeline
    setMessages((prev) => [...prev, { sender: 'user', text: textToSend }]);

    try {
      const res = await fetch('/api/ai/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_text: textToSend }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Falha ao processar comando.');
      }

      const data = await res.json();
      setCurrentInterpretation(data);

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `Entendi! Detectei a ação "${data.detected_action}". Revise os dados abaixo para confirmar e gravar no sistema:`,
          interpretation: data,
        },
      ]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao comunicar com a IA.');
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `Desculpe, não consegui processar esse comando. ${err.message || ''}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (interp: any) => {
    if (!interp || confirming) return;
    setConfirming(true);
    setError('');

    try {
      const res = await fetch('/api/ai/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interpretation_id: interp.id,
          payload: interp.structured_payload,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Falha ao salvar no banco de dados.');
      }

      const resData = await res.json();
      setCurrentInterpretation(null);

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `✅ Sucesso! Ação executada e gravada no sistema. (${resData.message || 'Criado com sucesso'})`,
        },
      ]);

      // Refresh any page data if appropriate
      window.dispatchEvent(new CustomEvent('ai-action-completed'));
    } catch (err: any) {
      setError(err.message || 'Erro ao confirmar.');
    } finally {
      setConfirming(false);
    }
  };

  const handleDismiss = async (interp: any) => {
    if (!interp) return;
    try {
      await fetch('/api/ai/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interpretation_id: interp.id }),
      });
      setCurrentInterpretation(null);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Entendido, ação cancelada. Em que mais posso ajudar?',
        },
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      {/* Floating Action Trigger Button */}
      <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          title="Assistente IA PixelCraft"
          className="relative group w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none ring-4 ring-blue-500/20"
        >
          {isOpen ? (
            <X size={22} className="transition-transform rotate-0 group-hover:rotate-90 duration-200" />
          ) : (
            <>
              <Bot size={24} className="animate-pulse" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
            </>
          )}
        </button>
      </div>

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-18 sm:bottom-24 right-3 sm:right-6 left-3 sm:left-auto z-40 sm:w-[420px] max-h-[calc(100vh-90px)] sm:max-h-[600px] h-[500px] sm:h-[560px] bg-white rounded-3xl shadow-2xl border border-gray-200/90 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 zoom-in-95 duration-200 select-none">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-gray-900 via-gray-900 to-indigo-950 text-white flex items-center justify-between border-b border-gray-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Sparkles size={16} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm tracking-tight">Assistente IA</h3>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-semibold uppercase">
                    Gemini
                  </span>
                </div>
                <p className="text-[10px] text-gray-400">Voz e texto para tarefas e finanças</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-gray-50/50">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
              >
                <div
                  className={`p-3.5 rounded-2xl max-w-[85%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                      : 'bg-white text-gray-800 border border-gray-200/80 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>

                {/* Structured Interpretation Card */}
                {m.interpretation && (
                  <div className="w-full bg-white rounded-2xl border border-blue-200 p-3.5 shadow-sm space-y-3 text-xs mt-1">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="font-bold text-gray-900 flex items-center gap-1.5">
                        {m.interpretation.detected_action === 'create_task' && <CheckSquare size={14} className="text-blue-600" />}
                        {m.interpretation.detected_action === 'create_transaction' && <DollarSign size={14} className="text-emerald-600" />}
                        {m.interpretation.detected_action === 'create_lead' && <TrendingUp size={14} className="text-purple-600" />}
                        {m.interpretation.detected_action === 'create_event' && <Calendar size={14} className="text-indigo-600" />}
                        Ação: {m.interpretation.detected_action}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium">
                        Confiança: {Math.round(m.interpretation.confidence * 100)}%
                      </span>
                    </div>

                    {/* Payload Details */}
                    <div className="space-y-1 text-gray-700 bg-gray-50 p-2.5 rounded-xl border border-gray-100 font-mono text-[11px]">
                      {Object.entries(m.interpretation.structured_payload || {}).map(([key, val]: any) => (
                        <div key={key} className="flex justify-between gap-2">
                          <span className="text-gray-400 capitalize">{key}:</span>
                          <span className="font-semibold text-gray-900 truncate max-w-[180px]">{String(val || '-')}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action Confirmation Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleConfirm(m.interpretation)}
                        disabled={confirming}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-1 shadow-sm transition-colors text-xs"
                      >
                        {confirming ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                        Confirmar e Gravar
                      </button>
                      <button
                        onClick={() => handleDismiss(m.interpretation)}
                        disabled={confirming}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-semibold transition-colors text-xs"
                      >
                        Dispensar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-2xl w-fit text-xs text-gray-500 shadow-sm animate-pulse">
                <Loader2 size={14} className="animate-spin text-blue-600" />
                <span>Analisando instrução com IA...</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                <AlertTriangle size={14} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Voice status banner */}
          {isRecording && (
            <div className="bg-red-500 text-white px-3 py-1.5 text-[11px] font-semibold flex items-center justify-between animate-pulse">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white" />
                Gravando áudio... Fale seu comando agora.
              </span>
              <button onClick={toggleRecording} className="text-xs font-bold underline">
                Parar
              </button>
            </div>
          )}

          {/* Input Footer */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
            <button
              type="button"
              onClick={toggleRecording}
              title={isRecording ? 'Parar gravação' : 'Falar comando de voz'}
              className={`p-2.5 rounded-xl transition-all ${
                isRecording
                  ? 'bg-red-500 text-white animate-bounce shadow-md shadow-red-500/30'
                  : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isRecording ? 'Ouvindo sua voz...' : 'Digite ou fale um comando...'}
              className="flex-1 px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-900"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl shadow-sm transition-all active:scale-95"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
