import fs from 'fs';
import path from 'path';
import type { Especialidad } from '@/types/especialidades';
import type { Carrera } from '@/types/carreras';
import type { Modulo } from '@/types/modulos';

export async function getEspecialidades(): Promise<Especialidad[]> {
    const ruta = (archivo: string) =>
        path.join(process.cwd(), 'public', 'data', archivo);

    const especialidadesRaw = fs.readFileSync(ruta('especialidades.json'), 'utf8');
    const carrerasRaw = fs.readFileSync(ruta('carreras.json'), 'utf8');
    const modulosRaw = fs.readFileSync(ruta('modulos.json'), 'utf8');

    const especialidades = JSON.parse(especialidadesRaw);
    const carrerasPorEspecialidad: Record<number, Carrera[]> = {};
    const modulosPorCarrera: Record<number, Modulo[]> = {};

    // indexar carreras por id de especialidad
    for (const esp of JSON.parse(carrerasRaw)) {
        carrerasPorEspecialidad[esp.id] = esp.carreras;
    }

    // indexar modulos por id de carrera
    for (const car of JSON.parse(modulosRaw)) {
        modulosPorCarrera[car.id] = car.modulos;
    }

    // reconstruir especialidades con carreras y módulos anidados
    return especialidades.map((esp: any) => {
        const carreras: Carrera[] = (carrerasPorEspecialidad[esp.id] || []).map((car: any) => ({
            ...car,
            modulos: modulosPorCarrera[car.id] || [],
        }));

        return {
            ...esp,
            carreras,
        };
    });
}
