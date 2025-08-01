import { NextRequest, NextResponse } from 'next/server';
 
export async function POST(req: NextRequest) {
  try {
    // Read the raw body as text (not JSON yet)
    const text = await req.text();
    console.log("📦 Raw request body:", text);
 
    // Try parsing manually to catch malformed JSON
    const json = JSON.parse(text);
    const orderId = json.data?.id;
 
    console.log("🆔 Order ID from webhook:", orderId);
 
    return NextResponse.json({
      success: true,
      orderId,
      raw: text
    });
  } catch (error) {
    console.error("❌ Error parsing JSON:", error);
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 400 });
  }
}
 