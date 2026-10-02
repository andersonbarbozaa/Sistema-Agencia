import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'local.sqlite');
const db = new DatabaseSync(dbPath);

console.log('[Seed] Conectado ao banco local SQLite:', dbPath);

// Execute schema
const schemaPath = path.join(process.cwd(), 'migrations', '0001_initial_schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');
db.exec(schemaSql);
console.log('[Seed] Schema verificado e pronto.');

async function runSeed() {
  // Clear existing demo data
  db.exec(`
    DELETE FROM ai_interpretations;
    DELETE FROM audit_logs;
    DELETE FROM notifications;
    DELETE FROM calendar_events;
    DELETE FROM crm_interactions;
    DELETE FROM crm_leads;
    DELETE FROM contracts;
    DELETE FROM financial_transactions;
    DELETE FROM bank_accounts;
    DELETE FROM financial_categories;
    DELETE FROM task_deletion_requests;
    DELETE FROM task_status_history;
    DELETE FROM task_comments;
    DELETE FROM task_media_links;
    DELETE FROM task_assignees;
    DELETE FROM tasks;
    DELETE FROM task_categories;
    DELETE FROM projects;
    DELETE FROM users;
    DELETE FROM clients;
    DELETE FROM positions;
    DELETE FROM settings;
  `);

  console.log('[Seed] Tabelas limpas para inserção de dados de demonstração...');

  // 1. CARGOS
  const positions = [
    { id: 'pos_dir_fotografia', name: 'Diretor de Fotografia', description: 'Responsável pela estética visual, iluminação e captação' },
    { id: 'pos_ed_video', name: 'Editor de Vídeo', description: 'Responsável pela montagem, cortes, color grading e finalização' },
    { id: 'pos_social_media', name: 'Social Media', description: 'Planejamento de conteúdo, gestão de redes e relacionamento' },
    { id: 'pos_designer', name: 'Designer Gráfico', description: 'Criação de identidades visuais, posts e materiais gráficos' },
    { id: 'pos_videomaker', name: 'Videomaker', description: 'Captação dinâmica e produção de conteúdo ágil' },
    { id: 'pos_motion', name: 'Motion Designer', description: 'Animações gráficas, vinhetas e efeitos 2D/3D' },
  ];

  const posStmt = db.prepare('INSERT INTO positions (id, name, description) VALUES (?, ?, ?)');
  for (const pos of positions) {
    posStmt.run(pos.id, pos.name, pos.description);
  }

  // 2. CATEGORIAS DE TAREFAS
  const taskCategories = [
    { id: 'tcat_edicao', name: 'Edição', color: '#3b82f6' },
    { id: 'tcat_captacao', name: 'Captação', color: '#10b981' },
    { id: 'tcat_fotografia', name: 'Fotografia', color: '#8b5cf6' },
    { id: 'tcat_social', name: 'Social Media', color: '#ec4899' },
    { id: 'tcat_design', name: 'Design', color: '#f59e0b' },
    { id: 'tcat_motion', name: 'Motion', color: '#6366f1' },
    { id: 'tcat_reuniao', name: 'Reunião', color: '#06b6d4' },
    { id: 'tcat_revisao', name: 'Revisão', color: '#f97316' },
    { id: 'tcat_outro', name: 'Outro', color: '#64748b' },
  ];

  const tcatStmt = db.prepare('INSERT INTO task_categories (id, name, color, is_active) VALUES (?, ?, ?, 1)');
  for (const tc of taskCategories) {
    tcatStmt.run(tc.id, tc.name, tc.color);
  }

  // 3. CATEGORIAS FINANCEIRAS
  const finCategories = [
    { id: 'fcat_software', name: 'Software', type: 'saida' },
    { id: 'fcat_equip', name: 'Equipamentos', type: 'saida' },
    { id: 'fcat_marketing', name: 'Marketing', type: 'saida' },
    { id: 'fcat_publicidade', name: 'Publicidade', type: 'saida' },
    { id: 'fcat_impostos', name: 'Impostos', type: 'saida' },
    { id: 'fcat_transporte', name: 'Transporte', type: 'saida' },
    { id: 'fcat_alimentacao', name: 'Alimentação', type: 'saida' },
    { id: 'fcat_servicos', name: 'Serviços Prestados', type: 'entrada' },
    { id: 'fcat_fornecedores', name: 'Fornecedores', type: 'saida' },
    { id: 'fcat_outros', name: 'Outros', type: 'both' },
  ];

  const fcatStmt = db.prepare('INSERT INTO financial_categories (id, name, type, is_active) VALUES (?, ?, ?, 1)');
  for (const fc of finCategories) {
    fcatStmt.run(fc.id, fc.name, fc.type);
  }

  // 4. CLIENTES
  const clients = [
    {
      id: 'cli_santacasa',
      name: 'Santa Casa de Araçatuba',
      corporate_name: 'Irmandade da Santa Casa de Misericórdia de Araçatuba',
      trade_name: 'Santa Casa Saúde',
      document: '44.405.908/0001-44',
      email: 'comunicacao@santacasaaracatuba.com.br',
      phone: '(18) 3607-3000',
      whatsapp: '(18) 99781-4422',
      address: 'Rua Floriano Peixoto, 896 - Centro',
      city: 'Araçatuba',
      state: 'SP',
      website: 'https://santacasaaracatuba.com.br',
      instagram: '@santacasaaracatuba',
      notes: 'Cliente institucional com foco em campanhas de conscientização e vídeos médicos humanizados.',
      status: 'ativo',
    },
    {
      id: 'cli_conscape',
      name: 'Conscape Construtora',
      corporate_name: 'Conscape Engenharia e Construções Ltda',
      trade_name: 'Conscape Empreendimentos',
      document: '12.345.678/0001-90',
      email: 'contato@conscape.com.br',
      phone: '(18) 3622-1144',
      whatsapp: '(18) 99123-5566',
      address: 'Av. Brasília, 1450 - Sala 302',
      city: 'Araçatuba',
      state: 'SP',
      website: 'https://conscape.com.br',
      instagram: '@conscapeimoveis',
      notes: 'Produção audiovisual de lançamentos imobiliários, drones, reels e render tours.',
      status: 'ativo',
    },
    {
      id: 'cli_vinhedos',
      name: 'Vinhedos Bistrô & Eventos',
      corporate_name: 'Vinhedos Gastronomia e Lazer Ltda',
      trade_name: 'Vinhedos Bistrô',
      document: '98.765.432/0001-10',
      email: 'reserva@vinhedosbistro.com.br',
      phone: '(18) 3644-2200',
      whatsapp: '(18) 99877-3311',
      address: 'Rodovia Marechal Rondon, Km 520',
      city: 'Birigui',
      state: 'SP',
      website: 'https://vinhedosbistro.com.br',
      instagram: '@vinhedosbistro',
      notes: 'Produção de fotografia gastronômica, vídeos de eventos e gestão de mídia social.',
      status: 'ativo',
    },
  ];

  const cliStmt = db.prepare(`
    INSERT INTO clients (id, name, corporate_name, trade_name, document, email, phone, whatsapp, address, city, state, website, instagram, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const c of clients) {
    cliStmt.run(c.id, c.name, c.corporate_name, c.trade_name, c.document, c.email, c.phone, c.whatsapp, c.address, c.city, c.state, c.website, c.instagram, c.notes, c.status);
  }

  // 5. USUÁRIOS (Password: admin123 para todos os testes)
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('admin123', salt);

  const users = [
    {
      id: 'usr_anderson',
      name: 'Anderson Ferreira',
      email: 'anderson@agencia.com',
      password_hash: passwordHash,
      role: 'ADMINISTRADOR',
      position_id: 'pos_dir_fotografia',
      client_id: null,
      is_partner: 1, // Parceiro
      phone: '(18) 99700-1122',
      status: 'ativo',
    },
    {
      id: 'usr_joao',
      name: 'João Silva',
      email: 'joao@agencia.com',
      password_hash: passwordHash,
      role: 'COLABORADOR',
      position_id: 'pos_ed_video',
      client_id: null,
      is_partner: 0,
      phone: '(18) 99811-3344',
      status: 'ativo',
    },
    {
      id: 'usr_mariana',
      name: 'Mariana Costa',
      email: 'mariana@agencia.com',
      password_hash: passwordHash,
      role: 'COLABORADOR',
      position_id: 'pos_social_media',
      client_id: null,
      is_partner: 1, // Parceira
      phone: '(18) 99622-4455',
      status: 'ativo',
    },
    {
      id: 'usr_santacasa_client',
      name: 'Equipe Marketing Santa Casa',
      email: 'contato@santacasa.com',
      password_hash: passwordHash,
      role: 'CLIENTE',
      position_id: null,
      client_id: 'cli_santacasa',
      is_partner: 0,
      phone: '(18) 99781-4422',
      status: 'ativo',
    },
  ];

  const usrStmt = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, position_id, client_id, is_partner, phone, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const u of users) {
    usrStmt.run(u.id, u.name, u.email, u.password_hash, u.role, u.position_id, u.client_id, u.is_partner, u.phone, u.status);
  }

  // 6. CONTAS BANCÁRIAS
  const accounts = [
    { id: 'acc_nubank', name: 'Conta PJ Nubank', bank: 'Nubank', type: 'Corrente', initial_balance: 15400.0, responsible_partner_id: 'usr_anderson' },
    { id: 'acc_inter', name: 'Conta PJ Banco Inter', bank: 'Inter', type: 'Corrente', initial_balance: 8250.0, responsible_partner_id: 'usr_mariana' },
    { id: 'acc_caixa', name: 'Caixa Econômica Federal', bank: 'Caixa', type: 'Poupança Reserva', initial_balance: 3500.0, responsible_partner_id: 'usr_anderson' },
  ];

  const accStmt = db.prepare(`
    INSERT INTO bank_accounts (id, name, bank, type, initial_balance, responsible_partner_id, status)
    VALUES (?, ?, ?, ?, ?, ?, 'ativo')
  `);
  for (const a of accounts) {
    accStmt.run(a.id, a.name, a.bank, a.type, a.initial_balance, a.responsible_partner_id);
  }

  // 7. PROJETOS
  const projects = [
    {
      id: 'proj_outubro_rosa',
      name: 'Campanha Outubro Rosa 2026',
      client_id: 'cli_santacasa',
      description: 'Série de 4 vídeos institucionais com depoimentos de médicas oncologistas e pacientes recuperadas.',
      start_date: '2026-09-15',
      deadline: '2026-10-25',
      status: 'Em produção',
      value: 7500.0,
      created_by: 'usr_anderson',
    },
    {
      id: 'proj_jardins',
      name: 'Lançamento Residencial Jardins',
      client_id: 'cli_conscape',
      description: 'Campanha de lançamento do novo edifício com captação aérea em drone, 3D tour e 12 reels.',
      start_date: '2026-09-20',
      deadline: '2026-11-10',
      status: 'Em produção',
      value: 11200.0,
      created_by: 'usr_anderson',
    },
    {
      id: 'proj_menu_primavera',
      name: 'Cardápio e Campanha Primavera/Verão',
      client_id: 'cli_vinhedos',
      description: 'Sessão de fotografia gastronômica dos novos pratos e vídeos verticais para Instagram e TikTok.',
      start_date: '2026-09-25',
      deadline: '2026-10-18',
      status: 'Em aprovação',
      value: 3800.0,
      created_by: 'usr_anderson',
    },
  ];

  const projStmt = db.prepare(`
    INSERT INTO projects (id, name, client_id, description, start_date, deadline, status, value, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const p of projects) {
    projStmt.run(p.id, p.name, p.client_id, p.description, p.start_date, p.deadline, p.status, p.value, p.created_by);
  }

  // 8. TAREFAS
  const tasks = [
    {
      id: 'task_001',
      name: 'Editar vídeo institucional oncologia 60s',
      description: 'Corte da entrevista com a Dra. Helena, inserção de trilha sonora suave, letterings em harmonia com a marca e color grading em Rec709.',
      client_id: 'cli_santacasa',
      project_id: 'proj_outubro_rosa',
      category_id: 'tcat_edicao',
      delivery_date: '2026-10-15',
      status: 'Em produção',
      value: 1200.0,
      created_by: 'usr_anderson',
    },
    {
      id: 'task_002',
      name: 'Captação depoimentos médicas oncologistas',
      description: 'Gravação na unidade de alta complexidade com 2 câmeras Sony FX3, áudio lapela wireless e iluminação difusa.',
      client_id: 'cli_santacasa',
      project_id: 'proj_outubro_rosa',
      category_id: 'tcat_captacao',
      delivery_date: '2026-10-02',
      status: 'Concluída',
      completed_at: '2026-10-02 18:30:00',
      value: 1500.0,
      created_by: 'usr_anderson',
    },
    {
      id: 'task_003',
      name: 'Carrossel informativo para Instagram: Prevenção',
      description: 'Arte de 7 lâminas com dicas de autoexame e dados da Santa Casa. Pronta para aprovação do cliente.',
      client_id: 'cli_santacasa',
      project_id: 'proj_outubro_rosa',
      category_id: 'tcat_social',
      delivery_date: '2026-10-10',
      status: 'Em aprovação',
      value: 450.0,
      created_by: 'usr_mariana',
    },
    {
      id: 'task_004',
      name: 'Motion Design para Reels do Edifício Jardins',
      description: 'Animação 3D dos diferenciais da planta (varanda gourmet, piscina aquecida e coworking).',
      client_id: 'cli_conscape',
      project_id: 'proj_jardins',
      category_id: 'tcat_motion',
      delivery_date: '2026-10-22',
      status: 'Não iniciada',
      value: 900.0,
      created_by: 'usr_anderson',
    },
    {
      id: 'task_005',
      name: 'Fotografia gastronômica pratos principais',
      description: 'Ensaio fotográfico de 12 novos pratos do cardápio executivo com tratamento de cor e contraste.',
      client_id: 'cli_vinhedos',
      project_id: 'proj_menu_primavera',
      category_id: 'tcat_fotografia',
      delivery_date: '2026-10-08',
      status: 'Aprovada',
      value: 1400.0,
      created_by: 'usr_anderson',
    },
    {
      id: 'task_006',
      name: 'Ajuste no corte vertical do vídeo de depoimento',
      description: 'Cliente solicitou aumentar a fonte do lettering e trocar o trecho do relato final.',
      client_id: 'cli_santacasa',
      project_id: 'proj_outubro_rosa',
      category_id: 'tcat_revisao',
      delivery_date: '2026-10-14',
      status: 'Em alteração',
      value: 300.0,
      created_by: 'usr_anderson',
    },
  ];

  const taskStmt = db.prepare(`
    INSERT INTO tasks (id, name, description, client_id, project_id, category_id, delivery_date, status, completed_at, value, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const t of tasks) {
    taskStmt.run(t.id, t.name, t.description, t.client_id, t.project_id, t.category_id, t.delivery_date, t.status, t.completed_at || null, t.value, t.created_by);
  }

  // 9. RESPONSÁVEIS PELAS TAREFAS (Tabela task_assignees)
  const assignees = [
    { id: 'asgn_1', task_id: 'task_001', user_id: 'usr_joao' },
    { id: 'asgn_2', task_id: 'task_001', user_id: 'usr_anderson' },
    { id: 'asgn_3', task_id: 'task_002', user_id: 'usr_anderson' },
    { id: 'asgn_4', task_id: 'task_003', user_id: 'usr_mariana' },
    { id: 'asgn_5', task_id: 'task_004', user_id: 'usr_joao' },
    { id: 'asgn_6', task_id: 'task_005', user_id: 'usr_anderson' },
    { id: 'asgn_7', task_id: 'task_006', user_id: 'usr_joao' },
  ];

  const asgnStmt = db.prepare('INSERT INTO task_assignees (id, task_id, user_id) VALUES (?, ?, ?)');
  for (const a of assignees) {
    asgnStmt.run(a.id, a.task_id, a.user_id);
  }

  // 10. LINKS DE MÍDIA DAS TAREFAS (Somente URLs externas de serviços como YouTube, Drive, Dropbox, etc.)
  const mediaLinks = [
    {
      id: 'med_001',
      task_id: 'task_001',
      title: 'Versão Prévia do Vídeo (YouTube Não Listado)',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      media_type: 'video',
      description: 'Primeiro corte com áudio mixado em -14 LUFS para aprovação preliminar.',
      sort_order: 1,
      created_by: 'usr_joao',
    },
    {
      id: 'med_002',
      task_id: 'task_001',
      title: 'Pasta no Google Drive com Arquivos Brutos',
      url: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview',
      media_type: 'document',
      description: 'Documentação de briefing e roteiro aprovado.',
      sort_order: 2,
      created_by: 'usr_anderson',
    },
    {
      id: 'med_003',
      task_id: 'task_003',
      title: 'Arte de Capa do Carrossel',
      url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80',
      media_type: 'image',
      description: 'Layout da lâmina 1 em alta resolução.',
      sort_order: 1,
      created_by: 'usr_mariana',
    },
    {
      id: 'med_004',
      task_id: 'task_005',
      title: 'Foto Prato Principal - Risoto de Cogumelos',
      url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
      media_type: 'image',
      description: 'Foto final tratada e aprovada pelo chef.',
      sort_order: 1,
      created_by: 'usr_anderson',
    },
  ];

  const medStmt = db.prepare(`
    INSERT INTO task_media_links (id, task_id, title, url, media_type, description, sort_order, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const m of mediaLinks) {
    medStmt.run(m.id, m.task_id, m.title, m.url, m.media_type, m.description, m.sort_order, m.created_by);
  }

  // 11. COMENTÁRIOS E HISTÓRICO DAS TAREFAS
  const comments = [
    {
      id: 'com_001',
      task_id: 'task_001',
      user_id: 'usr_anderson',
      content: 'A captação foi excelente, cortes sincronizados com a fala da médica.',
      type: 'comment',
    },
    {
      id: 'com_002',
      task_id: 'task_006',
      user_id: 'usr_santacasa_client',
      content: 'Gostamos muito do início, mas precisamos aumentar a legibilidade do nome da médica no lettering e trocar a frase dos 35 segundos.',
      type: 'change_request',
    },
    {
      id: 'com_003',
      task_id: 'task_005',
      user_id: 'usr_anderson',
      content: 'Ensaio fotográfico aprovado integralmente pelo cliente no set.',
      type: 'approval',
    },
  ];

  const comStmt = db.prepare('INSERT INTO task_comments (id, task_id, user_id, content, type) VALUES (?, ?, ?, ?, ?)');
  for (const c of comments) {
    comStmt.run(c.id, c.task_id, c.user_id, c.content, c.type);
  }

  // 12. TRANSAÇÕES FINANCEIRAS (Entradas e Saídas independentes de datas de entrega)
  const transactions = [
    {
      id: 'tra_001',
      description: 'Mensalidade Contrato Santa Casa - Outubro',
      amount: 4500.0,
      type: 'Entrada',
      category_id: 'fcat_servicos',
      bank_account_id: 'acc_nubank',
      client_id: 'cli_santacasa',
      task_id: null,
      project_id: 'proj_outubro_rosa',
      created_by: 'usr_anderson',
      partner_id: null,
      due_date: '2026-10-05',
      paid_at: '2026-10-05 11:20:00',
      status: 'Pago',
      notes: 'Faturamento mensal recorrente recebido via PIX.',
    },
    {
      id: 'tra_002',
      description: 'Entrada Projeto Residencial Jardins (50% sinal)',
      amount: 5600.0,
      type: 'Entrada',
      category_id: 'fcat_servicos',
      bank_account_id: 'acc_inter',
      client_id: 'cli_conscape',
      task_id: null,
      project_id: 'proj_jardins',
      created_by: 'usr_anderson',
      partner_id: null,
      due_date: '2026-10-01',
      paid_at: '2026-10-01 14:15:00',
      status: 'Pago',
      notes: 'Primeira parcela de lançamento imobiliário.',
    },
    {
      id: 'tra_003',
      description: 'Segunda Parcela Campanha Outubro Rosa',
      amount: 3000.0,
      type: 'Entrada',
      category_id: 'fcat_servicos',
      bank_account_id: 'acc_nubank',
      client_id: 'cli_santacasa',
      task_id: 'task_001',
      project_id: 'proj_outubro_rosa',
      created_by: 'usr_anderson',
      partner_id: null,
      due_date: '2026-10-20',
      paid_at: null,
      status: 'Pendente',
      notes: 'Vencimento programado para entrega dos 4 cortes.',
    },
    {
      id: 'tra_004',
      description: 'Assinatura Adobe Creative Cloud Teams',
      amount: 380.0,
      type: 'Saída',
      category_id: 'fcat_software',
      bank_account_id: 'acc_nubank',
      client_id: null,
      task_id: null,
      project_id: null,
      created_by: 'usr_anderson',
      partner_id: 'usr_anderson',
      due_date: '2026-10-03',
      paid_at: '2026-10-03 09:00:00',
      status: 'Pago',
      notes: 'Cobrança mensal cartão corporativo Nubank.',
    },
    {
      id: 'tra_005',
      description: 'Locação Objetiva Sony G Master 24-70mm',
      amount: 250.0,
      type: 'Saída',
      category_id: 'fcat_equip',
      bank_account_id: 'acc_inter',
      client_id: 'cli_santacasa',
      task_id: 'task_002',
      project_id: 'proj_outubro_rosa',
      created_by: 'usr_anderson',
      partner_id: 'usr_anderson',
      due_date: '2026-10-02',
      paid_at: '2026-10-02 08:00:00',
      status: 'Pago',
      notes: 'Locação para diária de gravação médica.',
    },
    {
      id: 'tra_006',
      description: 'Campanha de Tráfego Pago Instagram/Meta',
      amount: 500.0,
      type: 'Saída',
      category_id: 'fcat_marketing',
      bank_account_id: 'acc_inter',
      client_id: null,
      task_id: null,
      project_id: null,
      created_by: 'usr_mariana',
      partner_id: 'usr_mariana',
      due_date: '2026-10-04',
      paid_at: '2026-10-04 16:30:00',
      status: 'Pago',
      notes: 'Prospecção ativa de novos clientes na região de Araçatuba e Birigui.',
    },
    {
      id: 'tra_007',
      description: 'Imposto DAS Simples Nacional',
      amount: 720.0,
      type: 'Saída',
      category_id: 'fcat_impostos',
      bank_account_id: 'acc_nubank',
      client_id: null,
      task_id: null,
      project_id: null,
      created_by: 'usr_anderson',
      partner_id: 'usr_anderson',
      due_date: '2026-10-20',
      paid_at: null,
      status: 'Pendente',
      notes: 'Guia tributária mensal da agência.',
    },
  ];

  const traStmt = db.prepare(`
    INSERT INTO financial_transactions (id, description, amount, type, category_id, bank_account_id, client_id, task_id, project_id, created_by, partner_id, due_date, paid_at, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const tr of transactions) {
    traStmt.run(tr.id, tr.description, tr.amount, tr.type, tr.category_id, tr.bank_account_id, tr.client_id, tr.task_id, tr.project_id, tr.created_by, tr.partner_id, tr.due_date, tr.paid_at, tr.status, tr.notes);
  }

  // 13. CONTRATOS
  const contracts = [
    {
      id: 'ctr_001',
      client_id: 'cli_santacasa',
      title: 'Contrato Anual de Assessoria Audiovisual e Comunicação',
      description: 'Produção contínua de 4 vídeos institucionais mensais, cobertura de eventos e apoio em mídias.',
      value: 54000.0,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      status: 'ativo',
      external_url: 'https://docs.google.com/document/d/1exemplocontratosantacasa/view',
      notes: 'Renovação automática com 60 dias de aviso prévio.',
      created_by: 'usr_anderson',
    },
    {
      id: 'ctr_002',
      client_id: 'cli_conscape',
      title: 'Contrato de Produção Audiovisual e Lançamento Imobiliário',
      description: 'Pacote completo: tour virtual, captação com drone e 12 vídeos para redes.',
      value: 11200.0,
      start_date: '2026-09-20',
      end_date: '2026-11-20',
      status: 'ativo',
      external_url: 'https://docs.google.com/document/d/1exemplocontratoconscape/view',
      notes: 'Pagamento em 2 parcelas de 50%.',
      created_by: 'usr_anderson',
    },
  ];

  const ctrStmt = db.prepare(`
    INSERT INTO contracts (id, client_id, title, description, value, start_date, end_date, status, external_url, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const c of contracts) {
    ctrStmt.run(c.id, c.client_id, c.title, c.description, c.value, c.start_date, c.end_date, c.status, c.external_url, c.notes, c.created_by);
  }

  // 14. CRM - LEADS & PROSPECÇÃO (Incluindo regra dinâmica de sem resposta > 7 dias)
  const leads = [
    {
      id: 'lead_001',
      contact_name: 'Dra. Carolina Lima',
      company: 'Clínica Sorriso & Estética',
      phone: '(18) 3621-9988',
      whatsapp: '(18) 99711-2233',
      email: 'carolina@clinicasorriso.com.br',
      city: 'Birigui',
      first_contact_date: '2026-09-25',
      platform: 'Instagram',
      assignee_id: 'usr_mariana',
      status: 'Em andamento',
      notes: 'Interessada em vídeos curtos de tirar dúvidas para o Reels e posicionamento médico humanizado.',
      last_activity_at: '2026-09-28 15:00:00', // Recente (< 7 dias)
    },
    {
      id: 'lead_002',
      contact_name: 'Roberto Mendes',
      company: 'Mendes Motors Premium',
      phone: '(18) 3636-4400',
      whatsapp: '(18) 99188-7766',
      email: 'roberto@mendesmotors.com.br',
      city: 'Araçatuba',
      first_contact_date: '2026-09-10',
      platform: 'WhatsApp',
      assignee_id: 'usr_anderson',
      status: 'Aguardando resposta',
      notes: 'Enviada proposta de cobertura mensal de estoque em vídeo 4K. Não respondeu após follow-up.',
      last_activity_at: '2026-09-18 10:00:00', // Mais de 7 dias atrás! Ativará dinamicamente o status 'Sem resposta'
    },
    {
      id: 'lead_003',
      contact_name: 'Lucas Ferreira',
      company: 'IronFit Academia 24h',
      phone: '(18) 3600-7711',
      whatsapp: '(18) 99655-4433',
      email: 'lucas@ironfit.com.br',
      city: 'Araçatuba',
      first_contact_date: '2026-09-22',
      platform: 'Indicação',
      assignee_id: 'usr_anderson',
      status: 'Finalizado positivo', // Fechou!
      notes: 'Fechou plano semestral de vídeos de treino e depoimentos de alunos.',
      last_activity_at: '2026-09-29 17:00:00',
    },
    {
      id: 'lead_004',
      contact_name: 'Patrícia Toledo',
      company: 'Toledo Advocacia Empresarial',
      phone: '(18) 3624-5500',
      whatsapp: '(18) 99744-8899',
      email: 'patricia@toledoadvocacia.com.br',
      city: 'Araçatuba',
      first_contact_date: '2026-09-05',
      platform: 'LinkedIn',
      assignee_id: 'usr_mariana',
      status: 'Finalizado negativo',
      notes: 'Decidiu internalizar a produção de conteúdo no momento.',
      last_activity_at: '2026-09-12 11:00:00',
    },
  ];

  const leadStmt = db.prepare(`
    INSERT INTO crm_leads (id, contact_name, company, phone, whatsapp, email, city, first_contact_date, platform, assignee_id, status, notes, last_activity_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const l of leads) {
    leadStmt.run(l.id, l.contact_name, l.company, l.phone, l.whatsapp, l.email, l.city, l.first_contact_date, l.platform, l.assignee_id, l.status, l.notes, l.last_activity_at);
  }

  // 15. CRM - INTERAÇÕES
  const interactions = [
    {
      id: 'crm_int_1',
      lead_id: 'lead_001',
      user_id: 'usr_mariana',
      interaction_date: '2026-09-28 15:00:00',
      platform: 'WhatsApp',
      message: 'Enviei a apresentação da agência com casos de sucesso de profissionais da saúde.',
      notes: 'Cliente demonstrou interesse e pediu reunião na próxima semana.',
    },
    {
      id: 'crm_int_2',
      lead_id: 'lead_002',
      user_id: 'usr_anderson',
      interaction_date: '2026-09-18 10:00:00',
      platform: 'WhatsApp',
      message: 'Enviada proposta comercial detalhada em PDF via WhatsApp.',
      notes: 'Mensagem entregue e lida, aguardando retorno.',
    },
  ];

  const intStmt = db.prepare(`
    INSERT INTO crm_interactions (id, lead_id, user_id, interaction_date, platform, message, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const i of interactions) {
    intStmt.run(i.id, i.lead_id, i.user_id, i.interaction_date, i.platform, i.message, i.notes);
  }

  // 16. AGENDA / COMPROMISSOS (Somente este módulo se integra com Google Calendar)
  const calendarEvents = [
    {
      id: 'cal_001',
      title: 'Reunião de Alinhamento Campanha Outubro Rosa',
      description: 'Apresentação do corte 1 para a diretoria clínica da Santa Casa.',
      event_date: '2026-10-06',
      start_time: '14:00',
      end_time: '15:30',
      location: 'Sala de Diretoria - Santa Casa Araçatuba',
      client_id: 'cli_santacasa',
      project_id: 'proj_outubro_rosa',
      created_by: 'usr_anderson',
      notes: 'Levar notebook com cabo HDMI e cópia de segurança em pen drive.',
    },
    {
      id: 'cal_002',
      title: 'Gravação externa com Drone no Residencial Jardins',
      description: 'Captação aérea das fundações e vista panorâmica do pôr do sol.',
      event_date: '2026-10-09',
      start_time: '16:00',
      end_time: '18:30',
      location: 'Canteiro de Obras Jardins - Av. Brasília',
      client_id: 'cli_conscape',
      project_id: 'proj_jardins',
      created_by: 'usr_anderson',
      notes: 'Checar baterias do drone Mavic 3 Pro e autorização Decea.',
    },
    {
      id: 'cal_003',
      title: 'Reunião Semanal de Produção da Agência',
      description: 'Pauta: distribuição de cortes, cronograma de filmagem e metas do mês.',
      event_date: '2026-10-05',
      start_time: '09:00',
      end_time: '10:00',
      location: 'Estúdio Principal da Agência',
      client_id: null,
      project_id: null,
      created_by: 'usr_anderson',
      notes: 'Presença de Anderson, João e Mariana.',
    },
  ];

  const calStmt = db.prepare(`
    INSERT INTO calendar_events (id, title, description, event_date, start_time, end_time, location, client_id, project_id, created_by, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const c of calendarEvents) {
    calStmt.run(c.id, c.title, c.description, c.event_date, c.start_time, c.end_time, c.location, c.client_id, c.project_id, c.created_by, c.notes);
  }

  // 17. NOTIFICAÇÕES
  const notifications = [
    {
      id: 'not_001',
      user_id: 'usr_joao',
      title: 'Nova tarefa atribuída',
      message: 'Você foi atribuído à tarefa "Editar vídeo institucional oncologia 60s".',
      type: 'task_assigned',
      reference_module: 'tasks',
      reference_id: 'task_001',
    },
    {
      id: 'not_002',
      user_id: 'usr_anderson',
      title: 'Cliente solicitou alteração',
      message: 'Santa Casa solicitou alteração na tarefa "Ajuste no corte vertical do vídeo de depoimento".',
      type: 'change_request',
      reference_module: 'tasks',
      reference_id: 'task_006',
    },
    {
      id: 'not_003',
      user_id: 'usr_anderson',
      title: 'Conta a vencer em breve',
      message: 'O imposto DAS Simples Nacional vence em 20/10/2026 no valor de R$ 720,00.',
      type: 'bill_due',
      reference_module: 'finance',
      reference_id: 'tra_007',
    },
  ];

  const notStmt = db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, reference_module, reference_id, read_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
  `);
  for (const n of notifications) {
    notStmt.run(n.id, n.user_id, n.title, n.message, n.type, n.reference_module, n.reference_id);
  }

  // 18. AUDITORIA
  db.exec(`
    INSERT INTO audit_logs (id, user_id, action, module, record_id, before_data, after_data, created_at)
    VALUES 
    ('aud_init_1', 'usr_anderson', 'LOGIN', 'AUTH', 'usr_anderson', NULL, '{"method":"password"}', datetime('now', '-2 hours')),
    ('aud_init_2', 'usr_anderson', 'CREATE', 'PROJECTS', 'proj_outubro_rosa', NULL, '{"name":"Campanha Outubro Rosa 2026"}', datetime('now', '-1 day')),
    ('aud_init_3', 'usr_joao', 'STATUS_CHANGE', 'TASKS', 'task_002', '{"status":"Em produção"}', '{"status":"Concluída"}', datetime('now', '-5 hours'));
  `);

  // 19. CONFIGURAÇÕES
  db.exec(`
    INSERT INTO settings (key, value, description)
    VALUES 
    ('agency_name', 'PixelCraft Studios & Audiovisual', 'Nome comercial da agência'),
    ('ai_assistant_enabled', 'true', 'Ativação do assistente de IA Gemini'),
    ('ai_model', 'gemini-1.5-flash', 'Modelo padrão do Google Gemini'),
    ('default_timezone', 'America/Sao_Paulo', 'Fuso horário padrão do sistema');
  `);

  console.log('[Seed] Dados de demonstração inseridos com sucesso!');
  console.log('============================================================');
  console.log('USUÁRIOS DE DEMONSTRAÇÃO DISPONÍVEIS:');
  console.log('1. Administrador: anderson@agencia.com / admin123 (Cargo: Diretor de Fotografia)');
  console.log('2. Colaborador:   joao@agencia.com / admin123     (Cargo: Editor de Vídeo)');
  console.log('3. Colaboradora:  mariana@agencia.com / admin123  (Cargo: Social Media / Parceira)');
  console.log('4. Cliente:       contato@santacasa.com / admin123 (Santa Casa de Araçatuba)');
  console.log('============================================================');
}

runSeed().catch(err => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});
