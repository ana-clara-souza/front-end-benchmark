import { NextResponse } from "next/server";
const { connectDB } = require("@/config/db");
const { login } = require("@/controllers/authController");
const {
  check,
  registerFailure,
} = require("@/lib/loginRateLimit");
export const runtime = "nodejs";

function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return (
    forwardedFor?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function rateLimitResponse(retryAfterSeconds) {
  return NextResponse.json(
    { message: "Muitas tentativas de login. Tente novamente mais tarde." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const ip = getClientIp(request);
  const email = String(body.emailInstitucional || "").trim().toLowerCase();
  const keys = ["ip:" + ip];
  if (email) keys.push("account:" + email);
  const limit = check(keys);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  await connectDB();
  const result = await login({ body });

  if (result.status === 401) registerFailure(keys);

  return NextResponse.json(result.body, { status: result.status });
}
