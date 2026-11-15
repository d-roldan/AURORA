# Decisiones arquitectónicas

## ADR-006 · AURORA y espacio personal · 15/11/2026

Por solicitud explícita del usuario, el nombre del producto pasa a **AURORA**. La interfaz individual toma como referencia `Nasa_Space_Apps_26.html`: superficies claras, acentos salvia/arena/pizarra, acompañante SVG local, tarjetas amplias y esquema corporal. Conserva un tema oscuro equivalente y las preferencias existentes; el tema inicial para navegadores sin preferencia pasa a claro.

La implementación es React nativo con ECharts y el diccionario inglés/español. Inicio, cuerpo, rutina, señales y espacio de descanso reorganizan los contratos existentes. El acompañante es ilustrativo; no se presenta como IA conectada. El espacio de descanso ofrece un temporizador local, sin instrucciones médicas. Agenda, juegos, voz y diario del HTML no se trasladan como funciones aparentes sin contratos reales.

NestJS mantiene reglas, autorización y escrituras. La UI personal consulta el contexto operativo existente para conservar indicadores universales, radiación y condiciones activas en todas sus secciones. Se reutilizan ECG, histórico, check-ins y caché por identidad. Las tendencias personales almacenadas se incorporan a la misma política de continuidad.

Se conservan los identificadores técnicos históricos `aegis` en Compose, volúmenes, bases, contratos, paquetes y claves locales. El cambio de marca no migra ni reinicia almacenamiento o servicios del backend. Las especificaciones fuente conservan su nombre histórico.

## ADR-001 · Interfaz integral · 14/11/2026

Decisión explícita del usuario: Grafana queda eliminado de la arquitectura inicial. Prevalece sobre los documentos originales. No contenedores, configuraciones, dependencias, rutas, dashboards embebidos ni iframes externos. React integra visualización y controles nativos; Apache ECharts es el único motor de gráficos. NestJS es el único intermediario hacia PostgreSQL, InfluxDB, Python y simulador. Un solo acceso localhost vía Nginx.

Componentes: Chart reutilizable con series múltiples, ejes por unidad, zoom/pan/tooltips, referencias basales y umbrales demo, anotaciones temporales de eventos. History controla rango relativo/absoluto, comparación de sujetos/métricas y descarga CSV de los puntos efectivamente consultados, con procedencia y algoritmo. Indicadores numéricos nativos accesibles; no usan aplicaciones externas. System integra comprobaciones de infraestructura, sin dashboards externos.

Los documentos fuente conservados en docs/source son instantáneas históricas anotadas, no la especificación vigente. Los documentos raíz y docs/ reflejan la corrección. No se trasladan capacidades no implementadas bajo apariencia de configuración: las pendientes figuran en ROADMAP.

## ADR-002 · Temas e idiomas · 14/11/2026

Solicitud explícita: pantalla de Configuración inmediatamente debajo de Sistema, modos oscuro/claro e idiomas inglés/español para la interfaz integral. Preferencias locales al navegador, sin dependencia de servicios externos, disponibles para todos los roles. Los identificadores de protocolo, evidencia original y notas humanas no se traducen ni reescriben. Detalles y pruebas en UI_PREFERENCES.md y VALIDATION.md.

## ADR-003 · Superposición integral y métricas por dominio · 14/11/2026

Catálogo de 38 métricas/11 categorías según ampliación del usuario. Telemetría superpone todas inicialmente y permite selección nativa sincronizada entre casillas, categorías y leyenda. Unidades heterogéneas usan escala visual relativa explícita; unidades originales disponibles para subconjuntos de hasta dos unidades. Datos originales y procedencia permanecen en tooltips/CSV.

Separar sensores continuos, señales, features derivadas y registros periódicos; no inferir hueso/sueño/psicología desde ECG. ECG sintético para los cuatro perfiles; HRV real con NeuroKit2 solo al completar cinco minutos contiguos. Reiniciar solo API conserva la ejecución ya activa del productor; autostart inicia NORMAL únicamente si el productor está detenido. Catálogo, límites y cadencias en METRIC_CATALOG.md.

## ADR-004 · Vista operativa integral y Emergency Override · 14/11/2026
Cinco espacios: dos universales y tres contextuales; radiación universal en franja permanente independiente. Reglas de demostración locales en NestJS, estado persistente en PostgreSQL, valores en Influx y UI React con Fullscreen API y alternativa de ventana completa. Sin diagnóstico, inferencia clínica ni fuentes externas aparentes. Detalle, prioridades y límites en OPERATIONAL_MODES.md.


## ADR-005 · Continuidad visual y caché autorizada · 14/11/2026
Conservar la última lectura y señal reales durante cortes sin presentarlas como actuales. Copia de vistas en IndexedDB por identidad autenticada, sin credenciales; Influx sigue siendo la fuente autoritativa. Preparar ECG siguiente en segundo plano. Semántica, límites y pruebas en UI_CONTINUITY.md.

## ADR-006 · Presentaciones por dispositivo · 15/11/2026

Plan PDCA acotado: diferenciar la presentación del entorno operativo según el dispositivo solicitado, reutilizando exclusivamente contratos y reglas existentes. La imagen aportada es referencia visual; sus instrucciones sobre oxígeno no se convierten en un protocolo médico.

Se implementan visor personal (HUD), TV de estación y monitor detallado. Estación abre TV por defecto; los demás entornos abren visor. Entorno y dispositivo se pueden seleccionar independientemente. Se mantiene el monitor de cinco espacios como opción explícita. La TV consulta la tripulación autorizada por NestJS y de la misma misión: no inventa ubicación, asignación EVA ni presencia física. CREW solo recibe su propio perfil por autorización del servidor.

El visor concentra la atención en un emergente amarillo/rojo y la guía de revisión humana que devuelve NestJS; mantiene constantes universales y radiación. La TV muestra SpO₂, HR/HRV, radiación por persona y cinco canales ambientales. Las condiciones activas generan avisos automáticos sin interacción; a 1920×1080 aparecen sobre el seguimiento. Ningún cierre local elimina una condición ni reconoce un evento. No se introducen umbrales, alarmas sonoras, reglas de salud o protocolos terapéuticos en React.

Valores conservados, fechas UTC originales y avisos de degradación continúan según ADR-005. La consulta de cabina reutiliza metricCatalog, incorporada a la caché por identidad. Las preferencias de idioma/tema se pueden cambiar dentro de la vista operativa, sin salir de pantalla completa. No cambian esquema de base de datos ni dependencias.

Kaizen: la primera distribución de TV exigía desplazamiento; se verificó y ajustó a cuatro columnas a partir de 1400 px. En pantallas menores se conserva desplazamiento vertical. No se ha validado un visor físico ni hardware de TV; es una presentación web adaptable. Cobertura de reglas y ausencia de protocolos clínicos permanecen como límites explícitos.

## Bitácora manual · 15/11/2026

Se amplía el check-in existente como bitácora de observaciones humanas con texto libre, título/categoría y fechas de observación y creación diferenciadas. Sueño/fatiga siguen siendo atributos opcionales del registro, sin escribir series ni intervenir en reglas. Entrada y auditoría se guardan en la misma transacción. Migración aditiva con conservación de las fechas históricas; permisos existentes de misión, sin promesa de diario privado. Contrato, PDCA y límites en LOGBOOK.md.
## ADR-007 · Líneas y contexto temporal por cadencia · 15/11/2026

Solicitud explícita del usuario: reemplazar puntos/cortes de las gráficas de tripulación por líneas coherentes y cargar los valores sintéticos necesarios. Las tendencias escalares conectan registros mediante segmentos rectos; el ECG conserva huecos reales. Se elimina la regla universal de corte de 90 segundos para tendencias. Para periódicas se elige la última observación de cada intervalo del catálogo, conservando todos los originales en API/CSV. Se amplían consultas a 90 días y se agregan ventanas largas continuas para evitar truncar datos recientes.

El historial de demo se genera con Python y lo valida/escribe NestJS mediante un endpoint ADMIN y demo-only, separado de ingesta en vivo y de reglas. Fuente SIMULATED y perfil vigente `aurora-coherent-history-v2` explícitos; instantáneas continuas a seis horas y cadencias periódicas originales para tripulación/hábitat, sin datos NASA, ECG ni señales derivadas retrospectivas. Motivo, límites, reproducción y semántica en LINEAR_TRENDS.md. Esta decisión actualiza la representación histórica, no sus unidades, retenciones ni umbrales operativos.


## Retratos y navegación lateral · 15/11/2026

Plan acotado: identificar rápidamente a la tripulación y permitir contraer/desplegar el menú. Se agregan cuatro retratos fotográficos sintéticos locales, asociados a UUID de perfiles ficticios. El mismo retrato aparece en Tripulación, resumen y encabezado personal. Los perfiles sin imagen y los fallos de carga muestran iniciales/icono sin asignar otra cara. Procedencia: apps/frontend/public/images/crew/README.md. No se incorporan fotos de personas reales ni servicios externos.

La barra lateral tiene control accesible con nombre, aria-expanded y soporte de teclado. Contraída conserva los siete destinos con nombres accesibles y títulos; el contenido aprovecha el ancho liberado. La preferencia sidebarCollapsed se guarda junto con tema/idioma en aegis.preferences, sin credenciales. En móvil sin preferencia previa inicia contraída; al desplegar muestra el menú sobre el contenido con cierre exterior y se contrae al elegir un destino. Configuración sigue disponible para todos los roles.

Kaizen: las imágenes se sirven desde /images/crew para evitar colisión con la ruta React /crew. No cambian contratos, permisos, telemetría ni bases de datos. No se incorpora carga o edición de fotografías de perfiles.
