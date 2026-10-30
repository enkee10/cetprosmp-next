export type SemestreSummary = { id: number; titulo?: string | null; inicio?: string | null; fin?: string | null };

export type AppSettings = {
  programacionCurricular: {
    mostrarContenidoEnCuadroEmergente: boolean;
  };
  general: {
    poderOcultarProgramacionOpcionesOcupacionales: boolean;
    usarAvataresEnCertificadosTitulos: boolean;
    formularioMatriculaAceptaRespuestas: boolean;
    activarReconocimientoDni: boolean;
    semestreActualId: number | null;
    semestres: SemestreSummary[];
    semestresConsultaIds: number[];
    usarListasSemestreAnteriorDocentes: boolean;
  };
  formularioMatricula: {
    aceptaRespuestas: boolean;
    siguienteAceptaRespuestas: boolean;
    semestreId: number | null;
    activarReconocimientoDni: boolean;
    fondoColor: string;
    siguienteFondoColor: string;
  };
  visualizaciones: {
    usarRecorteFotografiaComoAvatarEstudiantes: boolean;
    mostrarImagenAvatarEstudiantesEnListas: boolean;
    visualizarAvatarEstudianteCertificados: boolean;
    visualizarAvatarEstudianteFichaMatricula: boolean;
    visualizarAvatarEstudianteTitulos: boolean;
    usarGeneradorImagenesAvatar: boolean;
    modeloGeneradorImagenesAvatar: string;
  };
};

export const defaultAppSettings: AppSettings = {
  programacionCurricular: {
    mostrarContenidoEnCuadroEmergente: true,
  },
  general: {
    poderOcultarProgramacionOpcionesOcupacionales: false,
    usarAvataresEnCertificadosTitulos: false,
    formularioMatriculaAceptaRespuestas: false,
    activarReconocimientoDni: true,
    semestreActualId: null,
    semestres: [],
    semestresConsultaIds: [],
    usarListasSemestreAnteriorDocentes: false,
  },
  formularioMatricula: {
    aceptaRespuestas: false,
    siguienteAceptaRespuestas: false,
    semestreId: null,
    activarReconocimientoDni: true,
    fondoColor: '#ffffff',
    siguienteFondoColor: '#ffffff',
  },
  visualizaciones: {
    usarRecorteFotografiaComoAvatarEstudiantes: false,
    mostrarImagenAvatarEstudiantesEnListas: true,
    visualizarAvatarEstudianteCertificados: true,
    visualizarAvatarEstudianteFichaMatricula: true,
    visualizarAvatarEstudianteTitulos: true,
    usarGeneradorImagenesAvatar: true,
    modeloGeneradorImagenesAvatar: 'gemini-3.1-flash-image-512',
  },
};

export const normalizeSettings = (value: Partial<AppSettings> | undefined | null): AppSettings => ({
  programacionCurricular: {
    mostrarContenidoEnCuadroEmergente: value?.programacionCurricular?.mostrarContenidoEnCuadroEmergente !== false,
  },
  general: {
    poderOcultarProgramacionOpcionesOcupacionales: value?.general?.poderOcultarProgramacionOpcionesOcupacionales === true,
    semestres: Array.isArray(value?.general?.semestres)
      ? value.general.semestres.filter((item) => Number.isInteger(item.id) && item.id > 0)
        .map(({ id, titulo, inicio, fin }) => ({ id, titulo, inicio, fin }))
      : [],
    usarAvataresEnCertificadosTitulos: Boolean(
      value?.general?.usarAvataresEnCertificadosTitulos,
    ),
    formularioMatriculaAceptaRespuestas: Boolean(
      value?.formularioMatricula?.aceptaRespuestas ?? value?.general?.formularioMatriculaAceptaRespuestas,
    ),
    activarReconocimientoDni: (value?.formularioMatricula?.activarReconocimientoDni ?? value?.general?.activarReconocimientoDni) !== false,
    semestreActualId: Number(value?.general?.semestreActualId) > 0
      ? Number(value?.general?.semestreActualId)
      : Number(value?.formularioMatricula?.semestreId) > 0
        ? Number(value?.formularioMatricula?.semestreId)
        : null,
    semestresConsultaIds: Array.isArray(value?.general?.semestresConsultaIds)
      ? value.general.semestresConsultaIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
      : [],
    usarListasSemestreAnteriorDocentes: false,
  },
  formularioMatricula: {
    aceptaRespuestas: Boolean(
      value?.formularioMatricula?.aceptaRespuestas ?? value?.general?.formularioMatriculaAceptaRespuestas,
    ),
    siguienteAceptaRespuestas: Boolean(value?.formularioMatricula?.siguienteAceptaRespuestas),
    semestreId: Number(value?.general?.semestreActualId) > 0
      ? Number(value?.general?.semestreActualId)
      : Number(value?.formularioMatricula?.semestreId) > 0
        ? Number(value?.formularioMatricula?.semestreId)
        : null,
    activarReconocimientoDni: (value?.formularioMatricula?.activarReconocimientoDni ?? value?.general?.activarReconocimientoDni) !== false,
    fondoColor: /^#[0-9a-f]{6}$/i.test(String(value?.formularioMatricula?.fondoColor || ''))
      ? String(value?.formularioMatricula?.fondoColor)
      : '#ffffff',
    siguienteFondoColor: /^#[0-9a-f]{6}$/i.test(String(value?.formularioMatricula?.siguienteFondoColor || ''))
      ? String(value?.formularioMatricula?.siguienteFondoColor)
      : '#ffffff',
  },
  visualizaciones: {
    usarRecorteFotografiaComoAvatarEstudiantes: Boolean(
      value?.visualizaciones?.usarRecorteFotografiaComoAvatarEstudiantes,
    ),
    mostrarImagenAvatarEstudiantesEnListas: value?.visualizaciones?.mostrarImagenAvatarEstudiantesEnListas !== false,
    visualizarAvatarEstudianteCertificados: value?.visualizaciones?.visualizarAvatarEstudianteCertificados !== false,
    visualizarAvatarEstudianteFichaMatricula: value?.visualizaciones?.visualizarAvatarEstudianteFichaMatricula !== false,
    visualizarAvatarEstudianteTitulos: value?.visualizaciones?.visualizarAvatarEstudianteTitulos !== false,
    usarGeneradorImagenesAvatar: value?.visualizaciones?.usarGeneradorImagenesAvatar !== false,
    modeloGeneradorImagenesAvatar: [
      'gemini-3.1-flash-lite-image-1024',
      'gemini-3.1-flash-image-512',
    ].includes(String(value?.visualizaciones?.modeloGeneradorImagenesAvatar))
      ? String(value?.visualizaciones?.modeloGeneradorImagenesAvatar)
      : 'gemini-3.1-flash-image-512',
  },
});

