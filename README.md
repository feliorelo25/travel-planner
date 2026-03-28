# Voyanta — Travel Planner

Aplicación web estática lista para deploy en Netlify.

## Qué incluye

- Registro e inicio de sesión con persistencia local
- Múltiples viajes por usuario
- Transporte, alojamiento, itinerario, excursiones, gastos, notas
- Dashboard visual con gráficos
- Mapa integrado con Leaflet
- Foro simple entre usuarios
- Datos mock precargados
- Arquitectura preparada para evolucionar a Supabase

## Estructura

- `index.html` → layout principal de la app
- `styles.css` → diseño visual y responsive
- `app.js` → lógica de autenticación mock, viajes, foros y persistencia
- `netlify.toml` → configuración simple para Netlify

## Demo local

Abrí `index.html` directamente o levantá un servidor estático.

Usuario demo:

- Email: `demo@voyanta.app`
- Contraseña: `demo1234`

## Deploy en Netlify

### Opción 1

1. Comprimí o subí la carpeta completa `travel-planner`.
2. En Netlify elegí **Add new site** → **Deploy manually**.
3. Arrastrá la carpeta o el zip.

### Opción 2

1. Subí el proyecto a GitHub.
2. En Netlify elegí **Import from Git**.
3. Seleccioná el repositorio.
4. Como es un sitio estático, no hace falta build command.
5. Publish directory: `.`

## Próximos pasos sugeridos

- Reemplazar localStorage por Supabase Auth + Supabase Database
- Agregar tablas reales: users, trips, trip_items, expenses, notes, forum_posts, comments
- Crear permisos para compartir viajes con colaboradores
- Incorporar conversión de monedas por API
- Agregar subida real de imágenes y attachments
