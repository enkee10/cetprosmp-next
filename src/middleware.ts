import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "__session";

export function middleware(request: NextRequest) {
    // 1. En desarrollo local, siempre permite ver todo el sitio.
    if (process.env.NODE_ENV === "development") {
        return NextResponse.next();
    }

    // 2. Si el modo construcción no está activado en Firebase,
    // todos pueden ver el sitio normalmente.
    if (process.env.MAINTENANCE_MODE !== "true") {
        return NextResponse.next();
    }

    const { pathname } = request.nextUrl;

    // 3. Rutas que siempre deben estar permitidas.
    const rutasPermitidas = ["/construccion", "/api/acceso", "/api/salir"];

    const esRutaPermitida = rutasPermitidas.some((ruta) =>
        pathname.startsWith(ruta)
    );

    // 4. Archivos internos de Next.js, imágenes, íconos, estilos, scripts, etc.
    const esArchivoInterno =
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon.ico") ||
        pathname.startsWith("/robots.txt") ||
        pathname.startsWith("/sitemap.xml") ||
        pathname.startsWith("/imagenes") ||
        pathname.startsWith("/images") ||
        pathname.includes(".");

    if (esRutaPermitida || esArchivoInterno) {
        return NextResponse.next();
    }

    // 5. Verificar cookie de acceso.
    const cookie = request.cookies.get(COOKIE_NAME)?.value;
    const claveSecreta = process.env.MAINTENANCE_SECRET;

    if (cookie && claveSecreta && cookie === claveSecreta) {
        return NextResponse.next();
    }

    // 6. Si no tiene acceso, mostrar página de construcción.
    const url = request.nextUrl.clone();
    url.pathname = "/construccion";

    return NextResponse.rewrite(url);
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};