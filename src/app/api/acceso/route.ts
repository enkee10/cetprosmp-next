import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "__session";
const ACCESS_VALUE = "autorizado";
const DIEZ_ANIOS = 60 * 60 * 24 * 365 * 10;

export async function GET(request: NextRequest) {
    const url = request.nextUrl.clone();
    url.pathname = "/";

    const response = NextResponse.redirect(url);

    response.cookies.set(COOKIE_NAME, ACCESS_VALUE, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: DIEZ_ANIOS,
    });

    return response;
}