import { NextRequest, NextResponse } from "next/server";
import type { KakaoLocalSearchResponse } from "@/lib/types/kakao";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: "검색어는 2글자 이상이어야 합니다." }, { status: 400 });
  }

  const apiKey = process.env.KAKAO_LOCAL_REST_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Kakao API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", q.trim());
  url.searchParams.set("size", "5");

  const kakaoRes = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${apiKey}` },
    next: { revalidate: 0 },
  });

  if (!kakaoRes.ok) {
    return NextResponse.json(
      { error: "Kakao API 호출에 실패했습니다." },
      { status: kakaoRes.status }
    );
  }

  const data: KakaoLocalSearchResponse = await kakaoRes.json();
  return NextResponse.json(data);
}
