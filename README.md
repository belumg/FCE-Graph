# FCE-Graph

Visualizador interactivo del plan de estudios (correlativas) de las carreras
de la Facultad de Ciencias Económicas, con seguimiento de avance por alumno.

## Estructura del proyecto

```
FCE-Graph/
├── backend/                   # API REST (Flask + MongoDB)
│   ├── app.py                 # Application factory + rutas
│   ├── config.py              # Configuración centralizada (variables de entorno)
│   ├── modelos.py             # Validación y acceso a datos (repositorio de alumnos)
│   ├── scrapper_carreras.py   # Herramienta auxiliar de generación de datos (no es parte del runtime)
│   ├── requirements.txt
│   └── .env.example
│
├── index.html                 # Cliente estático (sin build)
├── css/
│   ├── main.css               # Variables CSS, layout base y componentes
│   ├── theme.css              # Temas claro/oscuro
│   └── responsive.css         # Breakpoints, orientación, accesibilidad táctil
├── js/
│   ├── config.js              # Configuración global del frontend (namespace FCEGraph)
│   ├── diagram.js             # Configuración del diagrama GoJS (temas, nodos, enlaces)
│   ├── data.js                # Carga de datos de carreras y cálculo de correlativas
│   ├── app.js                 # Lógica de negocio, UI del banner, llamadas a la API
│   └── animations.js          # Animación de confeti al completar la carrera
├── assets/
│   ├── icon.png
│   └── images/                # Imágenes auxiliares por carrera
├── data/                       # JSON de cada carrera + layout.json
│
└── README.md
```

## Backend — instalación y ejecución local

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # En Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # Completar MONGO_URI y ORIGENES_PERMITIDOS
python app.py                   # Modo desarrollo
```

Para producción, usar un servidor WSGI como `gunicorn` (incluido en requirements.txt):

```bash
cd backend
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
cualquier servidor de archivos estáticos (Nginx, Vercel, Netlify, GitHub Pages, etc.)
apuntando a la raíz del proyecto (donde está `index.html`).

Para desarrollo local, por ejemplo:

```bash
python3 -m http.server 8080
```

**Importante:** antes de desplegar, editar en `index.html` el `<meta>`
con la URL pública del backend:

```html
<meta name="api-base-url" content="https://tu-backend-en-produccion.com">
```

Todas las llamadas a la API leen esta URL desde `FCEGraph.URL_BASE_API`
(definida en `js/config.js`), por lo que no es necesario tocar ningún otro archivo.

## Diseño responsive

Los estilos (`css/responsive.css`) están escritos mobile-first:
- Layout en columna con `flex-wrap` en el banner superior para pantallas angostas.
- Botones táctiles con áreas de toque adecuadas.
- Switch de tema reubicado como botón flotante inferior-derecho en mobile,
  y superior-derecho en pantallas ≥768px.
- El lienzo del diagrama (GoJS) ocupa el espacio disponible restante
  usando flexbox y `100dvh`, evitando saltos por la barra de direcciones móvil.
- El bloque de detalle de la materia seleccionada (`subject-details`) se
  centra en la vista mobile (`max-width: 640px`).

## Sistema de estilos (main.css / theme.css / responsive.css)

- **`main.css`**: variables (`:root`), reset, layout base y componentes
  (`.form-select`, `.icon-button`, `.student-info`, `.theme-toggle`, etc.).
- **`theme.css`**: temas `body.theme-dark` / `body.theme-light`, transiciones
  e integración de variables con GoJS.
- **`responsive.css`**: breakpoints mobile/tablet/desktop, modo orientación,
  optimizaciones táctiles, `prefers-reduced-motion`, impresión, y además el
  layout del contenedor del diagrama (altura real en mobile con `100dvh`,
  `min-height: 0` en la cadena flex) y el estado inicial de los componentes
  dinámicos del banner (panel de detalle oculto, acciones de materia ocultas).

El HTML usa las clases que estos archivos esperan (`.app-container`,
`.main-header`, `.header-left/center/right`, `.form-group`, `.subject-details`,
etc.), y conserva los `id` que usa la lógica en `app.js`, `diagram.js` y
`data.js` — por lo que toda la funcionalidad (buscar, guardar, eliminar,
aprobar materias, promedio, cambio de tema, confeti) se mantiene intacta.

## Arquitectura del frontend

El frontend vive bajo un único namespace global `FCEGraph` (definido en
`js/config.js`), evitando variables globales sueltas y colisiones de nombres.
Cada módulo se cuelga de ese namespace y expone una API pública explícita:

- **`config.js`** → `FCEGraph` (constantes, límites, estado de sesión).
- **`diagram.js`** → `FCEGraph.diagrama` (instancia GoJS, temas, plantillas
  de nodos/enlaces, resaltado, reencuadre responsive).
- **`data.js`** → `FCEGraph.datos` (carga de carreras, cálculo de
  correlativas/estado, materia seleccionada).
- **`app.js`** → `FCEGraph.app` (validaciones, lógica de negocio de notas y
  promedio, eventos de UI, comunicación con la API REST).
- **`animations.js`** → efecto de confeti (`window.lanzar_confeti` /
  `window.detener_confeti`), independiente del namespace `FCEGraph`.

Orden de carga en `index.html`: `config.js` → `diagram.js` → `data.js` →
`app.js` → `animations.js` (cada módulo depende de que el anterior ya esté
definido en `window.FCEGraph`).

## Arquitectura del backend

El backend separa configuración (`config.py`), validación/persistencia
(`modelos.py`) y rutas (`app.py`), con manejo de errores centralizado y
validaciones explícitas en `POST`/`PUT`. `scrapper_carreras.py` es una
herramienta auxiliar de generación de datos (no forma parte del runtime
desplegado): su salida (`<carrera>.json`) debe copiarse manualmente a
`data/`.

## Notas de diseño

- Se eliminó el `<?= Date.now() ?>` (sintaxis de PHP inválida en HTML estático)
  y se resolvió el cache-busting de scripts server-side; los datos JSON
  (`data/*.json`) siguen usando cache-busting por query string en runtime.
- **Zoom del diagrama en pantallas muy comprimidas:** el reencuadre automático
  (`zoomToFit` + `alignDocument`) en `diagram.js` reacciona a `resize`,
  `orientationchange`, `visualViewport` (cambios de altura por la barra de
  direcciones o el teclado virtual en mobile) y a un `ResizeObserver` sobre
  el contenedor del diagrama.
