# Brag Plan: KhMenu Staff — the update

## What is this app?
KhMenu ("App កូនខ្មែរ") is a QR menu and table-ordering app for Cambodian restaurants; its staff app runs the floor: live orders, a table grid, and an end-of-day report. This video is about the staff app's latest update.

## The angle
An "update drop" / patch-notes video. The first video followed one diner's order (vertical); the second was an owner sales pitch with a problem→solution arc (vertical). This one is for people who already know KhMenu: **what's new in the staff app**. Landscape, one continuous tablet recreation of the staff app with a numbered "What's new" rail on the left that ticks through six updates while a tap-dot actually performs each one on the real table grid. The board state carries through: every change stays on screen, so by the end the grid tells the whole story.

## Hook (first 2-3 seconds)
Orange full-bleed. The bell app icon pops, "New in KhMenu Staff" lands, "6 updates for your floor team" under it, and six real UI fragments from the update scatter in around it (ខ្មែរ · 中文 · 👥 4 · Table 3 → Table 7 · Broken · CSV) like confetti made of the product.

## Key moments (the middle)
- The language switch flips the whole orders board EN → ខ្មែរ → 中文 → EN (tabs, "Tables", status words, column headers).
- Tap free Table 5 → "How many people?" 1–8 picker → tap 4 → tile shows the Users icon · 4 · Seated, toast "Table 5 · 4 guests".
- Tap busy Table 3 → Paid · clear table ($18.50) / Move to another table / Change number of guests → Move → pick Table 7 → the party jumps; toast "Moved Table 3 → Table 7."
- The party grows: tap Table 8 → Combine with another table → Table 7 → tile reads "With Table 7".
- Tap Table 1 → Mark table unavailable → type "Broken" → tile goes grey "Broken".
- Today tab: the new Guests tile counts to 23, "7 tables · $6.40 per guest"; tap Download CSV and a spreadsheet slides out.

Note: the brief mentioned "With Table 3" as an example label; because Table 3's party is moved to Table 7 in the previous beat, the combine lands on "With Table 7" so the board stays truthful (the moved party grows, so staff join Table 8 to it).

## Outro / punchline
Orange. Bell icon + "KhMenu Staff", "Update out now", "App កូនខ្មែរ · Made in Phnom Penh". Music fades out.

## User flow worth showing
Staff open the Orders board → tap tables to seat, move, combine, block → switch to Today to see guests and export the day.

## Tone
- Preset: default (with app-store cleanliness)
- Creative direction: patch-notes update drop, "look what just shipped"
- Interpretation: bouncy, confident, product-forward; numbered changelog rail keeps the viewer oriented; each UI interaction is real and legible; no jokes beyond the UI-confetti hook.

## Format: landscape — 1920x1080
## Duration: 24.0s

## Visual identity (from the project)
- Background: app `--background` oklch(0.985 0.004 75) ≈ #faf8f5; header card white; page `bg-secondary/50` ≈ #f3efe9
- Accent: #c2410c (`--primary`); status colours from the grid: emerald-500/50/700 (wants bill), amber-400/50/700 (calling), muted grey (unavailable)
- Text: oklch(0.2 0.01 60) ≈ #292524; muted ≈ #78716c
- Display/body font: Plus Jakarta Sans 500/700/800; Khmer: Kantumruy Pro 700; Chinese: Microsoft YaHei (system)
- Strongest visual element: the Tables grid with its state colours and the TableSheet dialog

## Share copy (draft)
New in KhMenu Staff: tap a table to seat, move, combine or block it, see how many guests you served today, export the day to CSV, and run it all in English, ខ្មែរ or 中文. App កូនខ្មែរ 🇰🇭

## Audio direction
- Role: punchy warm bed with interaction clicks
- Music: happy-beats-business-moves-vol-10-by-ende-dot-app.mp3 (109.96 BPM, "compact loop, punchy"); different from vol-11 and vol-12 used in the first two videos
- Music treatment: from 0 at ~0.8 volume, 1.2s fade-out ending at 24.0s
- Music cue guidance: preset `cues/happy-beats-business-moves-vol-10-by-ende-dot-app.music-cues.md` read. Strong-cue locks: 18.55 (Guests count lands), 20.74 (outro logo). Language flips on beats 3.55 / 4.64 (every other beat, each holds ~1.1s). Feature rail advances on ~beats 5.74 / 8.73 / 12.02 / 14.73 / 17.47.
- Audio-reactive treatment: none (the UI carries the motion; keeps text rock-steady)
- SFX posture: moderate, motion-matched: click on every tap, switch on language flips, soft keypresses on "Broken", drop/card on dialogs & toasts, chips on the count-up, bell on outro
- Restraint rule: no SFX on rail text changes; nothing louder than the music bed except the outro bell

## Storyboard

### Scene 1 — Hook — 0–2.46s
Orange. Icon at 0.27, "New in" / "KhMenu Staff" at 0.55, sub "6 updates for your floor team" at 1.1, six UI chips pop in on 1.37/1.90 in two waves. Holds.
Audio: music starts; soft drop on the icon.
Transition: orange panel wipes left off screen → Scene 2.

### Scene 2 — The staff app — 2.46–20.74s
Left rail "What's new" with six numbered items; active item grows and turns orange, done items get a check. Right: tablet with the staff app (header Sabay Kitchen + EN/ខ្មែរ/中文 switch, tabs Orders/Today/Menu/Tables & QR/Settings, Live pill, Tables grid 8 tiles, New/Preparing/Open bills columns peeking below).
1. 2.46–5.74 Languages: taps ខ្មែរ 3.55, 中文 4.64, EN 5.46.
2. 5.74–8.73 Seat guests: tap Table 5, "How many people?", tap 4 at 7.35, tile → 4 · Seated, toast.
3. 8.73–12.02 Move: tap Table 3 (2 guests · $18.50), tap Move, tap Table 7 at 10.93, toast "Moved Table 3 → Table 7."
4. 12.02–14.73 Combine: tap Table 8, Combine with another table, tap Table 7 → "With Table 7".
5. 14.73–17.47 Unavailable: tap Table 1, Mark table unavailable, type "Broken", confirm → grey tile.
6. 17.47–20.74 Today: tap Today tab, Guests 23 counts up landing on 18.55, "7 tables · $6.40 per guest", Total sales $147.20, Profit, Orders 19; tap Download CSV → spreadsheet card "khmenu-demo-2026-09-21.csv".
Sequential/interaction: yes, simulated taps throughout (tap-dot with ripple)
Transition: orange wipe from the right → Scene 3.

### Scene 3 — Outro — 20.74–24.0s
Orange. Icon + "KhMenu Staff" on 20.74, "Update out now" pill, "App កូនខ្មែរ · Made in Phnom Penh".
Audio: bell on 20.74, music fades.

**Music mood for this video:** upbeat, punchy
**Audio summary:** a punchy bed with a tactile layer of taps and switches that makes the UI feel real, closing on one bell.

Demo data is fictional (Sabay Kitchen demo restaurant, no real emails or customers).
