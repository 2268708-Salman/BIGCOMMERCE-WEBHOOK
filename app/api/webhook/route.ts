import { NextRequest, NextResponse } from 'next/server';
 
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("📦 Raw body:", JSON.stringify(body));
 
    const orderId = body.data?.id;
    console.log("🔔 Webhook triggered for order:", orderId);
 
    // 🧾 Fetch Order (no include=products)
    const orderRes = await fetch(
`https://api.bigcommerce.com/stores/${process.env.BC_STORE_HASH}/v2/orders/${orderId}`,
      {
        headers: {
          'X-Auth-Token': process.env.BC_API_TOKEN!,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );
 
    if (!orderRes.ok) {
      const errorText = await orderRes.text();
      throw new Error(`❌ Order fetch failed (${orderRes.status}): ${errorText}`);
    }
 
    const order = await orderRes.json();
 
    // 📦 Fetch Order Products
    const productsRes = await fetch(
`https://api.bigcommerce.com/stores/${process.env.BC_STORE_HASH}/v2/orders/${orderId}/products`,
      {
        headers: {
          'X-Auth-Token': process.env.BC_API_TOKEN!,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );
 
    if (!productsRes.ok) {
      const errorText = await productsRes.text();
      throw new Error(`❌ Order products fetch failed (${productsRes.status}): ${errorText}`);
    }
 
    const products = await productsRes.json();
 
    // 👤 Fetch Customer
    const customerRes = await fetch(
`https://api.bigcommerce.com/stores/${process.env.BC_STORE_HASH}/v3/customers/${order.customer_id}`,
      {
        headers: {
          'X-Auth-Token': process.env.BC_API_TOKEN!,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );
 
    if (!customerRes.ok) {
      const errorText = await customerRes.text();
      throw new Error(`❌ Customer fetch failed (${customerRes.status}): ${errorText}`);
    }
 
    const customerJson = await customerRes.json();
    const customer = customerJson.data;
 
    console.log("🧾 Order Details:", {
id: order.id,
      status: order.status,
      total_inc_tax: order.total_inc_tax,
      shipping_cost_inc_tax: order.shipping_cost_inc_tax,
coupons: order.coupons,
      fees: order.fees,
    });
 
    console.log("📦 Products:", products);
 
    console.log("👤 Customer Details:", {
id: customer.id,
email: customer.email,
company: customer.company,
      first_name: customer.first_name,
      last_name: customer.last_name,
    });
 
const companyName = customer.company?.trim().toLowerCase();
 
    if (companyName) {
      const companyRes = await fetch(
"https://api-b2b.bigcommerce.com/api/v3/io/companies",
        {
          headers: {
            'X-Auth-Token': process.env.B2B_API_TOKEN!,
            'Content-Type': 'application/json',
          },
        }
      );
 
      if (!companyRes.ok) {
        const errorText = await companyRes.text();
        throw new Error(`❌ Company list fetch failed (${companyRes.status}): ${errorText}`);
      }
 
      const companyJson = await companyRes.json();
      const companies = companyJson.data;
 
      const matchedCompany = companies.find(
        (comp: any) => comp.companyName?.trim().toLowerCase() === companyName
      );
 
      if (matchedCompany) {
        const e8Field = matchedCompany.extraFields?.find(
          (field: any) => field.fieldName.toUpperCase() === "E8 COMPANY ID"
        );
        const e8CompanyId = e8Field?.fieldValue || null;
 
        console.log("🏢 Company Info:", {
          companyId: matchedCompany.companyId,
          companyName: matchedCompany.companyName,
          e8CompanyId,
        });
      } else {
        console.log(`❌ No matching company found for: ${companyName}`);
      }
    } else {
      console.log("❗ Customer has no company assigned.");
    }
 
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error in webhook handler:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}