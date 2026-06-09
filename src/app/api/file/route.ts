// Auth-gated proxy for Blob-hosted documents and photos.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";
const ALLOWED_HOSTS = /\.(public|private)?\.?blob\.vercel-storage\.com$/;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const raw = req.nextUrl.searchParams.get("u");
  if (!raw) return new NextResponse("Missing url", { status: 400 });

  let target: URL;
  try { target = new URL(raw); } catch {
    return new NextResponse("Bad url", { status: 400 });
  }

  if (target.protocol !== "https:" || !ALLOWED_HOSTS.test(target.hostname)) {
    return new NextResponse("Forbidden host", { status: 403 });
  }

  const upstream = await fetch(target.toString(), {
    headers: process.env.BLOB_READ_WRITE_TOKEN
      ? { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
      : {},
    redirect: "follow",
    cache: "no-store",
  });

  if (!upstream.ok) {
    return new NextResponse("Upstream " + upstream.status, { status: upstream.status });
  }

  const ct = upstream.headers.get("content-type") ?? "application/octet-stream";
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": ct,
      "Cache-Control": "private, max-age=300, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
