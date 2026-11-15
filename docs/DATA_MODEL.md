# Modelo de datos

Prisma schema es el contrato relacional ejecutable; migración inicial SQL versionada y seed idempotente. UUID, UTC, claves únicas, relaciones y referencias explícitas. Mission → CrewMember/Habitat/Device. Cada Device pertenece a un solo sujeto (restricción SQL). MetricDefinition declara unidad, scope e intervalos. User almacena hash y rol. HealthBaseline preserva versiones con centro, dispersión, contexto y método ficticio; AlertRule documenta 20%/30s.

HealthEvent persiste evidencia JSON, versión, sujeto, timestamps, dedupKey único y transiciones OPEN → ACKNOWLEDGED → RESOLVED con actor/nota. HealthCheckIn almacena observaciones manuales; SimulationRun rastrea escenario, semilla, estado y configuración. AuditLog registra operaciones de control/revisión. EvidenceSource contiene referencias, nunca se presenta como dataset adquirido.

No hay tabla de muestras fisiológicas en PostgreSQL. Las series continuas y features viven exclusivamente en Influx. Alta de un perfil/misión es administrativa: no genera sensores ni fisiología ficticia implícita. El registro inicial no se reescribe al volver a ejecutar seed.

## Migración 004: episodios operativos
OperationalAlertState conserva por dispositivo/métrica el nivel enclavado, eventId, tiempos, recoveryCount y versión de regla. No duplica series temporales. Evento y auditoría se escriben en la misma transacción del estado; Influx mantiene las muestras. Ver OPERATIONAL_MODES.md.

