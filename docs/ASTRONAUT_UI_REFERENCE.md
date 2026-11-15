# Referencia para la interfaz individual del astronauta

Fecha: 15/11/2026. Estado original: análisis. Actualización posterior: adaptación implementada como AURORA según ADR-006; el análisis de abajo conserva la evaluación previa y las diferencias del prototipo.

## Intención del usuario

El usuario identifica `docs/Nasa_Space_Apps_26.html` como referencia del aspecto deseado para la interfaz individual de cada astronauta. El archivo presenta AURORA, una consola personal con cinco vistas. Esta preferencia orienta el próximo rediseño del detalle individual; las decisiones funcionales que siguen son propuestas, no capacidades implementadas ni nuevos protocolos.

Se revisaron las dos especificaciones de `docs/source`, las decisiones vigentes, la arquitectura, la continuidad visual, el catálogo de métricas y el detalle actual en `apps/frontend/src/main.tsx`.

## Lenguaje visual a conservar

- Fondo claro grisáceo, paneles blancos y acentos salvia, arena y azul pizarra.
- Bordes finos, radios moderados, poca ornamentación y espacios amplios.
- Navegación lateral, saludo personal, contexto de misión y etiquetas compactas.
- Tarjetas numéricas con jerarquía clara y tendencias junto a su contexto.
- Esquema corporal seleccionable con detalle del sistema a la derecha.
- Organización personal de la información: resumen, cuerpo, rutina, actividades y espacio de descanso.

La referencia usa una barra de 268 px y dos columnas principales en escritorio; pasa a una columna a 1220 px y a navegación móvil a 820 px. Estos puntos de corte son una base de evaluación, no una garantía de accesibilidad.

AEGIS debe expresar esta estética mediante sus variables CSS y su paleta ECharts. Conservar las preferencias globales de idioma y tema, con equivalencia oscura legible. El rediseño individual no implica convertir automáticamente Mission Control al mismo diseño.

## Correspondencia con AEGIS

| Vista de referencia | Adaptación propuesta | Base existente y trabajo pendiente |
|---|---|---|
| Home | Resumen personal, indicadores, últimas observaciones, eventos y acceso a ECG | Reutilizar overview, catálogo, check-ins y componentes de señal. El acompañante ilustrado puede conservarse como recurso visual; un asistente conversacional sería otra función. |
| Body & Clinical Biomarkers | Mapa corporal para explorar métricas por dominio | Filtrar el catálogo real de AEGIS. Mostrar origen, unidad, calidad y fecha. Los dominios sin métricas deben indicar falta de cobertura. |
| Routine & Calendar | Historial de check-ins y registros de sueño/actividad; agenda cuando exista contrato | Los check-ins ya tienen API. Agenda, tareas, recurrencia y cumplimiento requieren modelo y API propios. |
| Challenges | Actividades interactivas de demostración, diferenciadas de las métricas sintéticas | El HTML contiene juegos simples de reacción y memoria. AEGIS no dispone de un contrato equivalente de sesiones/resultados; no presentarlos como pruebas clínicas validadas. |
| Quiet Space | Espacio opcional de pausa y recursos locales | Audio procedural y animaciones son trasladables. Un diario persistente requiere definir acceso, retención y API antes de prometer privacidad. |

El detalle actual ya reúne modos operativos, ficha, baseline, ECG, histórico y check-ins en una página vertical. El cambio central es reorganizarlos como espacio personal, conservando trazabilidad y contexto operacional.

## Diferencias que impiden copiar directamente el HTML

1. Es un documento monolítico con estilos y JavaScript globales, manipulación del DOM y manejadores inline. Debe convertirse en componentes React y estado por sujeto estable.
2. Los gráficos usan Chart.js desde CDN. AEGIS requiere ECharts instalado localmente y su tema compartido.
3. Tipografías de Google e iconos remotos introducen dependencias de ejecución. Usar fuentes locales y `lucide-react` existente.
4. `DEFAULT_STATE`, `BODY_ZONES`, el calendario y las fases contienen valores prefijados. No son lecturas adquiridas ni históricos reales. Usar consultas NestJS; no completar períodos sin evidencia.
5. El acompañante reconoce palabras con `includes` y devuelve mensajes predefinidos. No existe integración con un modelo de IA ni análisis de telemetría detrás de esas respuestas.
6. El guardado y la descarga dependen de `window.notebookAppApi`. Si esa API no existe, el guardado retorna sin persistir; la exportación puede anunciar éxito sin producir archivo. Sustituir por contratos reales y confirmar resultados antes de comunicar éxito.
7. La voz intenta usar reconocimiento del navegador y, si falla, ejecuta un comando de ejercicio simulado. Ese reemplazo no es aceptable para registrar actividad: una entrada fallida debe conservarse como fallo observable. No activar reconocimiento de voz externo como dependencia de operación local.
8. Fechas, persona, día de misión y demora con Tierra están fijados. Derivarlos de configuración autorizada y tiempo UTC, mostrando desconocido cuando corresponda. No introducir una demora ficticia como estado real.
9. Las referencias a NASA y las instrucciones sobre suplementos, ejercicio, sueño y efectos fisiológicos no constituyen protocolos validados del proyecto. Conservar la organización visual y usar textos descriptivos sin diagnósticos ni indicaciones médicas.
10. No hay autenticación ni autorización por astronauta en el prototipo. Toda escritura debe pasar por NestJS y las notas deben conservar su contenido original.

## Propuesta de primer incremento acotado

Adaptar primero la estructura y el aspecto de Home y Body al detalle `/crew/:id` y al acceso del rol CREW:

- Identidad del astronauta y navegación personal, conservando acceso a preferencias.
- Tarjetas basadas en el catálogo y resumen de eventos realmente recibidos.
- Mapa corporal accesible por teclado y lista alternativa de dominios.
- ECG e histórico existentes integrados en la nueva composición.
- Registro de check-ins mediante la API actual.
- Contexto operacional, espacios universales y radiación visibles; ninguna vista personal puede ocultar una condición activa.

Agenda completa, sesiones de juegos, diario y conversación requieren incrementos separados con contratos explícitos. No crear secciones que aparenten funciones disponibles usando datos prefijados.

La ausencia de datos nunca significa estado saludable. Durante cortes conservar la última lectura y el ECG recibidos con su fecha original y rótulo de evidencia retenida, según `UI_CONTINUITY.md`. El almacenamiento visual continúa particionado por identidad y no participa de reglas.

## Verificación observada y límites

Se abrió el HTML en Edge mediante Playwright CLI y un servidor temporal de loopback, a 1440 × 1000. Se recorrieron las cinco vistas por sus botones y se capturaron imágenes en `output/playwright/aurora-reference-{home,body,routine,challenges,quiet}.png`. Se inspeccionaron visualmente las capturas de Home y Body.

La consola notificó un atributo SVG `height="auto"` inválido y la ausencia de favicon (404). Las dependencias remotas cargaron en esta sesión; eso no verifica funcionamiento sin Internet.

No se probaron micrófono, juegos completos, audio, persistencia entre recargas, exportación efectiva, navegación completa por teclado ni diseño móvil. No se modificó código de aplicación, infraestructura, bases ni datos.

Para la futura adaptación verificar: aislamiento entre dos identidades, lectura y escritura por rol, temas e idiomas, mapa por teclado, radiación/condiciones activas al cambiar de sección, cortes y reconexión sin perder evidencia, períodos vacíos sin curvas inventadas y ejecución sin dependencias remotas.
