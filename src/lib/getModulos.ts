// src/lib/getModulos.ts
import fs from 'fs';
import path from 'path';
import type { Modulo } from '@/types/modulos';

export async function getModulos(): Promise<Modulo[]> {
    const filePath = path.join(process.cwd(), 'public', 'data', 'modulos.json');
    const rawData = fs.readFileSync(filePath, 'utf8');

    const modulosPorCarrera = JSON.parse(rawData);

    // Extraer todos los módulos y unificarlos en un solo array
    const todosLosModulos: Modulo[] = [];

    for (const entrada of modulosPorCarrera) {
        const modulos = entrada.modulos ?? [];
        todosLosModulos.push(...modulos);
    }

    return todosLosModulos;
}
