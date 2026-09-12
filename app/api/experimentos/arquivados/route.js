import { NextResponse } from "next/server";

const { connectDB } = require("../../../../config/db");
const { getAuthenticatedUser } = require("../../../../lib/auth");
const {
  getExperimentosArquivados,
} = require("../../../../controllers/experimentoController");

export const runtime = "nodejs";

export async function GET(request) {
  const auth = getAuthenticatedUser(request);

  if (!auth.user) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  await connectDB();
  const result = await getExperimentosArquivados({ user: auth.user });

  return NextResponse.json(result.body, { status: result.status });
}
