import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { runKeywordCheck } from "@/lib/check-runner";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const result = await runKeywordCheck(id);

  if (!result.success) {
    return NextResponse.json(result, { status: 422 });
  }

  return NextResponse.json(result);
}
