import fs from 'fs';
import path from 'path';
import type { Publicacion } from '@/types/publicaciones';
import { formatDateOnly } from '@/lib/dateOnly';

const rutaPublicaciones = path.join(process.cwd(), 'public', 'data', 'publicaciones.json');

export async function getPublicaciones(): Promise<Publicacion[]> {
    try {
        const raw = fs.readFileSync(rutaPublicaciones, 'utf8');
        const json = JSON.parse(raw) as Publicacion[];
        return json
            .slice()
            .sort((a, b) => {
                const fa = a.fechaPublicacion || '';
                const fb = b.fechaPublicacion || '';
                if (fa && fb && fa !== fb) return fb.localeCompare(fa); // desc
                return (a.titulo || '').localeCompare(b.titulo || '');
            });
    } catch {
        return [];
    }
}

export async function getPublicacionBySlug(slug: string): Promise<Publicacion | null> {
    const all = await getPublicaciones();
    return all.find(p => p.slug === slug) || null;
}

export function formatFecha(iso?: string | null) {
    return formatDateOnly(iso, { dateStyle: 'long' });
}
