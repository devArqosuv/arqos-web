# Prompt para Claude Code — Copiar y pegar tal cual

Lee CLAUDE.md completo. Ese archivo es tu fuente de verdad para todo el proyecto.

## Tarea: Scaffold del proyecto ARQOS Web

Haz esto en orden:

### 1. Inicializa el proyecto Next.js 15
- Usa `pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
- Si pregunta si usar Turbopack, di sí.

### 2. Configura las dependencias adicionales
- Instala: `pnpm add lucide-react framer-motion`
- Instala dev: `pnpm add -D @tailwindcss/typography`

### 3. Configura Tailwind con los tokens de ARQOS
- Extiende `tailwind.config.ts` con los colores y fonts del CLAUDE.md
- Configura `globals.css` con las CSS custom properties de ARQOS

### 4. Configura las fonts en el root layout
- Usa `next/font/google` para cargar Playfair Display (400, 700) y Montserrat (300, 400, 500, 600, 700)
- Aplícalas como variables CSS (`--font-display` y `--font-body`)

### 5. Crea la estructura de carpetas
- Sigue exactamente la estructura del CLAUDE.md sección 2

### 6. Crea los componentes base
- `src/components/ui/Button.tsx` — Botón reutilizable con variantes (primary negro sólido, secondary outline, ghost)
- `src/components/ui/SectionWrapper.tsx` — Wrapper con max-width, padding lateral, y padding vertical estándar
- `src/components/layout/Navbar.tsx` — Sticky, blur, logo + links + CTA mobile-responsive
- `src/components/layout/Footer.tsx` — Fondo negro, logo blanco, links, copyright 2026

### 7. NO construyas las secciones del landing todavía
Solo el scaffold, layout, navbar, footer y la página principal con un placeholder que diga "ARQOS — En construcción".

### 8. Verifica que compila
- Corre `pnpm build` y asegúrate de que no hay errores.
- Corre `pnpm dev` y confirma que se ve el layout con navbar y footer.

Cuando termines, dame un resumen de lo que creaste y cualquier decisión que hayas tomado.
