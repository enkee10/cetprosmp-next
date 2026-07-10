# Reportes Office Converter

Servicio Cloud Run para convertir los Excel generados por Functions a PDF usando
LibreOffice en modo headless.

## Endpoints

- `GET /health`: verifica que LibreOffice este disponible.
- `POST /convert`: recibe un `.xlsx` como body binario y devuelve `application/pdf`.

## Variables

- `OFFICE_BIN`: binario de LibreOffice. Por defecto busca `soffice`, `libreoffice`
  u `openoffice`.
- `OFFICE_CONVERT_TIMEOUT_SECONDS`: timeout de conversion. Por defecto `180`.
- `OFFICE_CONVERTER_TOKEN`: token opcional. Si existe, exige
  `Authorization: Bearer <token>`.

## Deploy

```bash
gcloud run deploy reportes-office-converter \
  --source services/reportes-office-converter \
  --region us-central1 \
  --project cetprosmp-2026 \
  --no-allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --concurrency 1 \
  --timeout 300
```

Luego configura Functions:

```bash
REPORTES_OFFICE_CONVERTER_URL=https://...
REPORTES_OFFICE_CONVERTER_IAM=true
```
