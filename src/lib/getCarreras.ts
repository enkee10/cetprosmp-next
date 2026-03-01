import fs from 'fs';
import path from 'path';
import type { Carrera } from '@/types/carreras';
import type { Modulo } from '@/types/modulos';

export async function getCarreras(): Promise<Carrera[]> {
    const ruta = (archivo: string) =>
        path.join(process.cwd(), 'public', 'data', archivo);

    const carrerasRaw = fs.readFileSync(ruta('carreras.json'), 'utf8');
    const modulosRaw = fs.readFileSync(ruta('modulos.json'), 'utf8');

    const carrerasPorEspecialidad = JSON.parse(carrerasRaw);
    const modulosPorCarrera: Record<number, Modulo[]> = {};

    for (const car of JSON.parse(modulosRaw)) {
        modulosPorCarrera[car.id] = car.modulos;
    }

    // unificar todas las carreras en un solo array
    const todasLasCarreras: Carrera[] = [];

    for (const esp of carrerasPorEspecialidad) {
        const carreras = esp.carreras ?? [];
        for (const car of carreras) {
            todasLasCarreras.push({
                ...car,
                modulos: modulosPorCarrera[car.id] || [],
            });
        }
    }

    return todasLasCarreras;
}
