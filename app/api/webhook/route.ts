import { NextRequest, NextResponse } from "next/server";
 
const storeHash = process.env.BC_STORE_HASH!;
const token = process.env.BC_API_TOKEN!;
const apiUrl = `https://api.bigcommerce.com/stores/${storeHash}/v2`;
 
async function safeFetch(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "X-Auth-Token": token,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });
 
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Fetch error:", error);
    return null;
  }
}
 
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId = body?.data?.id;
 
    if (!orderId) {
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
    }
 
    const order = await safeFetch(`${apiUrl}/orders/${orderId}`);
    const customer = order?.customer_id
      ? await safeFetch(`${apiUrl}/customers/${order.customer_id}`)
      : null;
    const products = await safeFetch(`${apiUrl}/orders/${orderId}/products`);
    const fees = await safeFetch(`${apiUrl}/orders/${orderId}/fees`);
    const coupons = await safeFetch(`${apiUrl}/orders/${orderId}/coupons`);
 
    const fullData = { order, customer, products, fees, coupons };
    console.log("✅ Full Order Details with Customer:", fullData);
 
    return NextResponse.json({ success: true, data: fullData });
  } catch (err) {
    console.error("❌ Webhook Error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}