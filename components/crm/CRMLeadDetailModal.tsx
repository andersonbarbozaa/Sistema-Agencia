'use client';

import React, { useState, useEffect } from 'react';
import ModalPortal from '@/components/ModalPortal';
import {
  X,
  Edit2,
  PhoneCall,
  History,
  MessageCircle,
  MapPin,
  ExternalLink,
  Send,
  Loader2,
  Clock,
  CheckCircle2,
  RefreshCw,
  Activity,
  FileText,
  UserCheck,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Globe,
} from 'lucide-react';
import { CRMLead, CRMInteraction, CRMStatusHistory, CRMLeadStatus } from '@/types';
import {
  CRM_STATUSES,
  CRM_CHANNELS,
  CRM_INTERACTION_TYPES,
  getFollowUpInfo,
  getChannelTarget,
  formatDurationHuman,
} from '@/lib/crm-utils';
import { formatDate, formatDateTime, cn } from '@/lib/utils';
import {
  renderChannelIcon,
  renderStatusBadge,
  parseSocialLinks,
  buildSocialUrl,
  normalizeWebsiteUrl,
  getFullAddress,
  getGoogleMapsUrl,
  getWazeUrl,
  InstagramIcon,
  FacebookIcon,
  LinkedinIcon,
} from './CRMIcons';

interface CRMLeadDetailModalProps {
  lead: CRMLead;
  isOpen: boolean;
  onClose: () => void;
  onEditLead: (lead: CRMLead) => void;
  onUpdateStatus: (leadId: string, newStatus: CRMLeadStatus, notes?: string) => Promise<void>;
  onOpenWhatsApp: (lead: CRMLead) => void;
  onExecutePrimaryChannel: (lead: CRMLead) => void;
  onChangePrimaryChannel: (leadId: string, channel: string) => void;
  onReactivate: (lead: CRMLead) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export function CRMLeadDetailModal({
  lead,
  isOpen,
  onClose,
  onEditLead,
  onUpdateStatus,
  onOpenWhatsApp,
  onExecutePrimaryChannel,
  onChangePrimaryChannel,
  onReactivate,
  showToast,
}: CRMLeadDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'interactions' | 'status_history'>('info');
  const [interactions, setInteractions] = useState<CRMInteraction[]>(lead.interactions || []);
  const [statusHistory, setStatusHistory] = useState<CRMStatusHistory[]>(lead.status_history || []);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>(lead.status_counts || {});
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Formulário de novo contato
  const [newChannel, setNewChannel] = useState<string>(lead.primary_channel || 'WhatsApp');
  const [newType, setNewType] = useState<string>('Mensagem enviada');
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().slice(0, 16));
  const [newMessage, setNewMessage] = useState<string>('');
  const [submittingContact, setSubmittingContact] = useState<boolean>(false);

  // Status change state
  const [isChangingStatus, setIsChangingStatus] = useState<boolean>(false);
  const [statusNotes, setStatusNotes] = useState<string>('');
  const [selectedTargetStatus, setSelectedTargetStatus] = useState<CRMLeadStatus>(lead.status);

  const followUp = getFollowUpInfo(lead);
  const channelTarget = getChannelTarget(lead.primary_channel, lead);
  const socials = parseSocialLinks(lead);
  const fullAddress = getFullAddress(lead);
  const isClosed = lead.status === 'Fechado — ganho' || lead.status === 'Perdido';

  // Carrega histórico completo e interações do servidor
  const loadFullLeadData = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch(`/api/crm/${lead.id}`);
      if (res.ok) {
        const d = await res.json();
        const data = d.data || {};
        if (data.interactions) setInteractions(data.interactions);
        if (data.status_history) setStatusHistory(data.status_history);
        if (data.status_counts) setStatusCounts(data.status_counts);
      }
    } catch (err) {
      console.error('Erro ao carregar detalhes do lead:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFullLeadData();
      setSelectedTargetStatus(lead.status);
    }
  }, [isOpen, lead.id]);

  if (!isOpen) return null;

  const handleRegisterContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMsg = newMessage.trim();
    if (!cleanMsg) {
      showToast('Por favor, descreva o contato realizado.', 'error');
      return;
    }

    try {
      setSubmittingContact(true);
      const res = await fetch(`/api/crm/${lead.id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: newChannel,
          platform: newChannel,
          type: newType,
          message: cleanMsg,
          interaction_date: new Date(newDate).toISOString(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar contato.');
      }

      setNewMessage('');
      showToast('Contato registrado com sucesso!', 'success');
      await loadFullLeadData();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erro ao registrar contato.', 'error');
    } finally {
      setSubmittingContact(false);
    }
  };

  const handleApplyStatusChange = async () => {
    if (selectedTargetStatus === lead.status) {
      setIsChangingStatus(false);
      return;
    }

    try {
      await onUpdateStatus(lead.id, selectedTargetStatus, statusNotes.trim() || undefined);
      setIsChangingStatus(false);
      setStatusNotes('');
      await loadFullLeadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ModalPortal>
      <div
        onClick={onClose}
        className="fixed inset-0 !m-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl max-h-[92vh] bg-white dark:bg-gray-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-700"
        >
          {/* 1. HEADER DO MODAL */}
          <div className="shrink-0 p-5 sm:p-6 border-b border-gray-150 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-750 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                  {lead.contact_name}
                </h3>
                {renderStatusBadge(lead.status)}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {lead.company || 'Pessoa Física'} {lead.city ? `• ${lead.city}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {/* Botão de Reativação se fechado ou perdido */}
              {isClosed && (
                <button
                  type="button"
                  onClick={() => onReactivate(lead)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  <RefreshCw size={13} className="text-blue-600 dark:text-blue-400" />
                  <span>Reativar Lead</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onEditLead(lead)}
                className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Edit2 size={13} />
                <span>Editar</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-200/50 dark:hover:bg-gray-700 transition-colors"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* 2. BARRA DE INDICADOR DE CONTATO & STATUS ATUAL */}
          <div className="px-5 sm:px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-750 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Indicador de Follow-up com bolinha colorida */}
            <div className="flex items-center gap-2">
              <span className={cn('w-2.5 h-2.5 rounded-full inline-block shrink-0', followUp.dotClass)} />
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                {followUp.label}
              </span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:inline">
                ({followUp.description})
              </span>
            </div>

            {/* Canal Principal de Contato */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 text-[11px] font-medium">Canal Principal:</span>
              <button
                type="button"
                onClick={() => onExecutePrimaryChannel(lead)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs transition-all',
                  channelTarget.hasData
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                )}
              >
                {renderChannelIcon(lead.primary_channel || 'WhatsApp', 12)}
                <span>{lead.primary_channel || 'WhatsApp'}</span>
              </button>

              <select
                value={lead.primary_channel || 'WhatsApp'}
                onChange={(e) => onChangePrimaryChannel(lead.id, e.target.value)}
                className="text-[11px] p-1 bg-transparent border-0 text-gray-500 dark:text-gray-400 cursor-pointer font-medium focus:ring-0"
                title="Alterar canal principal"
              >
                {CRM_CHANNELS.map((ch) => (
                  <option key={ch} value={ch} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                    {ch}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. NAVEGAÇÃO DE SUB-ABAS NO DETALHE */}
          <div className="px-5 sm:px-6 pt-3 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 flex gap-2 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveTab('info')}
              className={cn(
                'px-4 py-2 rounded-t-xl font-bold transition-all border-b-2 flex items-center gap-2 shrink-0',
                activeTab === 'info'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400'
              )}
            >
              <FileText size={14} />
              <span>Dados & Informações</span>
            </button>

            <button
              onClick={() => setActiveTab('interactions')}
              className={cn(
                'px-4 py-2 rounded-t-xl font-bold transition-all border-b-2 flex items-center gap-2 shrink-0',
                activeTab === 'interactions'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400'
              )}
            >
              <PhoneCall size={14} />
              <span>Histórico de Contatos</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                {interactions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('status_history')}
              className={cn(
                'px-4 py-2 rounded-t-xl font-bold transition-all border-b-2 flex items-center gap-2 shrink-0',
                activeTab === 'status_history'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400'
              )}
            >
              <History size={14} />
              <span>Linha do Tempo de Status</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300">
                {statusHistory.length}
              </span>
            </button>
          </div>

          {/* 4. CONTEÚDO PRINCIPAL DAS ABAS */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
            {/* ABA 1: HISTÓRICO DE CONTATOS / INTERAÇÕES (Requisito 3) */}
            {activeTab === 'interactions' && (
              <div className="space-y-5">
                {/* Formulário Rápido de Novo Contato */}
                <form
                  onSubmit={handleRegisterContact}
                  className="p-4 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-2xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                      <PhoneCall size={14} className="text-blue-600" />
                      Registrar Novo Contato
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Atualiza a data do último contato
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Canal */}
                    <div>
                      <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">Canal</label>
                      <select
                        value={newChannel}
                        onChange={(e) => setNewChannel(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {CRM_CHANNELS.map((ch) => (
                          <option key={ch} value={ch}>{ch}</option>
                        ))}
                      </select>
                    </div>

                    {/* Tipo */}
                    <div>
                      <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">Tipo</label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {CRM_INTERACTION_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    {/* Data/Hora */}
                    <div>
                      <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">Data e Hora</label>
                      <input
                        type="datetime-local"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Descreva o contato realizado (ex: ligou para confirmar recebimento da proposta)..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingContact || !newMessage.trim()}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                    >
                      {submittingContact ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      <span>Salvar Contato</span>
                    </button>
                  </div>
                </form>

                {/* Lista de Interações Registradas */}
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Activity size={13} className="text-blue-500" />
                    <span>Contatos e Interações Registradas</span>
                  </h4>

                  {loadingHistory ? (
                    <div className="flex items-center justify-center py-8 text-gray-400 gap-2">
                      <Loader2 size={16} className="animate-spin text-blue-600" />
                      <span>Carregando histórico...</span>
                    </div>
                  ) : interactions.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 bg-gray-50 dark:bg-gray-750/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 space-y-1">
                      <p className="font-semibold text-gray-500">Sem contato registrado ainda.</p>
                      <p className="text-[11px]">Utilize o formulário acima para registrar mensagens, ligações ou reuniões com o lead.</p>
                    </div>
                  ) : (
                    interactions.map((int: any) => {
                      const isReply = int.type === 'Resposta recebida';
                      return (
                        <div
                          key={int.id}
                          className="p-3.5 bg-gray-50/80 dark:bg-gray-750/60 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 space-y-1.5 transition-all"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                {renderChannelIcon(int.channel || int.platform, 11)}
                                <span>{int.channel || int.platform}</span>
                              </span>

                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded-md text-[10px] font-bold border',
                                  isReply
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                )}
                              >
                                {int.type || 'Mensagem enviada'}
                              </span>

                              {int.author_name && (
                                <span className="text-[11px] text-gray-400 font-medium">
                                  por {int.author_name}
                                </span>
                              )}
                            </div>

                            <span className="text-[11px] text-gray-400 font-mono">
                              {formatDateTime(int.interaction_date || int.created_at)}
                            </span>
                          </div>

                          <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-xs">
                            {int.message || int.notes}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ABA 2: LINHA DO TEMPO CRONOLÓGICA DE STATUS (Requisito 2) */}
            {activeTab === 'status_history' && (
              <div className="space-y-5">
                {/* Seletor rápido de Status com campo de notas */}
                <div className="p-4 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-2xl space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      Mudar Etapa Atual:
                    </span>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedTargetStatus}
                        onChange={(e) => {
                          setSelectedTargetStatus(e.target.value as CRMLeadStatus);
                          setIsChangingStatus(true);
                        }}
                        className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {CRM_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>

                      {isChangingStatus && selectedTargetStatus !== lead.status && (
                        <button
                          type="button"
                          onClick={handleApplyStatusChange}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-xs"
                        >
                          Salvar Mudança
                        </button>
                      )}
                    </div>
                  </div>

                  {isChangingStatus && selectedTargetStatus !== lead.status && (
                    <div className="animate-in fade-in space-y-1">
                      <label className="block text-[11px] text-gray-500 font-medium">
                        Observação sobre esta mudança (opcional):
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Proposta enviada após alinhamento de escopo..."
                        value={statusNotes}
                        onChange={(e) => setStatusNotes(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-gray-200"
                      />
                    </div>
                  )}
                </div>

                {/* Resumo de quantidade de passagens em cada status */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                    Passagens por Etapa (Histórico Cumulativo)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {CRM_STATUSES.map((st) => {
                      const count = statusCounts[st] || (lead.status === st ? 1 : 0);
                      return (
                        <span
                          key={st}
                          className={cn(
                            'px-2.5 py-1 rounded-xl text-[11px] font-semibold border flex items-center gap-1.5',
                            count > 0
                              ? 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                              : 'bg-gray-50 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 opacity-60'
                          )}
                        >
                          <span>{st}:</span>
                          <strong>{count}x</strong>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Linha do Tempo Cronológica */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <History size={13} className="text-purple-500" />
                    <span>Movimentações Registradas</span>
                  </h4>

                  {statusHistory.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 bg-gray-50 dark:bg-gray-750/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                      Nenhuma movimentação anterior registrada.
                    </div>
                  ) : (
                    statusHistory.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-3.5 bg-gray-50/80 dark:bg-gray-750/60 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {item.previous_status ? (
                              <>
                                <span className="font-semibold text-gray-600 dark:text-gray-300">
                                  {item.previous_status}
                                </span>
                                <ArrowRight size={12} className="text-gray-400" />
                                <span className="font-bold text-blue-600 dark:text-blue-400">
                                  {item.new_status}
                                </span>
                              </>
                            ) : (
                              <span className="font-bold text-blue-600 dark:text-blue-400">
                                Entrada no Funil: {item.new_status}
                              </span>
                            )}

                            {item.user_name && (
                              <span className="text-[11px] text-gray-400">
                                por {item.user_name}
                              </span>
                            )}
                          </div>

                          <span className="text-[11px] text-gray-400 font-mono">
                            {formatDateTime(item.moved_at || item.created_at)}
                          </span>
                        </div>

                        {/* Tempo de permanência na etapa anterior */}
                        {item.duration_seconds && item.duration_seconds > 0 ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                            <Clock size={11} className="text-amber-500" />
                            <span>Tempo na etapa anterior: <strong>{formatDurationHuman(item.duration_seconds)}</strong></span>
                          </div>
                        ) : null}

                        {item.notes && (
                          <p className="text-gray-700 dark:text-gray-300 text-xs italic bg-white/70 dark:bg-gray-800/70 p-2 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                            &ldquo;{item.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ABA 3: DADOS CADASTRAIS, ENDEREÇO & NOTAS */}
            {activeTab === 'info' && (
              <div className="space-y-5">
                {/* Grid de Informações de Contato */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-xl space-y-1">
                    <span className="text-gray-400 block text-[11px]">Telefone Principal:</span>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{lead.phone || '—'}</p>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-[11px]">WhatsApp:</span>
                      {(lead.whatsapp || lead.phone) && (
                        <button
                          type="button"
                          onClick={() => onOpenWhatsApp(lead)}
                          className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                        >
                          <MessageCircle size={11} /> Enviar
                        </button>
                      )}
                    </div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{lead.whatsapp || lead.phone || '—'}</p>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-[11px]">Segundo Telefone / Fixo:</span>
                      {lead.phone2 && (
                        <a
                          href={`tel:${lead.phone2.replace(/\D/g, '')}`}
                          className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
                        >
                          <PhoneCall size={11} /> Ligar
                        </a>
                      )}
                    </div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{lead.phone2 || '—'}</p>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-xl space-y-1">
                    <span className="text-gray-400 block text-[11px]">E-mail:</span>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{lead.email || '—'}</p>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-xl space-y-1">
                    <span className="text-gray-400 block text-[11px]">Ramo de Atuação:</span>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{lead.segment || '—'}</p>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-xl space-y-1">
                    <span className="text-gray-400 block text-[11px]">Valor Estimado:</span>
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {lead.estimated_value && Number(lead.estimated_value) > 0
                        ? `R$ ${Number(lead.estimated_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : 'R$ 0,00'}
                    </p>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-xl space-y-1">
                    <span className="text-gray-400 block text-[11px]">Data de Entrada:</span>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{formatDate(lead.created_at)}</p>
                  </div>
                </div>

                {/* Datas de Acompanhamento (Requisito 3) */}
                <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                    Controle de Acompanhamento
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[11px]">Última Interação Geral:</span>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {lead.last_interaction_at ? formatDateTime(lead.last_interaction_at) : 'Nenhuma registrada'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Último Contato da Equipe:</span>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {lead.last_contact_at ? formatDateTime(lead.last_contact_at) : 'Nenhum registrado'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Última Resposta do Lead:</span>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {lead.last_reply_at ? formatDateTime(lead.last_reply_at) : 'Nenhuma registrada'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Localização & Endereço */}
                <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <MapPin size={12} className="text-blue-600" />
                      Localização & Endereço
                    </span>
                    {fullAddress && (
                      <div className="flex items-center gap-2">
                        <a
                          href={getGoogleMapsUrl(fullAddress)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-blue-600 rounded-md font-semibold text-[10px] flex items-center gap-1"
                        >
                          Google Maps <ExternalLink size={9} />
                        </a>
                        <a
                          href={getWazeUrl(fullAddress)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-cyan-600 rounded-md font-semibold text-[10px] flex items-center gap-1"
                        >
                          Waze <ExternalLink size={9} />
                        </a>
                      </div>
                    )}
                  </div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    {fullAddress || 'Nenhum endereço cadastrado.'}
                  </p>
                </div>

                {/* Links & Redes Sociais */}
                {(lead.website || socials.length > 0) && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                      Links & Redes Sociais
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {lead.website && (
                        <a
                          href={normalizeWebsiteUrl(lead.website)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-blue-600 hover:text-blue-700 font-medium"
                        >
                          <Globe size={13} />
                          <span>{lead.website.replace(/^https?:\/\//i, '')}</span>
                          <ExternalLink size={10} className="text-gray-400" />
                        </a>
                      )}
                      {socials.map((item, idx) => (
                        <a
                          key={idx}
                          href={buildSocialUrl(item.network, item.value)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-medium"
                        >
                          {item.network.toLowerCase().includes('instagram') ? (
                            <InstagramIcon size={13} className="text-pink-600" />
                          ) : item.network.toLowerCase().includes('facebook') ? (
                            <FacebookIcon size={13} className="text-blue-600" />
                          ) : item.network.toLowerCase().includes('linkedin') ? (
                            <LinkedinIcon size={13} className="text-sky-600" />
                          ) : (
                            <Globe size={13} />
                          )}
                          <span>{item.network}: {item.value}</span>
                          <ExternalLink size={10} className="text-gray-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Descrição e Observações */}
                {lead.description && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-1">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                      Sobre o Cliente
                    </span>
                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{lead.description}</p>
                  </div>
                )}

                {lead.notes && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-1">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                      Observações Internas
                    </span>
                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{lead.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
