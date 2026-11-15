# AURORA — Astronaut Health Monitoring Platform

V0.1.1 · Prototipo experimental local para demostración. Tripulantes ficticios, telemetría sintética explícita y procesamiento ECG real. No es un producto NASA ni un dispositivo médico validado. No proporciona diagnósticos, tratamientos ni asistencia clínica.

Nombre de producto: **AURORA**. Los identificadores técnicos históricos `aegis` (servicios, volúmenes, paquetes y almacenamiento local) se conservan para mantener la instalación y sus datos. Referencia visual: `docs/Nasa_Space_Apps_26.html`.

## Ejecutar

Requisitos: Docker Desktop con contenedores Linux, Docker Compose v2+, PowerShell. El build inicial requiere Internet; el runtime no consume APIs externas ni CDN.

```powershell
./scripts/setup.ps1
docker compose config --quiet
docker compose up -d --build
./scripts/provision-tokens.ps1
docker compose up -d --force-recreate aegis-backend
docker compose ps
```

- Frontend: http://localhost:8085
- Swagger: http://localhost:8085/api/docs

Si setup selecciona otro puerto, usar `HTTP_PORT` de `.env`. Solo Nginx publica en IPv4 (`0.0.0.0`) para acceso desde la red local: `http://<IP-del-equipo>:8085`, Swagger en `/api/docs`. El firewall debe permitir ese puerto TCP desde la red local. Las bases y Python no publican puertos. Proyecto Compose `aegis`, volúmenes persistentes propios; no operar sobre otros proyectos.

La web abre como `viewer` de solo lectura. Pulsar el usuario arriba a la derecha para iniciar sesión. Cuentas: `admin`, `medical`, `crew`, `viewer`; contraseña demo compartida generada localmente en `DEMO_ADMIN_PASSWORD` de [.env](.env). No compartir ni versionar esos valores. La sesión JWT vive en memoria, expira a las 8 h y se reinicia al recargar. El usuario `crew` solo accede al primer perfil propio. Esta política está aplicada en backend.

Interfaz integral: ECharts nativo para ECG, tendencias, superposición multivariable, comparación entre tripulantes, baseline/umbral, anotaciones de eventos, zoom/pan y tooltips. Telemetry permite rangos personalizados y exportar CSV con procedencia. Sin dashboards externos ni iframes; toda consulta pasa por NestJS.

Configuración (`/settings`), debajo de System/Sistema: modo oscuro o claro e idioma inglés o español para toda la interfaz. Preferencias guardadas automáticamente en este navegador, independientes de la sesión. Los datos originales, notas e identificadores conservan su procedencia. Ver [preferencias](docs/UI_PREFERENCES.md).

Telemetría integral: 38 métricas en 11 categorías, todas superpuestas inicialmente. Casillas por métrica/categoría y leyenda sincronizada, seleccionar/deseleccionar todas, escala visual relativa (sin puntaje de salud), ejes originales para hasta dos unidades y CSV con datos originales. ECG para los cuatro perfiles; HRV RMSSD/SDNN real con NeuroKit2 tras cinco minutos contiguos. Registros óseos/laboratorio/sueño se distinguen de sensores continuos. [Catálogo y límites](docs/METRIC_CATALOG.md).

## Recorrido

1. Mission Control: cuatro perfiles y ambiente desde consultas Influx. Abrir Lucas Orozco para ECG y tendencias. ECG derivado aparece después de una ventana completa y ejecución analítica.
2. Como admin, Simulator → Persistent HR deviation → Start scenario. Esperar rampa y ≥30s sostenidos. Ver Events, evidencia y baseline congelado.
3. Reconocer el evento con una nota y luego resolverlo con otra. La recuperación de señal no resuelve revisiones humanas.
4. SENSOR_LOSS cesa la fuente elegida; después de 10s el dashboard muestra DATA UNAVAILABLE, y el supervisor registra un evento técnico en su próximo ciclo de 15s.
5. HABITAT_CHANGE aumenta CO₂ y activa aviso de demostración. NORMAL recupera la producción sin borrar histórico.
6. Crew: editar/agregar perfiles ficticios, crear misiones, registrar check-ins. Nuevos perfiles no obtienen sensores ni baselines automáticamente.

## Verificar

```powershell
docker compose exec -T aegis-backend npm test
docker compose exec -T aegis-analytics python -m pytest -q
./scripts/smoke.ps1
./scripts/metrics.ps1 # requiere 5min continuos de ECG para los cuatro sujetos
```

Ver [resultados observados](docs/VALIDATION.md), [despliegue](docs/DEPLOYMENT.md), [arquitectura](docs/ARCHITECTURE.md) y [limitaciones](docs/ROADMAP.md). El código original no tiene licencia asignada hasta confirmación del titular. Referencias iniciales preservadas íntegramente en raíz y `docs/source/`.

## Vista operativa por entorno
Abrir Crew → perfil → Spacecraft, Space station, Rover o Lunar / planetary base. La vista completa conserva SpO₂, HR/HRV y radiación, y adapta tres espacios al entorno. Escape/Exit focus vuelve al perfil. Alertas amarillas destacan; una roja secundaria reemplaza el espacio 5 con verificación humana. Son reglas sintéticas experimentales, sin diagnóstico ni tratamiento. Ver docs/OPERATIONAL_MODES.md. Prueba: ./scripts/operational.ps1.


Continuidad: durante cortes se conserva el último valor/ECG con fecha y estado explícitos. Las vistas consultadas se guardan en el navegador por identidad y se restauran tras autenticarla. Influx conserva el archivo de datos. Ver docs/UI_CONTINUITY.md; prueba ./scripts/continuity.ps1.


### Vistas por dispositivo

En Crew → perfil → Operational environment, Space station abre la TV de estación; los demás entornos abren el visor personal. El selector Display device permite cambiar a Astronaut visor, Station TV o Detailed monitor. TV reúne la tripulación autorizada de la misión, constantes universales, radiación y ambiente; las alertas activas aparecen automáticamente. No representa ubicación física. Idioma y tema también se pueden cambiar dentro de pantalla completa. Ver docs/OPERATIONAL_MODES.md, ADR-006 y resultados observados en docs/VALIDATION.md.
