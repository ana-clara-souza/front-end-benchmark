import { NextResponse } from "next/server";
const { connectDB } = require("../../../../config/db");
const { login } = require("../../../../controllers/authController");
const {
  check,
  registerFailure,
} = require("../../../../lib/loginRateLimit");
export const runtime = "nodejs";

const SESSION_COOKIE = "access_token";
const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

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

  const { sessionToken, ...responseBody } = result.body;
  const response = NextResponse.json(responseBody, { status: result.status });

  if (result.status === 200 && sessionToken) {
    response.cookies.set({
      name: SESSION_COOKIE,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  }

  return response;
}
