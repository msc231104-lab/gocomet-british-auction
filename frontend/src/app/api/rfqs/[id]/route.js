import { NextResponse } from "next/server";
import { getRFQById } from "@/lib/api";

export async function GET(request, { params }) {
  const { id } = await params;
  const numId = parseInt(id, 10);

  if (isNaN(numId) || numId <= 0) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Invalid RFQ ID parameter.",
          code: "INVALID_ID",
          status: 400,
        },
      },
      { status: 400 }
    );
  }

  const result = await getRFQById(numId);

  if (result.error) {
    return NextResponse.json(
      {
        data: null,
        error: result.error,
      },
      {
        status: result.error.status || 502,
      }
    );
  }

  return NextResponse.json({
    data: result.data,
    error: null,
  });
}
