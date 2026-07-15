import { XMLParser } from 'fast-xml-parser';
import { NextRequest, NextResponse } from 'next/server';

const WORKSPACE_EMAIL_PATTERN = /^[^\s@]+@cetprosmp\.edu\.pe$/i;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
});

const findWorkspaceEmail = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const match = value.match(/[^\s<>"']+@cetprosmp\.edu\.pe/i);
    return match?.[0]?.toLowerCase() ?? null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const email = findWorkspaceEmail(item);
      if (email) return email;
    }
    return null;
  }

  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      const email = findWorkspaceEmail(item);
      if (email) return email;
    }
  }

  return null;
};

const getLoginHintFromSamlResponse = (samlResponse: FormDataEntryValue | null): string | null => {
  if (typeof samlResponse !== 'string' || !samlResponse.trim()) return null;

  try {
    const xml = Buffer.from(samlResponse, 'base64').toString('utf8');
    const parsed = xmlParser.parse(xml);
    const email = findWorkspaceEmail(parsed);
    return email && WORKSPACE_EMAIL_PATTERN.test(email) ? email : null;
  } catch (error) {
    console.error('No se pudo leer el login_hint desde SAMLResponse:', error);
    return null;
  }
};

const redirectToWorkspaceSso = (loginHint?: string | null) => {
  const search = loginHint ? `?${new URLSearchParams({ login_hint: loginHint })}` : '';
  return new NextResponse(null, { status: 303, headers: { Location: `/sso${search}` } });
};

export async function GET() {
  return redirectToWorkspaceSso();
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  return redirectToWorkspaceSso(getLoginHintFromSamlResponse(formData.get('SAMLResponse')));
}
