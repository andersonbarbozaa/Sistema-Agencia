// ============================================================
// TIPOS GLOBAIS DO SISTEMA DE GERENCIAMENTO DE AGÊNCIA
// ============================================================

export type UserRole = 'ADMINISTRADOR' | 'COLABORADOR' | 'CLIENTE';

export interface Workspace {
  id: string;
  name: string;
  description?: string | null;
  owner_id?: string | null;
  invite_code: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  avatar_url?: string | null;
  phone?: string | null;
  role: UserRole;
  position_id?: string | null;
  position_name?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  is_partner: number;
  status: 'ativo' | 'inativo';
  workspace_id?: string;
  workspace_name?: string;
  workspace_description?: string | null;
  workspace_invite_code?: string;
  job_title?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Position {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  corporate_name?: string | null;
  trade_name?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  website?: string | null;
  instagram?: string | null;
  responsible_user_id?: string | null;
  responsible_name?: string | null;
  notes?: string | null;
  avatar_url?: string | null;
  status: 'ativo' | 'arquivado' | 'inativo';
  created_at: string;
  updated_at: string;
}

export type ProjectStatus = 'Planejamento' | 'Em produção' | 'Em aprovação' | 'Concluído' | 'Cancelado';

export interface Project {
  id: string;
  name: string;
  client_id: string;
  client_name?: string;
  description?: string | null;
  start_date?: string | null;
  deadline?: string | null;
  status: ProjectStatus;
  value: number;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  total_tasks?: number;
  completed_tasks?: number;
}

export interface TaskCategory {
  id: string;
  name: string;
  color?: string;
  is_active: number;
  created_at: string;
}

export type TaskStatus = 
  | 'Não iniciada'
  | 'Em produção'
  | 'Em aprovação'
  | 'Em alteração'
  | 'Aprovada'
  | 'Concluída';

export interface Task {
  id: string;
  name: string;
  description?: string | null;
  client_id: string;
  client_name?: string;
  project_id?: string | null;
  project_name?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  category_color?: string | null;
  delivery_date?: string | null;
  status: TaskStatus;
  completed_at?: string | null;
  value: number;
  notes?: string | null;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  assignees?: { id: string; user_id: string; name: string; avatar_url?: string; email: string }[];
  media_links_count?: number;
  comments_count?: number;
  has_deletion_request?: boolean;
  deletion_request_status?: string | null;
}

export type MediaType = 'image' | 'video' | 'document' | 'other';

export interface TaskMediaLink {
  id: string;
  task_id: string;
  title: string;
  url: string;
  media_type: MediaType;
  description?: string | null;
  sort_order: number;
  created_by: string;
  created_by_name?: string;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string | null;
  user_role?: UserRole;
  content: string;
  type: 'comment' | 'approval' | 'change_request';
  created_at: string;
}

export interface TaskStatusHistory {
  id: string;
  task_id: string;
  user_id: string;
  user_name?: string;
  previous_status?: string | null;
  new_status: string;
  comment?: string | null;
  created_at: string;
}

export interface TaskDeletionRequest {
  id: string;
  task_id: string;
  task_name?: string;
  client_name?: string;
  requested_by: string;
  requested_by_name?: string;
  reason?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  created_at: string;
}

export interface BankAccount {
  id: string;
  name: string;
  bank: string;
  type: string;
  initial_balance: number;
  currency?: string;
  current_balance?: number;
  responsible_partner_id?: string | null;
  responsible_partner_name?: string | null;
  status: 'ativo' | 'inativo';
  created_at: string;
  updated_at: string;
}

export interface FinancialCategory {
  id: string;
  name: string;
  type: 'entrada' | 'saida' | 'both';
  is_active: number;
  created_at: string;
}

export type TransactionType = 'Entrada' | 'Saída';
export type TransactionStatus = 'Pendente' | 'Pago';

export interface FinancialTransaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category_id?: string | null;
  category_name?: string | null;
  bank_account_id?: string | null;
  bank_account_name?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  task_id?: string | null;
  task_name?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  created_by: string;
  partner_id?: string | null;
  partner_name?: string | null;
  due_date: string;
  paid_at?: string | null;
  status: TransactionStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  client_id: string;
  client_name?: string;
  title: string;
  description?: string | null;
  value: number;
  start_date: string;
  end_date?: string | null;
  status: 'ativo' | 'em_revisao' | 'finalizado' | 'cancelado';
  external_url?: string | null;
  notes?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CRMLeadStatus = 
  | 'Novo'
  | 'Em andamento'
  | 'Aguardando resposta'
  | 'Sem resposta'
  | 'Finalizado positivo'
  | 'Finalizado negativo';

export interface CRMLead {
  id: string;
  contact_name: string;
  company?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  city?: string | null;
  first_contact_date?: string;
  platform?: string | null;
  source?: string | null;
  estimated_value?: number | null;
  assignee_id?: string | null;
  assignee_name?: string | null;
  status: CRMLeadStatus;
  notes?: string | null;
  last_activity_at: string;
  is_inactive?: boolean; // True se last_activity_at > 7 dias
  created_at: string;
  updated_at: string;
  interactions_count?: number;
}

export interface CRMInteraction {
  id: string;
  lead_id: string;
  user_id: string;
  user_name?: string;
  interaction_date: string;
  platform: string;
  message: string;
  notes?: string | null;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  location?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  created_by: string;
  google_event_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type NotificationType = 
  | 'task'
  | 'task_assigned'
  | 'task_due'
  | 'client_approval'
  | 'change_request'
  | 'deletion_request'
  | 'bill_due'
  | 'lead_inactive'
  | 'comment'
  | 'system';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  reference_module?: string | null;
  reference_id?: string | null;
  read_at?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  user_name?: string | null;
  action: string;
  module: string;
  record_id?: string | null;
  before_data?: string | null;
  after_data?: string | null;
  ip_address?: string | null;
  created_at: string;
}

export interface AIInterpretation {
  id: string;
  user_id: string;
  input_type: 'text' | 'audio';
  input_text: string;
  audio_reference?: string | null;
  detected_action: 'TASK' | 'TRANSACTION' | 'CLIENT' | 'PROJECT' | 'CRM_LEAD' | 'CRM_INTERACTION' | 'CALENDAR_EVENT' | 'COMMENT' | 'CONTRACT' | 'USER';
  structured_payload: any;
  confidence: number;
  status: 'Pendente' | 'Confirmado' | 'Dispensado' | 'Erro';
  created_at: string;
  confirmed_at?: string | null;
  dismissed_at?: string | null;
}
