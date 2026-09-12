import { NextResponse } from "next/server";
const { connectDB } = require("../../../../config/db");
const { verifyEmail } = require("../../../../controllers/authController");
export const runtime = "nodejs";
export async function GET(request) {
  await connectDB();
  const result = await verifyEmail({ query: request.nextUrl.searchParams });
  return NextResponse.json(result.body, { status: result.status });
}
