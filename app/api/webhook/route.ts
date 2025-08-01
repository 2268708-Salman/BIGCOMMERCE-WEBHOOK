import { NextRequest, NextResponse } from "next/server";
 
const storeHash = process.env.BC_STORE_HASH!;
const token = process.env.BC_API_TOKEN!;
const companyApiToken = process.env.BC_COMPANY_API_TOKEN!;
 
const apiUrl = `https://api.bigcommerce.com/stores/${storeHash}/v2`;
const companyApiUrl = "https://api-b2b.bigcommerce.com/api/v3/io/companies";
 
// 🧾 Types
interface ExtraField {
  fieldName: string;
  fieldValue: string;
}
 
interface Company {
  companyId: number;
  companyName: string;
  extraFields?: ExtraField[];
}
 
interface CompanyApiResponse {
  code: number;
  data: Company[];
  meta: {
    message: string;
  };
}
 
// 🛡️ Generic Fetch
async function safeFetch<T>(url: string, useCompanyApi = false): Promise<T | null> {
  try {
    const headers = {
      "X-Auth-Token": useCompanyApi ? companyApiToken : token,
      "Accept": "application/json",
      "Content-Type": "application/json",
    };
 
    const res = await fetch(url, { headers });
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch (err) {
    console.error("❌ Fetch error:", err);
    return null;
  }
}
 
// 📦 Webhook Handler
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId = body?.data?.id;
 
    if (!orderId) {
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
    }
 
    // Fetch order and related details
    const order = await safeFetch<any>(`${apiUrl}/orders/${orderId}`);
    const customer = order?.customer_id
      ? await safeFetch<any>(`${apiUrl}/customers/${order.customer_id}`)
      : null;
 
    const products = await safeFetch<any[]>(`${apiUrl}/orders/${orderId}/products`);
    const fees = await safeFetch<any[]>(`${apiUrl}/orders/${orderId}/fees`);
    const coupons = await safeFetch<any[]>(`${apiUrl}/orders/${orderId}/coupons`);
 
    // Match company
    const customerCompanyName = customer?.company?.toLowerCase();
    const companyRes = await safeFetch<CompanyApiResponse>(companyApiUrl, true);
    const allCompanies = companyRes?.data || [];
 
    const matchedCompany = allCompanies.find(
      (comp) => comp.companyName.toLowerCase() === customerCompanyName
    );
 
    const e8Field = matchedCompany?.extraFields?.find(
      (field) => field.fieldName === "E8 COMPANY ID"
    );
 
    const e8CompanyId = e8Field?.fieldValue || null;
    const companyId = matchedCompany?.companyId || null;
 
    const fullData = {
      order,
      customer,
      products,
      fees,
      coupons,
      company: matchedCompany,
      companyId,
      e8CompanyId,
    };
 
    console.log("✅ Full Order + Company + E8 ID:", fullData);
 
    return NextResponse.json({ success: true, data: fullData });
  } catch (err) {
    console.error("❌ Webhook Error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}