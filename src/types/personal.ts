export interface Personal {
    id: number;
    displayName: string;
    memo: string; // HTML enriquecido como cadena

    user: {
        id: number;
        nombre: string;
        apellidoPaterno: string;
        apellidoMaterno: string;
        apellidos: string;
        dni: string;
        celular: string;
        email: string;
        avatar: string; // URL de Google u otro sistema, puede estar vacío
        sexo: string; // permitido cualquier string para evitar errores
        fechaNacimiento: string; // Formato: YYYY-MM-DD
        direccion: string;
        distrito: string;
        estadoCivil: string; // permite cualquier texto
        instruccion: string; // permite cualquier texto
        foto: string | null; // URL completa o null
    };

    especialidades: {
        id: number;
        tituloComercial: string;
        slug: string;
    }[];
}
