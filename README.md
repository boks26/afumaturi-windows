# Afumaturi Windows

Aplicatie desktop bazata pe frontend-ul React din `../afumaturi`, impachetata cu Tauri 2.

## Cerinte

- Node.js 20+
- Rust (stable)
- dependentele de sistem Tauri pentru platforma pe care se face build-ul

Pe Ubuntu/Debian, dependentele native pot fi instalate astfel (comanda cere drepturi
de administrator):

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

## Configurarea backend-ului

Copiaza `.env.example` ca `.env` si adapteaza valorile:

```dotenv
VITE_API_BASE_URL=https://afumaturi-be.ddev.site
VITE_API_PATH=/api/v1
VITE_API_TIMEOUT_MS=15000
VITE_OAUTH_CLIENT_ID=uuid-ul-clientului-simple-oauth
VITE_OAUTH_CLIENT_SECRET=doar-pentru-dezvoltare-locala
```

Fisierul `.env` este ignorat de Git. Autentificarea foloseste momentan password grant-ul
Simple OAuth existent in backend. Client secret-ul din `VITE_*` este potrivit doar pentru
dezvoltare locala deoarece va fi inclus in frontend-ul compilat. Pentru installerul de
productie trebuie configurat un client public cu Authorization Code + PKCE sau un serviciu
intermediar; un secret nu poate fi protejat intr-o aplicatie desktop distribuita.

Backend-ul local este proiectul DDEV `afumaturi-be`; URL-ul implicit a fost preluat din
`../afumaturi-be/.ddev/config.yaml`. Rutele modulului Drupal pornesc cu `/api/v1`.

Configuratia este centralizata in `src/config/api.ts`, iar cererile HTTP trebuie facute
prin `src/services/apiClient.ts`.

Datele operaționale nu mai sunt păstrate în `localStorage`. După autentificare,
aplicația încarcă din Drupal categoriile, rețetele, produsele, resursele, mișcările
de stoc, angajații și dările de seamă. Finalizarea unei dări de seamă este executată
tranzacțional de backend; desktop-ul reîncarcă apoi starea autoritativă.

## Dezvoltare

```bash
npm install
npm run tauri:dev
```

Pentru a porni doar frontend-ul in browser:

```bash
npm run dev
```

## Verificare si build

```bash
npm run lint
npm run build
npm run tauri:build
```

Build-ul Windows trebuie facut pe Windows (sau intr-un runner Windows). Pe Linux,
`tauri:build` genereaza pachete Linux, nu un installer `.exe`/`.msi`.

## Structura desktop

- `src/` - aplicatia React/TypeScript
- `src/config/api.ts` - configuratia conexiunii la Drupal
- `src/services/apiClient.ts` - clientul HTTP comun
- `src-tauri/` - configuratia si codul nativ Tauri/Rust
