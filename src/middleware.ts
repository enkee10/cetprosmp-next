import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "__session";
const ACCESS_VALUE = "autorizado";

export function middleware(request: NextRequest) {
    // En desarrollo local con npm run dev, siempre permite ver todo.
    if (process.env.NODE_ENV === "development") {
        return NextResponse.next();
    }

    // Si el modo construcción está desactivado, todos ven la web.
    if (process.env.MAINTENANCE_MODE !== "true") {
        return NextResponse.next();
    }

    const { pathname } = request.nextUrl;

    // Rutas permitidas aunque el sitio esté en construcción.
    const rutasPermitidas = [
        "/construccion",
        "/api/acceso"
    ];

    const esRutaPermitida = rutasPermitidas.some((ruta) =>
        pathname.startsWith(ruta)
    );

    // Archivos internos de Next.js y archivos públicos.
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

    // Verifica si el navegador tiene la cookie de acceso.
    const cookie = request.cookies.get(COOKIE_NAME)?.value;

    if (cookie === ACCESS_VALUE) {
        return NextResponse.next();
    }

    // Si no tiene acceso, muestra la página de construcción.
    const url = request.nextUrl.clone();
    url.pathname = "/construccion";

    return NextResponse.rewrite(url);
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};