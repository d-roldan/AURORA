# Validación técnica observada · V0.1.0

Fecha: 14/11/2026, entorno Windows / Docker Desktop Linux. No validación médica. Resultados de ejecuciones reales; no mocks del frontend ni servicios ficticios. Aplicación en `http://localhost:8085`, Swagger en `/api/docs`, Configuración en `/settings`.

## Infraestructura

`docker compose config --quiet` y `docker compose up -d --build` ejecutados correctamente. Siete servicios persistentes saludables: PostgreSQL, InfluxDB, backend, analytics, simulator, frontend y Nginx. `aegis-migrate` termina con código 0; tres migraciones versionadas y seed idempotente. Único puerto publicado: `127.0.0.1:8085`. No se modificaron servicios de otros proyectos. Herramientas de pruebas efímeras separadas del Compose de producto.

Corrección arquitectónica aplicada: no contenedor, volumen, configuraciones ni ruta de Grafana; autorización antigua revocada. Toda visualización nativa React/ECharts, sin iframes. Frontend → API central → servicios internos. La red `aegis_default` es interna; solo Nginx tiene además red de ingreso para publicar loopback. Petición HTTPS saliente desde backend falló como se esperaba, mientras API, ingesta y gráficos continuaron. No se desconectó Internet global del equipo: el aislamiento comprobado es de los servicios de aplicación/datos.

## Pruebas ejecutadas

| Comprobación | Resultado observado |
|---|---|
| Build TypeScript frontend/backend | Correcto; Vite genera SPA y recursos locales |
| Reglas (`npm test`, Node test runner) | 2 pruebas aprobadas: 30s reales, un episodio, fuera de orden, recuperación, brechas/calidad inválida |
| Analytics (`python -m pytest -q -p no:cacheprovider`) | 5 aprobadas: señal NeuroKit2 a 62 bpm con HR recuperada 58–66, autenticación/ventana inválida, señal plana devuelve HR null, HRV real sobre 5min, rechazo de HRV con ventana corta |
| API (`scripts/smoke.ps1`) | 13 comprobaciones aprobadas: cuatro perfiles; dependencias UP; 17 escalares; ECG persistido; HR derivada; SpO₂ histórica; 401/403; unidad inválida; valor no numérico; >1000 muestras; CREW sin acceso ajeno; DTO Swagger documentado |
| Flujo de escenarios (`scripts/functional.ps1`) | Desviación persistente con evidencia de 30s, un evento por episodio, reconocimiento/resolución con notas y auditoría, pérdida de sensor, CO₂ ambiental y reintento con un único punto Influx |
| Gestión (`scripts/management.ps1`) | Creación de misión y perfil por API autenticada, lectura posterior; registros temporales QA eliminados de forma acotada, auditoría conservada |
| Persistencia (`scripts/persistence.ps1`) | Tras `docker compose restart`, mismas 73 lecturas del intervalo fijo, baselines sin cambios y los dos eventos existentes conservados; todas las dependencias recuperadas |
| Recreación completa | `compose down` sin borrar volúmenes + nuevo `up`: históricos, eventos, check-in y cuatro perfiles conservados |
| Servicio degradado | Analytics detenido: API reportó DEGRADED/analytics DOWN y mantuvo 17 indicadores frescos; analytics reiniciado y recuperado |
| Auditoría de paquetes Node | 0 vulnerabilidades conocidas en locks al generar las versiones finales; backend runtime audit también 0 |
| Catálogo integral (`scripts/metrics.ps1`) | Cuatro sujetos × 38 métricas disponibles en 11 categorías; 17 periódicas, ECG real >1000 puntos por sujeto y HRV NeuroKit2 GOOD sobre 300s con algoritmo/procedencia DERIVED |

Se usó el test runner nativo de Node para la regla pura en lugar de añadir Jest: decisión de reducir dependencia de desarrollo, con prueba funcional adicional sobre el motor desplegado. Esto no implica cobertura exhaustiva ni análisis de seguridad de imágenes del sistema operativo.

## Frontend real con Playwright CLI

Chromium en contenedor de pruebas conectado a la red local; interfaz servida por el mismo Nginx. Navegación Mission Control, Crew/detail, Telemetry, Events, Simulator, System y Settings. Se comprobó:

- Cuatro perfiles ficticios, lecturas cambiantes, ECG crudo desde Influx y HR derivada real de NeuroKit2.
- Inicio de escenario HR desde UI, creación de evento real, reconocimiento y resolución desde formularios.
- Pérdida de fuente: `DATA UNAVAILABLE`, tres de cuatro fuentes activas, ECG vacío y evento técnico; nunca falsa conclusión de salud.
- Superposición HR/SpO₂, comparación de dos sujetos, rango relativo y personalizado, baseline/umbral y anotaciones; interacción de rueda/arrastre sobre Canvas ejecutada sin error. No se ha medido precisión visual de cada nivel de zoom.
- CSV descargado y leído: 1328 filas en la captura, tres series (HR de Alex, SpO₂ de Alex, HR de Maya), origen SIMULATED; no números fabricados para exportación.
- Check-in enviado desde UI (7,5h de sueño, fatiga 2/10, observación sintética), recuperado por API; guardado de perfil y auditoría.
- Vista desktop 1440×1100 y móvil 390×844 inspeccionadas visualmente. No auditoría WCAG completa.
- Preferencias (`tests/e2e/preferences.js`): 10 comprobaciones aprobadas. Settings inmediatamente debajo de System; en/dark, en/light, es/dark, es/light; gráficos nativos en cada combinación; español/claro persisten tras recargar. `lang` y título de documento cambian, horas UTC 24h y números locales. Notas/evidencia original preservadas.
- Filtro de eventos español envía `OPEN` al API y muestra ABIERTO; no traduce valores de protocolo. Consola de la sesión final: 0 errores y 0 advertencias.
- Ampliación integral: 7 comprobaciones Playwright aprobadas de 38 casillas independientes, todas seleccionadas inicialmente, selección/deselección masiva e individual y ejes originales. Click real en la leyenda Canvas deseleccionó una serie (37 casillas activas), luego se restauraron 38. CSV descargado/parseado: 21290 filas, 38 métricas, 11 categorías, 170 puntos DERIVED; valores originales y unidades preservados.
- HRV extremo a extremo, cuatro sujetos: ventanas persistidas de 75000 muestras, 300s, calidad GOOD; RMSSD/SDNN no nulos. No se inyectaron features ficticios para aprobar la prueba. Settings también verificado con usuario CREW y en viewport móvil.

Artefactos locales reproducibles en `output/validation/` y capturas/CSV en `output/playwright/` (excluidos de control de versiones). Scripts de pruebas funcionales permanecen en `scripts/` y snippets CLI en `tests/e2e/`.

## Correcciones y límites

Se corrigieron descargas Docker interrumpidas, versiones Node con advisories detectados por audit, errores de inicialización de ejes vacíos ECharts, representación numérica nullable, validación de métricas con dígitos (`spo2`), resolución DNS Nginx al recrear upstreams y valores de filtros traducidos. Las interrupciones voluntarias durante redespliegue produjeron errores HTTP transitorios en sesiones antiguas; la sesión limpia final no los presenta.

Advertencias no críticas: 16 deprecaciones en dependencias Python; aviso Vite de tamaño del bundle. No pruebas clínicas, certificación, sensores reales, fuentes NASA importadas, validación clínica de HRV, backups/restauración, carga masiva, retención a largo plazo ni seguridad de imágenes OS. Una instancia de API/simulador; continuidad de reglas en memoria se reinicia conservadoramente; batchId reutilizado con contenido diferente no se detecta. ECG/HRV automáticos para cuatro sujetos; segmentos independientes de 600s y transiciones no modelan fisiología espacial. EVA actual inactiva (0); no escenario EVA activo. Administración avanzada, LOW_QUALITY persistente y selección de misión activa pendientes, detallados en ROADMAP.md.

## Validación de modos operativos · 14/11/2026

Despliegue real con `docker compose up -d --build`; migración 004 aplicada sin reinicializar volúmenes. Siete servicios en ejecución y saludables; migrate completado con código 0. Único acceso publicado en localhost:8085.

- 6 pruebas Node y 5 pruebas Python aprobadas. Python conserva avisos de dependencias y de caché pytest sin permiso; no afectan los resultados.
- `scripts/operational.ps1`: 23 comprobaciones aprobadas. Cuatro perfiles de entorno, cinco espacios, universales fijos/radiación, amarillo sin reemplazo, rojo secundario, escalado con el mismo evento, reconocimiento independiente, persistencia tras reiniciar API, caducidad con enclavamiento y valor N/A, recuperación sin resolver revisión, señal solar sintética, reintentos sin duplicación, lectura inválida interrumpe recuperación y autorización CREW.
- Playwright CLI: 15 comprobaciones de foco aprobadas, incluida Fullscreen API real, fondo inerte, cuatro zonas, salida, alternativa ante rechazo del navegador, Escape y móvil sin desbordamiento horizontal. Capturas desktop/mobile en output/playwright.
- Playwright con escenarios reales de API/Influx: amarillo mantiene cinco espacios y cero reemplazos; rojo mantiene cinco y reemplaza el espacio 5 con cuatro pasos de verificación humana. Tiempos de observación avanzan en ambas vistas; contenido de tarjetas sin desbordamiento. Capturas operational-yellow-final.png y operational-red-final.png.
- Regresión de preferencias: 10 comprobaciones EN/ES y oscuro/claro aprobadas. Captura adicional de la vista operativa en español/modo claro.
- Regresión del gráfico: 7 comprobaciones aprobadas con 60 métricas seleccionables, escala, deselección y CSV. Catálogos de los cuatro astronautas leídos desde API: 60/60 métricas con datos persistidos, 11 categorías (operational-catalog.json).
- Smoke: 13 comprobaciones aprobadas, incluyendo dependencias, Influx, ECG, feature NeuroKit2, Swagger y permisos/validación. Consola limpia de navegador final: cero errores y advertencias. Reinicios intencionales anteriores sí produjeron errores HTTP transitorios; no se contabilizan como una sesión limpia.

Evidencia: output/validation/operational.json, operational-catalog.json y smoke.json; output/playwright/operational-e2e.log, operational-YELLOW-e2e.log, operational-RED-e2e.log y capturas. Se corrigieron bloqueo PostgreSQL con retorno void, una carrera de prueba con recuperación legítima y autostart que podía reactivar una detención manual durante el arranque.

Límites: 13 reglas de demostración, no cobertura clínica de todas las métricas. Señal solar, datos oculares, sueño, psicología y rover sintéticos; sin fuente externa ni protocolos clínicos. HRV no se inventa tras cambiar escenarios: permanece N/A hasta disponer de cinco minutos ECG contiguos. El estado operativo nuevo persiste en PostgreSQL; la limitación previa de continuidad en memoria corresponde a la regla basal antigua. El modo seleccionado solo cambia la presentación. Revisiones de eventos siguen pendientes hasta acción humana.

## Corrección de continuidad visual · 14/11/2026

Solicitud: conservar información visible ante cortes y reinicios. Influx ya persistía muestras; la UI ocultaba datos antiguos, el ECG perdía la ventana móvil y la caché desaparecía al recargar. Se conservaron últimas evidencias con fecha/frescura, se agregó copia autorizada de vistas en IndexedDB y se preparan segmentos ECG en segundo plano. Detalle y límites: UI_CONTINUITY.md.

Resultados observados en el despliegue Docker real:

- Frontend/backend compilados y `docker compose up -d --build` ejecutado. Siete servicios saludables, migración idempotente terminada con código 0. Sin reinicializar volúmenes.
- 6 pruebas Node nuevas aprobadas (Node 22.20): conservación de nulos/cero/últimos valores, frescura de caché basada en timestamps, ECG retenido sin modificar fechas, fallo de consulta como error, renovación compartida del visitante demo y vencimiento de operador sin cambiar su rol. 6 pruebas previas del backend aprobadas.
- 1 prueba Python nueva aprobada: productor recorrido durante 620 segundos de reloj simulado con preparación deliberadamente pendiente. Lotes escalares cada dos segundos sin brecha, preparación desde minuto ocho y cambio de segmento en segundo 600. Usa generación/control HTTP sustituidos para probar planificación; no se presenta como ensayo real de diez minutos de NeuroKit2. Log continuity-simulator-unit.log.
- `scripts/continuity.ps1`: 15 comprobaciones de navegador aprobadas con lecturas del simulador real/API/Influx. Detención real de productor: SpO₂ y los doce indicadores del dashboard conservados, etiquetas de último registro, ECG congelado, fecha original y recarga. Detención/arranque real de API: cinco espacios y números conservados. GET bloqueados en navegador tras autenticación real: restauración desde IndexedDB, caducidad correcta y ausencia de tokens en la copia. Recuperación de emisión: retorno automático a mediciones frescas. Evidencia en output/validation/continuity.json.
- Prueba ampliada del caché/histórico: cinco comprobaciones aprobadas, incluidos más de 1000 puntos históricos restaurados sin lecturas de red y CSV con displayState=RETAINED y columnas de observación originales. Recuperación posterior aprobada. Artefactos continuity-cache-export.log, continuity-cache-export-recovery.log y retained-export.csv.
- 5 comprobaciones adicionales aprobadas: español/modo claro, acceso a login al vencer sesión dentro de fullscreen, fondo liberado y aplicación funcional con almacenamiento del navegador bloqueado (con aviso explícito).
- Regresiones aprobadas: 15 de navegación/fullscreen/móvil, 10 de temas/idiomas, 7 de selección/escala/CSV con 60 métricas y 13 smoke de API, Influx, ECG/features, contratos y permisos. Los fallos HTTP durante la interrupción controlada son esperados y se conservan en logs de prueba; sesión limpia final comprobada por separado.

Capturas: continuity-focus-stale.png, continuity-dashboard-stale.png, continuity-api-down.png, continuity-cached-reload.png, continuity-recovered.png y continuity-spanish-light.png en output/playwright. Logs de build/pruebas en output/logs. La primera prueba nueva del simulador se invocó con una ruta sin montar y no ejecutó pruebas; se corrigió copiando el archivo a /tmp en el contenedor de AEGIS, donde pasó.

No se garantiza telemetría nueva durante un fallo ni se fabrican puntos. El archivo continúa en Influx; IndexedDB es una copia limitada de vistas, no backup. Una recarga con API totalmente apagada espera autenticación antes de restaurar la copia de esa identidad; la página ya abierta mantiene la vista durante el corte. No se almacenan credenciales ni se alimentan reglas desde el caché.

Cierre de continuidad: sesión nueva sin fallos inducidos, consola con cero errores/advertencias. Estado final registrado en output/validation/continuity-final-state.json: dependencias UP, productor NORMAL/RUNNING y cuatro flujos de frecuencia cardíaca frescos. La copia CSV retenida incluye displayState y los tiempos originales. No se borraron volúmenes ni se modificaron servicios ajenos.

# Validación de la adaptación AURORA · 15/11/2026

- `docker compose build aegis-frontend`: TypeScript y build Vite aprobados. Advertencia de bundle JavaScript superior a 500 kB; queda pendiente dividir cargas del explorador/gráficos. No se agregaron dependencias, CDN ni fuentes remotas.
- `docker compose up -d --no-deps aegis-frontend`: se actualizó solo el contenedor de frontend. API, PostgreSQL, InfluxDB, analytics, simulador y Nginx permanecieron activos. Comprobación posterior: los siete contenedores saludables.
- `node --test tests/retained.test.mjs tests/session-refresh.test.mjs`: 6/6 pruebas aprobadas de continuidad, ceros/nulos, timestamps y renovación de sesión.
- `./scripts/validate-aurora.ps1`: perfil CREW limitado a su identidad; otro perfil devuelve 403; check-in sintético persistido sin alterar su nota; estado de PostgreSQL, InfluxDB, analytics y simulador `UP`. Se creó un registro identificado como validación sintética. El script reutiliza ese registro en ejecuciones posteriores.
- `node output/playwright/node_modules/@playwright/cli/playwright-cli.js -s=aurora-ui run-code --filename=tests/e2e/aurora-workspace.js`: 19 comprobaciones aprobadas en Edge. Incluyen marca, siete indicadores universales/radiación, mapa por teclado, métricas del catálogo, ausencia de formulario de escritura para viewer, nota de API visible, temporizador, histórico con muestras almacenadas, retención durante fallo de GET, timestamp conservado al cambiar de sección, reconexión, dos perfiles distintos, español/modo oscuro persistentes, móvil sin desbordamiento y sin excepciones JavaScript.

El fallo de red se indujo exclusivamente en el navegador mediante bloqueo temporal de GET; no se detuvieron servicios ni se modificó el escenario del productor. Los errores de red esperados de ese bloqueo no se presentan como fallos nuevos del backend. No se verificó en este incremento una nueva activación de alertas operativas; se conservaron sus contratos y reglas.

QA visual: capturas de inicio y cuerpo en escritorio 1600×1100, y español/oscuro a 390×844. Se corrigió una superposición de las etiquetas de la barra lateral móvil y se añadió una comprobación de sus límites. El selector de idioma usa el rol accesible `radio`; el test se corrigió para respetarlo. La comprobación de infraestructura usa viewer porque el backend rechaza correctamente ese endpoint para CREW.

Evidencia local ignorada por control de versiones: `output/validation/aurora-api.json`, `output/validation/aurora-workspace.log`, `output/playwright/aurora-personal-home.png`, `aurora-personal-body.png` y `aurora-mobile-es-dark.png` en ese mismo directorio de capturas.

Límites: no se implementaron ni validaron chat IA, voz, juegos clínicos, agenda de misión o diario privado. El formulario de check-in conserva el manejador existente; se verificó la escritura por API y su lectura en UI, sin simular un envío mediante el formulario autenticado. La prueba de cambio de perfil no sustituye una auditoría completa de seguridad; el aislamiento CREW sí se comprobó contra la API real. No es validación médica ni científica.

## Presentaciones operativas por dispositivo · 15/11/2026

Cambio acotado ADR-006: visor personal, TV de estación y acceso explícito al monitor detallado. Compilación de producción ejecutada con `docker compose up -d --build --no-deps aegis-frontend`: TypeScript y Vite correctos. Se mantiene el aviso de bundle superior a 500 kB; no es un fallo de compilación. `docker compose ps`: los siete servicios de ejecución saludables. Solo se reconstruyó/recreó frontend; no se reiniciaron bases ni se borraron volúmenes.

Node 22 local: `node --test tests/retained.test.mjs tests/session-refresh.test.mjs`: **6/6 aprobadas**. Playwright CLI 0.1.24 con Edge local, stack real servido por Nginx en localhost:8085. `scripts/device-displays.ps1`: fases finales **normal, yellow, red, offline aprobadas**. Logs en output/playwright/device-{normal,yellow,red,offline}.log.

Observaciones verificadas:

- TV a 1920×1080: cuatro perfiles autorizados, radiación por persona y cinco canales de cabina; sin desplazamiento vertical ni horizontal en la vista normal.
- Escenario YELLOW_ALERT_DEMO dirigido a CREW-02: emergente automático de Elba Quaife mientras la TV se abrió desde CREW-01. Valores recibidos del simulador, NestJS e Influx; no fixtures visuales.
- Visor CREW-02 a 390×844: tarjeta amarilla y escalado real a rojo mediante RED_ALERT_DEMO, sin desbordamiento horizontal; cuatro pasos de revisión humana proporcionados por NestJS.
- Idioma cambiado desde el propio visor: guía española visible y retorno a inglés mediante el control accesible.
- Interrupción de GET operational-view en el navegador: aviso de conexión, condición roja conservada, lectura rotulada como retenida y timestamp original inalterado a través de nuevos intentos. El bloqueo se retiró al finalizar; servicios permanecieron activos.
- Se restauró NORMAL al finalizar el script. Los escenarios produjeron eventos sintéticos persistidos; no se borraron ni resolvieron automáticamente.

La primera inspección encontró TV con desplazamiento; se corrigió la distribución. La primera prueba móvil detectó una tarjeta superpuesta sobre preferencias; se corrigió la contracción flex y el orden de lectura. Se corrigieron también selectores de prueba para usar el nombre accesible del idioma y acotar avisos al diálogo. El recorrido completo se repitió y aprobó después de las correcciones.

Capturas inspeccionadas: output/playwright/station-tv.png y output/playwright/visor-red-mobile.png. También se generan station-tv-yellow.png y visor-yellow-mobile.png. El visor admite desplazamiento vertical para conservar legibilidad, evidencia universal y radiación.

Límites: no se probó hardware de visor ni TV física, no hay ubicación ni asignación EVA disponible, y CREW conserva el alcance propio autorizado por el backend. No se validaron protocolos clínicos; la guía es verificación y aviso humano. La cobertura sigue limitada a las reglas demostrativas existentes de NestJS. No se ejecutó de nuevo toda la suite histórica de escenarios/reinicio; los tests de cinco espacios se adaptaron para seleccionar Detailed monitor y no se declaran ejecutados en esta validación.

## Bitácora · validación 15/11/2026

Se ejecutaron builds de producción de frontend y backend mediante Docker Compose. TypeScript y Vite completaron correctamente; persiste el aviso de tamaño del bundle frontend (>500 kB). Se aplicó prisma migrate deploy: migración aditiva 202611150001_crew_logbook completada sin reset de volúmenes. Se conservan las entradas de check-in anteriores.

`scripts/validate-logbook.ps1`: siete grupos aprobados contra NestJS/PostgreSQL reales: texto libre multilínea sin valores numéricos obligatorios; fechas de observación/creación diferenciadas; lectura persistida; aislamiento CREW y rechazo de escritura al viewer; rechazo de espacios, tamaños excesivos, categoría/fecha inválida, futuro, offset no UTC, valores fuera de rango y campos suplantados; payload anterior y ceros; validación de página. Evidencia: output/validation/logbook-api.json. Un primer intento del script comparó fechas usando DateTime local; se corrigió la prueba a DateTimeOffset y el recorrido completo aprobó.

`tests/e2e/logbook.js`, ejecutado con Playwright CLI local y Edge headless: 15 comprobaciones aprobadas. Incluyen guardado sin sueño/fatiga; borrador conservado tras abortar el POST; texto original y HTML mostrado como texto; valores ausentes sin ceros; limpieza solo al confirmar; siete indicadores universales/radiación; persistencia al navegar y recargar; retención del historial con aviso tras abortar GET y recuperación con Retry; idioma español; formulario móvil a 390×844 sin desbordamiento horizontal; viewer sin formulario; sin excepciones JavaScript. Los bloqueos afectaron exclusivamente el navegador de prueba. Se crearon entradas de validación explícitamente sintéticas y no se borraron registros.

Se inspeccionaron visualmente output/playwright/logbook-desktop-en-light.png y logbook-mobile-es-dark.png. Evidencia completa del recorrido: output/playwright/logbook-browser.log. Se corrigieron selectores y la navegación del test al comprobar que una recarga restablece la sesión demo de lectura. El recorrido completo se repitió y aprobó. npm test backend: seis pruebas existentes aprobadas, sin cambios en reglas operativas.

Límites: no se ejecutó toda la suite histórica ni escenarios destructivos de caída de bases; no se comprobó navegación con más de 50 entradas. No hay carga offline, borrador persistente, adjuntos, edición ni deduplicación de envíos inciertos. Ver LOGBOOK.md. La bitácora no alimenta alertas ni series de sensores.

También se ejecutaron `node --test tests/retained.test.mjs tests/session-refresh.test.mjs`: seis pruebas aprobadas de continuidad y renovación de sesión. La reconstrucción final tras ajustar la fecha del resumen de Inicio y los valores opcionales nulos completó correctamente.
## Tendencias lineales e historial de demo · 15/11/2026

Resultado observado: 7.244 registros periódicos SIMULATED importados para cuatro astronautas en 28 lotes mediante NestJS, modelo `aurora-periodic-history-v1`. Se conservó el simulador en ejecución y no se borraron ni reiniciaron volúmenes. Se actualizaron backend y frontend mediante Compose `--no-deps`.

- Builds de TypeScript/NestJS y React/Vite aprobados. Persiste la advertencia conocida de bundle frontend mayor de 500 kB.
- `node --test tests/chart-data.test.mjs tests/retained.test.mjs tests/session-refresh.test.mjs`: 10 pruebas aprobadas. Líneas cronológicas sin muestras inventadas; huecos de ECG conservados; ventanas por cadencia; selección de la última instantánea por intervalo; retención y renovación de sesión.
- `docker run --rm --network none aegis-backend:0.1.0 npm test`: 10 pruebas aprobadas. Incluye selección de última lectura entre tags, agregación acotada, importación demo-only, validación previa a escritura, conservación de originales, deduplicación y reglas operativas existentes.
- Python: `history_demo.py` y `test_history_demo.py` copiados a `/tmp` del simulador; `docker compose exec -T -e PYTHONPATH=/tmp aegis-simulator python -m pytest -q -p no:cacheprovider /tmp/test_history_demo.py`: 2 pruebas aprobadas. Generación determinista, relaciones aritméticas de sueño, variación ósea acotada de demo, cadencia mensual y ausencia de features derivadas inventadas.
- `scripts/verify-trend-history.ps1`: seis comprobaciones agrupadas aprobadas contra API real. Reimportar el primer lote acepta cero puntos; viewer obtiene 403; fecha reciente de fixture obtiene 400; existen registros diarios/semanales/mensuales para las cuatro personas; cadencias históricas correctas; fecha y valor finales del gráfico coinciden con el catálogo en 16 series (sueño, densidad ósea, P1NP y reacción por astronauta).
- Playwright CLI local/Edge, `tests/e2e/linear-trends.js`: 11 comprobaciones aprobadas. Incluyen sueño, selección de métrica ósea, ventana mensual de 90 días, procedencia, coincidencia con tarjeta, ventana semanal de 21 días, explorer de 90 días, selección de una serie, conservación de puntos al bloquear GET y móvil sin desbordamiento. Capturas de sueño/hueso revisadas visualmente; se ajustaron resolución decimal y márgenes de ejes para evitar etiquetas repetidas y gráficos estrechos.

Evidencias locales: `output/validation/history-import.json`, `history-verification.json`, `linear-trends-browser.log`; capturas `output/playwright/linear-sleep.png`, `linear-bone.png`, `linear-history-bone.png`, `linear-sleep-mobile.png`. Los errores de red de la prueba son provocados únicamente en el navegador; no se detuvieron fuentes para ese caso. Comprobación final: los siete servicios saludables.

Correcciones del proceso de verificación: se agregó readiness al cargador después de observar 502 durante el reinicio del API; se corrigió la normalización de arrays/fechas de Invoke-RestMethod en el verificador; el test de selección usa el control observado y una consulta autenticada explícita, tras un timeout del selector exacto/espera de respuesta inicial. Los recorridos corregidos aprobaron. Los primeros intentos fallidos no se contabilizan como pruebas aprobadas.

Límites: las líneas escalares conectan registros, no prueban continuidad de adquisición. El ECG conserva pérdidas reales. Los datos retrospectivos son ficticios y no validan fisiología ni salud. Los promedios de ventanas largas no son muestras crudas. La verificación API abarca 16 series, no una auditoría manual de todos los puntos; las otras series periódicas fueron generadas por el mismo modelo y validación. Reglas/alertas se probaron mediante la suite existente, sin activar un escenario adicional de emergencia durante este incremento. Diseño y reproducción en LINEAR_TRENDS.md.


## Retratos y barra lateral · 15/11/2026

Build de producción de frontend mediante `docker compose build aegis-frontend`: TypeScript y Vite completaron correctamente. Continúa el aviso previo del bundle JS mayor a 500 kB. Se actualizó únicamente el frontend local y se recargó Nginx; no se cambiaron API, volúmenes, reglas o base de datos.

`tests/e2e/crew-navigation.js`, mediante Playwright CLI y Edge headless: 19 comprobaciones aprobadas. Los cuatro retratos cargan, cada UUID tiene una imagen distinta, el encabezado del perfil conserva la imagen correcta y un fallo de imagen muestra icono/iniciales sin perder el nombre. La barra lateral se despliega en escritorio, responde a Enter, libera espacio al contraerse y conserva la preferencia tras recargar. Los siete enlaces mantienen nombre accesible y título en modo compacto. En móvil se despliega a 224 px con cierre exterior, se contrae al elegir destino y mantiene Configuración accesible. Se verificaron traducción española, tema oscuro, ausencia de desbordamiento horizontal a 390×844 y ausencia de excepciones JavaScript.

El primer recorrido detectó que ubicar los recursos en public/crew hacía que Nginx tratara /crew como directorio y redirigiera al puerto interno 8080. Se corrigió moviéndolos a public/images/crew; el recorrido completo posterior aprobó. Evidencia: output/playwright/crew-navigation.log. Capturas inspeccionadas: crew-portraits-expanded.png, crew-profile-collapsed.png, sidebar-mobile-expanded.png y crew-mobile-es-dark.png en output/playwright. Las pruebas de fallo de imagen bloquearon exclusivamente el navegador auxiliar; se retiraron los bloqueos y se conservaron todos los datos.

Límites: retratos generados de personas ficticias, no de astronautas reales; no hay edición/carga de fotos. Perfiles nuevos muestran iniciales hasta tener una asociación explícita. Los PNG originales locales suman aproximadamente 9,3 MB; no se añadieron servicios ni dependencias de imágenes. No se ejecutaron nuevamente los escenarios de telemetría o caída de bases porque este cambio solo afecta presentación y preferencia de navegación.
# Acceso LAN por Nginx · 15/11/2026

- `docker compose config --quiet`: correcto. Recreado únicamente `aegis-nginx` con `docker compose up -d --no-deps aegis-nginx`; estado observado `running healthy`, publicación `0.0.0.0:8085->8080/tcp`.
- HTTP desde este equipo: `/api/v1/system/live` respondió 200 por loopback, Ethernet `10.75.36.96` y Wi-Fi `10.120.97.249`; `/api/docs` y `/` respondieron 200 por Ethernet.
- Crear la regla Windows Firewall TCP 8085 con origen `LocalSubnet` falló con `Acceso denegado`; requiere PowerShell como administrador. No se verificó acceso desde otro dispositivo.
- Pendiente en PowerShell administrador: `New-NetFirewallRule -Name 'AEGIS-Nginx-LAN-8085' -DisplayName 'AEGIS Nginx LAN TCP 8085' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8085 -RemoteAddress LocalSubnet -Profile Any`.


## Control de misión simplificado · 15/11/2026

PDCA: cambio acotado para reducir texto repetido; Heading permite omitir contexto sin dejar elementos vacíos y Dashboard muestra únicamente el título. Build de producción con docker compose build aegis-frontend aprobado (TypeScript y Vite); persiste el aviso previo de bundle mayor a 500 kB. Se actualizó solo el frontend local y se recargó Nginx.

Verificación visual mediante navegador integrado en escritorio y 390×844: título sin eyebrow, descripción ni insignia; cuatro tarjetas con datos de API y cola de eventos visibles, navegación móvil contraída y sin desbordamiento horizontal observado. La misión continúa en la barra superior y el aviso de datos simulados permanece. Playwright CLI no disponible en PATH; no se agregaron pruebas para este ajuste de presentación ni se repitieron escenarios de backend. Kaizen: concentrar el contexto de misión en la barra superior para reducir repetición.

## Logo AURORA · 15/11/2026

PDCA: sustituir exclusivamente la marca gráfica y agregar el favicon con el emblema recibido. SVG autocontenido con el JPEG original incrustado, viewBox y recorte circular; hash del JPEG copiado coincide con el adjunto. No se añadieron dependencias.

Build `docker compose build aegis-frontend` aprobado (TypeScript y Vite); persiste aviso previo de bundle mayor a 500 kB. Actualizado únicamente frontend con `up -d --no-deps` y recarga de Nginx. Recurso de icono servido con HTTP 200 y Content-Type image/svg+xml. Navegador integrado: logo cargado (44 px), barra expandida/contraída inspeccionada y enlace rel=icon apunta al mismo emblema; comprobación DOM a 390×844 sin desbordamiento horizontal. Captura: output/playwright/aurora-logo.jpg. Siete servicios saludables. No se repitieron pruebas de telemetría para este cambio de presentación. Kaizen: compartir una sola marca local entre navegación y pestaña, conservando el original para futuras variantes. La comprobación del favicon verifica declaración y recurso; no se inspeccionó el icono en la barra nativa del navegador.

## Botón de barra lateral · 15/11/2026

PDCA: anclar el control al borde lateral por encima del logo sin participar del flujo. CSS comparte el ancho efectivo de barra y posición del botón; conserva 224/190 px desplegada y 64 px contraída, con espacio superior estable para marca y navegación. Build TypeScript/Vite aprobado (aviso de bundle grande existente), frontend local actualizado y Nginx recargado. Navegador integrado: centro del botón x=224 expandido y x=64 contraído, y=24, alto 34, logo y=74; sin superposición vertical. Móvil 390×844: alternancia funcional, ancho contraído 64 y sin overflow horizontal. Inspección visual confirma control completo fuera del borde, sin recorte. Sin pruebas de backend por tratarse de presentación; no se añadieron tests. Kaizen: una variable CSS determina borde y control en cada breakpoint.

## Control de navegación en cabecera · 15/11/2026

Corrección de ubicación solicitada: SidebarToggle se renderiza en la barra superior junto a ARES-01, fuera del aside. Se retira el espacio superior reservado al control: logo vuelve a y=25. Build TypeScript/Vite aprobado, con aviso de bundle grande previo; frontend local actualizado y Nginx recargado. Navegador integrado confirmó botón dentro de topbar y ausente del aside, alternancia de escritorio y cierre exterior móvil; 390×844 sin desbordamiento horizontal e inspección visual del botón junto a misión. La ubicación anterior sobre el borde queda reemplazada. Sin cambios de API o pruebas de backend. PDCA/Kaizen: separar el control de navegación del contenido de la barra para evitar espacio reservado y superposiciones.

## Menú reducido · 15/11/2026

PDCA: ocultar accesos Simulador y Sistema del listado compartido de navegación. Build TypeScript/Vite aprobado (aviso de bundle grande existente); frontend local actualizado y Nginx recargado. Navegador integrado confirmó cinco enlaces: Control de misión, Tripulación, Telemetría, Eventos y Configuración. Se ajusta expectativa del recorrido crew-navigation a cinco enlaces; ese recorrido completo no se reejecutó. Las rutas directas y permisos de API continúan existentes; ocultación visual no equivale a restricción de acceso. Kaizen: reducir menú sin modificar operaciones del backend.

## Entrega V0.1.1 · 15/11/2026

Compose válido. Construidas las cuatro imágenes 0.1.1 (frontend, backend, analytics y simulator); TypeScript/Vite y backend compilan. Pruebas ejecutadas: node --test de gráficos/retención/sesión: 10 aprobadas; npm test en aegis-backend:0.1.1 sin red: 10 aprobadas; pytest en aegis-analytics:0.1.1 sin red: 5 aprobadas, 16 advertencias de deprecación. Persisten advertencias de bundle grande. Sin nuevas migraciones. El recorrido E2E crew-navigation completo no se reejecutó. Notas consolidadas en releases/V0.1.1.md. Publicación en main y release autorizadas expresamente por el usuario; no se despliega un sitio público ni se publican imágenes Docker.
## Publicación Cloudflare · 15/11/2026

- Configuración local del túnel validada con `cloudflared tunnel ingress validate`: correcta.
- La red Docker `aegis_ingress` permitió alcanzar `http://aegis-nginx:8080/api/v1/system/live`: HTTP 200.
- Cloudflare creó el CNAME de `aurora.drait.com.ar` hacia el túnel `drait-web`. Los resolvers públicos `1.1.1.1` y `8.8.8.8` devolvieron las direcciones anycast de Cloudflare.
- Verificación HTTPS por el edge de Cloudflare: `/`, `/api/v1/system/live`, `/api/docs` y `/settings` respondieron HTTP 200; la validación TLS fue correcta. Liveness devolvió `{"status":"UP","version":"0.1.0"}`.
- Comprobación de regresión: `https://drait.com.ar/` continuó respondiendo HTTP 200 después de recrear únicamente el conector `cloudflared`.

La caché del resolvedor local conservó temporalmente la respuesta negativa previa a crear el registro; por eso la primera consulta normal desde el host no resolvió aunque los resolvers públicos ya mostraban el registro. La prueba HTTPS final fijó una dirección anycast obtenida desde `1.1.1.1`, manteniendo hostname y SNI públicos. No se ejecutó una prueba desde una red física externa ni se configuró Cloudflare Access. La publicación contiene exclusivamente la demo sintética existente; no es validación médica ni autorización para datos reales.

## Retratos e historial coherente v2 · 15/11/2026

Se corrigió la ausencia de retratos observada en la instalación vigente. La causa fue una asociación frontend con UUID de una base anterior; los cuatro perfiles actuales conservaban los códigos `CREW-01`…`CREW-04` pero tenían UUID nuevos. `CrewPortrait` ahora asocia por código estable de seed y agrega versión a la URL para invalidar cachés. El build público contiene los cuatro códigos y las cuatro imágenes respondieron HTTP 200 `image/png` en `https://aurora.drait.com.ar`.

Modelo `aurora-coherent-history-v2`: 47.020 muestras SIMULATED aceptadas, cero omitidas y cero errores, distribuidas en 322 lotes para cuatro tripulantes y un hábitat. Se cubrieron 51 métricas escalares por tripulante y cinco ambientales; las continuas usan instantáneas cada seis horas durante 89 días y las periódicas conservan cadencia de catálogo. ECG, ECG-HR y HRV no se generaron retrospectivamente. Un intento de ejecutar el script PowerShell no escribió datos porque `pwsh` no está instalado; se ejecutó el mismo flujo con Bash, curl y jq contra NestJS.

Validación observada:

- Python `test_history_demo.py`: 3/3 aprobadas; determinismo, consistencia de sueño, cadencia mensual, ciclos actividad/pulso/respiración/metabolismo, dosis acumulada y límites ambientales.
- Backend en imagen sin red: 10/10 pruebas aprobadas, incluidas validación total previa a escritura y deduplicación por timestamp crudo.
- Builds de backend y frontend aprobados. Persiste la advertencia conocida de bundle frontend mayor de 500 kB.
- CREW-01: 352 puntos v2 de pulso en la consulta de 89 días; actividad entre 0,77 y 1,9924 MET. Dosis histórica de 1,0029 a 3,1966 mSv, monótona hacia el presente.
- Sueño: 85 registros v2, 7,2997–7,9948 h. Hábitat: 352 puntos v2 de CO₂, 602,0001–781,2013 ppm.
- Reimportar un punto exacto de la grilla devolvió `accepted=0`, `skipped=1`. Una comprobación inicial usó por error el timestamp de una ventana agregada de la API, que no era una identidad cruda existente, y añadió un único punto sintético válido; no sustituyó lecturas actuales ni activó reglas.
- Los siete servicios de ejecución terminaron saludables; la versión pública sirvió el nuevo asset frontend y los cuatro PNG.

Estos patrones son decisiones de una demostración ficticia, no reconstrucción de sensores, evidencia médica ni modelo fisiológico validado. Las líneas entre instantáneas no representan muestras intermedias. No se generaron EVA ni eventos solares históricos.

## Catálogo demostrativo de eventos · 15/11/2026

Se crearon seis `HealthEvent` sintéticos idempotentes mediante Prisma: `INFO/RESOLVED`, `TECHNICAL/RESOLVED`, `YELLOW/ACKNOWLEDGED` ambiental, `REVIEW/OPEN` fisiológico, `YELLOW/ACKNOWLEDGED` operacional y `RED/OPEN` operacional. Resultado inicial: `created=6`, `existing=0`; segunda ejecución: `created=0`, `existing=6`. Cada creación produjo un `AuditLog` `DEMO_EVENT_CREATED`; se observaron seis auditorías.

La API devolvió exactamente dos eventos OPEN, dos ACKNOWLEDGED y dos RESOLVED con fuente `SYNTHETIC_EVENT_CATALOG`. El frontend compila insignias separadas de severidad y estado, borde de criticidad y traducciones españolas de tipos, explicaciones y notas. El asset público `index-DQfCBQ5g.js` y su CSS contenían las nuevas marcas; `https://aurora.drait.com.ar` respondió correctamente. Backend: 10/10 pruebas aprobadas. Los siete servicios quedaron saludables.

El catálogo no inserta muestras ni estados de alerta operacional; por diseño, el evento RED de bitácora no altera visor/TV. Sirve para explorar evidencia y transiciones humanas sin iniciar escenarios. Alcance y reproducción en `EVENT_CATALOG.md`. Todos los eventos son ficticios y no constituyen evaluación clínica.

