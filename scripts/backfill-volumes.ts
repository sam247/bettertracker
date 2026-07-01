import { isGadsMcpConfigured } from "@/lib/gads-metrics";
import { refreshStaleGadsMetrics } from "@/lib/refresh-gads-metrics";

async function main() {
  const projectId = process.argv[2];

  if (!isGadsMcpConfigured()) {
    console.error(
      "GADS MCP is not configured. Set GADS_MCP_API_URL, GADS_MCP_API_SECRET, and GADS_DEFAULT_CUSTOMER_ID.",
    );
    process.exit(1);
  }

  let remaining = 1;
  let totalUpdated = 0;

  while (remaining > 0) {
    const result = await refreshStaleGadsMetrics({
      projectId,
      limit: 200,
    });
    totalUpdated += result.updated;
    remaining = result.remaining;
    console.log(
      `batch processed=${result.processed} updated=${result.updated} failed=${result.failed} remaining=${result.remaining}`,
    );
    if (result.processed === 0) break;
  }

  console.log(`Done. Total updated: ${totalUpdated}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
