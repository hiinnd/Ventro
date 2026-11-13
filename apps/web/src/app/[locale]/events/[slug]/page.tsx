import { notFound } from 'next/navigation';
import { eventSchema } from '@ventro/types';
import { PublicEventDetail } from '../../../../components/events/public-events';
import { authApiUrl } from '../../../../lib/auth/server';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{locale:'en'|'ar';slug:string}>}){const {locale,slug}=await params;try{const r=await fetch(new URL('/api/v1/events/'+slug,authApiUrl('session')),{cache:'no-store'});if(!r.ok)return notFound();return <PublicEventDetail locale={locale} event={eventSchema.parse(await r.json())}/> }catch{return notFound()}}
