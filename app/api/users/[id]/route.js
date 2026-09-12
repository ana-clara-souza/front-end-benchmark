import { NextResponse } from "next/server";
const { connectDB } = require("../../../../config/db");
const { getAuthenticatedUser } = require("../../../../lib/auth");
const {
  updateUser,
  deleteUser,
} = require("../../../../controllers/userController");
export const runtime = "nodejs";
async function authenticate(request) {
  const auth = getAuthenticatedUser(request);
  return auth.user
    ? null
    : NextResponse.json(auth.body, { status: auth.status });
}
export async function PATCH(request, { params }) {
  const denied = await authenticate(request);
  if (denied) return denied;
  await connectDB();
  const { id } = await params;
  const result = await updateUser({ id, body: await request.json() });
  return NextResponse.json(result.body, { status: result.status });
}
export async function DELETE(request, { params }) {
  const denied = await authenticate(request);
  if (denied) return denied;
  await connectDB();
  const { id } = await params;
  const result = await deleteUser({ id });
  return NextResponse.json(result.body, { status: result.status });
}
