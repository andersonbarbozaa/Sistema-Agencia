import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { generateId } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const body = await request.json();
    const { interpretation_id, action, payload } = body;

    const firestore = getAdminFirestore();
    const wsId = user.workspace_id || 'ws_default';
    const now = new Date().toISOString();

    // Verify interpretation if id provided
    if (interpretation_id) {
      const interpDoc = await firestore.collection('ai_interpretations').doc(interpretation_id).get();
      if (interpDoc.exists) {
        const interp = interpDoc.data();
        if (interp?.status && interp.status !== 'Pendente') {
          return NextResponse.json({ error: `Esta interpretação já está ${interp.status}.` }, { status: 400 });
        }
      }
    }

    const detectedAction = action || body.detected_action;
    const data = payload || body.structured_payload || {};

    let createdId = null;

    switch (detectedAction) {
      case 'TASK': {
        const taskName = data.name || data.title || 'Nova Tarefa Criativa';

        let clientId = data.client_id;
        if (!clientId) {
          const clientsSnap = await firestore.collection('clients').limit(1).get();
          clientId = clientsSnap.empty ? 'cli_default' : clientsSnap.docs[0].id;
        }

        let deliveryDate = data.delivery_date;
        if (!deliveryDate || deliveryDate.includes('sexta') || deliveryDate.includes('hoje') || deliveryDate.includes('amanhã')) {
          const d = new Date();
          d.setDate(d.getDate() + 5);
          deliveryDate = d.toISOString().split('T')[0];
        }

        const taskId = generateId('task');
        await firestore.collection('tasks').doc(taskId).set({
          id: taskId,
          name: taskName,
          title: taskName,
          description: data.description || null,
          client_id: clientId,
          delivery_date: deliveryDate,
          due_date: deliveryDate,
          value: Number(data.value) || 0,
          status: 'Não iniciada',
          created_by: user.id,
          workspace_id: wsId,
          created_at: now,
          updated_at: now,
        });

        createdId = taskId;
        break;
      }

      case 'TRANSACTION': {
        const desc = data.description || 'Lançamento via IA';
        const amount = Number(data.amount) || 0;
        const type = data.type === 'Entrada' ? 'Entrada' : 'Saída';

        let bankId = data.bank_account_id;
        if (!bankId) {
          const accSnap = await firestore.collection('bank_accounts').where('status', '==', 'ativo').limit(1).get();
          bankId = accSnap.empty ? null : accSnap.docs[0].id;
        }

        const transId = generateId('tra');
        const dueDate = data.due_date || now.split('T')[0];
        const status = data.status || 'Pendente';
        const paidAt = status === 'Pago' ? (data.paid_at || now.split('T')[0]) : null;

        await firestore.collection('financial_transactions').doc(transId).set({
          id: transId,
          description: desc,
          amount,
          type,
          category_id: data.category_id || null,
          bank_account_id: bankId,
          created_by: user.id,
          due_date: dueDate,
          paid_at: paidAt,
          status,
          notes: data.notes || 'Criado via confirmação de IA',
          workspace_id: wsId,
          created_at: now,
          updated_at: now,
        });

        createdId = transId;
        break;
      }

      case 'CLIENT': {
        const clientName = data.name || 'Novo Cliente';
        const clientId = generateId('cli');

        await firestore.collection('clients').doc(clientId).set({
          id: clientId,
          name: clientName,
          phone: data.phone || null,
          city: data.city || null,
          notes: data.notes || 'Cadastrado via IA',
          status: 'ativo',
          workspace_id: wsId,
          created_at: now,
          updated_at: now,
        });

        createdId = clientId;
        break;
      }

      case 'CALENDAR_EVENT': {
        const eventId = generateId('cal');
        const eventDate = data.event_date && data.event_date.match(/^\d{4}-\d{2}-\d{2}$/)
          ? data.event_date
          : now.split('T')[0];

        await firestore.collection('calendar_events').doc(eventId).set({
          id: eventId,
          title: data.title || 'Compromisso',
          description: data.description || null,
          event_date: eventDate,
          start_time: data.start_time || '14:00',
          end_time: data.end_time || '15:00',
          location: data.location || null,
          created_by: user.id,
          workspace_id: wsId,
          created_at: now,
          updated_at: now,
        });

        createdId = eventId;
        break;
      }

      case 'CRM_LEAD': {
        const leadId = generateId('lead');
        await firestore.collection('crm_leads').doc(leadId).set({
          id: leadId,
          contact_name: data.contact_name || 'Contato',
          company: data.company || null,
          phone: data.phone || null,
          email: data.email || null,
          city: data.city || null,
          first_contact_date: now.split('T')[0],
          platform: data.platform || 'WhatsApp',
          status: 'Novo',
          notes: data.notes || null,
          workspace_id: wsId,
          last_activity_at: now,
          created_at: now,
          updated_at: now,
        });

        createdId = leadId;
        break;
      }

      case 'CRM_INTERACTION': {
        let leadId = data.lead_id;
        if (!leadId) {
          const leadSnap = await firestore.collection('crm_leads').limit(1).get();
          leadId = leadSnap.empty ? null : leadSnap.docs[0].id;
        }

        if (leadId) {
          const intId = generateId('crm_int');
          await firestore.collection('crm_interactions').doc(intId).set({
            id: intId,
            lead_id: leadId,
            user_id: user.id,
            interaction_date: now,
            platform: data.platform || 'WhatsApp',
            notes: data.notes || data.message || 'Interação registrada via IA',
            created_at: now,
          });

          await firestore.collection('crm_leads').doc(leadId).set({
            last_activity_at: now,
            updated_at: now,
          }, { merge: true });

          createdId = intId;
        }
        break;
      }

      default:
        return NextResponse.json({ error: `Ação "${detectedAction}" ainda não suportada para criação automática.` }, { status: 400 });
    }

    // Update interpretation if exists
    if (interpretation_id) {
      await firestore.collection('ai_interpretations').doc(interpretation_id).set({
        status: 'Confirmado',
        confirmed_at: now,
        updated_at: now,
      }, { merge: true });
    }

    await logAudit({
      userId: user.id,
      action: 'AI_CONFIRM',
      module: detectedAction,
      recordId: createdId,
      afterData: data,
    });

    return NextResponse.json({
      success: true,
      created_id: createdId,
      message: `Ação ${detectedAction} confirmada e gravada com sucesso no banco de dados!`,
    });
  } catch (err: any) {
    console.error('[AI Confirm Error]:', err);
    return NextResponse.json({ error: 'Erro ao confirmar e salvar registro.' }, { status: 500 });
  }
}
