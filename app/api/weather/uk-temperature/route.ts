import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { fetchUkDailyTemperatures } from "@/lib/uk-weather";

export async function GET(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json(
      { error: "start and end dates are required" },
      { status: 400 },
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  try {
    const temperatures = await fetchUkDailyTemperatures(start, end);
    return NextResponse.json({ temperatures });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch temperature data" },
      { status: 502 },
    );
  }
}
