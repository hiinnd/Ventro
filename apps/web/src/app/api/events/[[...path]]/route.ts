import { NextResponse } from 'next/server';
import { eventListSchema, eventSchema } from '@ventro/types';
import { authApiUrl } from '../../../../lib/auth/server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const path = (await context.params).path ?? [];
  if (path.length > 2 || (path.length === 2 && path[1] !== 'cover') || path.some((part) => !/^[a-z0-9-]{1,120}$/.test(part)))
    return NextResponse.json({ message: 'Resource unavailable' }, { status: 404 });
  const url = new URL('/api/v1/events' + (path[0] ? '/' + path[0] : '') + (path[1] ? '/' + path[1] : ''), authApiUrl('session'));
  if (!path.length) for (const [key, value] of new URL(request.url).searchParams) {
    if (key === 'page' && /^[1-9][0-9]{0,3}$/.test(value)) url.searchParams.set(key,value);
    else if ((key === 'q' || key === 'category') && value.length <= 80) url.searchParams.set(key,value);
    else return NextResponse.json({ message: 'Invalid search' }, { status: 400 });
  }
  try { const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000)}); if(!response.ok)return NextResponse.json({message:response.status===404?'Event not found':'Events temporarily unavailable'},{status:response.status}); if(path[1]==='cover'){const bytes=await response.arrayBuffer();return new NextResponse(bytes,{headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}})} const data=path.length?eventSchema.parse(await response.json()):eventListSchema.parse(await response.json()); return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}}); } catch { return NextResponse.json({message:'Events temporarily unavailable'},{status:502}); }
}
