# DNI OpenCV Processor

Servicio Cloud Run para procesar los documentos de matricula que deja Functions en
`matriculaDocumentoProcessingJobs`.

## Entrada

Recibe un `POST /` con el job generado por `crearMatriculaFormulario` o
`updateMatriculaFormulario`.

Para cada lado usa:

- `source.path`: ruta del archivo original en Firebase Storage.
- `source.url`: URL de descarga como respaldo si no se puede leer por bucket.
- `hasTwoBodies`: indica si el archivo contiene dos cuerpos.
- `selectedArea`: `superior`, `inferior`, `pagina-1`, `pagina-2` o `completa`.

Si un lado llega con `hasTwoBodies: true`, el servicio procesa un solo archivo
(preferentemente el lado `frente`), detecta los dos cuerpos por bordes y devuelve
dos salidas:

- `frente`: usa el area marcada por la metadata (`selectedArea`) del lado
  procesado.
- `reverso`: usa el otro cuerpo de la misma imagen.

Si no se encuentran dos contornos confiables, divide la imagen en parte superior
e inferior y procesa cada mitad como respaldo.

Despues de recortar los dos cuerpos, usa OCR local solo para clasificar el lado:
el cuerpo con señales como `DIRECCION`, `DISTRITO` o `PER<` se guarda como
`reverso`; el otro se guarda como `frente`. Si el OCR no da suficiente
confianza, usa la metadata/posicion como respaldo.

## Salida

Guarda imagenes JPEG procesadas en:

```text
matriculas/documentos-procesados/{numero-documento}/{dni|ce}-{numero-documento}-procesado-{frente|reverso}.jpg
```

Devuelve un JSON con `status: "completed"` y `outputs`. La Cloud Function que
invoca este servicio guarda ese resultado en Firestore.

## Editor manual

`POST /manual-edit` recibe la imagen ya girada por el usuario a la posicion
normal del DNI y cuatro `perspectivePoints` que definen sus esquinas. Esos puntos
determinan el unico recorte: se corrige la perspectiva hacia una salida horizontal
con proporcion `8.6/5.4`, sin condiciones sobre la proporcion de la seleccion,
sin giros automaticos y sin volver a detectar o recortar margenes. El ancho
configurado en `OUTPUT_WIDTH` se limita a 800–2400 pixeles; el alto se redondea
al pixel mas cercano. El realce y la miniatura conservan esa geometria.

Si no se envian cuatro puntos, se conserva el encuadre recibido y solo se ajusta
el ancho. Estas reglas son exclusivas del editor manual; `POST /` conserva su
procesamiento automatico.

Pruebas locales sin escribir en Storage:

```bash
python -B -m unittest discover -s services/dni-opencv-processor -p test_manual_edit.py -v
```

## Variables

- `FIREBASE_STORAGE_BUCKET`: bucket principal de Storage. Recomendado.
- `ENABLE_OCR_ORIENTATION`: activa la correccion final de orientacion por OCR.
  Por defecto esta activada y compara la lectura normal contra la lectura a 180 grados.
- `FORCE_DOCUMENT_RATIO`: fuerza la proporcion fisica aproximada del DNI (`8.6/5.4`)
  cuando el contorno detectado es razonable en el procesamiento automatico.
  Por defecto esta activada. El editor manual siempre aplica esa proporcion.
- `ENABLE_PRE_WARP_REFINEMENT`: activa el refinamiento lateral del contorno antes
  de corregir perspectiva. Por defecto esta activada.
- `ENABLE_PRE_WARP_EXPANSION`: activa la expansion preventiva del contorno antes
  de corregir perspectiva. Por defecto esta activada.
- `ENABLE_NEAR_FRONTAL_CROP`: activa el recorte conservador para documentos casi
  frontales. Por defecto esta activada.
- `PROCESSOR_TOKEN`: secreto opcional. Si existe, exige header
  `Authorization: Bearer <token>`. Si no existe, usa seguridad IAM de Cloud Run.
- `OUTPUT_WIDTH`: ancho aproximado de salida en pixeles. Por defecto `1015`.

## Deploy sugerido

```bash
gcloud run deploy dni-opencv-processor \
  --source services/dni-opencv-processor \
  --region us-central1 \
  --project cetprosmp-2026 \
  --set-env-vars FIREBASE_STORAGE_BUCKET=cetprosmp-2026.firebasestorage.app
```

Luego configura Functions con la URL:

```bash
MATRICULA_DOCUMENT_PROCESSOR_URL=https://...
```

En este proyecto se usan variables de entorno v2, asi que configura
`MATRICULA_DOCUMENT_PROCESSOR_URL` en el entorno de Functions antes de desplegar.
