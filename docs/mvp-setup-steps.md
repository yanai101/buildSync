# MVP Setup Steps (Chunk 1)

1. Install dependencies:
```bash
npm install
```

2. Initialize Convex (if not initialized in this environment):
```bash
npx convex dev
```

3. Run app:
```bash
npm run dev
```

4. Environment variables required:
- `VITE_CONVEX_URL`
- Convex auth-related vars (added in auth chunk)

## Required Dependencies for MVP
- Core: `@tanstack/react-start`, `@tanstack/react-router`, `@tanstack/react-query`, `react`, `typescript`
- Backend: `convex`, `@convex-dev/react-query`
- UI/RTL: `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`, `@emotion/cache`, `stylis`, `stylis-plugin-rtl`
- i18n: `i18next`, `react-i18next`
- Validation: `zod`
- PWA: `vite-plugin-pwa`

## Notes
- Existing template/demo dependencies can be pruned after route migration in the next chunk to avoid breaking current scaffold midway.
