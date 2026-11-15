# Continuidad de datos visibles

Actualización AURORA (15/11/2026): el cambio de marca conserva `aegis-display-cache` y las claves de identidad existentes. Las consultas `personalTrend` se incluyen en la misma copia visual autorizada; no crean otra caché ni alimentan reglas. El espacio personal comparte `metricCatalog`, `operationalView`, ECG e históricos con las vistas existentes. Los check-ins siguen consultándose contra NestJS y no se incorporan a la copia persistente por este cambio.

## Problema observado y corrección

La ingesta ya persistía en InfluxDB, pero el frontend reemplazaba números antiguos por N/A o guiones. La ventana móvil del ECG quedaba vacía al detenerse la fuente, los fallos individuales del histórico devolvían arrays vacíos y la caché de TanStack Query desaparecía al recargar. Además, el productor generaba los siguientes cuatro segmentos ECG al llegar al límite de diez minutos, suspendiendo temporalmente la emisión mientras esperaba a NeuroKit2.

Ahora la UI conserva la última lectura y el último trazado real recibido. Un corte o reinicio no convierte el valor en cero ni actualiza artificialmente su fecha. Se distingue el último registro de una medición en vivo con color, texto, hora de observación y estado de comunicación. N/A queda para métricas sin ninguna lectura disponible. La API mantiene `value:null` cuando la medición operacional es inválida/antigua y entrega `lastValue` como evidencia; la UI puede mostrar esa evidencia rotulada. El motor de alertas sigue evaluando únicamente lecturas nuevas válidas: el caché no interviene en sus decisiones.

## Persistencia y reconexión

- InfluxDB y sus volúmenes siguen siendo el archivo autoritativo. PostgreSQL no recibe duplicados de las series.
- IndexedDB `aegis-display-cache` guarda una copia de las vistas consultadas: misión, perfiles, últimas mediciones, catálogo, modos operativos y gráficos. Se separa por usuario, rol y sujeto asignado; se restaura después de autenticar esa identidad contra nuestra API. No se guardan contraseñas, JWT ni respuestas de autenticación. Un cambio de cuenta limpia primero la caché en memoria y restaura solamente la partición correspondiente.
- Escritura agrupada cada 1,5 s, máximo aproximado de 32 MiB serializados por identidad, priorizando registros y vistas antes de históricos grandes. No es un respaldo completo ni garantía de conservación de cada frame. Si el navegador bloquea el almacenamiento o agota su cuota, aparece un aviso y permanece la copia en memoria y el histórico del servidor. Borrar datos del navegador elimina esta copia local, nunca los volúmenes de InfluxDB.
- Un error de red conserva los resultados anteriores y permanece como error observable, sin fingir una respuesta nueva exitosa. Al recuperar la API, el polling sustituye los datos guardados por las lecturas confirmadas. Los estados de frescura se calculan también con el reloj del cliente; un indicador LIVE guardado no vuelve actual una lectura vieja.
- La recarga restaura el contenido después de validar la sesión. Si se recarga con toda la API apagada, la autenticación espera y reintenta hasta que vuelva: no se permite consultar cachés de otra identidad sin autenticarla. Mantener la página abierta durante ese corte sí conserva la vista inmediatamente.
- Los JWT vencen a las ocho horas. El visitante demo renueva su sesión de lectura de forma automática. Los operadores deben autenticarse nuevamente; se conservan los datos y no se cambia silenciosamente de rol. La pantalla completa se cierra para permitir ese ingreso. No se persiste el JWT entre recargas.

## Señales e históricos

El ECG detenido se muestra congelado con su horario original y el rótulo de último ECG registrado. No se genera una animación o traza sustituta. Los fallos por serie mantienen los puntos previamente consultados con aviso. En ventanas automáticas, si una serie termina fuera del rango móvil y no llegan datos nuevos, se conserva la última traza y se explicita que no está en vivo; no se cambian sus timestamps para hacerla entrar en el rango. Cambiar a un rango personalizado vacío conserva la semántica de consulta vacía. CSV incorpora `displayState=RETAINED|STORED`, manteniendo valores, fuentes y tiempos originales.

La lectura del último indicador derivado consulta la retención de 90 días y la última muestra de ECG del catálogo hasta los siete días retenidos, en lugar de eliminar su referencia al pasar una hora o treinta segundos. Los históricos de señal siguen acotados a ventanas cortas. La caducidad sigue siendo explícita.

El simulador prepara el siguiente segmento ECG desde el minuto ocho en un hilo de trabajo, manteniendo la emisión del segmento actual. El bloque siguiente se utiliza en el límite de diez minutos. Si el equipo no termina a tiempo, puede existir una brecha real; la UI la informa y conserva la última evidencia. No se inventa continuidad de muestras. Los cambios de escenario cancelan la preparación pendiente y no borran los históricos.

## Verificación reproducible

`node --test tests/retained.test.mjs tests/session-refresh.test.mjs` (Node 22.20 o posterior) comprueba retención, valores nulos/cero, frescura por timestamp y renovación de sesión. `services/simulator/tests/test_continuity.py` avanza el reloj del productor durante 620 segundos con un trabajador deliberadamente pendiente: comprueba que siguen saliendo lotes cada dos segundos y que cambia el bloque ECG a los 600 segundos. Es una prueba de planificación con generación sustituida; no constituye una observación de diez minutos de NeuroKit2 real.

`scripts/continuity.ps1`, con el contenedor auxiliar `aegis-browser` y Playwright CLI disponible, detiene el productor y la API de este proyecto, recarga, bloquea temporalmente lecturas GET del navegador, comprueba restauración y vuelve a NORMAL. Las lecturas utilizadas provienen del simulador real, NestJS e InfluxDB. Resultados observados en VALIDATION.md.

Comando observado para la prueba de planificación, sin reconstruir la imagen de producción:

```powershell
docker cp services/simulator/tests/test_continuity.py aegis-aegis-simulator-1:/tmp/test_continuity.py
docker compose exec -T -e PYTHONPATH=/app aegis-simulator python -m pytest -q -p no:cacheprovider /tmp/test_continuity.py
```
Actualización de tendencias (15/11/2026): las líneas escalares unen registros almacenados sin crear mediciones entre ellos; los huecos reales del ECG siguen visibles. Periódicas muestran la última observación por intervalo de catálogo, conservando la última lectura y todos los registros crudos para CSV. Las ventanas `personalTrend` forman parte de su clave de caché para separar consultas de una hora, siete días, 21 días y hasta 90 días. El historial de demo es una importación explícita en InfluxDB, no relleno del caché ni respuesta inventada del frontend; no evalúa reglas ni cambia lastSeenAt. Ver LINEAR_TRENDS.md.

