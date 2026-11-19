# Arquitectura

## Diagrama de componentes

```mermaid
flowchart LR
  subgraph Cliente["Navegador · apps/web (React + Vite)"]
    UI["Vistas: Login · Perfil · Buscar · Solicitudes"]
    SDK["Firebase Auth SDK"]
  end
  subgraph Servidor["API REST · apps/api (Node.js + Express)"]
    MW["Middleware: autenticación · validación · errores"]
    RT["Rutas: users · skills · requests"]
    SV["Servicios: reglas de negocio"]
  end
  subgraph Firebase["Firebase"]
    AUTH[("Authentication")]
    FS[("Cloud Firestore")]
  end
  UI -->|"correo y contraseña"| SDK --> AUTH
  UI -->|"HTTPS + ID token"| MW --> RT --> SV
  MW -->|"verifyIdToken"| AUTH
  SV -->|"Admin SDK"| FS
```

## Decisiones
1. **Separación interfaz / reglas de negocio / persistencia.** El navegador no escribe en Firestore: todo pasa por la API (requisito del PDF).
2. **El rol vive en Firestore** (`users/{uid}.role`) y lo decide el servidor; las reglas de Firestore bloquean cualquier escritura desde clientes.
3. **Validación en el servidor** con Zod; el frontend solo ayuda a la persona usuaria.
4. **Inyección de dependencias** (`createApp({ db, verifyToken })`) para probar sin Internet.

## Bocetos de las 4 pantallas

```text
┌ Iniciar sesión ────────────┐   ┌ Mi perfil ─────────────────────────────────┐
│ ⏳ SkillBarter             │   │ Nombre público  [______________]            │
│ Correo      [____________] │   │ Sobre mí        [______________]            │
│ Contraseña  [____________] │   │ Habilidades que ofrezco  [Guitarra▾][Avz▾]+ │
│ [ Entrar ]                 │   │ Temas que quiero aprender (Python) (SQL)…   │
│ ¿No tienes cuenta?         │   │ Disponibilidad  [Lun▾][18:00][20:00] +      │
└────────────────────────────┘   │ [ Guardar perfil ]                          │
                                 └─────────────────────────────────────────────┘
┌ Buscar ────────────────────────────┐ ┌ Solicitudes ───────────────────────────┐
│ ¿Qué quieres aprender? [Guitarra▾] │ │ Nueva solicitud [Habilidad▾][60 min▾]  │
│ [ Buscar quién la enseña ]         │ │ [ Descripción… ]  [ Publicar ]         │
│ ┌ Ana Pérez · Avanzado ┐           │ │ Filtros [Todas▾] ☐ Solo mías           │
│ │ Lun 18:00-20:00      │           │ │ ┌ Python · Abierta ┐ ┌ Guitarra … ┐    │
│ └──────────────────────┘           │ └────────────────────────────────────────┘
└────────────────────────────────────┘
```
