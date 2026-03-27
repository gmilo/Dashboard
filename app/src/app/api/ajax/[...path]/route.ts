import { NextResponse } from "next/server";
import { config } from "@/lib/config";

export async function GET(request: Request, { params }: { params: { path: string[] } }) {
  const url = new URL(request.url);
  const target = new URL(`${config.ajaxBaseUrl}/${params.path.join("/")}`);
  target.search = url.search;

  const upstream = await fetch(target, {
    method: "GET",
    headers: {
      Accept: "*/*"
    },
    cache: "no-store"
  });

  const body = await upstream.arrayBuffer();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=10, stale-while-revalidate=30"
    }
  });
}
