# AEGIS development conventions

- Read both source specifications before changing scope. Work in Spanish; code identifiers and initial UI in English.
- Preserve independent monorepo boundaries: React UI, NestJS core, Python analytics and simulator, infrastructure.
- API owns all writes. Validate DTOs, units, timestamps, payload size and authorization server-side. Never trust UI permissions.
- AEGIS has one integral native React UI. Apache ECharts is the visualization engine; no Grafana, embedded dashboards or external application iframes. All frontend data access passes through NestJS and the same Nginx origin.
- PostgreSQL stores entities, versioned baselines, events and audit only; InfluxDB stores raw and derived time series.
- Use UTC and stable point identity. Do not fabricate successful integrations, medical conclusions, NASA imports or test results.
- Demo uses fictitious people and explicitly labeled synthetic data only. No real medical records or secrets in source control.
- Version database changes with Prisma migrations. Seed idempotently. Never reset volumes without explicit authorization.
- Pin dependencies, retain lockfiles, avoid external runtime services and remote fonts.
- All user-facing UI copy must use the native English/Spanish locale dictionary. Preserve protocol values, original evidence and user notes; never translate values sent to the API. Use theme CSS variables and the shared ECharts theme palette. Preferences must remain accessible to every role and persist locally.
- Every feature must handle unavailable, stale and degraded data; absence of data is not health evidence.
- Test meaningful risks and end-to-end behavior; document observed results, limitations, decisions and release notes.
- SemVer starts at V0.1.0. Follow PDCA: plan a bounded change, implement, verify, document improvements (Kaizen).
- Do not publish, push, configure a public domain or apply a license without authorization.

- Operational priorities and demo thresholds belong to NestJS. Keep universal slots and radiation visible; missing data must never clear an active condition. Do not introduce medical instructions or portray synthetic scenario signals as external scientific feeds.


- Preserve actual last readings and ECG traces across transient failures; label retained evidence with its original observation time and never as live. UI caches are partitioned by authenticated identity, contain no credentials, and never feed alert rules. See docs/UI_CONTINUITY.md.

