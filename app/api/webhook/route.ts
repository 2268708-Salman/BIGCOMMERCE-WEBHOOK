import { NextRequest, NextResponse } from 'next/server';
 
interface Order {
  id: number;
  status: string;
  total_inc_tax: string;
  shipping_cost_inc_tax: string;
  products: any[]; // You can type this further if needed
  coupons: any;
  fees: any;
  customer_id: number;
}
 
interface Customer {
  id: number;
  email: string;
  company: string | null;
  first_name: string;
  last_name: string;
}
 
interface ExtraField {
  fieldName: string;
  fieldValue: string;
}
 
interface Company {
  companyId: number;
  companyName: string;
  extraFields?: ExtraField[];
}
 
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId = body.data?.id;
 
    console.log("🔔 Webhook triggered for order:", orderId);
 
const orderRes = await fetch(`https://api.bigcommerce.com/stores/${process.env.BC_STORE_HASH}/v2/orders/${orderId}?include=products`, {
      headers: {
        'X-Auth-Token': process.env.BC_API_TOKEN!,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
 
    const order: Order = await orderRes.json();
 
    const customerId = order.customer_id;
const customerRes = await fetch(`https://api.bigcommerce.com/stores/${process.env.BC_STORE_HASH}/v3/customers/${customerId}`, {
      headers: {
        'X-Auth-Token': process.env.BC_API_TOKEN!,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
 
    const customerData = await customerRes.json();
    const customer: Customer = customerData.data;
 
    console.log("🧾 Order Summary:", {
id: order.id,
      status: order.status,
      total_inc_tax: order.total_inc_tax,
      shipping_cost_inc_tax: order.shipping_cost_inc_tax,
      products: order.products,
coupons: order.coupons,
      fees: order.fees
    });
 
    console.log("👤 Customer Info:", {
id: customer.id,
email: customer.email,
company: customer.company,
      first_name: customer.first_name,
      last_name: customer.last_name,
    });
 
const customerCompanyName = customer.company?.trim().toLowerCase();
 
    if (!customerCompanyName) {
      console.log("No company assigned to customer.");
    } else {
const companyRes = await fetch("https://api-b2b.bigcommerce.com/api/v3/io/companies", {
        method: "GET",
        headers: {
          "X-Auth-Token": process.env.B2B_API_TOKEN!,
          "Content-Type": "application/json",
        },
      });
 
      const companiesData = await companyRes.json();
      const companies: Company[] = companiesData.data;
 
      const matchedCompany = companies.find((company) =>
        company.companyName?.trim().toLowerCase() === customerCompanyName
      );
 
      if (!matchedCompany) {
        console.log(`❌ No matching company found for: ${customerCompanyName}`);
      } else {
        const e8Field = matchedCompany.extraFields?.find(
          (field) => field.fieldName?.toUpperCase() === "E8 COMPANY ID"
        );
        const e8CompanyId = e8Field?.fieldValue || null;
 
        console.log("🏢 Company Matched:", {
          companyId: matchedCompany.companyId,
          companyName: matchedCompany.companyName,
          e8CompanyId,
          fullCompanyData: matchedCompany,
        });
      }
    }
 
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Error in webhook handler:", err);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}