import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  let results = [];

  const columns = [
    'location TEXT',
    'google_event_id TEXT',
    'notes TEXT',
    'workspace_id TEXT'
  ];

  for (const col of columns) {
    try {
      await db.prepare(`ALTER TABLE calendar_events ADD COLUMN ${col}`).run();
      results.push(`Added ${col} successfully.`);
    } catch (e: any) {
      results.push(`Skipped ${col}: ${e.message}`);
    }
  }

  return NextResponse.json({ success: true, results });
}
