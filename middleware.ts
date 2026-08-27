import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type WorkspaceRoute = "entry" | "mine" | "demo";

interface WorkspaceRouting {
  route: WorkspaceRoute | null;
  rewritePath: string | null;
  redirectPath: string | null;
}

function explicitRouteForPath(pathname: string): WorkspaceRoute | null {
  if (pathname === "/app") return "entry";
  if (pathname === "/app/demo" || pathname.startsWith("/app/demo/")) return "demo";
  if (pathname === "/app/my" || pathname.startsWith("/app/my/")) return "mine";
  return null;
}

function explicitRouteFromReferer(request: NextRequest): WorkspaceRoute | null {
  const referer = request.headers.get("referer");
  if (!referer) return null;

  try {
    return explicitRouteForPath(new URL(referer).pathname);
  } catch {
    return null;
  }
}

function getWorkspaceRouting(request: NextRequest): WorkspaceRouting {
  const pathname = request.nextUrl.pathname;
  const explicitRoute = explicitRouteForPath(pathname);
  if (explicitRoute) {
    if (explicitRoute === "entry") return { route: explicitRoute, rewritePath: null, redirectPath: null };
    const prefix = explicitRoute === "demo" ? "/app/demo" : "/app/my";
    return {
      route: explicitRoute,
      rewritePath: pathname === prefix ? "/app" : `/app${pathname.slice(prefix.length)}`,
      redirectPath: null,
    };
  }

  if (pathname.startsWith("/app/") && !pathname.startsWith("/app/api/")) {
    const refererRoute = explicitRouteFromReferer(request);
    if (refererRoute === "demo" || refererRoute === "mine") {
      const prefix = refererRoute === "demo" ? "/app/demo" : "/app/my";
      return { route: refererRoute, rewritePath: null, redirectPath: `${prefix}${pathname.slice("/app".length)}` };
    }
  }

  const refererRoute = pathname.startsWith("/api/") ? explicitRouteFromReferer(request) : null;
  return { route: refererRoute, rewritePath: null, redirectPath: null };
}

export async function middleware(request: NextRequest) {
  const routing = getWorkspaceRouting(request);
  const requestHeaders = new Headers(request.headers);
  if (routing.route) requestHeaders.set("x-memora-workspace-route", routing.route);
  else requestHeaders.delete("x-memora-workspace-route");

  const responseForRequest = () => {
    if (routing.redirectPath) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = routing.redirectPath;
      redirectUrl.search = request.nextUrl.search;
      return NextResponse.redirect(redirectUrl);
    }
    if (routing.rewritePath) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = routing.rewritePath;
      return NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  };

  let response = responseForRequest();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = responseForRequest();
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
