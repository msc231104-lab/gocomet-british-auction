import { NextResponse } from "next/server";
import { getSuppliers, createSupplier } from "@/lib/api";

export async function GET() {
  const result = await getSuppliers();

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

export async function POST(request) {
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

  const result = await createSupplier(body);

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
