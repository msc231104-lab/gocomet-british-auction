import { NextResponse } from "next/server";
import { getRFQBidHistory, submitRFQBid } from "@/lib/api";

export async function GET(request, { params }) {
  const { id } = await params;
  const numId = parseInt(id, 10);

  if (isNaN(numId) || numId <= 0) {
    return NextResponse.json(
      {
        data: [],
        error: {
          message: "Invalid RFQ ID parameter.",
          code: "INVALID_ID",
          status: 400,
        },
      },
      { status: 400 }
    );
  }

  const result = await getRFQBidHistory(numId);

  if (result.error) {
    return NextResponse.json(
      {
        data: [],
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

export async function POST(request, { params }) {
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

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Invalid JSON request payload.",
          code: "INVALID_JSON",
          status: 400,
        },
      },
      { status: 400 }
    );
  }

  const result = await submitRFQBid(numId, body);

  if (result.error) {
    return NextResponse.json(
      {
        data: null,
        error: result.error,
      },
      {
        status: result.status || result.error.status || 502,
      }
    );
  }

  return NextResponse.json(
    {
      data: result.data,
      error: null,
    },
    {
      status: 201,
    }
  );
}
