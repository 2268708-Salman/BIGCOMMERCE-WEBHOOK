import { NextRequest, NextResponse } from "next/server";
 
const storeHash = process.env.BC_STORE_HASH!;
const token = process.env.BC_API_TOKEN!;
const companyApiToken = process.env.BC_COMPANY_API_TOKEN!;
const apiUrl = `https://api.bigcommerce.com/stores/${storeHash}/v2`;
const companyApiUrl = "https://api-b2b.bigcommerce.com/api/v3/io/companies";
 
async function safeFetch(url: string, useCompanyApi = false) {
  try {
    const headers = useCompanyApi
      ? {
          "X-Auth-Token": companyApiToken,
          "Accept": "application/json",
          "Content-Type": "application/json",
        }
      : {
          "X-Auth-Token": token,
          "Accept": "application/json",
          "Content-Type": "application/json",
        };
 
    const response = await fetch(url, { headers });
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
 
    // 👉 Step: Call company API
    const companyRes = await safeFetch(companyApiUrl, true);
    const company = companyRes?.data;
 
    // 👉 Extract E8 COMPANY ID from extraFields
    const e8Field = company?.extraFields?.find(
      (field: any) => field.fieldName === "E8 COMPANY ID"
    );
    const e8CompanyId = e8Field?.fieldValue || null;
 
    const fullData = {
      order,
      customer,
      products,
      fees,
      coupons,
      company,
      e8CompanyId,
    };
 
    console.log("✅ Full Order + E8 ID:", fullData);
 
    return NextResponse.json({ success: true, data: fullData });
  } catch (err) {
    console.error("❌ Webhook Error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}