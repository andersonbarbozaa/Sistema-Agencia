import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const db = getDb();
    const rows = await db.prepare("SELECT id, name FROM tasks LIMIT 1").all();
    return NextResponse.json(rows.results);
  } catch (err) {
    return NextResponse.json({ error: String(err) });
  }
}
