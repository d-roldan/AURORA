# Bitácora del astronauta

15/11/2026 · Ampliación solicitada de Rutina y registros.

## Uso

La sección permite registrar observaciones manuales del astronauta, actividad diaria e información que considere pertinente. Tiene título opcional, categoría, fecha/hora de observación en UTC y texto libre de 3 a 4.000 caracteres. Sueño (0–24 h) y fatiga (entero 0–10) son opcionales: dejarlos vacíos no crea ceros. La demo admite únicamente información ficticia.

Las entradas se ordenan por fecha de observación descendente, con paginación de 50. Cada una muestra también la fecha de guardado asignada por el servidor. El texto original, los saltos de línea y el idioma del autor se conservan; HTML se presenta como texto. Los textos de la interfaz utilizan el diccionario inglés/español y los colores del tema compartido.

CREW puede consultar y escribir únicamente sus registros. ADMIN y MEDICAL_OFFICER conservan el acceso autorizado existente; DEMO_VIEWER solo lee. Las entradas siguen permisos de misión y no son un diario privado.

## Contrato y persistencia

- `GET /api/v1/check-ins?subjectId=<uuid>&page=1`: sujeto obligatorio, página entera 1–1000, máximo 50 entradas; orden por observedAt, recordedAt e id descendentes.
- `POST /api/v1/check-ins`: crewMemberId, notes; opcionales title (hasta 120 caracteres), category, observedAt, sleepHours y fatigueScore. Categorías de protocolo: GENERAL, SLEEP, ACTIVITY, WELLBEING, NUTRITION, OTHER. No se traducen al enviarlas.
- observedAt acepta ISO 8601 UTC (Z o +00:00), sin fechas futuras. Si se omite, se asigna la hora del servidor. recordedAt y createdBy siempre los establece el servidor.
- NestJS valida DTO, texto no vacío, fecha real, permisos y existencia del sujeto. La entrada y su auditoría se escriben en una transacción PostgreSQL; la auditoría no duplica el texto libre. Se mantiene el límite global de cuerpo de 1 MiB.
- Migración Prisma `202611150001_crew_logbook`: agrega título, categoría y fecha de observación; para entradas existentes copia recordedAt a observedAt. No borra datos ni modifica volúmenes.

Los números opcionales son atributos de la observación humana, como en el check-in anterior. No se insertan en InfluxDB, no reemplazan sensores ni alimentan reglas automáticas. No se incorporan series temporales a PostgreSQL.

## Fallos y límites

El guardado se confirma después de la respuesta del servidor. Si falla el envío, el borrador permanece en el formulario y se informa que no se confirmó el guardado. Un fallo de actualización conserva las entradas ya cargadas en memoria con aviso de posible desactualización y botón de reintento. No se presenta un error inicial como historial vacío.

El borrador no se persiste: cambiar de sección, cerrar o recargar puede perder texto sin guardar. La bitácora no se incorpora al caché persistente de telemetría ni implementa envío offline. La recarga vuelve a la sesión demo de lectura según el comportamiento existente de autenticación; se debe iniciar sesión para agregar entradas. No hay edición, eliminación ni adjuntos. Un fallo de conexión después de que el servidor haya confirmado internamente la transacción puede dejar el resultado incierto; no se implementa deduplicación por clave de envío en este cambio.

## PDCA

Plan: reemplazar el formulario obligatorio de sueño/fatiga por una bitácora manual, reutilizando permisos, check-ins y auditoría existentes. Implementación: formulario, historial y ampliación compatible del contrato y modelo. Verificación: API real, pruebas de navegador y builds descritos en VALIDATION.md. Kaizen: separar hora de observación y hora de guardado; mantener el borrador cuando falla el envío y hacer visible la degradación del historial.
