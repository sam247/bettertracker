import { NextResponse } from "next/server";
import {
  getDueKeywords,
  getRetryKeywords,
  runKeywordCheck,
} from "@/lib/check-runner";

export const maxDuration = 300;

export async function GET() {
  const batchSize = parseInt(process.env.CRON_BATCH_SIZE ?? "20", 10);
  const due = await getDueKeywords(batchSize);

  const results = [];
  for (const keyword of due) {
    const result = await runKeywordCheck(keyword.id);
    results.push(result);
  }

  const retryIds = await getRetryKeywords(5);
  const dueIds = new Set(due.map((k) => k.id));
  const retryOnly = retryIds.filter((id) => !dueIds.has(id));

  for (const id of retryOnly) {
    const result = await runKeywordCheck(id);
    results.push(result);
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const remainingDue = (await getDueKeywords(1000)).length;

  return NextResponse.json({
    checked: results.length,
    succeeded,
    failed,
    remainingDue,
    results,
  });
}
