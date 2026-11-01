const fs = require('fs');

// 1. clients/page.tsx
let clientsCode = fs.readFileSync('app/(app)/clients/page.tsx', 'utf8');

const oldClientsCreate = `  const handleCloseCreateModal = () => {
    if (isNewClientDirty) {
      const ok = window.confirm('Você possui alterações não salvas no cadastro do cliente. Deseja realmente descartar e fechar?');
      if (!ok) return;
    }
    setShowCreateModal(false);
    setNewClient({
      name: '',
      company_name: '',
      corporate_name: '',
      trade_name: '',
      avatar_url: '',
      document: '',
      email: '',
      password: '',
      phone: '',
      whatsapp: '',
      address: '',
      city: '',
      website: '',
      notes: '',
      social_links: [],
    });
  };

  const isPortalUserDirty = Boolean(portalUserForm.name.trim() || portalUserForm.email.trim() || portalUserForm.password.trim());

  const handleClosePortalUserModal = () => {
    if (isPortalUserDirty) {
      const ok = window.confirm('Você possui dados preenchidos no formulário de acesso. Deseja realmente descartar e fechar?');
      if (!ok) return;
    }
    setShowPortalUserModal(false);
  };`;

const newClientsCreate = `  const handleCloseCreateModal = () => {
    const doClose = () => {
      setShowCreateModal(false);
      setNewClient({
        name: '',
        company_name: '',
        corporate_name: '',
        trade_name: '',
        avatar_url: '',
        document: '',
        email: '',
        password: '',
        phone: '',
        whatsapp: '',
        address: '',
        city: '',
        website: '',
        notes: '',
        social_links: [],
      });
    };

    if (isNewClientDirty) {
      setConfirmState({
        isOpen: true,
        title: 'Descartar novo cliente?',
        message: 'Você possui informações preenchidas para o novo cliente. Se fechar agora, todas as informações serão perdidas.',
        type: 'warning',
        confirmText: 'Descartar e Fechar',
        cancelText: 'Continuar Editando',
        onConfirm: () => {
          setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
          doClose();
        },
      });
      return;
    }
    doClose();
  };

  const isPortalUserDirty = Boolean(portalUserForm.name.trim() || portalUserForm.email.trim() || portalUserForm.password.trim());

  const handleClosePortalUserModal = () => {
    if (isPortalUserDirty) {
      setConfirmState({
        isOpen: true,
        title: 'Descartar acesso ao portal?',
        message: 'Você possui dados preenchidos no formulário de acesso. Se fechar agora, as informações serão perdidas.',
        type: 'warning',
        confirmText: 'Descartar e Fechar',
        cancelText: 'Continuar Editando',
        onConfirm: () => {
          setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
          setShowPortalUserModal(false);
        },
      });
      return;
    }
    setShowPortalUserModal(false);
  };`;

clientsCode = clientsCode.replace(oldClientsCreate, newClientsCreate);

const oldClientsEdit = `  const handleCloseEditModal = () => {
    if (isEditClientDirty) {
      const ok = window.confirm('Você possui alterações não salvas no cliente. Deseja realmente descartar as alterações e fechar?');
      if (!ok) return;
    }
    setShowEditModal(false);
  };`;

const newClientsEdit = `  const handleCloseEditModal = () => {
    if (isEditClientDirty) {
      setConfirmState({
        isOpen: true,
        title: 'Descartar alterações?',
        message: 'Você possui alterações não salvas no cliente. Se fechar agora, todas as alterações serão perdidas.',
        type: 'warning',
        confirmText: 'Descartar e Fechar',
        cancelText: 'Continuar Editando',
        onConfirm: () => {
          setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
          setShowEditModal(false);
        },
      });
      return;
    }
    setShowEditModal(false);
  };`;

clientsCode = clientsCode.replace(oldClientsEdit, newClientsEdit);
fs.writeFileSync('app/(app)/clients/page.tsx', clientsCode, 'utf8');
console.log('clients/page.tsx updated!');

// 2. tasks/page.tsx
let tasksCode = fs.readFileSync('app/(app)/tasks/page.tsx', 'utf8');

const oldTasksCreate = `  const handleCloseCreateTaskModal = () => {
    if (isNewTaskDirty) {
      const ok = window.confirm('Você possui informações preenchidas para a nova tarefa. Deseja realmente descartar e fechar?');
      if (!ok) return;
    }
    setShowCreateModal(false);
    setNewTask({
      name: '',
      description: '',
      client_id: '',
      category_id: '',
      delivery_date: '',
      value: 0,
      assignee_ids: [],
      visibility: 'grupo',
      calendar_id: '',
    });
  };

  const [initialEditTaskState, setInitialEditTaskState] = useState('');
  const isEditTaskDirty = Boolean(initialEditTaskState && JSON.stringify(editTaskForm) !== initialEditTaskState);

  const handleCloseEditTaskModal = () => {
    if (isEditTaskDirty) {
      const ok = window.confirm('Você possui alterações não salvas na tarefa. Deseja realmente descartar as alterações e fechar?');
      if (!ok) return;
    }
    setShowEditTaskModal(false);
  };`;

const newTasksCreate = `  const handleCloseCreateTaskModal = () => {
    const doClose = () => {
      setShowCreateModal(false);
      setNewTask({
        name: '',
        description: '',
        client_id: '',
        category_id: '',
        delivery_date: '',
        value: 0,
        assignee_ids: [],
        visibility: 'grupo',
        calendar_id: '',
      });
    };

    if (isNewTaskDirty) {
      setConfirmState({
        isOpen: true,
        title: 'Descartar nova tarefa?',
        message: 'Você possui dados preenchidos para a nova tarefa. Se fechar agora, todas as informações serão perdidas.',
        type: 'warning',
        confirmText: 'Descartar e Fechar',
        cancelText: 'Continuar Editando',
        onConfirm: () => {
          setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
          doClose();
        },
      } as any);
      return;
    }
    doClose();
  };

  const [initialEditTaskState, setInitialEditTaskState] = useState('');
  const isEditTaskDirty = Boolean(initialEditTaskState && JSON.stringify(editTaskForm) !== initialEditTaskState);

  const handleCloseEditTaskModal = () => {
    if (isEditTaskDirty) {
      setConfirmState({
        isOpen: true,
        title: 'Descartar alterações?',
        message: 'Você possui alterações não salvas na tarefa. Se fechar agora, todas as alterações serão perdidas.',
        type: 'warning',
        confirmText: 'Descartar e Fechar',
        cancelText: 'Continuar Editando',
        onConfirm: () => {
          setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
          setShowEditTaskModal(false);
        },
      } as any);
      return;
    }
    setShowEditTaskModal(false);
  };`;

tasksCode = tasksCode.replace(oldTasksCreate, newTasksCreate);
fs.writeFileSync('app/(app)/tasks/page.tsx', tasksCode, 'utf8');
console.log('tasks/page.tsx updated!');

// 3. finance/page.tsx
let finCode = fs.readFileSync('app/(app)/finance/page.tsx', 'utf8');

const oldFinHandlers = `  const handleCloseNewTransModal = () => {
    if (isNewTransDirty) {
      const ok = window.confirm('Você possui dados preenchidos no lançamento. Deseja realmente descartar e fechar?');
      if (!ok) return;
    }
    setShowTransModal(false);
  };

  const handleCloseEditTransModal = () => {
    if (editingTrans) {
      const ok = window.confirm('Deseja realmente fechar a edição do lançamento? Alterações não salvas serão perdidas.');
      if (!ok) return;
    }
    setEditingTrans(null);
  };

  const isDebtDirty = Boolean(
    debtForm.title.trim() ||
    debtForm.total_amount ||
    debtForm.company_name.trim() ||
    debtForm.user_id ||
    debtForm.notes.trim()
  );

  const handleCloseDebtModal = () => {
    if (isDebtDirty) {
      const ok = window.confirm('Você possui dados preenchidos na dívida. Deseja realmente descartar e fechar?');
      if (!ok) return;
    }
    setShowDebtModal(false);
    setEditingDebt(null);
  };

  const isPayDirty = Boolean(payForm.amount || payForm.notes.trim());

  const handleClosePayModal = () => {
    if (isPayDirty) {
      const ok = window.confirm('Você possui dados preenchidos no pagamento. Deseja realmente descartar e fechar?');
      if (!ok) return;
    }
    setShowPayModal(false);
    setPayingDebt(null);
  };`;

const newFinHandlers = `  const handleCloseNewTransModal = () => {
    if (isNewTransDirty) {
      setConfirmState({
        isOpen: true,
        title: 'Descartar lançamento?',
        message: 'Você possui dados preenchidos no lançamento financeiro. Se fechar agora, as informações serão perdidas.',
        type: 'warning',
        confirmText: 'Descartar e Fechar',
        cancelText: 'Continuar Editando',
        onConfirm: () => {
          setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
          setShowTransModal(false);
        },
      });
      return;
    }
    setShowTransModal(false);
  };

  const handleCloseEditTransModal = () => {
    if (editingTrans) {
      setConfirmState({
        isOpen: true,
        title: 'Descartar alterações?',
        message: 'Deseja realmente fechar a edição do lançamento? Alterações não salvas serão perdidas.',
        type: 'warning',
        confirmText: 'Descartar e Fechar',
        cancelText: 'Continuar Editando',
        onConfirm: () => {
          setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
          setEditingTrans(null);
        },
      });
      return;
    }
    setEditingTrans(null);
  };

  const isDebtDirty = Boolean(
    debtForm.title.trim() ||
    debtForm.total_amount ||
    debtForm.company_name.trim() ||
    debtForm.user_id ||
    debtForm.notes.trim()
  );

  const handleCloseDebtModal = () => {
    if (isDebtDirty) {
      setConfirmState({
        isOpen: true,
        title: 'Descartar dívida?',
        message: 'Você possui dados preenchidos na dívida. Se fechar agora, todas as informações serão perdidas.',
        type: 'warning',
        confirmText: 'Descartar e Fechar',
        cancelText: 'Continuar Editando',
        onConfirm: () => {
          setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
          setShowDebtModal(false);
          setEditingDebt(null);
        },
      });
      return;
    }
    setShowDebtModal(false);
    setEditingDebt(null);
  };

  const isPayDirty = Boolean(payForm.amount || payForm.notes.trim());

  const handleClosePayModal = () => {
    if (isPayDirty) {
      setConfirmState({
        isOpen: true,
        title: 'Descartar pagamento?',
        message: 'Você possui dados preenchidos no pagamento/amortização. Se fechar agora, as informações serão perdidas.',
        type: 'warning',
        confirmText: 'Descartar e Fechar',
        cancelText: 'Continuar Editando',
        onConfirm: () => {
          setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
          setShowPayModal(false);
          setPayingDebt(null);
        },
      });
      return;
    }
    setShowPayModal(false);
    setPayingDebt(null);
  };`;

finCode = finCode.replace(oldFinHandlers, newFinHandlers);
fs.writeFileSync('app/(app)/finance/page.tsx', finCode, 'utf8');
console.log('finance/page.tsx updated!');

// 4. crm/page.tsx
let crmCode = fs.readFileSync('app/(app)/crm/page.tsx', 'utf8');

const oldCrmHandlers = `  const handleCloseCreateModal = () => {
    if (isNewLeadDirty) {
      const ok = window.confirm('Você possui dados preenchidos no lead. Deseja realmente descartar e fechar?');
      if (!ok) return;
    }
    setShowCreateModal(false);
    setNewLead(EMPTY_NEW_LEAD);
  };

  const [initialEditLeadState, setInitialEditLeadState] = useState('');
  const isEditLeadDirty = Boolean(initialEditLeadState && JSON.stringify(editLead) !== initialEditLeadState);

  const handleCloseEditModal = () => {
    if (isEditLeadDirty) {
      const ok = window.confirm('Você possui alterações não salvas no lead. Deseja realmente descartar as alterações e fechar?');
      if (!ok) return;
    }
    setShowEditModal(false);
  };`;

const newCrmHandlers = `  const handleCloseCreateModal = () => {
    if (isNewLeadDirty) {
      setConfirmState({
        isOpen: true,
        title: 'Descartar lead?',
        message: 'Você possui dados preenchidos no lead. Se fechar agora, todas as informações serão perdidas.',
        type: 'warning',
        confirmText: 'Descartar e Fechar',
        cancelText: 'Continuar Editando',
        onConfirm: () => {
          setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
          setShowCreateModal(false);
          setNewLead(EMPTY_NEW_LEAD);
        },
      });
      return;
    }
    setShowCreateModal(false);
    setNewLead(EMPTY_NEW_LEAD);
  };

  const [initialEditLeadState, setInitialEditLeadState] = useState('');
  const isEditLeadDirty = Boolean(initialEditLeadState && JSON.stringify(editLead) !== initialEditLeadState);

  const handleCloseEditModal = () => {
    if (isEditLeadDirty) {
      setConfirmState({
        isOpen: true,
        title: 'Descartar alterações?',
        message: 'Você possui alterações não salvas no lead. Se fechar agora, todas as alterações serão perdidas.',
        type: 'warning',
        confirmText: 'Descartar e Fechar',
        cancelText: 'Continuar Editando',
        onConfirm: () => {
          setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
          setShowEditModal(false);
        },
      });
      return;
    }
    setShowEditModal(false);
  };`;

crmCode = crmCode.replace(oldCrmHandlers, newCrmHandlers);
fs.writeFileSync('app/(app)/crm/page.tsx', crmCode, 'utf8');
console.log('crm/page.tsx updated!');

// 5. agenda/page.tsx
let agendaCode = fs.readFileSync('app/(app)/agenda/page.tsx', 'utf8');

const oldAgendaHandlers = `  const handleCloseCreateModal = () => {
    if (isNewEventDirty) {
      const ok = window.confirm('Você possui dados preenchidos no compromisso. Deseja realmente descartar e fechar?');
      if (!ok) return;
    }
    setShowCreateModal(false);
    setNewEvent({
      title: '',
      description: '',
      event_date: new Date().toISOString().split('T')[0],
      start_time: '10:00',
      end_time: '11:00',
      location: '',
      client_id: '',
      visibility: 'grupo',
      calendar_id: '',
      notes: '',
    });
  };

  const isCalendarFormDirty = Boolean((calendarForm.name || '').trim() || (calendarForm.description || '').trim());

  const handleCloseCalendarModal = () => {
    if (isCalendarFormDirty) {
      const ok = window.confirm('Você possui dados preenchidos na agenda. Deseja realmente descartar e fechar?');
      if (!ok) return;
    }
    setShowCalendarModal(false);
  };`;

const newAgendaHandlers = `  const handleCloseCreateModal = () => {
    const doClose = () => {
      setShowCreateModal(false);
      setNewEvent({
        title: '',
        description: '',
        event_date: new Date().toISOString().split('T')[0],
        start_time: '10:00',
        end_time: '11:00',
        location: '',
        client_id: '',
        visibility: 'grupo',
        calendar_id: '',
        notes: '',
      });
    };

    if (isNewEventDirty) {
      setConfirmState({
        isOpen: true,
        title: 'Descartar compromisso?',
        message: 'Você possui dados preenchidos no compromisso. Se fechar agora, todas as informações serão perdidas.',
        type: 'warning',
        confirmText: 'Descartar e Fechar',
        cancelText: 'Continuar Editando',
        onConfirm: () => {
          setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
          doClose();
        },
      });
      return;
    }
    doClose();
  };

  const isCalendarFormDirty = Boolean((calendarForm.name || '').trim() || (calendarForm.description || '').trim());

  const handleCloseCalendarModal = () => {
    if (isCalendarFormDirty) {
      setConfirmState({
        isOpen: true,
        title: 'Descartar agenda?',
        message: 'Você possui dados preenchidos na agenda personalizada. Se fechar agora, as informações serão perdidas.',
        type: 'warning',
        confirmText: 'Descartar e Fechar',
        cancelText: 'Continuar Editando',
        onConfirm: () => {
          setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
          setShowCalendarModal(false);
        },
      });
      return;
    }
    setShowCalendarModal(false);
  };`;

agendaCode = agendaCode.replace(oldAgendaHandlers, newAgendaHandlers);
fs.writeFileSync('app/(app)/agenda/page.tsx', agendaCode, 'utf8');
console.log('agenda/page.tsx updated!');
