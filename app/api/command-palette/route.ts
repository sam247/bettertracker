import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCommandPaletteData } from "@/lib/commands/palette-data";

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getCommandPaletteData();
  return NextResponse.json(data);
}
