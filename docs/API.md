# Contratos API · V0.1.0

Swagger local: `/api/docs`; JSON `/api/docs-json`. Prefijo `/api/v1`. JSON UTC. Error `{code,message,requestId}`; errores internos sin stack ni secretos. Cuerpos DTO rechazan propiedades extra. JWT Bearer para lectores/operadores; `x-service-key` exclusivamente ingesta y comunicación Python.

| Rutas | Acceso / comportamiento |
|---|---|
| POST auth/demo, auth/login; GET auth/me | Login local, demo read-only, rol desde DB |
| GET/POST missions | Listar lectores de misión / crear ADMIN |
| GET missions/:id/overview | Lectores misión, datos Influx y eventos DB |
| GET/POST crew; PATCH crew/:id | Listar propio para CREW / altas y edición ADMIN |
| GET crew/:id/overview, crew/:id/baseline | Roles lectura, CREW solo propio |
| GET devices | Roles misión |
| POST telemetry/ingest, telemetry/waveforms | Solo servicio, confirmación de escritura requerida |
| GET telemetry/latest?subjectId | Lectura con frescura, CREW sujeto propio |
| GET telemetry/catalog?subjectId | 38 métricas, categorías, unidades, cadencias, origen y últimas lecturas; hábitat contextual compartido |
| GET telemetry/history?subjectId&metric&from&to | Máximo 90d, 10000 puntos; agregación adaptativa para continuas |
| GET telemetry/waveforms?subjectId&from&to | Máximo 30s |
| POST analytics/ecg?subjectId | ADMIN/MEDICAL, ventana persistida |
| POST analytics/hrv?subjectId | ADMIN/MEDICAL, ventana ECG persistida de 5min, RMSSD/SDNN reales o calidad insuficiente |
| GET events?subjectId&status&page | 50 por página, hasta página 1000; CREW propio |
| POST events/:id/acknowledge, /resolve | ADMIN/MEDICAL, note 3–1000 chars, transición atómica auditada |
| GET/POST check-ins | Lectura / ADMIN, MEDICAL o CREW propio; notas, sueño 0–24h, fatiga 0–10 |
| GET simulator/status | Lectores misión |
| POST simulator/start, simulator/stop | ADMIN, escenario permitido y seed positivo, confirmación servicio |
| GET audit | ADMIN, últimos 100 |
| GET system/live | Público, sin detalle de dependencias |
| GET system/health | Roles misión, estado real de dependencias |

Sin DELETE deliberadamente. No gestión de usuarios ni configuración de sensores/baselines por UI. CREW no ve resumen de misión, dispositivos ni otras personas. DEMO_VIEWER no modifica eventos, simulación ni check-ins.

## Operational focus
GET /api/v1/crew/:id/operational-view?environment=TRANSIT|STATION|ROVER|SURFACE devuelve cinco slots, radiation, alerts, level y guidance. CREW solo puede consultar su propio perfil. Lectura sin mutación de entorno. Toda la comunicación pasa por NestJS. Ver OPERATIONAL_MODES.md.


La vista operacional mantiene value:null ante caducidad/baja calidad y lastValue con la evidencia registrada. El frontend muestra lastValue rotulado como último registro; no modifica disponibilidad ni evaluación del backend. Ver UI_CONTINUITY.md.


## Bitácora · ampliación 15/11/2026

GET/POST /check-ins mantiene la ruta y amplía el contrato con título, categoría y fecha de observación UTC. GET requiere subjectId UUID y acepta page (1–1000), 50 entradas por página. POST conserva notas obligatorias, hasta 4.000 caracteres; sueño/fatiga opcionales. Las fechas futuras se rechazan; la creación y el actor pertenecen al servidor. Ver [LOGBOOK.md](LOGBOOK.md).
# Historial sintético y tendencias · actualización 15/11/2026

`GET /api/v1/telemetry/history`: rango máximo de 90 días; adquisición continua en períodos largos usa promedios de ventanas adaptativas. Los registros periódicos conservan valores/timestamps originales. ECG sigue limitado a 30 segundos. Autorización por sujeto y hábitat sin cambios.

`POST /api/v1/simulator/history`: importación explícita ADMIN, solo con DEMO_MODE, mediante IngestDto (máximo 1.000 muestras y límite global de payload). Solo métricas periódicas SIMULATED, unidades canónicas, calidad GOOD, valores dentro de rangos visuales demo y fechas entre uno y 90 días de antigüedad. Omite registros existentes y devuelve accepted, skipped, batchId y model. No actualiza adquisición ni evalúa alertas. Perfil histórico en algorithmVersion y auditoría. Detalle en LINEAR_TRENDS.md.

