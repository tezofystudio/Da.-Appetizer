# Da. Appetizer — responsive restaurant web-app concept

A responsive, bilingual (English default / বাংলা) restaurant microsite for desktop and mobile. Includes mobile bottom tabs for Home, Menu, Reviews, Location, and Order; the Order tab opens Foodpanda because native checkout is not yet connected. Also includes dark/light theme, category search, 3D-inspired menu-board cards with ten AI-generated food illustrations and one inline-vector curry-bowl fallback, a gentle sliding/shimmer Order-tab cue (disabled for reduced-motion preferences), location and review views.

## What's new — immersive item preview (v2)

Tapping a category on Home/Menu now opens a full-screen, app-style item preview (sample dishes, clearly marked **demo prices** — not the restaurant's real menu):

- 3D-style food photo that rises from its card, rotates gently, with clean rising steam; drag to tilt, swipe or use the arrows to move around a 360° ring of 11 sample dishes.
- Endless icon + name ticker of all dishes (random order) above the category name; thumbnail slider under the dish name. Tap either to jump to a dish.
- Details/price sheet hidden by default — swipe up to show, swipe down to hide.
- The bottom navigation auto-hides 2 s after opening or after any touch; touch brings it back. While it is hidden, the price and the order-cart button drop into its place. While it is visible, a category button takes the cart button's spot.
- Cart: the food shrinks into a floating popup and the order sheet rises from below. Demo orders are saved only in the browser (`localStorage`); there is no real checkout or payment. Real ordering still goes to Foodpanda.
- English / বাংলা, light/dark, reduced-motion support, works offline once loaded.

## Repository layout

| Path | What it is |
| --- | --- |
| `index.html`, `app/`, `experience.css`, `fonts.css`, `fonts/`, `images/` | **Built site** served by GitHub Pages (do not hand-edit `app/`; it is generated) |
| `assets/` | Original image source copies (unchanged) |
| `source/` | Vite source of the immersive preview — edit here |
| `source/README.bn.md` | Feature notes in Bangla |

### Updating the site

```bash
cd source
npm install
npm run dev            # live preview at http://localhost:3000
npm run publish:site   # build and copy the result to the repo root
cd ..
git add -A && git commit -m "Update immersive preview" && git push
```

`npm run offline-demo` creates a single self-contained HTML file (`Da-Appetizer-immersive-menu.html`, ignored by git).
Fonts (DM Sans, Manrope, Hind Siliguri) are self-hosted under the SIL Open Font License; licences are in `fonts/`.

## Run

Open `index.html` in a modern browser, or serve this folder (serving is recommended — the preview loads `app/`, `images/` and `fonts/` next to `index.html`):

```bash
python -m http.server 8000 --bind 0.0.0.0
```

The original site's images are embedded as data URIs in `index.html`; `assets/` holds source copies for later updates. The immersive preview's dish photos live in `images/`.

## Publicly sourced details used

- **Place:** Da. Appetizer Chinese restaurant, New Bata Building, 2nd floor, SS Road, Sirajganj 6700.
- **Coordinates:** 24.4555333, 89.7051173 (from user-supplied Google Maps pin).
- **Google rating snapshot:** 4.0/5, 399 reviews, from an indexed Google Maps-derived directory listing checked around 25 Feb 2026. Not a live Google Maps API response; re-check the pin for current data.
- **Foodpanda listing snapshot (checked 12 Oct 2026):** 4.4/5, 1,000+ ratings (structured listing count surfaced as 1,033); online ordering; public schedule Mon–Thu and Sat–Sun 11:00–21:30, Friday 11:30–21:30.
- **Menu categories shown:** Appetizer (4), Soup & Salad (4), Rice (4), Set Menu (2), Biryani (4), Pizza (6), Burger (4), Chowmein (3), Pasta (1), Combo (2), Curry (5). These are category counts from the public listing, not menu item names.
- **Price information:** listing price band `৳৳৳`; a Tk 50 minimum order and a displayed Tk 39 delivery fee were visible. No dependable item-by-item price list was exposed in the page extract, so no item prices are invented. The live menu button links to Foodpanda.
- **Review themes:** a small visible sample praises fresh ingredients, biryani and taste; critical/mixed snippets mention portions, consistency, a disappointing biryani, naan/tandoori, and a cold/damaged order. Reviews shown in the app are paraphrases, not verbatim quotations; platform scores are kept separate.
- **Accessibility:** Google Maps limited view lists wheelchair-accessible restroom and seating.
- **Visuals:** hero image is the photo used by the restaurant's Foodpanda listing. Interior image is associated with the restaurant in a public listing/image result. `DA` is a custom placeholder monogram—not a verified official logo. No verified direct restaurant website or phone number was found in the sources reviewed.

## Sources

- User-supplied Google Maps pin: https://www.google.com/maps/place/Da.+Appetizer+Chinese+restaurant/@24.4555333,89.7051173,17z/data=!4m7!3m6!1s0x39fdeb463c3a81ab:0xed5af56a13fafa37!8m2!3d24.4555333!4d89.7051173!10e1!16s%2Fg%2F11mv505rxn?entry=ttu
- Foodpanda menu/listing: https://www.foodpanda.com.bd/restaurant/nygx/da-appetizer
- Google Maps-derived directory snapshot: https://www.top-rated.online/cities/Sir%C4%81jganj/place/p/13856783/FOOD+CHOICE
- Foodpanda listing image: https://images.deliveryhero.io/image/fd-bd/LH/nygx-hero.jpg
- Public directory image source: https://top-rated.online/cities/Sir%C4%81jganj/place/p/13856783/FOOD+CHOICE

## Gaps for the next iteration

To turn this concept into a faithful menu/order app, provide (or confirm where to obtain): the official logo, complete current menu with item names/prices/variants, official phone/contact, dine-in and takeaway confirmation, any delivery policies, and permission/API details for accepting orders. The current prototype sends users to Foodpanda for actual ordering and live prices; it does not process orders or payments itself.
