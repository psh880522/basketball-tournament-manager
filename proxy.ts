import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const AUTH_PATHS = ["/login", "/signup"];

function isProtectedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/team") || // /team 및 /teams/* 모두 커버
    pathname.startsWith("/my-applications") ||
    pathname.startsWith("/onboarding") ||
    /^\/tournament\/[^/]+\/apply(\/|$)/.test(pathname)
  );
}

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error?.code === "refresh_token_already_used") {
    await supabase.auth.signOut();
  }

  const { pathname } = request.nextUrl;

  // 이미 로그인된 사용자가 /login, /signup 접근 → /dashboard로 이동
  // 역할별 최종 분기(/admin)는 /dashboard/page.tsx 의 역할 가드가 처리
  if (AUTH_PATHS.includes(pathname) && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 보호 경로: 세션 없으면 /login?next={경로}로 리다이렉트
  if (isProtectedPath(pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
