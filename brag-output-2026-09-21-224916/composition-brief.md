# Hyperframes Composition Brief: KhMenu Staff — the update

## Objective
Short "what's new" update-drop video for the KhMenu staff app.

## Output
- Composition directory: `brag-output-2026-09-21-224916/composition/`
- Rendered video: `brag-output-2026-09-21-224916/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 24.0s

## Source Material
- Project root: C:\Users\billy\OneDrive\Desktop\emenu
- Files read: HANDOVER.md, git log, src/pages/admin/{AdminPage,OrdersBoard,TableSheet,DailyReport}.tsx, src/lib/i18n.ts, src/index.css, supabase/migrations/008-011, assets/logo/khmenu-icon.svg
- Product name: KhMenu Staff (KhMenu, "App កូនខ្មែរ")
- Key UI to recreate: the Orders board Tables grid (tile states Free / Seated / $bill / Calling / Wants bill / With Table N / unavailable reason), the TableSheet dialog (guest picker 1–8 + More, busy-table actions, move/combine pickers, unavailable reason input), the header LangSwitch, the Today report stat row (Guests tile) and Download CSV.
- Copy used verbatim from i18n.ts: How many people? · Paid · clear table ($18.50) · Move to another table · Change number of guests · Move Table 3 to… · Moved Table 3 → Table 7. Ask the guests to scan the QR on Table 7. · Combine with another table · Combine Table 8 with… · With Table 7 · Mark table unavailable · Reason (optional), e.g. broken, reserved · Unavailable · Guests · 7 tables · $6.40 per guest · Download CSV · Tap a table to seat, move or clear it; Khmer/Chinese equivalents for the language flip.

## Creative Direction
- Tone preset: default (app-store clean). Direction: patch-notes update drop.
- Angle/hook/outro: see brag-plan.md.
- Avoid: generic SaaS language, abstract filler, pricing.

## Visual Identity
- Background #faf8f5 / page #f3efe9, card #fff, text #292524, muted #78716c, border #e7e2da, accent #c2410c
- Fonts: Plus Jakarta Sans (local woff2 500/700/800), Kantumruy Pro 700 (local), Microsoft YaHei (system via local())
- Icons: lucide SVGs rendered from the project's own lucide-react install

## Storyboard
See brag-plan.md (3 scenes: Hook 2.46s, Staff app 18.28s with six sub-beats, Outro 3.26s).

## Audio
- Music: assets/music/happy-beats-business-moves-vol-10-by-ende-dot-app.mp3, 0.8 volume, 1.2s fade out
- Cue source: bundled preset (vol-10). Strong locks 18.55 and 20.74; language flips on 3.55/4.64.
- Audio-reactive: none (documented choice).
- SFX: click_002 per tap, switch_002 on language flips, keypress-00x on typing, drop_002 / card-place-1 on dialogs/toasts, chips-stack-2 on count-up, card-slide-1 on CSV sheet, impactSoft on the hook→app wipe, impactBell_heavy_003 on outro.
