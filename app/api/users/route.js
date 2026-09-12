import { NextResponse } from "next/server";
const { connectDB } = require("../../../config/db");
const { createUser } = require("../../../controllers/userController");
export const runtime = "nodejs";
export async function POST(request) {
  await connectDB();
  const result = await createUser({ body: await request.json() });
  return NextResponse.json(result.body, { status: result.status });
}
