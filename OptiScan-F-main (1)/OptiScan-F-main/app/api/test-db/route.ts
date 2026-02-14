// app/api/test-db/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/database/pool';

export async function GET() {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    client.release();
    return NextResponse.json({ success: true, time: res.rows[0].now });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}