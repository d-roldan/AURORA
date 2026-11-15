# Arquitectura y decisiones · V0.1.0

Monorepo: `apps/frontend` React/TS/Vite/Tailwind/Query/ECharts; `apps/backend` NestJS/Prisma/Swagger; `services/analytics` FastAPI/NeuroKit2; `services/simulator` Python; `infra` Nginx e Influx. No dependencias de repositorios privados.

Flujo: productor Python → HTTP autenticado → NestJS → confirmación Influx → reglas → eventos PostgreSQL. ECG crudo → consulta de ventana cerrada en Influx → NeuroKit2 ecg_process → features Influx con algoritmo y fuente DERIVED → API → React. Frontend no genera mediciones ni alertas. Polling TanStack Query a 2s, suspendido en pestañas inactivas; supervisor analítico a 15s. Swagger sirve sus propios recursos locales.

Decisiones: PostgreSQL 16; Influx OSS 2.7.12 deliberado para Flux; buckets por retención. Interfaz integral nativa React/ECharts según ADR-001; sin herramientas gráficas externas ni iframes. Backend y analytics no requieren disponibilidad del productor para liveness. Analytics caída degrada derivación, no impide consultas crudas ni ingesta escalar. Simulador arranca saludable sin API y recibe configuración desde ella.

Seguridad: localhost exclusivamente, JWT firmado issuer/audience, roles consultados desde DB, scrypt con sal por cuenta, comparación constante de claves de servicio, DTO whitelist, cuerpos ≤1MiB, sin Flux arbitrario, rangos acotados y parámetros escapados. Claves aleatorias locales. Backend y Python ejecutan usuarios no root; proxy y bases usan privilegios estándar de sus imágenes. Influx tokens limitados se provisionan tras inicialización; token administrador permanece en el servicio Influx para operaciones locales. No se expone Docker socket.

Limitaciones de diseño: una instancia de API/productor; continuidad de regla en memoria reiniciada al reiniciar API; espera nuevamente 30s conservadora. No garantía transaccional entre PostgreSQL/Influx. Un fallo después del commit Influx puede requerir reintento; identidad del punto evita duplicación, dedupKey único evita mismo evento. No se detecta reutilización de batchId con contenido cambiado; escribiría el mismo punto. Baselines y reglas congelados de demo, no configuración clínica. Dominios separados en servicios/DTOs y una fachada HTTP pequeña; dividir controladores por dominio al crecer.

PDCA/Kaizen: cada incremento registra intención, cambio, prueba observada y acción pendiente. V0.1.0 prioriza el flujo vertical; siguiente ciclo fortalece recuperación y evidencia antes de ampliar indicadores.

Visualización integral: Chart encapsula ECharts Canvas; History controla consultas, rangos personalizados, métricas superpuestas con ejes por unidad, comparación de tripulantes, baseline, umbral técnico, anotaciones y CSV con procedencia. Los huecos se representan como discontinuidades. System integra estado de servicios, registro de dispositivos y auditoría ADMIN. No frontend accede a bases ni Python directamente.

Vista operativa: OPERATIONAL_MODES.md documenta los cuatro entornos y la regla experimental. A diferencia de la regla basal original de 30s, los episodios operativos de la migración 004 conservan estado y recuperación en PostgreSQL al reiniciar la API.


Continuidad visual: la UI usa IndexedDB para copias acotadas de las vistas por identidad autenticada. Conserva valores/tiempos y trazados durante cortes; no interviene en alertas. La API mantiene frescura independiente de la presentación. Simulador prepara segmentos ECG en segundo plano. Ver UI_CONTINUITY.md.

