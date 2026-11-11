import { NextResponse } from 'next/server';
import { fetchBackendHealth } from '../../../lib/backend-health';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const { data, status } = await fetchBackendHealth();
    return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json(
      { error: 'The API health check is unavailable.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
