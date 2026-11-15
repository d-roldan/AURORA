# Roadmap / Kaizen

V0.1.0: flujo vertical sintético local, eventos humanos, persistencia real y verificación técnica. No validación clínica.

Próximos ciclos PDCA:
1. Recuperar continuidad y episodios activos desde almacenamiento; ledger batchId/hash durable; outbox/reconciliación entre stores; pruebas de reinicio en mitad de un episodio.
2. Validar recuperación de backups, retenciones configurables y límites de recursos; separación de usuarios de migración y API en PostgreSQL.
3. Extender gestión administrativa (dispositivos, catálogo, baseline versionado, usuarios) y elección explícita de misión activa; simulador para nuevas misiones. Actualmente misión operativa ARES-01.
4. Dividir fachada HTTP por dominios y realizar una auditoría WCAG completa; ampliar cobertura móvil y E2E de roles. Modos claro/oscuro e idiomas inglés/español ya están integrados en Configuración.
5. ECG y HRV experimentales de los cuatro sujetos implementados. Siguiente: cola con límites, identificación/rechazo de ventanas que cruzan segmentos y trazabilidad más completa de ventanas.
6. LOW_QUALITY con episodios persistentes y visualización de calidad procesada. El MVP acepta calidad técnica y evita continuidad inválida pero no expone un escenario de baja calidad ni clasificación clínica.
7. Elegir un dataset NASA concreto, revisar licencia/autorización, importar con ID y transformación verificable; no confundir contexto solar con dosis personal. Extender HRV experimental solo tras revisión experta; PPG requiere un protocolo y validación propios.
8. Revisión experta y estudios adecuados antes de hablar de uso médico. Sin diagnósticos ni recomendaciones terapéuticas autónomas.

No implementados: dispositivos reales, validación clínica de HRV, informes PDF, sincronización Tierra, multi-tenant, edición de misiones existentes, administración de usuarios y fuentes científicas importadas. Regla actual supone REST en demo; no modelo de actividad física.
