# Catálogo de eventos sintéticos de misión

Aurora carga siete eventos ficticios orientados a la operación cotidiana de una misión. Se crean con `apps/backend/prisma/seed-demo-events.cjs`, únicamente cuando `DEMO_MODE=true`, y usan claves estables para evitar duplicados.

| Ámbito | Tipo | Criticidad | Estado | Ejemplo |
|---|---|---|---|---|
| Actividad | `EXERCISE_REMINDER` | `INFO` | `OPEN` | Ventana programada de ejercicio para Elba |
| Estudio médico | `BLOOD_STUDY_DUE` | `REVIEW` | `ACKNOWLEDGED` | Estudio ficticio de sangre pendiente |
| Radiación | `HIGH_RADIATION_ALERT` | `RED` | `OPEN` | Umbral sintético alto del monitor externo |
| EVA | `SUIT_OXYGEN_LOW` | `RED` | `RESOLVED` | Simulación de oxígeno bajo en traje espacial |
| EVA | `EVA_CHECKLIST_DUE` | `YELLOW` | `ACKNOWLEDGED` | Lista previa a actividad extravehicular |
| Bienestar | `HYDRATION_REMINDER` | `INFO` | `RESOLVED` | Recordatorio operativo posterior al ejercicio |
| Descanso | `REST_WINDOW_REMINDER` | `INFO` | `OPEN` | Ventana planificada de descanso y relevo |

El cargador elimina los antiguos eventos `SIGNAL_LOST` de la demostración. La falta de datos continúa visible como estado de adquisición en las lecturas, pero ya no genera eventos en la bitácora del operador. Criticidad (`INFO`, `REVIEW`, `YELLOW`, `RED`) y flujo humano (`OPEN`, `ACKNOWLEDGED`, `RESOLVED`) siguen siendo conceptos separados.

El mismo cargador crea siete entradas cronológicas en la bitácora de Elba Quaife: planificación de jornada, ejercicio, preparación de muestras, chequeo de traje EVA, turno durante alerta de radiación, descanso y observación diaria. Son registros sintéticos e idempotentes identificados por `createdBy=demo-logbook-seed`.

Los valores, protocolos, horarios y notas son ficticios. Ningún evento es un diagnóstico, tratamiento o instrucción médica real.

## Reproducción

```bash
docker compose exec -T aegis-backend node prisma/seed-demo-events.cjs
```

La primera ejecución informa siete eventos y siete entradas de Elba; las siguientes actualizan los eventos y conservan la bitácora sin duplicarla.
