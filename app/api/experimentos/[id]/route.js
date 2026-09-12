import { NextResponse } from "next/server";
const { connectDB } = require("../../../../config/db");
const { getAuthenticatedUser } = require("../../../../lib/auth");
const {
  getExperimentoById,
  deleteExperimento,
} = require("../../../../controllers/experimentoController");
export const runtime = "nodejs";
export async function GET(request, { params }) {
  const auth = getAuthenticatedUser(request);
  if (!auth.user) return NextResponse.json(auth.body, { status: auth.status });
  await connectDB();
  const { id } = await params;
  const result = await getExperimentoById({ id, user: auth.user });
  return NextResponse.json(result.body, { status: result.status });
}
export async function DELETE(request, { params }) {
  const auth = getAuthenticatedUser(request);
  if (!auth.user) return NextResponse.json(auth.body, { status: auth.status });
  await connectDB();
  const { id } = await params;
  const result = await deleteExperimento({ id, user: auth.user });
  return NextResponse.json(result.body, { status: result.status });
}
