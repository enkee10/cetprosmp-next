const connectorConfig = {
  connector: 'default',
  service: 'cetprosmp-2026-service',
  location: 'us-central1',
};

export type ModuloTitulo = {
  titulo: string | null;
};

type ListModulosTitulosData = {
  modulos: ModuloTitulo[];
};

export async function getModulosTitulosFromDataConnect() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyD77s4vQE_0uRq9uFPvRypMsEEIwNaHCfs';
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'cetprosmp-2026';

  const { connector, location, service } = connectorConfig;
  const connectorPath = `projects/${projectId}/locations/${location}/services/${service}/connectors/${connector}`;
  const response = await fetch(
    `https://firebasedataconnect.googleapis.com/v1/${connectorPath}:executeQuery?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: connectorPath,
        operationName: 'ListModulosTitulos',
        variables: {},
      }),
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    throw new Error(`Data Connect respondio con HTTP ${response.status}.`);
  }

  const result = (await response.json()) as { data?: ListModulosTitulosData };

  return [...(result.data?.modulos ?? [])].sort((a, b) =>
    (a.titulo ?? '').localeCompare(b.titulo ?? '', 'es')
  );
}

export async function getModulosTitulosFromApi() {
  const response = await fetch('/api/pruebas/modulos-list', {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`No se pudo cargar la lista de modulos: HTTP ${response.status}.`);
  }

  const result = (await response.json()) as ListModulosTitulosData;

  return [...(result.modulos ?? [])].sort((a, b) =>
    (a.titulo ?? '').localeCompare(b.titulo ?? '', 'es')
  );
}
