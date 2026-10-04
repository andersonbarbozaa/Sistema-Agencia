import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET /api/users/[id] - Get user (admin or self)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    if (user.role !== 'ADMINISTRADOR' && user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const firestore = getAdminFirestore();
    const userDoc = await firestore.collection('users').doc(id).get();
    if (!userDoc.exists) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const userData: any = { id: userDoc.id, ...userDoc.data() };
    const { password_hash, ...safeUser } = userData;

    let position_name = null;
    let workspace_name = null;

    if (userData.position_id) {
      const pDoc = await firestore.collection('positions').doc(userData.position_id).get();
      if (pDoc.exists) position_name = pDoc.data()?.name || null;
    }

    if (userData.workspace_id) {
      const wDoc = await firestore.collection('workspaces').doc(userData.workspace_id).get();
      if (wDoc.exists) workspace_name = wDoc.data()?.name || null;
    }

    return NextResponse.json({
      data: {
        ...safeUser,
        position_name,
        workspace_name,
      }
    });
  } catch (error: any) {
    console.error('GET /api/users/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/users/[id] - Update user
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const isUserAdmin = user.role === 'ADMINISTRADOR';
    const isSelf = user.id === id;

    if (!isUserAdmin && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const firestore = getAdminFirestore();
    const userRef = firestore.collection('users').doc(id);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const existing: any = userDoc.data();
    const body = await request.json();
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Fields any user can update on their own profile
    if (isSelf) {
      const selfFields = ['name', 'phone', 'avatar_url', 'job_title'] as const;
      for (const field of selfFields) {
        if (field in body) {
          updateData[field] = body[field];
        }
      }

      if (body.new_password) {
        if (!body.current_password) {
          return NextResponse.json({ error: 'current_password is required to change password' }, { status: 400 });
        }
        const isValid = await verifyPassword(body.current_password, existing.password_hash as string);
        if (!isValid) {
          return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
        }
        updateData.password_hash = await hashPassword(body.new_password);
      }
    }

    // Admin-only fields
    if (isUserAdmin) {
      const adminFields = ['role', 'status', 'position_id', 'client_id', 'is_partner', 'name', 'phone', 'avatar_url', 'job_title'] as const;
      for (const field of adminFields) {
        if (field in body) {
          updateData[field] = field === 'is_partner' ? (body[field] ? 1 : 0) : body[field];
        }
      }

      if (body.password) {
        updateData.password_hash = await hashPassword(body.password);
      }
    }

    await userRef.set(updateData, { merge: true });

    await logAudit(user.id, 'users', 'UPDATE', id, body);

    const updatedDoc = await userRef.get();
    const updatedData: any = { id: updatedDoc.id, ...updatedDoc.data() };
    const { password_hash: _, ...safeUser } = updatedData;

    return NextResponse.json({ data: safeUser, user: safeUser });
  } catch (error: any) {
    console.error('PATCH /api/users/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Soft-delete user (admin only)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'ADMINISTRADOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    if (user.id === id) {
      return NextResponse.json({ error: 'Cannot deactivate yourself' }, { status: 400 });
    }

    const firestore = getAdminFirestore();
    const userRef = firestore.collection('users').doc(id);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    await userRef.set({ status: 'inativo', updated_at: new Date().toISOString() }, { merge: true });

    await logAudit(user.id, 'users', 'DEACTIVATE', id);

    return NextResponse.json({ message: 'User deactivated successfully' });
  } catch (error: any) {
    console.error('DELETE /api/users/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
