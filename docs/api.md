# API REST de SkillBarter

Base local: `http://localhost:3000`. Todas las rutas (salvo `/api/health`) exigen
`Authorization: Bearer <ID token de Firebase>`. Los errores siempre tienen la forma
`{ "error": { "code": "...", "message": "...", "details": [...] } }`.

## Salud
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado del servicio (público) |

## Catálogo de habilidades
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/skills` | autenticado | Lista ordenada por nombre |
| POST | `/api/skills` | admin | Crea `{id, name, category}` · 409 `SKILL_EXISTS` |
| PUT | `/api/skills/:id` | admin | Edita `{name, category}` |
| DELETE | `/api/skills/:id` | admin | 204 · 409 `SKILL_IN_USE` si alguien la ofrece |

## Usuarios
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/api/users/me` | autenticado | Alta de perfil (201) · 409 `PROFILE_EXISTS` · crea la billetera con 120 min |
| GET | `/api/users/me` | autenticado | Mi perfil · 404 `PROFILE_NOT_FOUND` |
| PUT | `/api/users/me` | miembro | Actualiza mi perfil |
| GET | `/api/users?offers=<skillId>&wants=<skillId>` | miembro | Búsqueda; devuelve solo datos públicos |

Cuerpo de `POST/PUT /api/users/me`:
```json
{
  "displayName": "Ana Pérez",
  "bio": "Enseño guitarra",
  "offeredSkills": [{ "skillId": "guitarra", "level": "advanced" }],
  "wantedSkills": ["python"],
  "availability": [{ "day": 1, "start": "18:00", "end": "20:00" }]
}
```

## Solicitudes de aprendizaje
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/api/requests` | miembro | `{skillId, description (10-500), durationMinutes}` → 201 `status: open` |
| GET | `/api/requests?status=&skillId=&mine=true` | miembro | Listado filtrable |
| GET | `/api/requests/:id` | miembro | Detalle · 404 |
| PATCH | `/api/requests/:id` | autor / admin | Edita `description`/`durationMinutes` · 409 si no está `open` |
| DELETE | `/api/requests/:id` | autor / admin | 204 · 409 `REQUEST_IN_PROGRESS` si está asignada o cumplida |

## Sesiones
| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| POST | `/api/sessions` | miembro (alumno) | `{teacherId, skillId, startAt (ISO), durationMinutes, requestId?, notes?}` → 201 `pending` |
| GET | `/api/sessions?as=teacher\|learner&status=` | miembro | Mis sesiones |
| GET | `/api/sessions/:id` | participante / admin | Detalle · 403 si no participa |
| POST | `/api/sessions/:id/accept` | docente | `pending → accepted` · 409 `SCHEDULE_CONFLICT` |
| POST | `/api/sessions/:id/reject` | docente | `pending → rejected` |
| POST | `/api/sessions/:id/cancel` | docente o alumno | `pending/accepted → cancelled` |
| POST | `/api/sessions/:id/confirm` | alumno | `accepted → completed` y acredita al docente |

## Billetera
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/wallet` | `{ balanceMinutes, balanceHours }` (crea la billetera si no existe) |
| GET | `/api/wallet/transactions?limit=50` | Historial, más reciente primero |

## Compatibilidad
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/matches?skillId=` | Docentes con `score` 0-100, `breakdown` y `reasons[]` |

## Administración (solo rol `admin`)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/admin/stats` | Conteos de miembros, solicitudes y sesiones; minutos intercambiados |
| GET | `/api/admin/users` | Miembros (máx. 100) |
| PATCH | `/api/admin/users/:id` | `{role?, disabled?}` · 400 `CANNOT_MODIFY_SELF` |

## Códigos de error frecuentes
| HTTP | `code` | Cuándo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Entrada inválida (ver `details`) |
| 400 | `UNKNOWN_SKILL`, `SELF_SESSION`, `START_IN_PAST`, `TEACHER_DOES_NOT_OFFER_SKILL` | Regla de negocio |
| 401 | `UNAUTHENTICATED`, `INVALID_TOKEN` | Sin token o token inválido |
| 403 | `FORBIDDEN`, `PROFILE_REQUIRED`, `USER_DISABLED` | Sin permiso |
| 404 | `NOT_FOUND`, `TEACHER_NOT_FOUND`, `REQUEST_NOT_FOUND` | No existe |
| 409 | `INVALID_TRANSITION`, `SCHEDULE_CONFLICT`, `REQUEST_NOT_OPEN`, `REQUEST_IN_PROGRESS`, `PROFILE_EXISTS`, `SKILL_EXISTS`, `SKILL_IN_USE` | Conflicto de estado |