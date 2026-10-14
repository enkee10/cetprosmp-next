import { randomUUID } from 'node:crypto';

// Prerendered once per build. This public endpoint contains no session or record data.
export const dynamic = 'force-static';
const version = randomUUID();

export function GET() {
  return Response.json({ version }, {
    headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
  });
}
