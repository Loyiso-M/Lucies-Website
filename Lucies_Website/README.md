# Lucie's Handmade Creations — website

A handmade, mobile-first shop front for Lucie's knitted and crocheted pieces.
Customers browse the collection, choose a colour, and build an order message that
opens in WhatsApp. There is no checkout, no payment and no backend — Lucie
confirms every order herself.

**Everything on the site is editable without touching the layout code.** There are
only two files you normally need.

---

## 1. Run it locally

The site is plain HTML, CSS and JavaScript with no build step and no
dependencies. It does need to be *served* (not opened as a `file://` path) so the
fonts and stylesheets load properly:

```bash
cd "untitled folder"
python3 -m http.server 8080
# then open http://localhost:8080
```

Any static host works for the real thing — Netlify, Vercel, Cloudflare Pages,
GitHub Pages or plain shared hosting. Upload the whole folder. There is nothing to
compile and no environment variables.

---

## 2. Finish the set-up (do this first)

Open the site. If anything below is missing, a dark bar appears at the very top of
the page listing exactly what still needs a real value. It disappears on its own
once everything is filled in.

| What | Where | Notes |
| --- | --- | --- |
| **WhatsApp number** | `assets/js/config.js` → `whatsapp.number` | Digits only, **no `+`, no leading zero**. `082 123 4567` becomes `"27821234567"`. Until this is set, the WhatsApp buttons explain that the number is pending and offer a **Copy message** button instead of opening a dead link. |
| TikTok link | `config.js` → `social.tiktokUrl` | Full link, e.g. `"https://www.tiktok.com/@lucieshandmade"`. |
| Delivery / collection | `config.js` → `fulfilment.deliveryNote` and `.collectionNote` | Free text. Until set, the contact card says it will be confirmed with Lucie. |
| Product photos | `assets/js/products.js` → `image` | See §4. |
| Lucie's own story | `config.js` → `copy.storyBody` | Two short paragraphs. The page currently shows a clearly-labelled placeholder instead of invented history. |
| Website address | `config.js` → `brand.siteUrl` | Used for the canonical tag and the share preview. |

---

## 3. Update products and prices

All products live in one place: **`assets/js/products.js`**. Prices are plain
numbers in rand — no `R`, no spaces, so the totals add up.

```js
{
  id: "small-ruffle-hat",          // unique, lowercase, dashes
  name: "Small Ruffle Hat",
  price: 180,                      // rand, as a number
  category: "hats",                // "hats" or "beanies", see CATEGORIES
  shortDescription: "Shown on the product card.",
  description: "Shown when the piece is opened.",
  image: null,                     // null until a real photo exists
  illustration: "assets/img/products/small-ruffle-hat.svg",
  allowsColourChoice: true,        // false = no R30 colour option
  colourFee: null,                 // null = use the R30 in config.js
  illustrationAspect: [340, 425],  // width/height of the picture
}
```

**To add a product:** copy an existing block, give it a new `id`, and it appears
in the grid, the filters and the order message automatically.
**To remove one:** delete its block (or set `allowsColourChoice: false` to drop
just the colour option).
**To add a category:** add it to `CATEGORIES` at the top of the same file.

Confirmed prices from Lucie's price list — please keep these in step with reality:

| Piece | Price | Colour change |
| --- | --- | --- |
| Small Ruffle Hat | R180 | + R30 |
| Bigger Ruffle Hat | R200 | + R30 |
| Slouchy Beanie | R100 | + R30 |
| Cat Ear Beanie | R80 | + R30 |

The R30 is set once, in `config.js` → `customisation.colourFee`. Change it there
and it updates the product cards, the piece drawer, the fee table and every order
message. A single product can override it with its own `colourFee`.

---

## 4. Adding Lucie's real product photos

1. Put the photo in `assets/img/products/`, e.g. `small-ruffle-hat.jpg`.
   Portrait, roughly **4:5**, about **1200 × 1500 px** looks best.
2. Set `image` for that product:

```js
image: "assets/img/products/small-ruffle-hat.jpg",
```

That is all. The drawn illustration disappears, the **“Photo to come”** label
disappears with it, and the picture is lazy-loaded with the right dimensions so
the page does not jump. If a photo is ever missing or broken, the illustration
comes back on its own rather than showing a broken image.

Until photos arrive, each piece uses a **hand-drawn line illustration** in the
brand's ink colour, with the yarn-strand texture from the logo. They are
deliberately drawn illustrations, never fake photographs.

---

## 5. Change the colour options

`config.js` → `customisation.colours`. Each entry is a name and a hex shade:

```js
{ name: "Dusty rose", hex: "#c98a93" },
```

Add, rename, recolour or delete freely. Customers can always pick **“Another
colour”** and type what they want instead, so this list never blocks an order.

The wording on the site deliberately says these are shades you can *ask for* and
that Lucie confirms what she has in stock — please keep that honest framing when
editing.

---

## 6. What the customer journey does

1. **Browse** — four pieces, filterable by type. Prices come from `products.js`.
2. **Open a piece** — a drawer with the bigger picture, description, colour
   choices, quantity, and a running total that updates as they change things.
3. **Choose a colour** (optional) — adds R30 per piece and appears in the summary
   and the message. Choosing “Another colour” asks them to describe it.
4. **Add to the order** — a small basket, saved in `sessionStorage`, so a refresh
   or a new tab does not lose it. Quantities can be changed, items removed, and
   removals undone from the toast.
5. **Send on WhatsApp** — the message is *generated* from what they picked:

```
Hello Lucie! ❤️

I would like to place an order:

1. Small Ruffle Hat
Price: R180
Quantity: 2
Colour: Dusty rose
Colour change fee: R30 per piece
Item total: R420

Estimated order total: R420

Please let me know about availability, payment, and collection or delivery options.

Thank you! ❤️
```

The site never claims the order was placed, never claims payment happened, never
reserves stock and never invents a delivery fee. Opening WhatsApp shows a message
saying so, and the customer still has to press send themselves.

---

## 7. Design system

Sampled from the logo so the site and the brand mark sit on the same paper.
Change a value in `assets/css/tokens.css` and it updates everywhere.

| Role | Value |
| --- | --- |
| Page paper | `#faf2ef` (exactly the logo's background) |
| Blush panel / illustration backdrop | `#f8e5e4` |
| Headings and body text | `#4a3630` |
| Secondary text | `#6b5751` |
| Captions and meta | `#74605a` |
| Primary action (the logo heart) | `#a04a58` |
| Line-art ink (the logo's drawing) | `#a8606e` |
| Hairlines | `#e6d2cc` |

Every text colour is checked against every paper tone and clears WCAG AA — the
tightest is 4.79:1.

**Type:** *Fraunces* for headings (warm, slightly wonky serif — deliberately not a
corporate font), *Karla* for text and UI, and letterspaced caps for labels,
echoing the way “HANDMADE CREATIONS” is set on the logo. Both fonts are
**self-hosted**, so the site makes no third-party requests and works offline.

**Shape language:** crisp hairline-bordered cards, pill-shaped buttons, and one
signature arch (the hero frame) that echoes a round ruffle hat in a portrait
frame. The only ornament is the logo's own **— ♥ —** rule, used once.

---

## 8. File map

```
index.html                     the whole page
robots.txt
assets/
  css/fonts.css                generated — do not edit by hand
  css/tokens.css               colours, type scale, spacing  ← edit these
  css/base.css                 reset, typography, buttons, notes
  css/components.css           header, hero, cards, drawers, footer
  js/config.js                 ← business details, fees, wording  ← edit this
  js/products.js               ← the catalogue and prices          ← edit this
  js/util.js                   money formatting, escaping, helpers
  js/basket.js                 the order basket and its totals
  js/whatsapp.js               the number and the message builder
  js/render.js                 turns data into markup
  js/app.js                    wiring, drawers, filters, feedback
  fonts/                       self-hosted Fraunces + Karla (92 KB total)
  img/brand/                   logo badge, favicons, share image
  img/products/                illustrations (and photos, once added)
_reference/                    the logo Lucie supplied, kept as the source
_tests/tests.js                the browser test suite
_tools/                        dev helpers, not part of the live site
_preview/                      generated preview builds, not part of the site
```

The JavaScript deliberately uses plain ordered `<script>` files rather than a
module bundler: there is no build step to break, the site works when simply
copied to a host, and each file has one clear job. A future CMS or backend can
replace `config.js` and `products.js` with a fetch without touching the views.

---

## 9. Dev tools

```bash
python3 _tools/check_links.py       # every asset path and #anchor resolves
python3 _tools/make_preview.py      # one self-contained file → _preview/site.html
python3 _tools/make_preview.py --tests
                                    # same file plus the test suite and results
python3 _tools/make_viewport_qa.py  # runs site + tests at 320/375/768/1280px
python3 _tools/fetch_fonts.py       # re-download the self-hosted fonts
python3 _tools/build_brand_assets.py
                                    # re-cut the logo badge, favicons, share image
python3 _tools/build_brand_mark.py  # re-trace the header mark from the icon
python3 _tools/build_product_art.py # re-draw the four product illustrations
python3 _tools/build_craft_scene.py # re-draw the crochet scene + its animation
```

Four of these generate files, so edit the generator, never its output:
`build_brand_assets.py` (the logo badge), `build_brand_mark.py` (the header
mark), `build_product_art.py` (the product illustrations) and
`build_craft_scene.py` (the crochet scene). `render_scene_preview.py` rasterises
the craft scene to ASCII, which is how its geometry was checked without a
picture. Every generated file is re-cut from `_reference/` each time it is run,
so none of them has to be trusted by hand.

`_tests/tests.js` drives the real DOM — it clicks the same buttons a customer
clicks and checks the numbers that come out: **159 assertions** covering the
price list, money formatting, the WhatsApp number rules, the generated order
message and its totals, quantity limits, the whole buying journey, basket
persistence, the mobile menu, accessibility and list semantics, colour contrast
against WCAG AA, and whether anything logged an error along the way.

Run `make_viewport_qa.py` after any layout change. It loads the site into an
iframe at 320, 375, 768 and 1280 px, runs the whole suite in each one, and
reports the layout measurements: no sideways scrolling, the grid going
1 → 2 → 4 columns, the desktop nav swapping for the mobile menu at the right
width, and no tap target under 24 × 24 px. Open it in a normal desktop browser —
embedded or mobile webviews are less reliable at holding several large documents
open at once.

---

## 10. Accessibility and performance

- Semantic landmarks, one `<h1>`, a skip link, labelled navigation.
- Drawers are real dialogs: focus moves in, is trapped, `Escape` closes, and
  focus returns to where it was.
- Colour swatches are actual radio buttons, so arrow keys and screen readers work
  without any custom code.
- Every control has a name; every image has alt text.
- Visible focus rings, and `prefers-reduced-motion` is respected.
- The basket is announced through `aria-live`, and feedback never relies on
  animation alone.
- No dependencies, no third-party requests, self-hosted fonts, lazy-loaded
  images with declared dimensions.

---

## 11. Deliberately not included

- **No payment or checkout.** WhatsApp is the ordering channel; Lucie confirms
  payment directly.
- **No fake reviews.** `config.js` has an empty `reviews` array ready for real
  ones: `{ quote, name, detail }`. None are shown until real ones exist.
- **No invented delivery, payment, sizing or material details.**
- **No stock tracking.** Every piece is made to order.
