/* ==========================================================================
   Views
   --------------------------------------------------------------------------
   Pure functions that turn data into markup. No state is kept here, so a view
   can always be re-rendered from scratch and will match the data exactly.
   ========================================================================== */

(function (window) {
  "use strict";

  var config = window.LHC.config;
  var products = window.LHC.products;
  var esc = window.LHC.util.esc;
  var rand = window.LHC.util.rand;

  var CATEGORY_NAMES = products.categories().reduce(function (acc, category) {
    acc[category.id] = category.name;
    return acc;
  }, {});

  var MONOGRAM =
    '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1Z"/></svg>';

  /**
   * The media block for a product. Uses the real photograph when one exists,
   * and otherwise the brand illustration with an honest label.
   */
  function media(product, options) {
    var opts = options || {};
    var picture = products.pictureFor(product);
    var aspect = product.illustrationAspect || [4, 5];
    var loading = opts.eager ? "eager" : "lazy";
    var priority = opts.eager ? ' fetchpriority="high"' : "";
    var alt = picture.isPhoto
      ? product.name + " — handmade piece by Lucie's Handmade Creations"
      : "Illustration of the " + product.name;

    return (
      '<img src="' +
      esc(picture.src) +
      '" alt="' +
      esc(alt) +
      '" width="' +
      esc(aspect[0]) +
      '" height="' +
      esc(aspect[1]) +
      '" loading="' +
      loading +
      '" decoding="async"' +
      priority +
      ' data-card-img="' +
      esc(product.id) +
      '"' +
      (picture.isPhoto
        ? ' data-fallback="' + esc(product.illustration) + '"'
        : "") +
      ">" +
      (picture.isPhoto
        ? ""
        : '<span class="card__badge" aria-hidden="true">Photo to come</span>')
    );
  }

  /** Colour dots for a shop card: tap one and the card's photo becomes that
   *  shade. app.js listens for [data-card-colour] clicks on the grid. */
  function cardColours(product, fee) {
    var dots = config.customisation.colours
      .map(function (colour) {
        return (
          '<button type="button" class="card__colour-dot" data-card-product="' +
          esc(product.id) +
          '" data-card-colour="' +
          esc(colour.name) +
          '" style="background:' +
          esc(colour.hex) +
          '" aria-label="Preview the ' +
          esc(product.name) +
          " in " +
          esc(colour.name) +
          '"></button>'
        );
      })
      .join("");
    return (
      '<div class="card__colours" role="group" aria-label="Pick a colour for this piece">' +
      dots +
      "</div>" +
      '<p class="card__colour-note">Custom colour +' +
      rand(fee) +
      "</p>"
    );
  }

  /** One product card. The whole card is tappable; the name is the button. */
  function productCard(product) {
    var fee = window.LHC.basket.feeFor(product);
    var customAvailable = product.allowsColourChoice && fee > 0;

    return (
      '<article class="card" data-card="' +
      esc(product.id) +
      '">' +
      '<div class="card__media">' +
      media(product) +
      "</div>" +
      '<div class="card__body">' +
      '<h3 class="card__title">' +
      '<button type="button" class="card__open" data-open-product="' +
      esc(product.id) +
      '">' +
      esc(product.name) +
      '<span class="visually-hidden"> — view details and start an order</span>' +
      "</button>" +
      "</h3>" +
      '<p class="card__price"><span class="price">' +
      rand(product.price) +
      "</span>" +
      (customAvailable
        ? '<span class="card__custom">or + ' +
          rand(fee) +
          " in your colour</span>"
        : "") +
      "</p>" +
      '<p class="card__desc">' +
      esc(product.shortDescription) +
      "</p>" +
      (customAvailable ? cardColours(product, fee) : "") +
      '<p class="card__foot" aria-hidden="true"><span>View &amp; order</span>' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
      "</p>" +
      "</div>" +
      "</article>"
    );
  }

  /**
   * Lists are given role="list" wherever CSS removes the bullets, because Safari
   * otherwise drops the list semantics for screen readers.
   */

  /** The filter row, with a live count on each option. */
  function filters(activeId) {
    var options = [{ id: "all", name: "All pieces", count: products.all().length }]
      .concat(products.categories());

    return options
      .map(function (option) {
        return (
          '<button type="button" class="filter" data-filter="' +
          esc(option.id) +
          '" aria-pressed="' +
          (option.id === activeId ? "true" : "false") +
          '">' +
          esc(option.name) +
          '<span class="filter__count">' +
          option.count +
          "</span>" +
          "</button>"
        );
      })
      .join("");
  }

  /**
   * Colour swatches as real radio buttons, so keyboard and screen-reader
   * behaviour comes for free.
   */
  function colourSwatches(product, selectedName) {
    var colours = config.customisation.colours;
    var groupName = "colour-" + product.id;

    // Divs rather than <li>: the container is a radiogroup, and list items are
    // not valid children of a radiogroup.
    var items = colours
      .map(function (colour, index) {
        var id = groupName + "-" + index;
        return (
          '<div class="swatch">' +
          '<input class="swatch__input visually-hidden" type="radio" id="' +
          esc(id) +
          '" name="' +
          esc(groupName) +
          '" value="' +
          esc(colour.name) +
          '" data-hex="' +
          esc(colour.hex) +
          '" aria-label="' +
          esc(colour.name) +
          ' shade"' +
          (colour.name === selectedName ? " checked" : "") +
          ">" +
          // No visible text and no tooltip: the dot itself is the whole
          // label. The radio's aria-label still names the shade for screen
          // readers, so the input must carry it.
          '<label class="swatch__label" for="' +
          esc(id) +
          '">' +
          '<span class="swatch__dot" style="background:' +
          esc(colour.hex) +
          '"></span>' +
          "</label>" +
          "</div>"
        );
      })
      .join("");

    var otherId = groupName + "-other";
    items +=
      '<div class="swatch">' +
      '<input class="swatch__input visually-hidden" type="radio" id="' +
      esc(otherId) +
      '" name="' +
      esc(groupName) +
      '" value="__other__" data-custom="true"' +
      (selectedName === "__other__" ? " checked" : "") +
      ' aria-label="Another colour">' +
      '<label class="swatch__label" for="' +
      esc(otherId) +
      '">' +
      '<span class="swatch__dot swatch__dot--other" aria-hidden="true">?</span>' +
      "</label>" +
      "</div>";

    return items;
  }

  /** Read-only palette used in the customisation section. */
  function paletteChips() {
    return config.customisation.colours
      .map(function (colour) {
        return (
          '<li class="palette__item">' +
          '<span class="palette__dot" style="background:' +
          esc(colour.hex) +
          '" aria-hidden="true"></span>' +
          '<span class="palette__name">' +
          esc(colour.name) +
          "</span>" +
          "</li>"
        );
      })
      .join("");
  }

  /** One ordering step. */
  function step(stepData) {
    return (
      "<li class=\"step\"><h3>" +
      esc(stepData.title) +
      "</h3><p>" +
      esc(stepData.text) +
      "</p></li>"
    );
  }

  /** One basket line. */
  function basketLine(line) {
    var picture = products.pictureFor(line.product || { illustration: "" });
    var aspect = (line.product && line.product.illustrationAspect) || [4, 5];

    var colourText = line.colour
      ? (line.colour.isCustom ? "Requested: " : "") + line.colour.name
      : "No colour chosen";

    return (
      '<li class="line" data-line="' +
      esc(line.key) +
      '">' +
      '<div class="line__media">' +
      '<img src="' +
      esc(picture.src) +
      '" alt="" width="' +
      esc(aspect[0]) +
      '" height="' +
      esc(aspect[1]) +
      '" loading="lazy" decoding="async">' +
      "</div>" +
      '<div class="line__main">' +
      '<h3 class="line__title">' +
      esc(line.name) +
      "</h3>" +
      '<p class="line__opts">' +
      (line.colour
        ? '<span class="line__dot" style="background:' +
          esc(line.colour.hex || "#fff") +
          '" aria-hidden="true"></span>'
        : "") +
      esc(colourText) +
      (line.colourFee > 0 ? " · +" + rand(line.colourFee) : "") +
      "</p>" +
      '<div class="line__controls">' +
      '<div class="qty qty--sm">' +
      '<button type="button" class="qty__btn" data-qty-down="' +
      esc(line.key) +
      '" aria-label="One fewer ' +
      esc(line.name) +
      '"' +
      (line.quantity <= 1 ? " disabled" : "") +
      ">&minus;</button>" +
      '<span class="qty__val" aria-hidden="true">' +
      line.quantity +
      "</span>" +
      '<span class="visually-hidden">Quantity: ' +
      line.quantity +
      "</span>" +
      '<button type="button" class="qty__btn" data-qty-up="' +
      esc(line.key) +
      '" aria-label="One more ' +
      esc(line.name) +
      '"' +
      (line.quantity >= config.customisation.maxQuantity ? " disabled" : "") +
      ">+</button>" +
      "</div>" +
      '<span class="line__price">' +
      rand(line.lineTotal) +
      "</span>" +
      "</div>" +
      '<button type="button" class="line__remove" data-remove="' +
      esc(line.key) +
      '">Remove<span class="visually-hidden"> ' +
      esc(line.name) +
      "</span></button>" +
      "</div>" +
      "</li>"
    );
  }

  window.LHC.render = {
    media: media,
    productCard: productCard,
    filters: filters,
    colourSwatches: colourSwatches,
    paletteChips: paletteChips,
    step: step,
    basketLine: basketLine,
    CATEGORY_NAMES: CATEGORY_NAMES,
    heartIcon: MONOGRAM,
  };
})(window);
