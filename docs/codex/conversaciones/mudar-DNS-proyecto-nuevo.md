tengo el servicio de DNS en un proyecto viejo de google cloud, y quiero pasarlo todo a firebase DNS, puedes darme los pasos para hacerlo de tal forma que no interrumpa mi conexion a mi dominio y mis servicios workspace, te paso captura de lo que tengo.
Tambien te comento que mi distribuidor de doninio es .pe de peru
9:16 PM


Worked for 26s
No existe un producto “Firebase DNS” como proveedor autoritativo completo.
Para no cortar servicio, la migración correcta es: mover la zona DNS a Cloud DNS (en el proyecto nuevo/Firebase) y luego conectar Hosting/App Hosting de Firebase con registros DNS.

Con tu captura, ya estás en Cloud DNS en el proyecto viejo (cetprosmp-dns para cetprosmp.edu.pe), así que el cambio real es migrar la zona entre proyectos sin perder MX de Workspace.

Pasos sin interrupción
Inventario completo de registros actuales

Exporta todos los registros de la zona actual (A, AAAA, CNAME, MX, TXT, SRV, CAA).
Incluye obligatoriamente Workspace: MX, SPF (TXT), DKIM (google._domainkey TXT/CNAME), DMARC (_dmarc TXT).
No te quedes solo con lo visible en la captura.
Baja TTL 24–48 h antes

En la zona actual, baja TTL de registros críticos (web/mail) a 300 segundos.
Espera al menos el TTL anterior para que el cambio se “asiente”.
Crea zona en el proyecto nuevo

Crea zona pública cetprosmp.edu.pe en Cloud DNS del proyecto nuevo.
Copia todos los registros del paso 1.
No copies NS/SOA del apex desde el archivo exportado; Cloud DNS genera los suyos.
Prevalida Firebase (sin cortar tráfico aún)

En Firebase Hosting/App Hosting, agrega dominio y crea los TXT de verificación/ACME que pida.
Mantén esos TXT permanentes si Firebase lo indica.
No cambies todavía los nameservers del dominio.
Verificación técnica antes del corte

Comprueba que en la zona nueva existan exactamente los mismos MX/TXT de correo.
Valida con dig/Admin Toolbox para MX, TXT, A, CNAME.
Ventana de cambio (registrador .pe)

En tu registrador .pe, cambia los nameservers a los NS de la zona nueva.
Mantén la zona vieja activa al menos 72 h por seguridad.
Post-cambio (24–72 h)

Monitorea:
Web: resolución de A/AAAA/CNAME
Correo: MX, SPF, DKIM, DMARC
Cuando todo esté estable, recién elimina zona vieja.
Rollback rápido (si algo falla)

Vuelve temporalmente los NS al set anterior.
Corrige registros en zona nueva y repite cambio.
Qué cuidar para no romper Workspace
No eliminar ni alterar MX válidos antes del cambio de NS.
No olvidar SPF/DKIM/DMARC.
Evitar coexistencia de MX antiguos + nuevos incorrectos.
Verificar formato FQDN (algunos paneles requieren punto final, otros no).
Referencias oficiales
Firebase custom domain (verificación TXT, setup avanzado sin downtime): https://firebase.google.com/docs/hosting/custom-domain
Migración entre proveedores hacia Cloud DNS: https://cloud.google.com/dns/docs/migrating
MX de Google Workspace (actuales y legacy): https://support.google.com/a/answer/16004259
Si quieres, te preparo un checklist exacto de tus registros (línea por línea) para ejecutar la migración en tu caso cetprosmp.edu.pe sin riesgo.





9:17 PM
a ver
9:26 PM

Perfecto. Vamos con un checklist operativo, pensado para cero corte.

Checklist exacto para cetprosmp.edu.pe
En el proyecto viejo, exporta la zona:

gcloud dns record-sets export old-zone.yaml --zone=cetprosmp-dns --project=PROYECTO_VIEJO
Crea la zona en el proyecto nuevo:

gcloud dns managed-zones create cetprosmp-dns --dns-name=cetprosmp.edu.pe. --visibility=public --project=PROYECTO_NUEVO
Edita old-zone.yaml y elimina solo estos registros apex:

NS de cetprosmp.edu.pe.
SOA de cetprosmp.edu.pe.
Importa en la zona nueva:

gcloud dns record-sets import old-zone.yaml --zone=cetprosmp-dns --project=PROYECTO_NUEVO
Verifica que estén en la zona nueva (mínimo):

A de cetprosmp.edu.pe (en tu captura: 199.36.158.100)
MX de Workspace (los 5 aspmx... que ya tienes)
TXT de verificación (hosting-site=...)
_acme-challenge TXT
Cualquier SPF/DKIM/DMARC existente
En Firebase (proyecto nuevo), agrega dominio personalizado:

Usa Advanced setup (no Quick) para evitar downtime.
Crea los TXT/ACME que pida Firebase en la zona nueva.
Baja TTL de registros críticos a 300 en ambas zonas (si no están así) y espera propagación previa.

En tu registrador .pe, cambia los Nameservers al set NS de la zona nueva (los 4 ns-cloud-... que te da el proyecto nuevo).

Monitorea 24–72h:

Web: dig A cetprosmp.edu.pe
Correo: dig MX cetprosmp.edu.pe
TXT: dig TXT cetprosmp.edu.pe, dig TXT _dmarc.cetprosmp.edu.pe
DKIM: dig TXT google._domainkey.cetprosmp.edu.pe (o CNAME según tu setup)
Cuando todo esté estable, elimina la zona vieja.

Comandos de verificación rápida
nslookup -type=NS cetprosmp.edu.pe
nslookup -type=MX cetprosmp.edu.pe
nslookup -type=TXT cetprosmp.edu.pe
nslookup -type=A cetprosmp.edu.pe
Si quieres, en el siguiente mensaje te doy una plantilla lista para copiar de old-zone.yaml con validaciones para que no se te escape ningún registro de Workspace.





9:26 PM
a ver dame esa plantilla
9:42 PM


# zone-migracion-template.yaml
# Plantilla para migrar cetprosmp.edu.pe a Cloud DNS (proyecto nuevo)
# IMPORTANTE:
# 1) NO incluir NS/SOA del apex (Cloud DNS los genera solo).
# 2) Reemplaza los valores de ejemplo por los reales exportados.
# 3) Mantén los MX/TXT de Workspace exactamente como están en producción.

---
# APEX A
name: cetprosmp.edu.pe.
type: A
ttl: 300
rrdatas:
  - "199.36.158.100"

---
# (Opcional) AAAA apex si existe en tu zona actual
name: cetprosmp.edu.pe.
type: AAAA
ttl: 300
rrdatas:
  - "REEMPLAZAR_IPV6_SI_EXISTE"

---
# TXT de Firebase Hosting (ejemplo de tu captura)
name: cetprosmp.edu.pe.
type: TXT
ttl: 300
rrdatas:
  - "\"hosting-site=cetprosmp-2026\""

---
# SPF (si está en apex; NO duplicar con otro SPF)
name: cetprosmp.edu.pe.
type: TXT
ttl: 300
rrdatas:
  - "\"v=spf1 include:_spf.google.com ~all\""

---
# MX de Google Workspace
name: cetprosmp.edu.pe.
type: MX
ttl: 300
rrdatas:
  - "1 aspmx.l.google.com."
  - "5 alt1.aspmx.l.google.com."
  - "5 alt2.aspmx.l.google.com."
  - "10 alt3.aspmx.l.google.com."
  - "10 alt4.aspmx.l.google.com."

---
# ACME challenge (si Firebase/SSL lo creó así)
name: _acme-challenge.cetprosmp.edu.pe.
type: TXT
ttl: 300
rrdatas:
  - "\"REEMPLAZAR_TOKEN_ACME_REAL\""

---
# DMARC (si ya existe)
name: _dmarc.cetprosmp.edu.pe.
type: TXT
ttl: 300
rrdatas:
  - "\"v=DMARC1; p=none; rua=mailto:postmaster@cetprosmp.edu.pe\""

---
# DKIM (opción TXT directo; usa el selector real)
name: google._domainkey.cetprosmp.edu.pe.
type: TXT
ttl: 300
rrdatas:
  - "\"v=DKIM1; k=rsa; p=REEMPLAZAR_CLAVE_PUBLICA\""

---
# DKIM alternativa (si lo tienes como CNAME en vez de TXT)
name: google._domainkey.cetprosmp.edu.pe.
type: CNAME
ttl: 300
rrdatas:
  - "google._domainkey.tudominio-proveedor-dkim.com."

---
# CAA (si existe; recomendado mantener)
name: cetprosmp.edu.pe.
type: CAA
ttl: 300
rrdatas:
  - "0 issue \"pki.goog\""
  - "0 issuewild \"pki.goog\""

---
# www hacia apex (o al target actual real)
name: www.cetprosmp.edu.pe.
type: CNAME
ttl: 300
rrdatas:
  - "cetprosmp.edu.pe."

---
# Subdominios de servicios (ejemplos; reemplazar)
name: mail.cetprosmp.edu.pe.
type: CNAME
ttl: 300
rrdatas:
  - "ghs.googlehosted.com."

---
# SRV ejemplo (solo si existe en tu zona actual)
name: _sip._tls.cetprosmp.edu.pe.
type: SRV
ttl: 300
rrdatas:
  - "10 5 443 sipdir.online.lync.com."
Validación rápida antes de importar:

Debe haber solo un registro SPF (v=spf1 ...) en el apex.
No dejes simultáneamente DKIM TXT y CNAME para el mismo selector.
No incluyas NS/SOA del apex.
Compara contra export real: ningún subdominio debe quedar fuera.
Importación:

gcloud dns record-sets import .\zone-migracion-template.yaml --zone=cetprosmp-dns --project=PROYECTO_NUEVO
Si quieres, te ayudo a convertir tu export real en esta plantilla final, línea por línea, para que quede lista sin placeholders.