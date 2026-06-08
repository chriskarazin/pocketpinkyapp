# Pocket Pinky – Mobile App

React Native (Expo) app for Pocket Pinky Dating Coach. Single codebase for iOS and Android.

## Setup

```bash
cd mobile
npm install
npx expo start
```

Then:

- **iOS:** Press `i` in terminal or scan QR with Camera (Expo Go)
- **Android:** Press `a` or scan QR with Expo Go
- **Web:** Press `w` (limited)

## Project structure

```
mobile/
├── App.tsx                 # Entry: bottom tabs (Chat, Services, Profile)
├── src/
│   ├── theme/              # Brand colors (Pinky design system)
│   ├── screens/            # Chat, Services, Profile
│   ├── components/         # Reusable UI (to add)
│   └── services/           # Botpress, Auth, Stripe, Push (to add)
└── assets/
```

## Next steps (from MOBILE_APP_REQUIREMENTS.md)

1. Auth & onboarding (email/social, Stripe, 3 free consults)
2. Botpress integration (REST + WebSockets)
3. Chat UI (messages, typing, voice, image upload)
4. Service access (Swirl, Him Report, Text Analysis, Red Flags)
5. Push notifications
6. Screenshot text analysis, calendar, dating journal
7. Backend (Firebase/Supabase, Stripe, push)
8. App store (Apple $99/yr, Google $25, Privacy/Terms, ASO)

## Brand colors

- Primary: `#FF1493` (hot pink)
- Dark: `#2D1B3D` (deep plum)
- Light: `#F5F1E8` (cream)
- Accent: `#D4AF37` (gold)
