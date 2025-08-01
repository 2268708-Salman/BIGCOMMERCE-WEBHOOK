import { NextRequest, NextResponse } from "next/server";
 
const storeHash = process.env.BC_STORE_HASH!;
const token = process.env.BC_API_TOKEN!;
const companyApiToken = process.env.BC_COMPANY_API_TOKEN!;
const apiUrl = `https://api.bigcommerce.com/stores/${storeHash}/v2`;
const companyApiUrl = "https://api-b2b.bigcommerce.com/api/v3/io/companies";
 
interface Order {
  id: number;
  customer_id: number;
}
 
interface Customer {
  id: number;
  company?: string;
}
 
interface Company {
  companyId: string;
  companyName: string;
  extraFields?: { fieldName: string; fieldValue: string }[];
}
 
async function safeFetch<T>(url: string, useCompanyApi = false): Promise<T | null> {
  try {
    const headers = {
      "X-Auth-Token": useCompanyApi ? companyApiToken : token,
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
    const orderId: number | undefined = body?.data?.id;
 
    if (!orderId) {
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
    }
 
    const order = await safeFetch<Order>(`${apiUrl}/orders/${orderId}`);
    const customer = order?.customer_id
      ? await safeFetch<Customer>(`${apiUrl}/customers/${order.customer_id}`)
      : null;
 
    const products = await safeFetch<unknown[]>(`${apiUrl}/orders/${orderId}/products`);
    const fees = await safeFetch<unknown[]>(`${apiUrl}/orders/${orderId}/fees`);
    const coupons = await safeFetch<unknown[]>(`${apiUrl}/orders/${orderId}/coupons`);
 
    const customerCompanyName = customer?.company?.toLowerCase();
 
    const allCompaniesRes = await safeFetch<{ data: Company[] }>(companyApiUrl, true);
    const allCompanies = allCompaniesRes?.data || [];
 
    const matchedCompany = allCompanies.find(
      (comp) => comp.companyName?.toLowerCase() === customerCompanyName
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