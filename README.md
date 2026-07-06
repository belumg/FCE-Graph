# FCE-Graph

Visualizador interactivo del plan de estudios (correlativas) de las carreras
de la Facultad de Ciencias Económicas, con seguimiento de avance por alumno.

## Estructura del proyecto

```
├── app.py              # Backend Flask: application factory + rutas
├── config.py            # Configuración centralizada (backend)
├── modelos.py            # Validación y acceso a datos (repositorio de alumnos)
├── requirements.txt
├── .env.example
│
├── index.html            # Frontend (estructura de clases BEM-like)
├── config.js             # Configuración global del frontend (namespace FCEGraph)
├── set_diagram.js        # Configuración del diagrama GoJS (temas, nodos, enlaces)
├── load_data.js          # Carga de datos de carreras y cálculo de correlativas
├── functions.js          # Lógica de negocio, UI del banner, llamadas a la API
├── animations.js         # Animación de confeti al completar la carrera
├── main.css              # Variables CSS, layout base y componentes
├── theme.css             # Temas claro/oscuro (clases body.theme-dark / body.theme-light)
├── responsive.css        # Breakpoints, orientación, accesibilidad táctil y layout del diagrama
├── icon.png
├── images/
└── src/                  # JSON de cada carrera + layout.json
```

## Backend — instalación y ejecución local

```bash
python3 -m venv venv
source venv/bin/activate        # En Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # Completar MONGO_URI y ORIGENES_PERMITIDOS
python app.py                   # Modo desarrollo
```

Para producción, usar un servidor WSGI como `gunicorn` (incluido en requirements.txt):

```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Variables de entorno

| Variable              | Descripción                                              | Ejemplo                          |
|-----------------------|-----------------------------------------------------------|-----------------------------------|
| `MONGO_URI`           | Cadena de conexión a MongoDB                              | `mongodb+srv://...`               |
| `PORT`                | Puerto donde corre el servidor                             | `5000`                            |
| `FLASK_ENV`           | `development` habilita modo debug                          | `production`                      |
| `ORIGENES_PERMITIDOS` | Orígenes permitidos para CORS, separados por coma         | `https://midominio.com`           |

### Endpoints disponibles

| Método | Ruta                                | Descripción                          |
|--------|--------------------------------------|---------------------------------------|
| GET    | `/salud`                             | Health check                          |
| GET    | `/alumnos`                           | Lista todos los alumnos               |
| GET    | `/alumnos/registro/<registro>`       | Busca un alumno por número de registro|
| POST   | `/alumnos`                           | Crea un alumno nuevo                  |
| PUT    | `/alumnos/registro/<registro>`       | Actualiza los datos de un alumno      |
| DELETE | `/alumnos/registro/<registro>`       | Elimina un alumno                     |

## Frontend — instalación y despliegue

El frontend es estático (HTML/CSS/JS), no requiere build. Puede servirse con
cualquier servidor de archivos estáticos (Nginx, Vercel, Netlify, GitHub Pages, etc.).

**Importante:** antes de desplegar, editar en `index.html` el `<meta>` con la
URL pública del backend:

```html
<meta name="api-base-url" content="https://tu-backend-en-produccion.com">
```

Todas las llamadas a la API leen esta URL desde `FCEGraph.URL_BASE_API`
(definida en `config.js`), por lo que no es necesario tocar ningún otro archivo.

## Diseño responsive

Los estilos (`estilos.css`) están escritos mobile-first:
- Layout en columna con `flex-wrap` en el banner superior para pantallas angostas.
- Botones táctiles con áreas de toque adecuadas.
- Switch de tema reubicado como botón flotante inferior-derecho en mobile,
  y superior-derecho en pantallas ≥768px.
- El lienzo del diagrama (GoJS) ocupa el espacio disponible restante
  usando flexbox y `100dvh`, evitando saltos por la barra de direcciones móvil.

## Sistema de estilos (main.css / theme.css / responsive.css)

Esta versión reemplaza el `estilos.css` original por un sistema de tres
archivos con variables CSS y clases semánticas:

- **`main.css`**: variables (`:root`), reset, layout base y componentes
  (`.form-select`, `.icon-button`, `.student-info`, `.theme-toggle`, etc.).
- **`theme.css`**: temas `body.theme-dark` / `body.theme-light`, transiciones
  e integración de variables con GoJS.
- **`responsive.css`**: breakpoints mobile/tablet/desktop, modo orientación,
  optimizaciones táctiles, `prefers-reduced-motion`, impresión, y además el
  layout del contenedor del diagrama (altura real en mobile con `100dvh`,
  `min-height: 0` en la cadena flex) y el estado inicial de los componentes
  dinámicos del banner (panel de detalle oculto, acciones de materia ocultas).

El HTML se reestructuró con las clases que estos archivos esperan
(`.app-container`, `.main-header`, `.header-left/center/right`, `.form-group`,
`.subject-details`, etc.), conservando los mismos `id` que usa la lógica en
`functions.js`, `set_diagram.js` y `load_data.js` — por lo que toda la
funcionalidad (buscar, guardar, eliminar, aprobar materias, promedio,
cambio de tema, confeti) sigue intacta.

El botón de cambio de tema pasó de ser un checkbox con `onchange` inline a
un `<button>` con listener en `functions.js`, que alterna las clases
`theme-dark`/`theme-light` en `<body>` y sincroniza el tema del diagrama GoJS.



- El frontend ahora vive bajo un único namespace `FCEGraph` (en `config.js`),
  evitando variables globales sueltas y colisiones de nombres.
- Los nombres de variables originales se conservaron y se tradujeron a
  español consistente donde correspondía (sin mezclar idiomas).
- El backend separa configuración (`config.py`), validación/persistencia
  (`modelos.py`) y rutas (`app.py`), con manejo de errores centralizado
  y validaciones explícitas (antes ausentes en `PUT` y `POST`).
- Se eliminó el `<?= Date.now() ?>` (sintaxis de PHP inválida en HTML estático)
  y se resolvió el cache-busting de scripts server-side; los datos JSON
  (`src/*.json`) siguen usando cache-busting por query string en runtime.
- `scrapper_carreras.py` es una herramienta auxiliar de generación de datos
  (no forma parte del runtime desplegado) y se mantiene sin cambios.

## Ajustes de esta versión

- **Zoom del diagrama en pantallas muy comprimidas:** se reforzó el
  reencuadre automático (`zoomToFit` + `alignDocument`) en `set_diagram.js`
  para que también reaccione a `orientationchange` y a `visualViewport`
  (cambios de altura por la barra de direcciones o el teclado virtual en
  mobile), además del `resize` de ventana y el `ResizeObserver` del
  contenedor. También se usa `100dvh` en el layout (sección final de
  `responsive.css`) para que el diagrama disponga de toda la altura real
  visible en mobile, evitando que quede con scroll interno en vez de
  encajar en pantalla.
- **Switch de tema compacto en mobile:** dentro del propio breakpoint
  mobile de `responsive.css` (`max-width: 640px`), el `.theme-toggle`
  mantiene su tamaño de píldora fijo (60px) en vez de estirarse al 100%
  del ancho, igual que en la vista de escritorio.
- Los ajustes que antes vivían en un archivo aparte (`integracion.css`)
  se fusionaron dentro de `responsive.css`, en sus propias secciones al
  final del archivo, para evitar tener una cuarta hoja de estilos suelta.


