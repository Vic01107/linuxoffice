# LinuxOffice

Suite ofimática completa para Linux, inspirada en Microsoft Office, con arquitectura single-window multi-tab.

## Aplicaciones

- **Writer** - Procesador de textos (.docx)
- **Calc** - Hoja de cálculo (.xlsx)
- **Impress** - Presentaciones (.pptx)
- **PDF Editor** - Editor PDF completo (merge, split, compress, edit, reorganize, convert, OCR)

## Stack Tecnológico

- **Electron 28+** + **React 18** + **TypeScript** + **Vite**
- **PDF.js** + **pdf-lib** (motor PDF híbrido)
- **Zustand** + **Immer** (estado)
- **Radix UI** + **Tailwind CSS** (UI)
- **@tanstack/react-virtual** (virtualización)
- **HyperFormula** (motor de cálculo - Fase 4)
- **pnpm workspaces** + **Turbo** (monorepo)

## Características

- ✅ Single-window multi-tab (estilo VS Code)
- ✅ Pestañas arrastrables con @dnd-kit
- ✅ Toolbar contextual por aplicación
- ✅ Tema claro/oscuro/sistema con persistencia
- ✅ Atajos de teclado globales
- ✅ Offline-first
- ✅ TypeScript estricto

## Instalación

```bash
# Instalar dependencias
pnpm install

# Desarrollo
pnpm dev

# Build
pnpm build

# Typecheck
pnpm typecheck

# Lint
pnpm lint

# Tests
pnpm test
```

## Estructura del Proyecto

```
LinuxOffice/
├── apps/
│   ├── main/           # Electron main process
│   ├── renderer/       # React renderer process
│   └── shared/         # Tipos y utilidades compartidas
├── scripts/            # Scripts de build/dev/package
├── turbo.json          # Configuración Turbo
├── pnpm-workspace.yaml # Configuración pnpm workspaces
└── package.json        # Configuración raíz
```

## Roadmap

- [x] **Fase 0**: Foundation (monorepo, build pipeline, Electron scaffold)
- [x] **Fase 1**: Shell UI + Navigation
- [ ] **Fase 2**: PDF Engine (PDF.js, pdf-lib, merge/split/compress/edit/reorganize/convert/OCR)
- [ ] **Fase 3**: Writer (docx parser, block editor, layout engine)
- [ ] **Fase 4**: Calc (HyperFormula, grid virtualizado, pivot tables, charts)
- [ ] **Fase 5**: Impress (canvas editor, animaciones, presenter view)
- [ ] **Fase 6**: Integración, pulido, accesibilidad, packaging
- [ ] **Fase 7**: Testing, release

## Licencia

MIT