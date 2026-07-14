import { NextResponse } from 'next/server';

const redirectToWorkspaceSso = () => new NextResponse(null, { status: 303, headers: { Location: '/sso' } });

export async function GET() {
  return redirectToWorkspaceSso();
}

export async function POST() {
  return redirectToWorkspaceSso();
}
