# Preferencias de interfaz

Configuración (`/settings`) aparece inmediatamente debajo de Sistema en la navegación. Permite oscuro/claro e inglés/español, sin recargar. Disponible para todos los roles, incluido CREW. Los controles tienen grupos radio, estados accesibles, foco de teclado y diseño responsive.

Preferencias locales al navegador/origen: clave `aegis.preferences`, sin datos sensibles ni sesión. Se restauran al recargar; si el almacenamiento está bloqueado, se conservan durante la sesión. Valores iniciales: inglés y oscuro. No son configuración de adquisición ni reglas fisiológicas y no se envían a bases de telemetría.

Paleta mediante variables CSS compartidas y estilos ECharts por tema. Diccionario de interfaz en `preferences.ts`; traducción nativa durante render, sin modificar DOM por observadores. Incluye navegación, formularios, estados, mensajes operativos, métricas, ejes, leyendas, accesibilidad y textos explicativos. Horas UTC en formato 24h; números según locale.

Contratos, identificadores, CSV de datos, JSON de evidencia original y observaciones libres conservan sus valores para trazabilidad. Los textos operativos se traducen en pantalla; los datos no se reescriben. La documentación formal Swagger mantiene nombres y contratos técnicos en inglés.

Regresión reproducible: `tests/e2e/preferences.js` es un snippet para `playwright-cli run-code` dentro del contenedor de pruebas. Verifica posición de navegación, cuatro combinaciones, gráficos nativos y persistencia tras recargar. No requiere una dependencia de producción adicional.

## Barra lateral · 15/11/2026

La misma preferencia local aegis.preferences incluye sidebarCollapsed. Se conserva al cambiar tema/idioma y al recargar. Si no existe valor previo, el menú comienza contraído en pantallas de hasta 760 px y desplegado en escritorio. Un error de almacenamiento conserva la selección en memoria. El botón superior del menú permite modificarla con ratón o teclado. Los destinos mantienen nombres accesibles y, cuando están contraídos, títulos de ayuda. En móvil se despliega sobre el contenido y se cierra mediante su botón, el fondo exterior o la selección de destino.
