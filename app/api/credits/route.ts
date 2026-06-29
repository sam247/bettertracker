import { desc, gte, sum } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { startOfToday } from "@/lib/dates";
import { db } from "@/lib/db";
import { apiLogs } from "@/lib/db/schema";
import { getCredits } from "@/lib/serprobot";

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creditResult = await getCredits();

  const [usedToday] = await db
    .select({ total: sum(apiLogs.creditsCost) })
    .from(apiLogs)
    .where(gte(apiLogs.createdAt, startOfToday()));

  const [lastCall] = await db
    .select()
    .from(apiLogs)
    .orderBy(desc(apiLogs.createdAt))
    .limit(1);

  const usedTodayCount = Number(usedToday?.total ?? 0);

  return NextResponse.json({
    remaining: creditResult.credits,
    usedToday: usedTodayCount,
    estimatedMonthly: usedTodayCount * 30,
    lastApiCall: lastCall
      ? {
          action: lastCall.action,
          success: !lastCall.error,
          error: lastCall.error,
          createdAt: lastCall.createdAt,
        }
      : null,
    creditFetchError: creditResult.error,
  });
}
