/* ==========================================================================
   Canvas colour preview
   --------------------------------------------------------------------------
   The customisation section's preview is a <canvas>. The piece's cream
   photograph is drawn onto it and the chosen shade is multiplied into the
   knitted pixels only.

   Background detection is SPATIAL, not per-pixel: hat and backdrop overlap
   in brightness and channels (crown 224 vs backdrop 204), so no threshold
   can separate them. Instead the backdrop is grown as a region from the
   photo's borders — the backdrop (with its smooth floor-shadow gradient) is
   one connected area touching every edge, while the knitted piece is a
   textured island inside it. A pixel joins the background only if it is
   SMOOTH (no stitch texture) and within a small step of the pixel it grew
   from, so the fill follows the soft shadow but stops dead at the knit
   silhouette. Everything the fill reaches stays untouched; everything else
   is recoloured with the luminance-preserving, strength-boosted colour math.

   app.js calls hatCanvas.show(product, hex) whenever the piece or the swatch
   changes — this file owns nothing but the painting.
   ========================================================================== */

(function (window, document) {
  "use strict";

  var products = window.LHC.products;

  var canvas = document.getElementById("hatCanvas");
  var ctx = canvas
    ? canvas.getContext("2d", { willReadFrequently: true })
    : null;

  // Base image (use your cream/off-white version)
  var baseImage = new Image();
  baseImage.crossOrigin = "anonymous";

  // The photograph currently requested and the one actually loaded, so a
  // piece switched mid-load can never be painted from the wrong picture.
  var requestedSrc = null;
  var drawnFor = null;

  // Whether a shade is applied. With no shade chosen the photo stays exactly
  // as photographed — the site never tints a piece with a guess.
  var tintApplied = false;

  // The piece currently on the canvas (its fill hints shape the mask).
  var currentProduct = null;

  // Current target colour
  var targetColor = { r: 245, g: 230, b: 211 }; // default cream

  // The background mask is pure geometry (which pixels are backdrop), so it
  // is computed once per photograph and reused for every swatch click.
  var maskForSrc = null;
  var maskCache = null;

  function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 245, g: 230, b: 211 };
  }

  /**
   * Grow the backdrop in from the photo borders. Two gates keep the fill on
   * the backdrop: the pixel must be SMOOTH (its luma differs from its
   * neighbours by no more than the stitch-texture ceiling — knit stitches
   * always exceed it, the shadow gradient never does), and it must be within
   * a small per-step colour distance of the pixel it grew from (the shadow
   * is a smooth gradient; the silhouette is a jump).
   */
  function buildBackgroundMask(img, w, h, product) {
    var n = w * h;
    var luma = new Float32Array(n);
    var i;
    for (i = 0; i < n; i++) {
      var p = i * 4;
      luma[i] = 0.299 * img[p] + 0.587 * img[p + 1] + 0.114 * img[p + 2];
    }

    var TEXTURE_CEILING = 5; // knit stitches measure ~6-20; smooth backdrop ~0-3
    var smooth = new Uint8Array(n);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var idx = y * w + x;
        var l = luma[idx];
        var t = 0;
        if (x > 0 && Math.abs(l - luma[idx - 1]) > t) t = Math.abs(l - luma[idx - 1]);
        if (x < w - 1 && Math.abs(l - luma[idx + 1]) > t) t = Math.abs(l - luma[idx + 1]);
        if (y > 0 && Math.abs(l - luma[idx - w]) > t) t = Math.abs(l - luma[idx - w]);
        if (y < h - 1 && Math.abs(l - luma[idx + w]) > t) t = Math.abs(l - luma[idx + w]);
        if (t <= TEXTURE_CEILING) smooth[idx] = 1;
      }
    }

    var mask = new Uint8Array(n);
    var queue = new Int32Array(n);
    var qs = 0;
    var qe = 0;
    var STEP = 14; // max per-step colour change the shadow gradient may have

    function tryAdd(from, nIdx) {
      if (mask[nIdx] || !smooth[nIdx]) return;
      var a = from * 4;
      var b = nIdx * 4;
      if (
        Math.abs(img[a] - img[b]) <= STEP &&
        Math.abs(img[a + 1] - img[b + 1]) <= STEP &&
        Math.abs(img[a + 2] - img[b + 2]) <= STEP
      ) {
        mask[nIdx] = 1;
        queue[qe++] = nIdx;
      }
    }

    // Seed every border pixel that is backdrop-smooth.
    for (var bx = 0; bx < w; bx++) {
      if (smooth[bx] && !mask[bx]) {
        mask[bx] = 1;
        queue[qe++] = bx;
      }
      var bottom = (h - 1) * w + bx;
      if (smooth[bottom] && !mask[bottom]) {
        mask[bottom] = 1;
        queue[qe++] = bottom;
      }
    }
    for (var by = 0; by < h; by++) {
      var left = by * w;
      var right = by * w + w - 1;
      if (smooth[left] && !mask[left]) {
        mask[left] = 1;
        queue[qe++] = left;
      }
      if (smooth[right] && !mask[right]) {
        mask[right] = 1;
        queue[qe++] = right;
      }
    }

    while (qs < qe) {
      var cur = queue[qs++];
      var cx = cur % w;
      var cy = (cur / w) | 0;
      if (cx > 0) tryAdd(cur, cur - 1);
      if (cx < w - 1) tryAdd(cur, cur + 1);
      if (cy > 0) tryAdd(cur, cur - w);
      if (cy < h - 1) tryAdd(cur, cur + w);
    }

    // Speckle cleanup: the fill only enters smooth pixels, so isolated
    // non-smooth noise in the shadow-contact zone survives as tiny unmasked
    // islands and would be tinted as "hat". The real piece is one huge
    // connected island; any unmasked island far smaller than it is noise.
    var MIN_PIECE_PIXELS = 500;
    var seen = new Uint8Array(n);
    var comp = new Int32Array(n);
    var cc;
    for (i = 0; i < n; i++) {
      if (mask[i] || seen[i]) continue;
      var size = 0;
      seen[i] = 1;
      comp[size++] = i;
      var rs = 0;
      while (rs < size) {
        var px = comp[rs++];
        var pxX = px % w;
        var pxY = (px / w) | 0;
        if (pxX > 0 && !mask[px - 1] && !seen[px - 1]) {
          seen[px - 1] = 1;
          comp[size++] = px - 1;
        }
        if (pxX < w - 1 && !mask[px + 1] && !seen[px + 1]) {
          seen[px + 1] = 1;
          comp[size++] = px + 1;
        }
        if (pxY > 0 && !mask[px - w] && !seen[px - w]) {
          seen[px - w] = 1;
          comp[size++] = px - w;
        }
        if (pxY < h - 1 && !mask[px + w] && !seen[px + w]) {
          seen[px + w] = 1;
          comp[size++] = px + w;
        }
      }
      if (size < MIN_PIECE_PIXELS) {
        for (cc = 0; cc < size; cc++) mask[comp[cc]] = 1;
      }
    }

    // Edge absorption: backdrop patches hugging the silhouette (the shadow
    // contact band) can survive the fill and the island cleanup because they
    // touch the knit or are too big to be speckle. They are almost entirely
    // surrounded by filled backdrop, so a majority-of-neighbours test eats
    // them while leaving the knit interior — surrounded by knit — intact.
    var ABSORB_PASSES = 2;
    var absorb = new Uint8Array(n);
    var pass, dy, dx;
    for (pass = 0; pass < ABSORB_PASSES; pass++) {
      var changed = false;
      for (y = 0; y < h; y++) {
        for (x = 0; x < w; x++) {
          var j = y * w + x;
          if (mask[j]) continue;
          var masked = 0;
          var count = 0;
          for (dy = -1; dy <= 1; dy++) {
            for (dx = -1; dx <= 1; dx++) {
              if (!dy && !dx) continue;
              var nx = x + dx;
              var ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
              count++;
              if (mask[ny * w + nx]) masked++;
            }
          }
          if (count > 0 && masked * 2 > count) {
            absorb[j] = 1;
            changed = true;
          }
        }
      }
      if (!changed) break;
      for (i = 0; i < n; i++) {
        if (absorb[i]) mask[i] = 1;
        absorb[i] = 0;
      }
    }

    // Defocus-band recovery. Where the knit fades into the backdrop out of
    // focus, the fill stops at the first textured pixel and leaves a cream
    // halo of smooth pixels that are really hat. Grow the hat outward into
    // smooth filled pixels while they keep getting darker (or stay equal):
    // the defocus ramp falls off toward the wall, while the floor shadow
    // BRIGHTENS outward from the piece — so the shadow is left alone. The
    // depth cap stops the growth wandering across the wall along iso-luma
    // contours.
    // GROW_TOL stays tiny on purpose: the crown ramp falls off outward, so
    // growth rides it down, while the floor shadow CLIMBS outward (+1.5/px)
    // and a loose tolerance would let growth snake up it. Depth 55 covers
    // the ~60px defocus band around the crown. Pieces whose photos don't
    // need the recovery (e.g. the cat ears leak into the wall) set
    // previewGrowthDepth: 0 in products.js.
    var GROW_DEPTH =
      product && typeof product.previewGrowthDepth === "number"
        ? product.previewGrowthDepth
        : 55;
    var GROW_STEP = 8;
    var GROW_TOL = 0.8;
    var depth = new Int32Array(n);
    var gq = new Int32Array(n);
    var gqs = 0;
    var gqe = 0;
    for (i = 0; i < n; i++) {
      if (!mask[i]) gq[gqe++] = i; // seed every hat pixel
    }
    while (gqs < gqe) {
      var gp = gq[gqs++];
      var gx = gp % w;
      var gy = (gp / w) | 0;
      if (depth[gp] >= GROW_DEPTH) continue;
      for (var dir = 0; dir < 4; dir++) {
        var nx2 = gx + (dir === 0 ? -1 : dir === 1 ? 1 : 0);
        var ny2 = gy + (dir === 2 ? -1 : dir === 3 ? 1 : 0);
        if (nx2 < 0 || ny2 < 0 || nx2 >= w || ny2 >= h) continue;
        var gn = ny2 * w + nx2;
        if (!mask[gn] || depth[gn] || !smooth[gn]) continue;
        var ga = gp * 4;
        var gb = gn * 4;
        if (
          Math.abs(img[ga] - img[gb]) > GROW_STEP ||
          Math.abs(img[ga + 1] - img[gb + 1]) > GROW_STEP ||
          Math.abs(img[ga + 2] - img[gb + 2]) > GROW_STEP
        )
          continue;
        if (luma[gn] > luma[gp] + GROW_TOL) continue; // brightening outward = shadow
        depth[gn] = depth[gp] + 1;
        mask[gn] = 0; // become hat
        gq[gqe++] = gn;
      }
    }

    // Boundary smoothing. Fill + growth leave a noisy silhouette (spikes and
    // speckle a few pixels deep). A majority filter over a 7x7 window, run
    // twice, rounds the edge off without moving it further than a couple of
    // pixels — summed-area table keeps it O(n) per pass.
    var SMOOTH_RADIUS = 3;
    var SMOOTH_PASSES = 2;
    var integral = new Int32Array((w + 1) * (h + 1));
    var cur = new Uint8Array(n);
    var nxt = new Uint8Array(n);
    var sp, sx, sy;
    for (sp = 0; sp < SMOOTH_PASSES; sp++) {
      for (i = 0; i < n; i++) cur[i] = mask[i] ? 0 : 1; // 1 = hat
      for (sy = 0; sy < h + 1; sy++) integral[sy * (w + 1)] = 0;
      for (sx = 0; sx < w + 1; sx++) integral[sx] = 0;
      for (y = 0; y < h; y++) {
        var rowSum = 0;
        for (x = 0; x < w; x++) {
          rowSum += cur[y * w + x];
          integral[(y + 1) * (w + 1) + (x + 1)] =
            integral[y * (w + 1) + (x + 1)] + rowSum;
        }
      }
      var win = (SMOOTH_RADIUS * 2 + 1) * (SMOOTH_RADIUS * 2 + 1);
      for (y = 0; y < h; y++) {
        var y0 = Math.max(0, y - SMOOTH_RADIUS);
        var y1 = Math.min(h - 1, y + SMOOTH_RADIUS);
        for (x = 0; x < w; x++) {
          var x0 = Math.max(0, x - SMOOTH_RADIUS);
          var x1 = Math.min(w - 1, x + SMOOTH_RADIUS);
          var hatCount =
            integral[(y1 + 1) * (w + 1) + (x1 + 1)] -
            integral[y0 * (w + 1) + (x1 + 1)] -
            integral[(y1 + 1) * (w + 1) + x0] +
            integral[y0 * (w + 1) + x0];
          nxt[y * w + x] = hatCount * 2 > win ? 0 : 1; // majority decides
        }
      }
      for (i = 0; i < n; i++) mask[i] = nxt[i];
    }

    return mask;
  }

  function backgroundMask(img, w, h, product) {
    if (requestedSrc !== maskForSrc || !maskCache) {
      maskCache = buildBackgroundMask(img, w, h, product);
      // Fill hints (fractions of the photo) mark zones too defocused for the
      // fill to judge — the crown top, typically. They are hat, full stop.
      (product && product.previewFillHints || []).forEach(function (hint) {
        var x0 = Math.round(hint.x * w);
        var y0 = Math.round(hint.y * h);
        var x1 = Math.round((hint.x + hint.w) * w);
        var y1 = Math.round((hint.y + hint.h) * h);
        for (var hy = y0; hy < y1; hy++) {
          for (var hx = x0; hx < x1; hx++) {
            maskCache[hy * w + hx] = 0;
          }
        }
      });
      maskForSrc = requestedSrc;
    }
    return maskCache;
  }

  function recolourHat() {
    if (!baseImage.complete || baseImage.naturalWidth === 0) return;

    // Match canvas size to image
    canvas.width = baseImage.naturalWidth;
    canvas.height = baseImage.naturalHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseImage, 0, 0);

    // No shade chosen: the photograph stays as shot.
    if (!tintApplied) return;

    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var data = imageData.data;
    var mask = backgroundMask(data, canvas.width, canvas.height, currentProduct);

    for (var i = 0; i < data.length; i += 4) {
      var a = data[i + 3];

      // Skip almost transparent pixels
      if (a < 30) continue;

      // The flood-filled backdrop (and its floor shadow) stays untouched
      if (mask[i >> 2]) continue;

      // Calculate luminance (keeps the knitted texture and shadows)
      var lum =
        (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;

      // Stronger colour application
      // We multiply the target colour by luminance, then boost it
      var strength = 1.15; // > 1 makes colours richer
      data[i] = Math.min(255, Math.round(targetColor.r * lum * strength));
      data[i + 1] = Math.min(255, Math.round(targetColor.g * lum * strength));
      data[i + 2] = Math.min(
        255,
        Math.round(targetColor.b * lum * strength)
      );
    }

    ctx.putImageData(imageData, 0, 0);
  }

  // When base image loads, draw it
  baseImage.onload = function () {
    drawnFor = requestedSrc;
    recolourHat();
  };

  /**
   * Show a piece, optionally in a shade. Called by app.js on every piece or
   * swatch change; hex is null for "as photographed".
   */
  function show(product, hex) {
    if (!canvas || !ctx || !product) return;

    // The engine recolours photographs. Every piece has one; if a piece ever
    // ships without a photo, keep showing whatever is on the canvas rather
    // than half-painting an illustration.
    var picture = products.pictureFor(product);
    if (!picture || !picture.isPhoto) return;

    currentProduct = product;

    if (hex) {
      targetColor = hexToRgb(hex);
      tintApplied = true;
    } else {
      tintApplied = false;
    }

    var src = picture.src;
    if (requestedSrc === src && baseImage.complete && baseImage.naturalWidth) {
      recolourHat();
      return;
    }
    requestedSrc = src;
    baseImage.src = src; // recolourHat runs when the load finishes
  }

  window.LHC = window.LHC || {};
  window.LHC.hatCanvas = {
    show: show,
  };
})(window, document);
