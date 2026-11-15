# AEGIS — Contexto científico, desafío y definición del producto

**Estado:** propuesta de proyecto experimental | **Fecha:** 14/11/2026 | **Documento 1 de 2**

> Leer junto con `02_AEGIS_ESPECIFICACION_TECNICA.md`. Este documento define el porqué y el alcance; el segundo contiene las instrucciones ejecutables para Codex. AEGIS es un nombre provisional. No es un producto de NASA ni un dispositivo médico validado.

## 1. Resumen ejecutivo

AEGIS (Astronaut Health Monitoring Platform) es una plataforma web autónoma para adquirir, almacenar, procesar y visualizar telemetría fisiológica y ambiental de una tripulación, detectar desviaciones respecto de referencias individuales y registrar revisiones humanas. Su diferencial será la combinación de telemetría real o reproducida, procesamiento de bioseñales con NeuroKit2, contexto operacional, trazabilidad y funcionamiento local sin servicios externos durante la misión.

Se propone un prototipo funcional, no un sistema certificado ni un diagnóstico automático. La demostración inicial utilizará exclusivamente tripulantes ficticios y señales sintéticas identificadas como tales. El backend y las bases de datos serán reales: los gráficos no podrán depender de números inventados por el frontend.

## 2. Desafío oficial

NASA Space Apps Challenge 2026: **Create Health Monitoring Software for Astronauts on Space Missions**. Dificultad intermedia; temas: exploración humana, software y exploración espacial. El enunciado describe riesgos de misiones prolongadas —incluidos cambios inmunológicos, pérdida ósea y problemas cardiovasculares y conductuales— y pide software que recopile indicadores y ayude a los astronautas a evaluar su salud y actuar. [1]

El evento oficial se realiza el 14 y 15 de noviembre de 2026; la página de la edición indica cierre de presentación el 15 de noviembre a las 23:59 hora local. [2] Confirmar reglas, registro, pertenencia a equipo, recursos exigidos, formato y criterios de la entrega en la plataforma oficial antes de enviar. La pestaña específica de recursos no pudo recuperarse integralmente en esta revisión: no asumir que las fuentes complementarias enumeradas aquí son la lista oficial ni que cumplen por sí solas las condiciones de elegibilidad. Tampoco se dispone aquí de un informe final de investigación profunda separado; esta especificación consolida lo verificado y las propuestas de la conversación.

## 3. Contexto científico

El Human Research Program (HRP) identifica cinco grupos de peligros [3–5]. La misión de AEGIS no es resolver todos ellos, sino hacer visibles indicadores y contexto, distinguir calidad de datos y apoyar una revisión informada.

| Peligro | Impactos relevantes | Cobertura propuesta | Límites |
|---|---|---|---|
| Radiación | Exposición acumulativa y efectos biológicos | Dosis simulada o dosimetría importada, eventos espaciales históricos | Un evento solar no es la dosis individual |
| Aislamiento y confinamiento | Fatiga, sueño, estrés y desempeño | Registros de sueño y autoevaluaciones | No diagnosticar salud mental |
| Distancia de la Tierra | Demoras y pérdida de apoyo inmediato | Servicios locales, registros y exportación autónoma | No sustituir asistencia médica |
| Gravedad alterada | Adaptación cardiovascular, pérdida muscular y ósea | Actividad, tendencias y registros periódicos | ECG/PPG no permiten medir directamente densidad ósea |
| Ambiente cerrado | Cambios atmosféricos y habitabilidad | CO₂, O₂, temperatura, humedad, presión | Correlación temporal no demuestra causalidad |

La NASA investiga tecnologías de apoyo clínico para operaciones médicas independientes de la Tierra (EIMO), mediante adquisición activa y pasiva de información y orientación a bordo. [6] Es una referencia conceptual, no un permiso para replicar protocolos clínicos ni una validación de AEGIS. El concepto de AEGIS prioriza interoperabilidad, evidencia y explicabilidad por encima de un asistente generativo.

## 4. Usuarios y necesidades

- Tripulante: conocer indicadores propios, disponibilidad de las señales, evolución histórica, registrar síntomas/observaciones y revisar eventos.
- Responsable médico de misión (rol simulado): revisar datos autorizados de tripulantes, contextualizar desviaciones, reconocer eventos y documentar seguimiento.
- Administrador técnico: gestionar misión, dispositivos, catálogo de métricas, simulación, usuarios y estado de infraestructura, sin asumir acceso ilimitado a información clínica real.
- Evaluador de la demo: observar el flujo de adquisición, almacenamiento, procesamiento y visualización, activar escenarios sintéticos y comprobar resiliencia.

## 5. Requisitos funcionales y matriz de alcance

| Área | MVP prioritario | Evolución |
|---|---|---|
| Misiones y tripulación | Una misión ficticia, cuatro tripulantes con IDs estables | Múltiples misiones y asignaciones |
| Telemetría | HR, SpO₂, temperatura, ECG simulado y ambiente | PPG, respiración, movimiento, dosimetría real |
| Análisis | ECG con NeuroKit2, HR derivada, calidad de señal, desviación demostrativa | HRV validada, análisis multivariable, modelos incrementales |
| Evaluación | Baseline individual explícito, tendencias, revisión de eventos | Protocolos autorizados por expertos, contexto de actividades |
| Acción | Verificar medición, registrar observación, solicitar revisión de acuerdo con protocolo humano | Flujos clínicos validados y sincronización diferida |
| Simulación | Normal, desviación persistente, fallo de sensor, aumento ambiental | Reproducción de datasets, escenarios reproducibles complejos |
| Historia | Consultas temporales, eventos y evidencia | Informes PDF/CSV, comparativas y exportación interoperable |
| Autonomía | Docker local, sin dependencias cloud en tiempo de ejecución | Sincronización con Tierra, backups y recuperación avanzada |

Una persona sin señal no está necesariamente sana ni enferma. Los estados visibles son `NO_FLAG`, `REVIEW_REQUESTED`, `DATA_UNAVAILABLE` y, por separado, el estado técnico de adquisición. Nunca mostrar “salud normal garantizada”.

## 6. Catálogo de indicadores

| Indicador | Unidad | Fuente posible | MVP |
|---|---|---|---|
| Frecuencia cardíaca | bpm | ECG/PPG o sensor | Sí |
| SpO₂ | % | Pulsioxímetro; simulada en demo | Sí |
| Temperatura corporal | °C | Sensor o registro manual | Sí |
| ECG | amplitud en unidad documentada | Señal sintética NeuroKit2; sensor calibrado futuro | Sí |
| Frecuencia respiratoria | respiraciones/min | RSP o instrumento | Futuro |
| HRV RMSSD/SDNN | ms | Intervalos NN de señal adecuada | Ventana posterior de 5 min como objetivo inicial; documentar método |
| Sueño | h | Registro o wearable con método explícito | Registro diario simulado |
| CO₂ | ppm | Sensor de hábitat | Sí |
| O₂ | % | Sensor de hábitat | Sí |
| Temperatura/humedad/presión ambiente | °C/%/kPa | Sensores del hábitat | Sí |
| Dosis y tasa de radiación | mSv, mSv/h si corresponde al instrumento | Dosímetro o escenario | Futuro |
| Estado subjetivo | categoría/nota | Autoevaluación | Sí, simple |

No estimar SpO₂ a partir de un ECG, ni convertir amplitudes arbitrarias de NeuroKit2 en mV sin calibración. Distinguir variables instantáneas, agregadas y evaluaciones periódicas. Un valor sintético no es evidencia médica.

## 7. Fuentes de datos y evidencia

| Recurso | Uso potencial | Advertencia |
|---|---|---|
| HRP y Human Research Roadmap [3–5] | Fundamentar peligros, métricas y necesidades | No es un feed de telemetría clínica |
| OSDR [7,8] | Estudios de biología, fisiología y ambiente; explorar Environmental Data y RadLab | Parte de datos humanos requiere autorización; revisar metadatos y licencia por estudio |
| NASA Life Sciences Portal [9] | Investigación humana y estudios análogos | No asumir acceso libre a registros individuales |
| NASA Technical Reports Server [10] | Evidencia técnica y estudios | Verificar versión y derechos de cada documento |
| NASA-STD-3001 [11] | Referencia de salud y desempeño humano | No convertir automáticamente estándares en umbrales médicos del prototipo |
| NASA DONKI [12] | Eventos solares históricos y contexto | No equivale a dosis absorbida por un astronauta |
| PhysioNet MIT-BIH [13] | ECG terrestre anotado para comprobar procesamiento | No representa astronautas ni valida desempeño espacial; verificar licencia de la versión |
| NeuroKit2 [14,15] | Generación y análisis reproducibles de bioseñales | No es un dispositivo médico ni un modelo completo de fisiología espacial |

**Plan de datos:** primero señales sintéticas versionadas con semilla; luego importar un recurso público NASA pertinente y autorizado, con ID de estudio/evento, licencia, fecha, enlace y transformación documentados. Investigar RadLab y DONKI como candidatos de contexto ambiental, sin atribuirlos a un tripulante. Para PhysioNet documentar versión y condiciones antes de redistribuir. No descargar ni publicar datos restringidos. No inventar IDs de conjuntos NASA ni presentar ingestiones como completadas si no se probaron.

## 8. NeuroKit2 y estrategia analítica

NeuroKit2 es una biblioteca Python de procesamiento de señales fisiológicas. Para ECG ofrece generación sintética, limpieza, detección de picos y estimaciones de frecuencia; también incluye procesamiento PPG, respiración, HRV y otras señales. [14,15]

Pipeline inicial: generar segmentos deterministas → conservar señal cruda → procesar → validar resultados/ calidad → persistir features y versión del algoritmo → publicar resumen en API → visualizar → evaluar desviación sostenida con reglas explícitas.

El baseline de demo se establece con parámetros ficticios documentados o una fase normal de calibración; congelarlo cuando se activa una desviación. Diferenciar variación por actividad, mala calidad, retraso de sensor y desviación persistente. No usar un modelo predictivo entrenado con datos terrestres como si estuviera validado para el espacio. No dar medicación, diagnósticos, probabilidades clínicas ni afirmaciones de prevención garantizada.

## 9. Referencias de ingeniería propias

Se revisaron README, manifiestos, Docker Compose, módulo principal y AGENTS.md de LATEX, además de README de ML-EMULSIONES y RAR. No se auditó todo el código ni se autoriza copiarlo.

- LATEX: separación InfluxDB (serie continua) y PostgreSQL (eventos, estados), API NestJS modular, frontend React/Vite/TypeScript, autorización backend, migraciones, auditoría, simuladores y despliegue on-premise.
- ML-EMULSIONES: servicio analítico Python independiente que consume InfluxDB y expone resultados vía REST; AEGIS sustituye predicción industrial por procesamiento fisiológico documentado.
- RAR: organización por dominios, flujos, roles y trazabilidad.

AEGIS debe ser un repositorio independiente, sin copiar secretos, datos, recursos gráficos ni código empresarial sin autorización. Los repositorios privados son referencias de metodología, no dependencias de compilación ni materiales de la demo pública.

## 10. Propuesta de interfaz y demostración

Actualización 14/11/2026 (ADR-001): interfaz integral nativa React/ECharts para monitorización, análisis, configuración y gestión. No dashboards externos ni iframes. Toda comunicación pasa por NestJS y el único acceso Nginx.

Mission Control con cuatro tarjetas de tripulantes, indicadores, hora de última actualización, estado de datos y gráficos; ambiente del hábitat; eventos recientes y estado local/ sin enlace a Tierra. El detalle individual muestra ECG, tendencias, baseline y observaciones. El simulador modifica la fuente de datos, no el estado visual directamente. Events permite reconocer y resolver revisiones con nota. El diseño será sobrio, técnico, oscuro, de alto contraste y con estados comprensibles sin depender solo del color.

Guion: arranque local → misión normal → activar desviación sintética → verificar que las muestras se almacenan → alerta explicada con evidencia → reconocer evento → histórico → simular desconexión de sensor → mostrar datos no disponibles → comprobar operación sin Internet. Para exposición pública, explicar límites y fuentes de evidencia. No usar logotipos NASA de forma que sugieran respaldo oficial.

## 11. Criterios de éxito y evolución

Primera instancia: levantar el stack con Docker Compose, abrir frontend, ver datos persistidos y ECG generados de verdad, activar escenario y consultar eventos/auditoría. Toda validación inicial es técnica, no clínica. Después incorporar fuentes NASA verificadas, protocolos revisados por profesionales, evaluación de sensibilidad y falsas alarmas, interoperabilidad, privacidad/retención, estudios con consentimiento y validación clínica independiente si se pretende uso real.

## 12. Fuentes

Consulta: 14/11/2026. [1–8,14] fundamentan la síntesis; [9–13,15] son referencias y candidatos a comprobar antes de integración.

1. NASA Space Apps, desafío oficial: https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/
2. Edición y fechas: https://www.spaceappschallenge.org/2026/
3. NASA, Five Hazards: https://www.nasa.gov/hrp/hazards/
4. NASA, riesgos: https://www.nasa.gov/hrp/risks/
5. Human Research Roadmap: https://humanresearchroadmap.nasa.gov/
6. NASA, EIMO Clinical Decision Support (2024): https://www.nasa.gov/centers-and-facilities/ames/ames-science/ames-space-biosciences/a-clinical-decision-support-system-for-earth-independent-medical-operations/
7. NASA, About OSDR: https://science.nasa.gov/biological-physical/data/osdr/
8. NASA, acceso controlado: https://www.nasa.gov/reference/osdr-tutorials-requesting-controlled-access-datasets/
9. NASA HRP, bases de ciencias de la vida: https://www.nasa.gov/hrp/
10. NTRS: https://ntrs.nasa.gov/
11. NASA Technical Standards: https://standards.nasa.gov/
12. NASA Open APIs / DONKI: https://api.nasa.gov/
13. PhysioNet MIT-BIH: https://physionet.org/content/mitdb/1.0.0/
14. NeuroKit2 documentación: https://neuropsychology.github.io/NeuroKit/introduction.html
15. NeuroKit2 repositorio: https://github.com/neuropsychology/NeuroKit
16. LATEX (referencia arquitectónica): https://github.com/d-roldan/LATEX
17. Guía de presentación (confirmar versión vigente): https://www.spaceappschallenge.org/resources/project-submission-guide/

## Continuidad de evidencia visible
La instrucción de conservar la UI ante interrupciones se implementa como último registro rotulado, sin equivalencia con monitorización en vivo ni evaluación médica. Archivo autoritativo en Influx y copia acotada de vistas en navegador, según docs/UI_CONTINUITY.md y ADR-005.

