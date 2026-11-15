# Tendencias lineales y datos históricos sintéticos

## Problema y comportamiento

El gráfico compartido insertaba un nulo cada vez que dos registros distaban más de 90 segundos. Ese criterio, pensado para adquisiciones continuas, cortaba también las series diarias, semanales y mensuales y las convertía en puntos aislados. Además, una ventana fija de siete días no permitía comparar mediciones mensuales y cada inicio de escenario añadía otra instantánea periódica dentro del mismo día.

Por solicitud del usuario, las tendencias escalares unen observaciones mediante segmentos rectos, sin suavizado ni marcadores repetidos. Una línea es una conexión visual entre registros: no crea muestras intermedias, no cambia timestamps y no demuestra continuidad de adquisición. El ECG conserva las separaciones reales superiores a 8 ms; se mantiene la evidencia congelada y rotulada durante fallos.

Para registros periódicos se muestra la última observación real de cada intervalo de su catálogo. Los intervalos se cuentan hacia atrás desde el último registro; no se promedian valores ni se generan observaciones. Así los reinicios de un escenario no aparentan mediciones mensuales adquiridas cada pocos minutos. El último punto coincide con el último valor de la tarjeta. Todos los registros originales siguen disponibles en las respuestas de API y en el CSV del explorador.

Ventanas personales: última hora para adquisición continua/derivada; al menos siete días y hasta tres intervalos de catálogo para periódicas, con máximo de 90 días. Ejemplos: sueño siete días, biomarcadores semanales 21 días, densidad ósea 90 días. El usuario puede elegir el indicador de tendencia dentro de cada dominio corporal. El eje usa fechas en ventanas largas y horas en ventanas cortas.

El explorador integral permite 90 días y abre con ese contexto. NestJS mantiene el límite de 30 segundos para ECG y eleva a 90 días el máximo de históricos escalares. Las consultas continuas de más de una hora se agregan por promedio en ventanas adaptativas, con aproximadamente 1.200 intervalos por conjunto de tags. Esto evita el recorte de la parte más reciente al alcanzar el límite de puntos. Los registros periódicos no se promedian. Las marcas de los puntos agregados corresponden a las ventanas de Flux, no a una muestra cruda individual.

## Carga histórica de demostración

Modelo `aurora-periodic-history-v1`, código en `services/simulator/app/history_demo.py`. Generación determinista por dispositivo, anclada en observaciones sintéticas originales existentes. El modelo conserva unidades y cadencias del catálogo. Sueño total, inicio, fin y fases se generan juntos; hueso varía lentamente; no se inventa una EVA para el escenario de reposo. Estas relaciones son decisiones de una demostración ficticia, no un modelo fisiológico validado ni una evaluación de salud. No se generan ECG ni HRV retrospectivos.

`scripts/seed-trend-history.ps1` obtiene dispositivos, catálogo y anclas mediante NestJS, ejecuta el generador Python dentro del contenedor existente y envía lotes de hasta 300 registros al endpoint `POST /api/v1/simulator/history`. No accede directamente a las bases. El script espera readiness después de una actualización del backend.

El endpoint requiere ADMIN y `DEMO_MODE=true`. Reutiliza validación DTO y tamaño de payload; acepta exclusivamente métricas periódicas SIMULATED de tripulantes, unidad canónica, calidad GOOD, valores finitos dentro de sus rangos visuales de demostración y fechas entre uno y 90 días de antigüedad. Los rangos visuales no se convierten en umbrales clínicos. No amplía la ventana de 24 horas de la ingesta en vivo.

Los puntos se escriben en InfluxDB como SIMULATED con `algorithm_version=aurora-periodic-history-v1`. El perfil aparece en `algorithmVersion` de la API y como «Historial sintético» en el tooltip. La importación omite identidades métrica/timestamp ya existentes, conserva las observaciones originales y registra `DEMO_HISTORY_IMPORTED` con modelo y cantidad en auditoría. No actualiza `lastSeenAt` ni invoca reglas operativas. La selección de últimas lecturas agrupa por sujeto/métrica y elige el timestamp más reciente entre conjuntos de tags, para que el historial nunca reemplace una lectura posterior.

No se modifican migraciones ni se reinician volúmenes. Se conserva el simulador activo; únicamente se actualizan API y frontend.

## Ejecución y verificación

```powershell
./scripts/seed-trend-history.ps1
./scripts/verify-trend-history.ps1
node --test tests/chart-data.test.mjs tests/retained.test.mjs tests/session-refresh.test.mjs
docker run --rm --network none aegis-backend:0.1.0 npm test
node output/playwright/node_modules/@playwright/cli/playwright-cli.js -s=aurora-lines run-code --filename=tests/e2e/linear-trends.js
```

El último comando requiere una sesión de navegador abierta. El test Python se ejecuta con `history_demo.py` accesible en PYTHONPATH; no necesita NeuroKit2 ni genera señales de reemplazo. Resultados observados y limitaciones en `VALIDATION.md`.
