import { NextResponse } from "next/server";

const COOKIE_NAME = "__session";
const ACCESS_VALUE = "autorizado";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export async function GET() {
  const response = new NextResponse(null, {
    status: 307,
    headers: {
      Location: "/",
    },
  });

  response.cookies.set(COOKIE_NAME, ACCESS_VALUE, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: TEN_YEARS,
  });

  return response;
}
