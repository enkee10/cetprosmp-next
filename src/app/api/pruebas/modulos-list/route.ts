import { NextResponse } from 'next/server';
import { getModulosTitulosFromDataConnect } from '@/lib/dataconnect';

export async function GET() {
  try {
    const modulos = await getModulosTitulosFromDataConnect();
    return NextResponse.json({ modulos });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'No se pudieron cargar los modulos desde Data Connect.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
