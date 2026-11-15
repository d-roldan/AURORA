# Catálogo integral de métricas · V0.1.0

Ampliación solicitada el 14/11/2026. Contrato ejecutable: `apps/backend/prisma/metrics.json`, persistido como MetricDefinition mediante migración 003 y seed idempotente. 38 métricas en 11 categorías; las cinco ambientales son compartidas por hábitat y se presentan como contexto de cada astronauta, sin duplicarlas en PostgreSQL ni por tripulante en Influx.

| Categoría | Métricas implementadas |
|---|---|
| Cardiovascular | Frecuencia cardíaca, HRV RMSSD/SDNN, presión sistólica/diastólica, ECG crudo y HR derivada del ECG |
| Respiratoria | SpO₂ y frecuencia respiratoria |
| Metabólica | Temperatura corporal e hidratación representada como fracción sintética de agua corporal |
| Muscular | Actividad MET, fuerza de prensión N, duración y cantidad de sesiones de ejercicio |
| Ósea | Densidad mineral ósea g/cm² y registros periódicos sintéticos de P1NP/CTX ng/mL |
| Psicológica | Estrés percibido, humor y fatiga autoinformados sintéticos |
| Cognitiva | Tiempo de reacción ms y precisión % de tarea de atención sintética |
| Sueño | Duración h, interrupciones, inicio y fin como hora UTC decimal 0–24 |
| Radiación | Dosis acumulada mSv y tasa µSv/h |
| Ambiental | CO₂ ppm, O₂ %, temperatura °C, humedad % y presión kPa |
| Operacional | Carga de trabajo, descansos diarios, tiempo diario de EVA y estado EVA 0/1 |

## Procedencia y cadencias

La demo no incorpora sensores médicos reales ni datos NASA. 35 métricas son SIMULATED (incluido ECG y las ambientales); HR ECG y ambas HRV son DERIVED. El catálogo total es 38. Ninguna métrica ósea, metabólica, psicológica, cognitiva o de sueño se infiere de ECG.

CONTINUOUS: escalares a 2s, ECG de los cuatro tripulantes a 250Hz. Se generan segmentos continuos de diez minutos por persona con semilla estable; cada segmento es independiente. No hay diagnóstico por morfología. El estado EVA del escenario actual de reposo es 0; duración EVA diaria sintética 0. No se implementó un escenario EVA activo ni causalidad entre indicadores.

PERIODIC: 17 campos de registro. Se emite una instantánea ficticia al iniciar cada escenario, luego según cadencia del catálogo (diaria, semanal o mensual). Densidad ósea no se trata como sensor de 2s. No se inventan meses de seguimiento histórico ni laboratorios adquiridos. Cambiar de escenario puede crear otra instantánea sintética: no representa una nueva evaluación médica real.

DERIVED: HR por ecg_process cada ~15s por astronauta. HRV cada ~60s, solo con exactamente 75000 muestras contiguas a 250Hz (5min). Huecos o señal insuficiente dejan N/A, sin ceros ficticios. Método: ecg_clean → ecg_peaks(correct_artifacts=True) → ecg_quality → hrv_time. Se comprueban cantidad de picos, intervalos y finitud; RMSSD/SDNN en ms. Intervalos NN son un supuesto experimental de ECG sinusal sintético, no una validación clínica. Referencia técnica: [NeuroKit2 HRV](https://neuropsychology.github.io/NeuroKit/functions/hrv.html).

Los valores de dosis se integran en el modelo sintético y parten del último acumulado persistido al iniciar una nueva ejecución. No convierten eventos solares en dosis personales. Hora de sueño es una coordenada horaria UTC para visualización, no una medición de un episodio real de sueño. Atención es precisión ficticia en tarea, no un puntaje de salud.

## Vista de Telemetría

Todas seleccionadas inicialmente. Seleccionar/deseleccionar individualmente, por categoría, en masa o desde la leyenda ECharts; la selección se sincroniza. La leyenda tiene paginación y la lista por categoría se puede expandir para mantener visible el gráfico.

Superposición relativa: `(valor - displayMin) / (displayMax - displayMin) × 100`. Los rangos son parámetros visuales ficticios documentados, nunca límites clínicos ni un score de salud. No se recortan valores fuera del rango. Tooltips y CSV mantienen valores/unidades originales. Se permite alternar a ejes con unidades originales al seleccionar hasta dos unidades distintas. La comparación adicional de tripulante conserva el contexto ambiental único.

ECG se limita a los últimos 30s del intervalo para evitar cargas sin límite; su panel dedicado mantiene 12s de señal cruda. Las tendencias periódicas unen con líneas la última observación de cada intervalo del catálogo, sin generar muestras intermedias; los registros originales completos permanecen en API/CSV. Ver LINEAR_TRENDS.md. Si no hay registros dentro del rango, la serie queda vacía; el catálogo informa el último registro real y su fecha en la descripción. Historia máxima actual: 90d por consulta (retención 90d para escalares/features, 7d para ECG).

API: GET `/api/v1/telemetry/catalog?subjectId=...` devuelve descripción, unidad, categoría, cadencia, origen, rango visual, asignación y última lectura. GET history/waveforms solo mediante API NestJS. POST `/analytics/hrv?subjectId=...` requiere ADMIN/MEDICAL. CREW accede a sus datos y al hábitat de su misión, nunca a otro tripulante.

Exportación CSV: UTC, sujeto, categoría, key, valor, unidad, origen, cadencia y versión de algoritmo. Incluye únicamente series seleccionadas y puntos efectivamente almacenados. El idioma de la interfaz no reescribe contratos ni datos originales.

## Ampliación operativa actual
El catálogo actual contiene 60 métricas (57 SIMULATED y 3 DERIVED) en 11 categorías. Las 22 adiciones cubren glucosa, modelos oculares/fluidos, sueño, plasma/vasculatura, rover, metabolismo, consumibles, marcha, polvo y señal solar sintética. Cadencias, unidades y procedencia autoritativas: apps/backend/prisma/metrics.json. Ver OPERATIONAL_MODES.md. Los resultados anteriores de 38 métricas describen el incremento previo.

