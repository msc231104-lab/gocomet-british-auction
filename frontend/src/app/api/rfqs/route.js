import { NextResponse } from "next/server";
import { getRFQs } from "@/lib/api";

export async function GET() {
  const result = await getRFQs();

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
