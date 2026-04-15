# Deployment & Remote Testing Guide

## 1. Share via Expo Go (Fastest for Mobile Testing)

This lets anyone with the Expo Go app scan a QR code and run the app instantly.

### Steps

1. Copy `.env.example` to `.env.local` and set your backend URL:
   ```
   EXPO_PUBLIC_BACKEND_URL=http://192.168.1.100:8000
   ```
   Use your machine's LAN IP so the phone can reach the backend.

2. Start the dev server with tunnel mode:
   ```bash
   npx expo start --tunnel
   ```
   This creates a public URL via ngrok so remote devices (e.g. your sales rep in Bangalore) can connect without being on the same network.

3. Share the QR code or the `exp://` link shown in the terminal. The other person needs:
   - **Android**: Install [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent) and scan the QR code.
   - **iOS**: Install [Expo Go](https://apps.apple.com/app/expo-go/id982107779) and scan the QR code with the Camera app.

### Important
- Your FastAPI backend must be accessible from the internet for remote testers. Either host it on a server or use a tool like `ngrok http 8000` to expose it temporarily.
- Update `EXPO_PUBLIC_BACKEND_URL` to the public backend URL before starting the tunnel.

---

## 2. Build & Deploy as a Web App

The app is already configured for static web export (`app.json` → `web.output: "static"`).

### Build

```bash
npx expo export --platform web
```

This generates a `dist/` folder with static HTML, JS, and CSS files.

### Deploy to Vercel

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Deploy from the frontend directory
vercel --prod
```

Or connect your GitHub repo to Vercel and configure:
- **Build command**: `npx expo export --platform web`
- **Output directory**: `dist`
- **Environment variable**: `EXPO_PUBLIC_BACKEND_URL` = your hosted backend URL

### Deploy to Netlify

1. Push your code to GitHub/GitLab.
2. Create a new site on [Netlify](https://app.netlify.com).
3. Configure build settings:
   - **Build command**: `npx expo export --platform web`
   - **Publish directory**: `dist`
4. Add environment variable: `EXPO_PUBLIC_BACKEND_URL` = your hosted backend URL.

---

## 3. Pointing to Your Backend

The frontend reads the backend URL from the `EXPO_PUBLIC_BACKEND_URL` environment variable. The API client (`src/api/client.ts`) appends `/api` automatically.

| Context | Where to set the variable |
|---|---|
| Local development | `.env.local` file |
| Expo Go tunnel | `.env.local` file (set before running `npx expo start`) |
| Vercel | Project Settings → Environment Variables |
| Netlify | Site Settings → Environment Variables |

### Reminders
- `EXPO_PUBLIC_*` variables are **inlined at build time**, not at runtime. Changing the value requires a rebuild/restart.
- For production, always use **HTTPS** for the backend URL.
- Ensure your FastAPI backend has **CORS** configured to allow requests from your web deployment domain.
