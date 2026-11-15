# Fundamentos y límites científicos

Fuentes originales preservadas en docs/source/01_AEGIS_CONTEXTO_INVESTIGACION.md. Cinco riesgos HRP orientan el producto; no se implementa evaluación clínica de esos riesgos.

- [NASA HRP hazards](https://www.nasa.gov/hrp/hazards/): contexto científico, no feed de datos.
- [NeuroKit2 ECG](https://neuropsychology.github.io/NeuroKit/functions/ecg.html): ecg_simulate genera sintéticos; ecg_process limpia, detecta R peaks y calcula ECG_Rate/ECG_Quality. Verificado como referencia técnica durante implementación.
- [InfluxDB cliente Node](https://docs.influxdata.com/influxdb/v2/api-guide/client-libraries/nodejs/write/): persistencia en lotes con confirmación.

No datasets NASA ni PhysioNet importados. No SpO₂ inferida desde ECG. Valores sintéticos SpO₂/temperatura/ambiente no equivalen a mediciones. Amplitud ECG a.u. sin calibrar. HR derivada es un cálculo de señal, no un diagnóstico. Calidad NeuroKit2 es una métrica de procesamiento sin validez clínica demostrada aquí. HRV RMSSD/SDNN se calcula experimentalmente con NeuroKit2 a partir de cinco minutos contiguos de ECG sinusal sintético; si no se completa la ventana o la calidad es insuficiente queda N/A. No constituye validación clínica. Ver METRIC_CATALOG.md.

Baseline ficticio de reposo por persona: 62,65,68,64 bpm. Umbral +20% por 30s es exclusivamente regla técnica demostrativa, no tomado de estándares médicos NASA ni justificado como umbral asistencial. No etiqueta salud mental ni causalidad de sueño/CO₂. Eventos piden observación humana; sin protocolo clínico no se proporciona asistencia clínica. No usar datos personales reales, logotipos NASA ni afirmar respaldo institucional.
