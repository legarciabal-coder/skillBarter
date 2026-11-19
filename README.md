# SkillBarter · Intercambio de habilidades mediante horas

> Proyecto 08 — Lenguajes Modernos de Programación (2026). Flujo central: **Sesión → confirmación → créditos**.

## Problema
Aprender una habilidad suele costar dinero y muchas personas tienen conocimientos que no saben cómo compartir.
Los intercambios informales fallan por falta de confianza: ¿quién cuenta las horas?, ¿quién confirma que la clase ocurrió?

## Objetivo
Una comunidad donde quien **enseña una hora gana una hora** y puede gastarla aprendiendo con otra persona, con un
saldo **auditable y consistente** (sin dobles acreditaciones).

## Alcance del MVP
- Registro/inicio de sesión y dos roles (miembro y administrador).
- Perfil con habilidades ofrecidas, temas a aprender y disponibilidad.
- Catálogo de habilidades y búsqueda de coincidencias.
- Solicitudes de aprendizaje, sesiones (proponer, aceptar, cancelar, confirmar), monedero e historial de movimientos.
- Valoraciones de sesiones completadas.
- Fuera de alcance: pagos reales, videollamadas, chat.

## Roles
| Rol | Puede |
|---|---|
| Miembro | Gestionar su perfil, buscar, publicar solicitudes, proponer/aceptar sesiones, ver su monedero |
| Administrador | Todo lo anterior + gestionar catálogo y miembros, ver indicadores y auditoría |

## Equipo
| Integrante | Rol en el proyecto | GitHub |
|---|---|---|
| Leonardo | Líder de repositorio y documentación, Backend núcleo | legarciabal-coder |
| Kevin | Backend de datos y Firebase | kevingonzalez-maker |
| Jorge | Frontend base, Frontend y QA | jorgenri |

## Tecnología
Node.js 22 · Express 4 · Firebase Authentication · Cloud Firestore · React 19 + Vite · Jest + Supertest.

## Requisitos
Node 22, npm 10, Java 21 (emulador de Firestore), Git.

## Instalación y ejecución local (con emuladores)
```bash
git clone https://github.com/legarciabal-coder/skillBarter.git
cd skillBarter
cp .env.example .env
npm install
npm run emulators      # terminal 1
npm run seed:skills    # terminal 2 (una vez por cada arranque del emulador)
npm run dev:api        # terminal 2 → http://localhost:3000
npm run dev:web        # terminal 3 → http://localhost:5173
```

## Pruebas
```bash
npm test
```

## Variables de entorno
Ver `.env.example`. **Nunca** se suben `.env` ni credenciales de servicio.

## Documentación
- [Arquitectura](docs/arquitectura.md) · [Historias de usuario](docs/historias-usuario.md) · [Modelo Firestore](docs/modelo-firestore.md)
- Revisiones: [R1](docs/revisiones/R1.md)

## Estado
- [x] R1 — 19/11/2026: arquitectura y primera operación con Firebase
- [ ] R2 — 26/11/2026
- [ ] R3 — 03/12/2026
