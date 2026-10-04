
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET /api/users/[id] - Get user (admin or self)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    // Only admin can view other users; regular users can only view themselves
    if (user.role !== 'ADMINISTRADOR' && user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getDb();

    const found = await db
      .prepare(
        `SELECT
          u.id, u.name, u.email, u.role, u.status, u.phone, u.avatar_url,
          u.position_id, u.client_id, u.is_partner, u.job_title, u.workspace_id,
          w.name as workspace_name, w.description as workspace_description, w.invite_code as workspace_invite_code,
          u.created_at, u.updated_at,
          p.name as position_name
        FROM users u
        LEFT JOIN positions p ON p.id = u.position_id
        LEFT JOIN workspaces w ON u.workspace_id = w.id
        WHERE u.id = ?`
      )
      .bind(id)
      .first();

    if (!found) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ data: found });
  } catch (error) {
    console.error('GET /api/users/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/users/[id] - Update user
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const isAdmin = user.role === 'ADMINISTRADOR';
    const isSelf = user.id === id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getDb();

    const existing = await db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>();

    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await request.json();
    const updates: string[] = [];
    const values: unknown[] = [];

    // Fields any user can update on their own profile
    if (isSelf) {
      const selfFields = ['name', 'phone', 'avatar_url', 'job_title'] as const;
      for (const field of selfFields) {
        if (field in body) {
          updates.push(`${field} = ?`);
          values.push(body[field]);
        }
      }

      // Password change: requires current_password verification
      if (body.new_password) {
        if (!body.current_password) {
          return NextResponse.json({ error: 'current_password is required to change password' }, { status: 400 });
        }
        const isValid = await verifyPassword(body.current_password, existing.password_hash as string);
        if (!isValid) {
          return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
        }
        const hashedNew = await hashPassword(body.new_password);
        updates.push('password_hash = ?');
        values.push(hashedNew);
      }
    }

    // Admin-only fields
    if (isAdmin) {
      const adminFields = ['name', 'email', 'role', 'status', 'phone', 'avatar_url', 'position_id', 'client_id', 'is_partner', 'job_title'] as const;
      for (const field of adminFields) {
        if (field in body && !updates.some((u) => u.startsWith(`${field} =`))) {
          updates.push(`${field} = ?`);
          values.push(body[field]);
        }
      }

      // Admin can also set a new password directly (no current_password required)
      if (body.new_password && !isSelf) {
        const hashedNew = await hashPassword(body.new_password);
        updates.push('password_hash = ?');
        values.push(hashedNew);
      }

      // Check duplicate email if email is being changed
      if (body.email && body.email !== existing.email) {
        const emailTaken = await db
          .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
          .bind(body.email, id)
          .first();
        if (emailTaken) {
          return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
        }
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const now = new Date().toISOString();
    updates.push('updated_at = ?');
    values.push(now, id);

    await db
      .prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    await logAudit(user.id, 'users', 'UPDATE', id, { updated_fields: Object.keys(body).filter((k) => k !== 'current_password' && k !== 'new_password') });

    const updated = await db
      .prepare(
        `SELECT u.id, u.name, u.email, u.role, u.status, u.phone, u.avatar_url,
          u.position_id, u.client_id, u.is_partner, u.job_title, u.workspace_id,
          w.name as workspace_name, w.description as workspace_description, w.invite_code as workspace_invite_code,
          u.created_at, u.updated_at, p.name as position_name
        FROM users u
        LEFT JOIN positions p ON p.id = u.position_id
        LEFT JOIN workspaces w ON u.workspace_id = w.id
        WHERE u.id = ?`
      )
      .bind(id)
      .first();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('PATCH /api/users/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
    }

    const db = getDb();

    const existing = await db
      .prepare('SELECT id, name, email FROM users WHERE id = ?')
      .bind(id)
      .first<{ id: string; name: string; email: string }>();

    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const now = new Date().toISOString();
    await db
      .prepare(`UPDATE users SET status = 'inativo', updated_at = ? WHERE id = ?`)
      .bind(now, id)
      .run();

    await logAudit(user.id, 'users', 'SOFT_DELETE', id, { name: existing.name, email: existing.email });

    return NextResponse.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('DELETE /api/users/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
