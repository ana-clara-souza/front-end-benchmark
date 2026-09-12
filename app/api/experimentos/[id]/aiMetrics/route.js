import { NextResponse } from "next/server";
const { connectDB } = require("../../../../../config/db");
const { getAuthenticatedUser } = require("../../../../../lib/auth");
const {
  addExecucoesScript,
} = require("../../../../../controllers/experimentoController");
export const runtime = "nodejs";
export async function PATCH(request, { params }) {
  const auth = getAuthenticatedUser(request);
  if (!auth.user) return NextResponse.json(auth.body, { status: auth.status });
  await connectDB();
  const { id } = await params;
  const result = await addExecucoesScript({
    id,
    body: await request.json(),
    user: auth.user,
  });
  return NextResponse.json(result.body, { status: result.status });
}
