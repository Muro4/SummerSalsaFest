import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req) {
  try {
    // 1. Check if the Stripe Key exists
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Missing Stripe Secret Key in .env.local" }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    // 2. Safely parse the body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Failed to parse request body" }, { status: 400 });
    }

    const { items } = body;

    // 3. Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart items array is empty or missing" }, { status: 400 });
    }

    // 4. Format Line Items Safely
    const lineItems = items.map((item) => {
      // Safety check: ensure price is a valid number to prevent Stripe from crashing
      const price = parseFloat(item.price);
      if (isNaN(price)) throw new Error(`Invalid price for item: ${item.passType}`);

      return {
        price_data: {
          currency: "eur",
          product_data: {
            name: String(item.passType || "Festival Ticket"),
            description: `Attendee: ${item.userName || "Guest"} | ID: ${item.ticketID || "N/A"}`,
          },
          unit_amount: Math.round(price * 100), // Stripe uses cents
        },
        quantity: 1,
      };
    });

    // 5. Create Stripe Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cart/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cart`,
    });

    // 6. Return Success URL
    return NextResponse.json({ url: session.url });

  } catch (error) {
    // THIS CATCHES STRIPE ERRORS AND RETURNS THEM AS JSON
    console.error("STRIPE SERVER ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}