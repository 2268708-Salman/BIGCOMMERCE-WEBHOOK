import { NextResponse } from 'next/server';
 
export async function GET() {
  const storeHash = process.env.BC_STORE_HASH;
  const token = process.env.BC_API_TOKEN;
  const domain = process.env.VERCEL_URL;
 
  if (!storeHash || !token || !domain) {
    return NextResponse.json({ error: 'Missing env variables' }, { status: 500 });
  }
 
const url = `https://api.bigcommerce.com/stores/${storeHash}/v3/hooks`;
  const headers = {
    'X-Auth-Token': token,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
 
  const body = {
    scope: 'store/order/created',
    destination: `https://${domain}/api/webhook`,
    is_active: true,
    events_history_enabled: true,
  };
 
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
 
  const data = await res.json();
  if (!res.ok) {
    console.error('❌ Webhook registration failed:', data);
    return NextResponse.json({ error: 'Failed to register webhook', data }, { status: 500 });
  }
 
  console.log('✅ Webhook registered:', data);
  return NextResponse.json({ message: 'Webhook registered', data });
}