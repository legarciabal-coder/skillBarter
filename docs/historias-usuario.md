# Historias de usuario

Formato: *Como [rol], quiero [acción] para [beneficio]*. Cada historia indica la revisión en que se implementa.

| ID | Historia | Criterios de aceptación | Rev. |
|---|---|---|---|
| HU-01 | Como **persona nueva**, quiero registrarme e iniciar sesión con correo y contraseña para tener una cuenta propia. | Cuenta creada en Firebase Auth · al volver a entrar veo mi perfil · sin token la API responde 401. | R1 |
| HU-02 | Como **miembro**, quiero crear mi perfil con las habilidades que ofrezco y los temas que quiero aprender para que me encuentren. | Nombre 2–60 caracteres · solo habilidades del catálogo · el rol lo asigna el servidor (`member`). | R1 |
| HU-03 | Como **miembro**, quiero indicar mi disponibilidad semanal para coordinar sesiones. | Franjas `HH:MM` con inicio < fin · se guardan en mi perfil. | R1 |
| HU-04 | Como **miembro**, quiero buscar quién enseña una habilidad para encontrar con quién aprender. | Lista de miembros que la ofrecen · no se muestra el correo ni el rol · no aparezco yo. | R1 |
| HU-05 | Como **miembro**, quiero publicar una solicitud de aprendizaje para que otros sepan qué necesito. | Habilidad del catálogo · descripción ≥ 10 caracteres · duración 30/60/90/120 · estado inicial *abierta* · persiste al recargar. | R1 |
| HU-06 | Como **miembro**, quiero filtrar y consultar solicitudes por habilidad y "solo mías" para encontrar a quién ayudar. | Filtros combinables · orden de más reciente a más antigua. | R1 |
| HU-07 | Como **alumno**, quiero proponer una sesión a un docente y como **docente** aceptarla o rechazarla para coordinar el horario. | Estados pendiente → aceptada/rechazada/cancelada · solo el docente acepta · no se aceptan dos sesiones traslapadas. | R2 |
| HU-08 | Como **alumno**, quiero confirmar que la sesión se realizó para que se transfieran las horas. | Solo el alumno confirma · se acredita al docente y se descuenta al alumno **una sola vez**, aunque se repita la petición. | R2/R3 |
| HU-09 | Como **miembro**, quiero ver mi saldo y mi historial de movimientos para confiar en el sistema. | Saldo en horas/minutos · cada movimiento muestra tipo, detalle y saldo posterior. | R2 |
| HU-10 | Como **miembro**, quiero recibir recomendaciones de docentes compatibles para ahorrar tiempo. | Puntaje 0–100 con explicación (habilidad, horarios, intercambio mutuo, reputación). | R2/R3 |
| HU-11 | Como **miembro**, quiero valorar a la otra persona tras una sesión completada para construir reputación. | Calificación 1–5 · una sola valoración por persona y sesión. | R3 |
| HU-12 | Como **administrador**, quiero gestionar el catálogo y los miembros y ver indicadores/auditoría para mantener la comunidad sana. | Solo rol admin (403 a miembros) · no puede degradarse a sí mismo · la auditoría detecta saldos que no cuadran. | R2/R3 |
