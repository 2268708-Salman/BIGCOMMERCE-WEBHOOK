import { NextRequest, NextResponse } from 'next/server';
 
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
 
    const order = await orderRes.json();
 
    const customerId = order.customer_id;
const customerRes = await fetch(`https://api.bigcommerce.com/stores/${process.env.BC_STORE_HASH}/v3/customers/${customerId}`, {
      headers: {
        'X-Auth-Token': process.env.BC_API_TOKEN!,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
 
    const customerData = await customerRes.json();
    const customer = customerData.data;
 
    // ✅ Print Order Details
    console.log("🧾 Order Summary:", {
id: order.id,
      status: order.status,
      total_inc_tax: order.total_inc_tax,
      shipping_cost_inc_tax: order.shipping_cost_inc_tax,
      products: order.products,
coupons: order.coupons,
      fees: order.fees
    });
 
    // ✅ Print Customer Info
    console.log("👤 Customer Info:", {
id: customer.id,
email: customer.email,
company: customer.company,
      first_name: customer.first_name,
      last_name: customer.last_name,
    });
 
    // ✅ Fetch Company Info
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
      const companies = companiesData.data;
 
      const matchedCompany = companies.find((company: any) =>
        company.companyName?.trim().toLowerCase() === customerCompanyName
      );
 
      if (!matchedCompany) {
        console.log(`❌ No matching company found for: ${customerCompanyName}`);
      } else {
        const e8Field = matchedCompany.extraFields?.find(
          (field: any) => field.fieldName?.toUpperCase() === "E8 COMPANY ID"
        );
        const e8CompanyId = e8Field?.fieldValue || null; 
        // ✅ Print Company Info
        console.log("🏢 Company Matched:", {
          companyId: matchedCompany.companyId,
          companyName: matchedCompany.companyName,
          e8CompanyId: e8CompanyId,
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