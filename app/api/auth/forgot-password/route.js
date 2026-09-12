import { NextResponse } from "next/server";

const { connectDB } = require("../../../../config/db");
const authController = require("../../../../controllers/authController");

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();

    const response = await authController.forgotPassword({
      body,
    });

    return NextResponse.json(response.body, {
      status: response.status,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { message: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}