# Catálogo de eventos sintéticos

Aurora incluye seis eventos ficticios para recorrer la bitácora, la criticidad, la evidencia y el flujo de revisión humana. Se crean con `apps/backend/prisma/seed-demo-events.cjs`, únicamente cuando `DEMO_MODE=true`. Cada evento tiene una `dedupKey` estable; repetir el cargador no duplica registros.

## Ejemplos incluidos

| Ámbito | Tipo | Criticidad | Estado inicial | Propósito |
|---|---|---|---|---|
| Misión | `MISSION_REVIEW_NOTE` | `INFO` | `RESOLVED` | Mostrar un registro informativo revisado y cerrado |
| Adquisición | `SIGNAL_LOST` | `TECHNICAL` | `RESOLVED` | Explicar una brecha de sensor sin inferir salud |
| Hábitat | `ENVIRONMENT_CHANGE` | `YELLOW` | `ACKNOWLEDGED` | Mostrar evidencia ambiental y seguimiento pendiente |
| Fisiología | `BASELINE_DEVIATION` | `REVIEW` | `OPEN` | Solicitar verificación humana de una desviación ficticia |
| Operación | `OPERATIONAL_THRESHOLD` | `YELLOW` | `ACKNOWLEDGED` | Mostrar atención operacional sin emergencia |
| Operación | `OPERATIONAL_THRESHOLD` | `RED` | `OPEN` | Mostrar escalamiento crítico y revisión pendiente |

Criticidad y estado son conceptos distintos. `INFO`, `TECHNICAL`, `REVIEW`, `YELLOW` y `RED` describen la naturaleza o prioridad. `OPEN`, `ACKNOWLEDGED` y `RESOLVED` representan el flujo humano. Reconocer un evento no lo resuelve.

Cada ejemplo conserva fuente `SYNTHETIC_EVENT_CATALOG`, `demoOnly=true`, explicación, métrica o categoría cuando corresponde, timestamp y notas de revisión. Los eventos creados se auditan como `DEMO_EVENT_CREATED`.

## Límites

El catálogo escribe exclusivamente `HealthEvent` y auditoría. No fabrica telemetría, no activa `OperationalAlertState`, no cambia el escenario del simulador y no ejecuta reglas clínicas. Por eso el evento rojo permite explorar la bitácora, pero no aparece como una condición activa en visor/TV. Para observar el flujo operacional en vivo debe ejecutarse uno de los escenarios de demostración del simulador.

Todos los nombres, valores y notas son ficticios. Ningún evento es un diagnóstico, tratamiento, protocolo médico o indicación de emergencia real.

## Reproducción

```bash
docker compose exec -T aegis-backend node prisma/seed-demo-events.cjs
```

Resultado idempotente esperado después de la primera ejecución: `created=0`, `existing=6`.
