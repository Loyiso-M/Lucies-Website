/* ==========================================================================
   App — wiring, state and behaviour
   --------------------------------------------------------------------------
   Everything that touches the DOM lives here. Data lives in config.js and
   products.js, totals live in basket.js, and message wording lives in
   whatsapp.js, so this file only has to join them up.
   ========================================================================== */

(function (window, document) {
  "use strict";

  var util = window.LHC.util;
  var config = window.LHC.config;
  var products = window.LHC.products;
  var basket = window.LHC.basket;
  var wa = window.LHC.wa;
  var render = window.LHC.render;

  var $ = util.$;
  var $$ = util.$$;
  var esc = util.esc;
  var rand = util.rand;
  var clampQuantity = util.clampQuantity;

  var FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

  var MIN_SCROLL_FOR_FLOAT = 520;

  var el = {};
  var state = {
    filter: "all",
    qty: 1,
    activeProduct: null,
    lastFocused: null,
    openOverlay: null,
    toastTimer: null,
    bumpTimer: null,
    floatScrollTimer: null,
    // The colour preview in the customisation section: pick a piece and a
    // shade and the preview image's src swaps to that piece's photograph.
    cardColours: {},
  };

  /**
   * Path of the pre-coloured photograph for a piece in a chosen shade, as
   * supplied by the client and copied to assets/img/products/variants/
   * (see _reference/colour-images-registry.md for the source mapping).
   */
  function variantSrc(product, colourName) {
    return (
      "assets/img/products/variants/" +
      product.id +
      "-" +
      colourName.toLowerCase().replace(/\s+/g, "-") +
      ".jpg"
    );
  }

  /* ----------------------------------------------------------------------
     Boot
     ---------------------------------------------------------------------- */

  function init() {
    cacheElements();
    paintStaticContent();
    injectStructuredData();
    paintProducts();
    bindEvents();
    basket.load();
    paintBasket();
    initScrollSpy();
    handleScroll();
  }

  function cacheElements() {
    el.body = document.body;
    el.header = $("#site-header");
    el.filters = $("#product-filters");
    el.grid = $("#products-grid");
    el.shopCount = $("#shop-count");
    el.steps = $("#steps-list");
    el.heroNoteText = $("#hero-note-text");
    el.storyBody = $("#story-body");
    el.storyPlaceholder = $("#story-placeholder");
    el.contactWhatsApp = $("#contact-whatsapp");
    el.contactTiktok = $("#contact-tiktok");
    el.contactFulfilment = $("#contact-fulfilment");
    el.footerYear = $("#footer-year");
    el.menuToggle = $("#menu-toggle");
    el.menu = $("#mobile-menu");
    el.menuList = $("#menu-list");
    el.menuBag = $("#menu-bag");
    el.bagButton = $("#bag-button");
    el.bagCount = $("#bag-count");
    el.backdrop = $("#backdrop");
    el.productDrawer = $("#product-drawer");
    el.productBody = $("#product-body");
    el.basketDrawer = $("#basket-drawer");
    el.basketBody = $("#basket-body");
    el.basketFoot = $("#basket-foot");
    el.basketSend = $("#basket-send");
    el.basketCopy = $("#basket-copy");
    el.basketUnconfigured = $("#basket-unconfigured");
    el.basketTitle = $("#basket-title");
    el.messageFallback = $("#message-fallback");
    el.messageFallbackText = $("#message-fallback-text");
    el.toast = $("#toast");
    el.toastMsg = $("#toast-msg");
    el.toastAction = $("#toast-action");
    el.floatWa = $("#float-wa");
  }

  /* ----------------------------------------------------------------------
     Content that comes from config
     ---------------------------------------------------------------------- */

  function paintStaticContent() {
    if (el.steps) el.steps.innerHTML = config.ordering.steps.map(render.step).join("");
    if (el.heroNoteText) el.heroNoteText.textContent = config.copy.heroNote;

    // Lucie's story: real paragraphs once config.copy.storyBody is filled,
    // an honest placeholder before that.
    if (el.storyBody) {
      el.storyBody.innerHTML = config.copy.storyBody
        .map(function (line) {
          return "<p>" + esc(line) + "</p>";
        })
        .join("");
    }
    if (el.storyPlaceholder) {
      var hasStory = config.copy.storyBody && config.copy.storyBody.length > 0;
      el.storyPlaceholder.hidden = hasStory;
      if (!hasStory) el.storyPlaceholder.textContent = config.copy.storyPlaceholder;
    }

    paintContact();
    paintWhatsAppLinks();
    paintWhatsAppAvailability();
  }

  /**
   * The primary "order on WhatsApp" buttons are real links once the number is
   * set, so middle-click, long-press and crawlers all behave sensibly. Until
   * then they fall back to the contact section.
   */
  function paintWhatsAppLinks() {
    var greeting =
      "Hello Lucie! \u2764\ufe0f\n\nI would like to ask about your handmade pieces.";
    $$("[data-wa-primary]").forEach(function (link) {
      if (wa.isConfigured()) {
        link.setAttribute("href", wa.linkFor(greeting));
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      } else {
        link.setAttribute("href", "#contact");
        link.removeAttribute("target");
        link.removeAttribute("rel");
      }
    });
  }

  function paintCanonical() {
    var link = document.querySelector('link[rel="canonical"]');
    if (link && config.brand.siteUrl) link.setAttribute("href", config.brand.siteUrl);
  }

  /**
   * Structured data is built from the same catalogue the page renders, so the
   * two can never drift apart.
   */
  function injectStructuredData() {
    if ($("script[data-lhc-structured]")) return;
    var data = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: config.brand.name,
      itemListElement: products.all().map(function (product, index) {
        var offer = {
          "@type": "Offer",
          price: product.price,
          priceCurrency: config.brand.currency,
        };
        if (config.brand.siteUrl) offer.url = config.brand.siteUrl;
        return {
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Product",
            name: product.name,
            description: product.shortDescription,
            category: render.CATEGORY_NAMES[product.category] || undefined,
            offers: offer,
          },
        };
      }),
    };
    var script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-lhc-structured", "");
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  function paintContact() {
    if (el.contactWhatsApp) {
      if (wa.isConfigured()) {
        el.contactWhatsApp.innerHTML =
          '<a href="https://wa.me/' +
          esc(wa.number()) +
          '" target="_blank" rel="noopener noreferrer">WhatsApp ' +
          esc(wa.displayNumber()) +
          "</a>";
      } else {
        el.contactWhatsApp.innerHTML =
          '<span class="pending">Number still to be confirmed</span>';
      }
    }

    if (el.contactTiktok) {
      if (config.social.tiktokUrl) {
        el.contactTiktok.innerHTML =
          '<a href="' +
          esc(config.social.tiktokUrl) +
          '" target="_blank" rel="noopener noreferrer">' +
          esc(config.social.tiktokHandle || "Lucie's on TikTok") +
          "</a>";
      } else {
        el.contactTiktok.innerHTML =
          '<span class="pending">Link still to be confirmed</span>';
      }
    }

    if (el.contactFulfilment) {
      var delivery = config.fulfilment.deliveryNote;
      var collection = config.fulfilment.collectionNote;
      if (delivery || collection) {
        var parts = [];
        if (delivery) parts.push("Delivery: " + esc(delivery));
        if (collection) parts.push("Collection: " + esc(collection));
        el.contactFulfilment.innerHTML = parts.join("<br>");
      } else {
        el.contactFulfilment.innerHTML =
          '<span class="pending">Still to be confirmed</span><br>' +
          '<span class="meta">' +
          esc(config.copy.deliveryPlaceholder) +
          "</span>";
      }
    }
  }

  /**
   * When the WhatsApp number is not set yet, say so plainly instead of sending
   * the customer to a dead link.
   */
  function paintWhatsAppAvailability() {
    // The number is configured, so every WhatsApp button is a real link.
    // The old "number pending" notes were removed from the markup.
  }

  /**
   * Anything the owner still has to confirm. The setup bar lists these so a
   * placeholder cannot quietly go live.
   */
  function paintProducts() {
    var list = products.byCategory(state.filter);

    if (el.grid) {
      el.grid.innerHTML = list
        .map(function (product) {
          return "<li>" + render.productCard(product) + "</li>";
        })
        .join("");
      bindImageFallbacks(el.grid);
    }
    if (el.filters) el.filters.innerHTML = render.filters(state.filter);
    if (el.shopCount) {
      el.shopCount.textContent =
        list.length +
        " " +
        util.plural(list.length, "piece") +
        (state.filter === "all"
          ? ""
          : " in " + (render.CATEGORY_NAMES[state.filter] || state.filter));
    }
  }

  /**
   * If a real photograph is missing or broken, fall back to the illustration
   * rather than showing a broken image. The "photo to come" label comes back
   * with it so the page stays honest.
   */
  function bindImageFallbacks(scope) {
    if (!scope) return;
    $$("img[data-fallback]", scope).forEach(function (img) {
      if (img.dataset.fallbackBound === "true") return;
      img.dataset.fallbackBound = "true";
      img.addEventListener(
        "error",
        function () {
          var fallback = img.getAttribute("data-fallback");
          if (!fallback || img.getAttribute("src") === fallback) return;
          img.setAttribute("src", fallback);
          var holder = img.parentElement;
          if (holder && !holder.querySelector(".card__badge")) {
            var span = document.createElement("span");
            span.className = "card__badge";
            span.setAttribute("aria-hidden", "true");
            span.textContent = "Photo to come";
            holder.appendChild(span);
          }
        },
        { once: true }
      );
    });
  }

  function setFilter(filterId) {
    state.filter = filterId;
    paintProducts();
    var button = $('[data-filter="' + filterId + '"]', el.filters);
    if (button) button.focus();
  }

  /* ----------------------------------------------------------------------
     Card colour dots — tap a shade on a shop card and that card's photo
     becomes the piece in that shade. Tapping the active dot again returns
     the card to the piece as photographed.
     ---------------------------------------------------------------------- */

  function setCardColour(productId, colourName, dotEl) {
    var product = products.getById(productId);
    if (!product || !product.allowsColourChoice) return;

    var same = state.cardColours[productId] === colourName;
    if (same) {
      delete state.cardColours[productId];
    } else {
      state.cardColours[productId] = colourName;
    }

    var card = dotEl.closest("[data-card]");
    if (card) {
      var img = card.querySelector("[data-card-img]");
      if (img) {
        img.src = same ? product.image : variantSrc(product, colourName);
        img.alt = same
          ? product.name + " — handmade piece by Lucie's Handmade Creations"
          : "The " + product.name + " in " + colourName;
      }
      $$("[data-card-colour]", card).forEach(function (dot) {
        var active =
          !same && dot.getAttribute("data-card-colour") === colourName;
        dot.classList.toggle("is-active", active);
        dot.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }
  }

  function openProduct(productId) {
    var product = products.getById(productId);
    if (!product) return;

    state.activeProduct = product;
    state.qty = 1;

    el.productBody.innerHTML = productDetailMarkup(product);
    bindImageFallbacks(el.productBody);
    openOverlay("product");
    pdpRefresh();

    var heading = $("#pdp-title", el.productDrawer);
    if (heading) heading.focus();
  }

  function productDetailMarkup(product) {
    var fee = basket.feeFor(product);
    var picture = products.pictureFor(product);
    var aspect = product.illustrationAspect || [4, 5];
    var canChooseColour = product.allowsColourChoice && fee > 0;

    var colourField = "";
    if (canChooseColour) {
      colourField =
        '<div class="field">' +
        '<span class="field__label" id="pdp-colour-label">Colour — optional, +' +
        rand(fee) +
        " per piece</span>" +
        '<div class="swatches swatches--compact" role="radiogroup" aria-labelledby="pdp-colour-label">' +
        render.colourSwatches(product, state.cardColours[product.id] || null) +
        "</div>" +
        '<div class="field" id="pdp-custom-field" hidden>' +
        '<label class="field__label" for="pdp-custom-input">Which colour would you like?</label>' +
        '<input class="input" id="pdp-custom-input" type="text" maxlength="60" ' +
        'placeholder="e.g. deep teal" autocomplete="off">' +
        "</div>" +
        '<div id="pdp-colour-error" hidden></div>' +
        "</div>";
    }

    return (
      '<div class="pdp__media">' +
      '<img src="' +
      esc(picture.src) +
      '" alt="' +
      esc(picture.isPhoto ? product.name : "Illustration of the " + product.name) +
      '" width="' +
      esc(aspect[0]) +
      '" height="' +
      esc(aspect[1]) +
      '" decoding="async"' +
      (picture.isPhoto ? ' data-fallback="' + esc(product.illustration) + '"' : "") +
      ">" +
      (picture.isPhoto
        ? ""
        : '<span class="card__badge" aria-hidden="true">Photo to come</span>') +
      "</div>" +
      '<h2 class="pdp__title" id="pdp-title" tabindex="-1">' +
      esc(product.name) +
      "</h2>" +
      '<div class="pdp__meta"><span class="price price--lg">' +
      rand(product.price) +
      "</span></div>" +
      colourField +
      '<div class="field">' +
      '<span class="field__label" id="pdp-qty-label">Quantity</span>' +
      '<div class="pdp__buy">' +
      '<div class="qty" role="group" aria-labelledby="pdp-qty-label">' +
      '<button type="button" class="qty__btn" id="pdp-qty-down" aria-label="One fewer">&minus;</button>' +
      '<span class="qty__val" id="pdp-qty-value" aria-live="polite">1</span>' +
      '<button type="button" class="qty__btn" id="pdp-qty-up" aria-label="One more">+</button>' +
      "</div>" +
      '<span class="price" id="pdp-line-total">' +
      rand(product.price) +
      "</span>" +
      "</div>" +
      "</div>"
    );
  }

  /** The colour currently chosen in the open product drawer. */
  function pdpChosenColour() {
    var product = state.activeProduct;
    if (!product || !product.allowsColourChoice) return null;
    var checked = $(
      'input[name="colour-' + product.id + '"]:checked',
      el.productDrawer
    );
    if (!checked) return null;
    if (checked.getAttribute("data-custom") === "true") {
      var input = $("#pdp-custom-input", el.productDrawer);
      var typed = input ? input.value.trim() : "";
      return { name: typed, hex: null, isCustom: true };
    }
    return {
      name: checked.value,
      hex: checked.getAttribute("data-hex"),
      isCustom: false,
    };
  }

  /** Keep prices, the fee row and the stepper in step with the selection. */
  function pdpRefresh() {
    var product = state.activeProduct;
    if (!product) return;

    var fee = basket.feeFor(product);
    var colour = pdpChosenColour();
    // A colour only costs extra once it is a real choice, not an empty box.
    var charging = !!colour && (!colour.isCustom || colour.name.length > 0);
    var unit = product.price + (charging ? fee : 0);

    var qtyValue = $("#pdp-qty-value", el.productDrawer);
    var qtyDown = $("#pdp-qty-down", el.productDrawer);
    var qtyUp = $("#pdp-qty-up", el.productDrawer);
    var lineTotal = $("#pdp-line-total", el.productDrawer);
    var errorBox = $("#pdp-colour-error", el.productDrawer);

    if (qtyValue) qtyValue.textContent = String(state.qty);
    if (qtyDown) qtyDown.disabled = state.qty <= 1;
    if (qtyUp) qtyUp.disabled = state.qty >= config.customisation.maxQuantity;
    if (lineTotal) lineTotal.textContent = rand(unit * state.qty);
    if (errorBox) {
      errorBox.hidden = true;
      errorBox.innerHTML = "";
    }

    // Same contract as the collection-card dots: a chosen shade IS a file.
    // A custom ("?") shade has no photograph, so the piece stays as shot.
    var picture = $(".pdp__media img", el.productDrawer);
    if (picture && product.allowsColourChoice) {
      var shadeName =
        colour && !colour.isCustom && colour.name ? colour.name : null;
      picture.dataset.fellBack = "false";
      picture.src = shadeName ? variantSrc(product, shadeName) : product.image;
      picture.alt = shadeName
        ? "The " + product.name + " in " + shadeName
        : "The " + product.name + ", photographed as made";
    }
  }

  function pdpShowColourError(message) {
    var errorBox = $("#pdp-colour-error", el.productDrawer);
    if (!errorBox) return;
    errorBox.hidden = false;
    errorBox.innerHTML =
      '<div class="note note--error"><span class="note__icon" aria-hidden="true">!</span><span>' +
      esc(message) +
      "</span></div>";
  }

  function addActiveProduct() {
    var product = state.activeProduct;
    if (!product) return;

    var colour = pdpChosenColour();
    if (colour && colour.isCustom && !colour.name) {
      pdpShowColourError(
        "Tell Lucie which colour you would like, or pick a shade from the list."
      );
      var input = $("#pdp-custom-input", el.productDrawer);
      if (input) input.focus();
      return;
    }

    basket.add(product, { quantity: state.qty, colour: colour });
    var label =
      product.name + (colour && colour.name ? " in " + colour.name : "");
    closeOverlay();
    toast(label + " added to your order", "View order", openBasket);
  }

  function askAboutActiveProduct() {
    var product = state.activeProduct;
    if (!product) return;
    var colour = pdpChosenColour();
    if (colour && colour.isCustom && !colour.name) colour = null;
    var text = wa.buildEnquiryMessage(product, {
      quantity: state.qty,
      colour: colour,
      colourFee: basket.feeFor(product),
    });
    sendViaWhatsApp(text);
  }

  /* ----------------------------------------------------------------------
     Basket
     ---------------------------------------------------------------------- */

  function paintBasket() {
    var lines = basket.lines();
    var total = basket.subtotal();
    var count = basket.count();

    if (el.bagCount) {
      el.bagCount.textContent = String(count);
      el.bagCount.classList.toggle("is-on", count > 0);
    }
    if (el.bagButton) {
      el.bagButton.setAttribute(
        "aria-label",
        count > 0
          ? "Open your order: " + count + " " + util.plural(count, "item")
          : "Open your order: currently empty"
      );
    }
    if (el.basketTitle) {
      el.basketTitle.textContent = count > 0 ? "Your order (" + count + ")" : "Your order";
    }

    // Built into a local first: if anything here ever fails, the drawer keeps
    // its previous contents instead of being left half-rendered.
    var bodyHtml;

    if (!lines.length) {
      bodyHtml =
        '<div class="basket__empty">' +
        '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>' +
        "<p><strong>Nothing in your order yet.</strong></p>" +
        '<p class="meta">Choose a piece and your WhatsApp message builds itself here.</p>' +
        '<p><button type="button" class="btn btn--quiet btn--sm" data-goto-shop>See the four pieces</button></p>' +
        "</div>";
    } else {
      bodyHtml =
        '<ul class="lines" role="list">' +
        lines.map(render.basketLine).join("") +
        "</ul>" +
        '<div class="summary">' +
        summaryMarkup(lines, total) +
        "</div>" +
        '<div class="note" style="margin-top:1.15rem">' +
        '<span class="note__icon" aria-hidden="true">i</span>' +
        "<span>" +
        esc(config.copy.orderConfirmNote) +
        "</span></div>";
    }

    el.basketBody.innerHTML = bodyHtml;

    var hasItems = lines.length > 0;
    if (el.basketFoot) el.basketFoot.hidden = !hasItems;
    if (hasItems) {
      if (el.basketSend) el.basketSend.disabled = !wa.isConfigured();
      if (el.basketUnconfigured) el.basketUnconfigured.hidden = wa.isConfigured();
    }
    if (el.messageFallback) el.messageFallback.hidden = true;
  }

  function summaryMarkup(lines, total) {
    var colourTotal = basket.colourFeeTotal();
    var pieces = lines.reduce(function (sum, line) {
      return sum + line.quantity;
    }, 0);
    var beforeColour = total - colourTotal;

    return (
      '<div class="summary__row"><span>' +
      pieces +
      " " +
      util.plural(pieces, "piece") +
      "</span><span>" +
      rand(beforeColour) +
      "</span></div>" +
      (colourTotal > 0
        ? '<div class="summary__row"><span>Colour changes</span><span>+' +
          rand(colourTotal) +
          "</span></div>"
        : "") +
      '<div class="summary__row summary__row--total"><span>Estimated total</span><span>' +
      rand(total) +
      "</span></div>"
    );
  }

  function openBasket() {
    if (basket.isEmpty()) {
      // Nothing to build a message from yet: send them to the products —
      // but say why. On a phone a silent jump reads as a broken button.
      closeOverlay(false);
      var shop = document.getElementById("shop");
      if (shop) shop.scrollIntoView({ block: "start" });
      toast("Your order is empty — pick a piece first, then tap Your order again.");
      return;
    }
    paintBasket();
    openOverlay("basket");
    var heading = $("#basket-title", el.basketDrawer);
    if (heading) heading.focus();
  }

  function currentOrderText() {
    return wa.buildOrderMessage(basket.lines(), basket.subtotal());
  }

  function sendViaWhatsApp(text) {
    var result = wa.open(text);

    if (result.ok) {
      toast(
        "WhatsApp is open with your message — press send there to reach Lucie. Nothing is ordered until she confirms."
      );
      return;
    }

    if (result.reason === "unconfigured") {
      showMessageFallback(text);
      toast(
        "Lucie's WhatsApp number has not been added yet, so your message is written out for you to copy.",
        "Copy message",
        copyOrderText,
        8000
      );
      return;
    }

    showMessageFallback(text);
    toast(
      "Your browser blocked the WhatsApp window. Copy the message and paste it into WhatsApp.",
      "Copy message",
      copyOrderText,
      8000
    );
  }

  function copyOrderText() {
    var text = currentOrderText();
    util.copyText(text).then(function (ok) {
      toast(
        ok
          ? "Order message copied — paste it into WhatsApp"
          : "Could not copy automatically. Select the text and copy it manually."
      );
    });
  }

  /** When WhatsApp cannot open, keep the finished message on screen. */
  function showMessageFallback(text) {
    if (!el.messageFallback || !el.messageFallbackText) return;
    el.messageFallback.hidden = false;
    el.messageFallbackText.textContent = text;
    if (el.basketDrawer && !el.basketDrawer.classList.contains("is-open")) {
      openBasket();
    }
  }

  function handleBasketClick(event) {
    var target = event.target.closest
      ? event.target.closest("[data-qty-up], [data-qty-down], [data-remove], [data-goto-shop]")
      : null;
    if (!target) return;

    if (target.hasAttribute("data-goto-shop")) {
      closeOverlay(false);
      var shop = document.getElementById("shop");
      if (shop) shop.scrollIntoView({ block: "start" });
      return;
    }

    var upKey = target.getAttribute("data-qty-up");
    if (upKey) {
      var upLine = findLine(upKey);
      if (upLine) basket.setQuantity(upKey, upLine.quantity + 1);
      return;
    }

    var downKey = target.getAttribute("data-qty-down");
    if (downKey) {
      var downLine = findLine(downKey);
      if (downLine) basket.setQuantity(downKey, downLine.quantity - 1);
      return;
    }

    var removeKey = target.getAttribute("data-remove");
    if (removeKey) {
      var removed = basket.remove(removeKey);
      if (removed) {
        toast(removed.name + " removed", "Undo", function () {
          basket.restore(removed);
          toast("Put back in your order");
        });
      }
    }
  }

  function findLine(key) {
    var lines = basket.lines();
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].key === key) return lines[i];
    }
    return null;
  }

  /* ----------------------------------------------------------------------
     Overlays (drawers + mobile menu)
     ---------------------------------------------------------------------- */

  function openOverlay(kind) {
    state.lastFocused = document.activeElement;
    // Only one overlay open at a time keeps the phone experience predictable.
    setDrawerOpen(el.productDrawer, kind === "product");
    setDrawerOpen(el.basketDrawer, kind === "basket");

    if (kind === "menu") {
      el.menu.classList.add("is-open");
      // The set-up banner can hold the header below the viewport top; start
      // the menu rows below wherever the header actually is, or its rows
      // end up sliced behind the banner and header.
      if (el.header) {
        el.menu.style.paddingTop =
          el.header.getBoundingClientRect().bottom + 1 + "px";
      }
      el.menuToggle.setAttribute("aria-expanded", "true");
      el.body.classList.add("is-locked");
      state.openOverlay = "menu";
      updateFloatVisibility();
      var firstMenuLink = $(FOCUSABLE, el.menu);
      if (firstMenuLink) firstMenuLink.focus();
      return;
    }

    el.backdrop.hidden = false;
    el.backdrop.classList.add("is-open");
    el.body.classList.add("is-locked");
    if (el.menuToggle) el.menuToggle.setAttribute("aria-expanded", "false");
    el.menu.classList.remove("is-open");
    state.openOverlay = kind;
    updateFloatVisibility();
  }

  function setDrawerOpen(drawer, open) {
    if (!drawer) return;
    drawer.classList.toggle("is-open", open);
    if (open) {
      drawer.removeAttribute("aria-hidden");
    } else {
      drawer.setAttribute("aria-hidden", "true");
    }
  }

  function closeOverlay(restoreFocus) {
    setDrawerOpen(el.productDrawer, false);
    setDrawerOpen(el.basketDrawer, false);
    if (el.backdrop) {
      el.backdrop.classList.remove("is-open");
      el.backdrop.hidden = true;
    }
    if (el.menu) el.menu.classList.remove("is-open");
    if (el.menuToggle) el.menuToggle.setAttribute("aria-expanded", "false");
    el.body.classList.remove("is-locked");
    state.openOverlay = null;
    updateFloatVisibility();

    if (restoreFocus !== false && state.lastFocused && state.lastFocused.focus) {
      state.lastFocused.focus();
    }
    state.lastFocused = null;
  }

  function getFocusable(container) {
    if (!container) return [];
    return $$(FOCUSABLE, container).filter(function (node) {
      return node.offsetParent !== null || node === document.activeElement;
    });
  }

  function handleOverlayKeydown(event) {
    if (event.key === "Escape" && state.openOverlay) {
      event.preventDefault();
      closeOverlay();
      return;
    }
    if (event.key !== "Tab" || !state.openOverlay) return;

    var container =
      state.openOverlay === "menu"
        ? el.menu
        : state.openOverlay === "basket"
        ? el.basketDrawer
        : el.productDrawer;
    var focusables = getFocusable(container);
    if (!focusables.length) return;

    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* ----------------------------------------------------------------------
     Toast — one at a time, never a stack
     ---------------------------------------------------------------------- */

  function toast(message, actionLabel, action, duration) {
    if (!el.toast) return;
    window.clearTimeout(state.toastTimer);
    el.toastMsg.textContent = message;

    if (actionLabel && action) {
      el.toastAction.hidden = false;
      el.toastAction.textContent = actionLabel;
      el.toastAction.onclick = function () {
        hideToast();
        action();
      };
    } else {
      el.toastAction.hidden = true;
      el.toastAction.onclick = null;
    }

    el.toast.classList.add("is-visible");
    if (el.floatWa) el.floatWa.classList.add("is-lifted");
    state.toastTimer = window.setTimeout(hideToast, duration || 4200);
  }

  function hideToast() {
    if (!el.toast) return;
    el.toast.classList.remove("is-visible");
    if (el.floatWa) el.floatWa.classList.remove("is-lifted");
  }

  /* ----------------------------------------------------------------------
     Scroll: header shadow, active nav link, floating WhatsApp button
     ---------------------------------------------------------------------- */

  function initScrollSpy() {
    var links = $$("[data-nav-link]");
    var sections = $$("[data-section]");
    if (!links.length || !sections.length || !("IntersectionObserver" in window)) {
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = entry.target.getAttribute("id");
          links.forEach(function (link) {
            if (link.getAttribute("href") === "#" + id) {
              link.setAttribute("aria-current", "true");
            } else {
              link.removeAttribute("aria-current");
            }
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  function handleScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    if (el.header) el.header.classList.toggle("is-stuck", y > 8);
    updateFloatVisibility(y);
    hideFloatWhileScrolling();
  }

  function hideFloatWhileScrolling() {
    if (!el.floatWa) return;
    el.floatWa.classList.add("is-scrolling");
    window.clearTimeout(state.floatScrollTimer);
    state.floatScrollTimer = window.setTimeout(function () {
      if (el.floatWa) el.floatWa.classList.remove("is-scrolling");
    }, 650);
  }

  function updateFloatVisibility(y) {
    if (!el.floatWa) return;
    var offset = typeof y === "number" ? y : window.pageYOffset || 0;
    el.floatWa.classList.toggle(
      "is-visible",
      offset > MIN_SCROLL_FOR_FLOAT && !state.openOverlay
    );
  }

  /* ----------------------------------------------------------------------
     Events
     ---------------------------------------------------------------------- */

  function bindEvents() {
    window.addEventListener("scroll", handleScroll, { passive: true });

    if (el.filters) {
      el.filters.addEventListener("click", function (event) {
        var button = event.target.closest("[data-filter]");
        if (button) setFilter(button.getAttribute("data-filter"));
      });
    }

    if (el.grid) {
      el.grid.addEventListener("click", function (event) {
        var dot = event.target.closest("[data-card-colour]");
        if (dot) {
          setCardColour(
            dot.getAttribute("data-card-product"),
            dot.getAttribute("data-card-colour"),
            dot
          );
          return;
        }
        var button = event.target.closest("[data-open-product]");
        if (button) openProduct(button.getAttribute("data-open-product"));
      });
    }

    if (el.bagButton) el.bagButton.addEventListener("click", openBasket);

    if (el.menuBag) {
      el.menuBag.addEventListener("click", function () {
        closeOverlay(false);
        openBasket();
      });
    }

    document.addEventListener("click", function (event) {
      var opener = event.target.closest
        ? event.target.closest("[data-open-basket]")
        : null;
      if (opener) {
        event.preventDefault();
        closeOverlay(false);
        openBasket();
      }
    });

    if (el.menuToggle) {
      el.menuToggle.addEventListener("click", function () {
        if (state.openOverlay === "menu") {
          closeOverlay();
        } else {
          openOverlay("menu");
        }
      });
    }
    if (el.menuList) {
      el.menuList.addEventListener("click", function (event) {
        if (event.target.closest("a")) closeOverlay(false);
      });
    }

    // Product drawer. These are delegated and bound once, so re-opening the
    // drawer can never stack up duplicate handlers.
    if (el.productDrawer) {
      el.productDrawer.addEventListener("click", function (event) {
        // Tapping the already-active swatch clears the choice — the same
        // contract as the collection-card dots, where tapping the active dot
        // returns the piece to how it was photographed. Radios fire no change
        // event when the checked one is clicked, so this is handled on click.
        var swatchLabel = event.target.closest
          ? event.target.closest(".swatch__label")
          : null;
        var active = swatchLabel && swatchLabel.control;
        if (active && active.checked && active.name.indexOf("colour-") === 0) {
          event.preventDefault();
          active.checked = false;
          var customField = $("#pdp-custom-field", el.productDrawer);
          if (customField) customField.hidden = true;
          pdpRefresh();
          return;
        }

        var target = event.target.closest
          ? event.target.closest("#pdp-add, #pdp-ask, #pdp-qty-up, #pdp-qty-down")
          : null;
        if (!target) return;
        var id = target.id;
        if (id === "pdp-add") {
          addActiveProduct();
        } else if (id === "pdp-ask") {
          askAboutActiveProduct();
        } else if (id === "pdp-qty-up") {
          state.qty = clampQuantity(state.qty + 1, config.customisation.maxQuantity);
          pdpRefresh();
        } else if (id === "pdp-qty-down") {
          state.qty = clampQuantity(state.qty - 1, config.customisation.maxQuantity);
          pdpRefresh();
        }
      });

      el.productDrawer.addEventListener("change", function (event) {
        var input = event.target;
        if (!input || !input.name || input.name.indexOf("colour-") !== 0) return;
        var customField = $("#pdp-custom-field", el.productDrawer);
        var isCustom = input.getAttribute("data-custom") === "true";
        if (customField) customField.hidden = !isCustom;
        if (isCustom) {
          var textInput = $("#pdp-custom-input", el.productDrawer);
          if (textInput) textInput.focus();
        }
        pdpRefresh();
      });

      el.productDrawer.addEventListener("input", function (event) {
        if (event.target && event.target.id === "pdp-custom-input") pdpRefresh();
      });
    }

    if (el.basketBody) el.basketBody.addEventListener("click", handleBasketClick);

    if (el.backdrop) {
      el.backdrop.addEventListener("click", function () {
        closeOverlay();
      });
    }

    document.addEventListener("click", function (event) {
      var closer = event.target.closest
        ? event.target.closest("[data-close-overlay]")
        : null;
      if (closer) {
        event.preventDefault();
        closeOverlay(false);
      }
    });

    if (el.basketSend) {
      el.basketSend.addEventListener("click", function () {
        sendViaWhatsApp(currentOrderText());
      });
    }
    if (el.basketCopy) {
      el.basketCopy.addEventListener("click", copyOrderText);
    }

    document.addEventListener("keydown", handleOverlayKeydown);

    basket.subscribe(function () {
      paintBasket();
      if (el.bagCount) {
        el.bagCount.classList.add("is-bumped");
        window.clearTimeout(state.bumpTimer);
        state.bumpTimer = window.setTimeout(function () {
          el.bagCount.classList.remove("is-bumped");
        }, 500);
      }
    });
  }

  window.LHC.app = {
    init: init,
    openProduct: openProduct,
    openBasket: openBasket,
    toast: toast,
    closeOverlay: closeOverlay,
    sendViaWhatsApp: sendViaWhatsApp,
    currentOrderText: currentOrderText,
    state: state,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window, document);
