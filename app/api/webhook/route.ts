import { NextRequest, NextResponse } from 'next/server';
 
interface OrderProduct {
  product_id: number;
  name: string;
  quantity: number;
  price_inc_tax: string;
  discounted_total_inc_tax: string;
}
 
interface OrderResponse {
  id: number;
  status: string;
  total_inc_tax: string;
  shipping_cost_inc_tax: string;
  products: OrderProduct[];
  coupons: unknown[];
  fees: unknown[];
  customer_id: number;
}
 
interface CustomerResponse {
  id: number;
  email: string;
  company: string;
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
    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      console.error("❌ Invalid JSON payload received:", jsonError);
      return NextResponse.json(
        { success: false, error: "The route is not valid JSON" },
        { status: 400 }
      );
    }
 
    const orderId = body.data?.id;
 
    if (!orderId) {
      console.log("❌ No order ID found in payload:", body);
      return NextResponse.json(
        { success: false, error: "Missing order ID in payload" },
        { status: 400 }
      );
    }
 
    console.log("🔔 Webhook triggered for order:", orderId);
 
    const orderRes = await fetch(
`https://api.bigcommerce.com/stores/${process.env.BC_STORE_HASH}/v2/orders/${orderId}?include=products`,
      {
        headers: {
          'X-Auth-Token': process.env.BC_API_TOKEN!,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
 
    const order: OrderResponse = await orderRes.json();
 
    const customerId = order.customer_id;
 
    const customerRes = await fetch(
`https://api.bigcommerce.com/stores/${process.env.BC_STORE_HASH}/v3/customers/${customerId}`,
      {
        headers: {
          'X-Auth-Token': process.env.BC_API_TOKEN!,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
 
    const customerData = await customerRes.json();
    const customer: CustomerResponse = customerData.data;
 
    // ✅ Print Order Info
    console.log("🧾 Order Details:", {
id: order.id,
      status: order.status,
      total_inc_tax: order.total_inc_tax,
      shipping_cost_inc_tax: order.shipping_cost_inc_tax,
      products: order.products,
coupons: order.coupons,
      fees: order.fees,
    });
 
    // ✅ Print Customer Info
    console.log("👤 Customer Details:", {
id: customer.id,
email: customer.email,
company: customer.company,
      first_name: customer.first_name,
      last_name: customer.last_name,
    });
 
const companyName = customer.company?.trim().toLowerCase();
 
    if (!companyName) {
      console.log("❗ Customer has no company assigned.");
    } else {
      const companyRes = await fetch(
"https://api-b2b.bigcommerce.com/api/v3/io/companies",
        {
          headers: {
            "X-Auth-Token": process.env.B2B_API_TOKEN!,
            "Content-Type": "application/json",
          },
        }
      );
 
      const companyJson = await companyRes.json();
      const companies: Company[] = companyJson.data;
 
      const matchedCompany = companies.find(
        (comp) => comp.companyName?.trim().toLowerCase() === companyName
      );
 
      if (!matchedCompany) {
        console.log(`❌ No matching company found for: ${companyName}`);
      } else {
        const e8Field = matchedCompany.extraFields?.find(
          (field) => field.fieldName.toUpperCase() === "E8 COMPANY ID"
        );
 
        const e8CompanyId = e8Field?.fieldValue || null;
 
        console.log("🏢 Company Info:", {
          companyId: matchedCompany.companyId,
          companyName: matchedCompany.companyName,
          e8CompanyId,
          fullCompanyData: matchedCompany,
        });
      }
    }
 
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error in webhook handler:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}