# Modos operativos de perfil

En Crew → perfil, los botones Spacecraft, Space station, Rover y Lunar / planetary base abren una vista nativa a pantalla completa. Escape o Exit focus devuelve al perfil. Si el navegador rechaza Fullscreen API, se mantiene una vista que ocupa la ventana con opción de reintentar. En móviles se permite desplazamiento para conservar legibilidad. La selección cambia prioridades de visualización; no constituye una asignación física ni modifica el escenario del simulador.

## Cinco espacios y radiación permanente

1. SpO₂ fijo.
2. Frecuencia cardíaca y HRV RMSSD/SDNN fijos. HRV requiere cinco minutos ECG contiguos; N/A expresa ausencia o caducidad, nunca un valor inventado.
3–5. Tres grupos prioritarios según entorno; cada grupo contiene entre dos y cinco mediciones relacionadas.

Para mantener también el tercer parámetro universal sin consumir espacios dinámicos, una franja independiente muestra siempre tasa y dosis de radiación, y la señal SPE sintética.

| Entorno | Espacio 3 | Espacio 4 | Espacio 5 |
| --- | --- | --- | --- |
| Tránsito | Fluidos cefálicos y presión ocular | Estrés, ánimo y fatiga | Sueño y horario circadiano |
| Estación | Registros de ejercicio | CO₂, volumen plasmático y resistencia vascular | Atención y reacción |
| Rover | Presión y gases del rover | Potencia metabólica, gasto energético, respiración y temperatura | Hidratación y consumibles |
| Superficie | Carga musculoesquelética | Marcha y fatiga | Polvo y dosimetría |

Son canales sintéticos identificados por procedencia y cadencia. Presión del rover no representa presión del traje ni presión de cabina. No existe prescripción ARED/cinta/bicicleta configurada: se muestran registros, no un porcentaje ficticio de cumplimiento. IOP, fluidos, volumen plasmático, sueño y estado psicológico son registros/modelos ficticios; no se infieren desde ECG, voz o una IA clínica. No hay fuente meteorológica solar externa ni predicción SANS/caídas.

## Emergency Override experimental

NestJS evalúa únicamente lecturas SIMULATED, GOOD y recientes, mediante reglas deterministas versionadas en `operational-rules.ts`. Los límites son valores técnicos de demostración sin validación médica y no se deducen de los rangos gráficos del catálogo. No se aplica este motor a datos reales medidos.

- Amarillo: borde y aviso contextual, sin reemplazar mediciones principales.
- Rojo secundario: reemplaza solamente el espacio dinámico 5. Prioridad explícita y desempate estable por métrica; nunca sustituye los espacios universales ni la franja de radiación. Las demás alertas siguen en la respuesta API y en Events.
- Rojo universal: conserva su medición fija y muestra aviso/procedimiento; no desplaza una medición dinámica.
- La condición permanece enclavada ante pérdida o baja calidad de datos. La API conserva value:null para los datos caducados; la UI muestra lastValue rotulado como último registro, con su hora original (UI_CONTINUITY.md). Dos observaciones normales consecutivas, GOOD y separadas por no más de cinco segundos, recuperan la condición. Una lectura inválida rompe esa secuencia.
- Reconocer/resolver un evento es revisión humana independiente; no elimina una condición activa. Recuperar la señal tampoco resuelve automáticamente el evento.
- PostgreSQL conserva el estado del episodio, evento y auditoría; InfluxDB conserva las muestras. Un bloqueo transaccional por dispositivo evita episodios concurrentes duplicados. Reiniciar la API conserva el enclavamiento.

Las instrucciones rojas son exclusivamente verificación operativa y aviso a una persona responsable. AEGIS no tiene protocolos clínicos ni emite recomendaciones terapéuticas. El rótulo de emergencia describe una demostración visual, no una clasificación médica validada. La guía usa reglas locales explicables, sin un modelo de lenguaje o servicio de IA externo.

## Demostración y verificación

ADMIN puede elegir YELLOW_ALERT_DEMO (glucosa sintética 195 mg/dL), RED_ALERT_DEMO (280 mg/dL) o SOLAR_EVENT_DEMO (señal SPE y tasa sintética) en Simulator. NORMAL recupera valores. El catálogo aumenta a 60 métricas: 57 sintéticas y 3 derivadas, con 11 categorías. Las métricas añadidas también están en históricos y exportación.

`scripts/operational.ps1` verifica los cuatro entornos, prioridades, escalado sin duplicación, revisión humana, reinicio de API, caducidad, recuperación, SPE, reintentos y autorización. Requiere el Compose local y modifica solamente escenarios/eventos ficticios. Restaura NORMAL al finalizar. Evidencia observada en VALIDATION.md.


Límite actual: solo las 13 reglas explícitas del motor producen niveles operativos. No se asume cobertura clínica de las 60 métricas. El autostart respeta una detención manual del productor: solo inicia un simulador recién creado sin runId.


## Presentaciones según dispositivo · 15/11/2026

Crew → perfil → Operational environment conserva los cuatro entornos. Space station abre Station TV; Spacecraft, Rover y Lunar / planetary base abren Astronaut visor. Dentro de la vista, Display device permite elegir visor, TV o Detailed monitor. Idioma y tema están disponibles para todos los roles dentro de pantalla completa.

- **Visor:** tarjeta emergente amarilla o roja según NestJS, evidencia con fecha UTC y guía operativa de verificación/aviso humano; sin alerta queda un estado de espera explícito. Las constantes universales y radiación siguen visibles. No reproduce la escena de fondo de la referencia ni transmite una cámara.
- **TV:** todos los perfiles autorizados de la misión, constantes universales y radiación por persona; CO₂, oxígeno, presión, temperatura y humedad de cabina. No representa ubicación física: no existe asignación EVA ni geolocalización en el modelo. Las condiciones activas aparecen automáticamente y las rojas se presentan primero. En desktop grande los emergentes se superponen al seguimiento; múltiples avisos admiten desplazamiento en el panel sin ocultar ni descartar episodios.
- **Monitor detallado:** conserva el tablero anterior de cinco espacios por entorno, incluidos overrides y procedimientos.

La guía procede del contrato operacional de NestJS. No hay protocolos clínicos configurados; no se incorporan consejos médicos desde la imagen. Los avisos solo desaparecen cuando el backend confirma recuperación, y esto no resuelve eventos de revisión humana. La pérdida de conexión conserva evidencia y alerta con estado no actual. La selección de dispositivo tampoco cambia el escenario o la ubicación.

Verificación reproducible: abrir una sesión Playwright CLI local en el perfil CREW-01 y ejecutar `scripts/device-displays.ps1`. Usa los dos perfiles sintéticos sembrados CREW-01/02, activa escenarios amarillos/rojos, bloquea GET del navegador sin detener servicios y restaura NORMAL al finalizar. La prueba genera eventos sintéticos persistidos, no los borra. No ejecutar sobre una demostración que deba mantener otro escenario.
