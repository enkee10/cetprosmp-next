import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const claveSecreta = process.env.MAINTENANCE_SECRET;

    if (!claveSecreta) {
        return NextResponse.json(
            { error: "No existe MAINTENANCE_SECRET" },
            { status: 500 }
        );
    }

    const url = request.nextUrl.clone();
    url.pathname = "/";

    const response = NextResponse.redirect(url);

    response.cookies.set("__session", claveSecreta, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
    });

    return response;
}