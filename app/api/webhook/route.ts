import { NextRequest, NextResponse } from "next/server";
 
// Env vars
const storeHash = process.env.BC_STORE_HASH!;
const token = process.env.BC_API_TOKEN!;
const companyApiToken = process.env.BC_COMPANY_API_TOKEN!;
 
// API URLs
const apiUrl = `https://api.bigcommerce.com/stores/${storeHash}/v2`;
const companyApiUrl = "https://api-b2b.bigcommerce.com/api/v3/io/companies";
 
// --------------------
// ✅ Interfaces
// --------------------
interface ExtraField {
  fieldName: string;
  fieldValue: string;
  [key: string]: any;
}
 
interface CompanyData {
  companyId: number;
  companyName: string;
  extraFields?: ExtraField[];
  [key: string]: any;
}
 
interface CompanyResponse {
  code: number;
  data: CompanyData[];
  meta: {
    message: string;
  };
}
 
// --------------------
// ✅ Safe Fetch
// --------------------
async function safeFetch<T = any>(url: string, useCompanyApi = false): Promise<T | null> {
  try {
    const headers = {
      "X-Auth-Token": useCompanyApi ? companyApiToken : token,
      "Accept": "application/json",
      "Content-Type": "application/json",
    };
 
    const response = await fetch(url, { headers });
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch (error) {
    console.error("❌ Fetch error:", error);
    return null;
  }
}
 
// --------------------
// ✅ Webhook Handler
// --------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId = body?.data?.id;
 
    if (!orderId) {
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
    }
 
    // 🔹 Fetch order & related data
    const order = await safeFetch(`${apiUrl}/orders/${orderId}`);
    const customer = order?.customer_id
      ? await safeFetch(`${apiUrl}/customers/${order.customer_id}`)
      : null;
    const products = await safeFetch(`${apiUrl}/orders/${orderId}/products`);
    const fees = await safeFetch(`${apiUrl}/orders/${orderId}/fees`);
    const coupons = await safeFetch(`${apiUrl}/orders/${orderId}/coupons`);
 
    // 🔹 Match customer company with company list
    const customerCompanyName = customer?.company?.toLowerCase();
    const companyRes = await safeFetch<CompanyResponse>(companyApiUrl, true);
    const allCompanies = companyRes?.data || [];
 
    const matchedCompany = allCompanies.find(
      (comp: CompanyData) => comp.companyName?.toLowerCase() === customerCompanyName
    );
 
    // 🔹 Get E8 Company ID from extraFields
    const e8Field = matchedCompany?.extraFields?.find(
      (field: ExtraField) => field.fieldName === "E8 COMPANY ID"
    );
 
    const e8CompanyId = e8Field?.fieldValue || null;
    const companyId = matchedCompany?.companyId || null;
 
    // 🔹 Combine all data
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