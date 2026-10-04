/* ==========================================================================
   Product catalogue
   --------------------------------------------------------------------------
   Add a product by copying one of the objects below. Prices are in South
   African rand, written as plain numbers (no "R", no spaces) so totals add up
   correctly — the R is added when the price is displayed.

   Confirmed prices, taken from the business's own price list:
     Small Ruffle Hat  R180
     Bigger Ruffle Hat R200
     Slouchy Beanie    R100
     Cat Ear Beanie    R80
     Custom colour     + R30

   Photography: the `image` paths point at Lucie's own product photographs
   (cream yarn, studio backdrop). While an `image` is empty the `illustration`
   is shown with a "photo to come" label instead, so nothing pretends to be a
   photograph it is not.

   Colour previews: the Customisation section swaps the preview image's src
   to a per-shade photograph at assets/img/products/variants/<id>-<shade>.jpg
   (shade = the config.js colour name lowercased with spaces as dashes, e.g.
   small-ruffle-hat-dusty-rose.jpg). These are the client's own photographs,
   one per piece per shade — a colour change is a plain image swap, with no
   recolouring anywhere. See _reference/colour-images-registry.md for the
   source-file mapping.
   ========================================================================== */

(function (window) {
  "use strict";

  var CATEGORIES = [
    { id: "hats", name: "Ruffle hats" },
    { id: "beanies", name: "Beanies" },
  ];

  var PRODUCTS = [
    {
      id: "small-ruffle-hat",
      name: "Small Ruffle Hat",
      price: 180,
      category: "hats",
      shortDescription: "A petite hat with a soft, gathered ruffle around the edge.",
      description:
        "The smaller of the two ruffle hats. A soft crown with a gathered ruffle worked all the way around the edge, so the frill frames the face.",
      image: "assets/img/products/small-ruffle-hat.jpg",
      illustration: "assets/img/products/small-ruffle-hat.svg",
      // Set to false for any piece Lucie does not offer in a chosen colour.
      allowsColourChoice: true,
      // Optional per-product override of the R30 fee in config.js.
      colourFee: null,
      illustrationAspect: [784, 1168],
    },
    {
      id: "bigger-ruffle-hat",
      name: "Bigger Ruffle Hat",
      price: 200,
      category: "hats",
      shortDescription: "The same ruffle trim in a larger, roomier size.",
      description:
        "The same gathered ruffle edge as the small hat, made larger — a roomier fit and a bolder shape.",
      image: "assets/img/products/bigger-ruffle-hat.jpg",
      illustration: "assets/img/products/bigger-ruffle-hat.svg",
      allowsColourChoice: true,
      colourFee: null,
      illustrationAspect: [784, 1168],
    },
    {
      id: "slouchy-beanie",
      name: "Slouchy Beanie",
      price: 100,
      category: "beanies",
      shortDescription: "A relaxed beanie that sits back with a soft slouch.",
      description:
        "A relaxed beanie with a folded ribbed cuff and a soft slouch at the crown, so it sits back rather than hugging the head.",
      image: "assets/img/products/slouchy-beanie.jpg",
      illustration: "assets/img/products/slouchy-beanie.svg",
      allowsColourChoice: true,
      colourFee: null,
      illustrationAspect: [784, 1168],
    },
    {
      id: "cat-ear-beanie",
      name: "Cat Ear Beanie",
      price: 80,
      category: "beanies",
      shortDescription: "A playful beanie finished with two little cat ears.",
      description:
        "A playful beanie with two little cat ears on top and a folded ribbed cuff. The smallest of the four pieces.",
      image: "assets/img/products/cat-ear-beanie.jpg",
      illustration: "assets/img/products/cat-ear-beanie.svg",
      allowsColourChoice: true,
      colourFee: null,
      illustrationAspect: [784, 1168],
    },
  ];

  /* --- Lookups ------------------------------------------------------------ */

  function all() {
    return PRODUCTS.slice();
  }

  function getById(id) {
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (PRODUCTS[i].id === id) return PRODUCTS[i];
    }
    return null;
  }

  function byCategory(categoryId) {
    if (!categoryId || categoryId === "all") return all();
    return PRODUCTS.filter(function (p) {
      return p.category === categoryId;
    });
  }

  function categories() {
    return CATEGORIES.map(function (category) {
      return {
        id: category.id,
        name: category.name,
        count: byCategory(category.id).length,
      };
    });
  }

  /**
   * The best picture available for a product, plus whether it is a real photo.
   * Views use this so the "photo to come" label disappears on its own the
   * moment a real photograph is added.
   */
  function pictureFor(product) {
    if (product.image) {
      return { src: product.image, isPhoto: true };
    }
    return { src: product.illustration, isPhoto: false };
  }

  /**
   * Dev-time sanity check. Returns a list of problems; an empty list is good.
   * Used by _tests/tests.html so a mistyped product cannot ship quietly.
   */
  function validate() {
    var problems = [];
    var seen = {};
    var categoryIds = CATEGORIES.map(function (c) {
      return c.id;
    });

    PRODUCTS.forEach(function (p, index) {
      var where = p && p.id ? p.id : "product at index " + index;
      if (!p.id || typeof p.id !== "string") {
        problems.push(where + ": needs a string id");
      } else if (seen[p.id]) {
        problems.push(where + ": duplicate id");
      }
      seen[p.id] = true;

      if (!p.name) problems.push(where + ": needs a name");
      if (typeof p.price !== "number" || !isFinite(p.price) || p.price <= 0) {
        problems.push(where + ": price must be a positive number");
      }
      if (Math.round(p.price * 100) !== p.price * 100) {
        problems.push(where + ": price has more than two decimal places");
      }
      if (categoryIds.indexOf(p.category) === -1) {
        problems.push(where + ": unknown category '" + p.category + "'");
      }
      if (!p.shortDescription) problems.push(where + ": needs a short description");
      if (!p.description) problems.push(where + ": needs a description");
      if (!p.image && !p.illustration) {
        problems.push(where + ": needs either an image or an illustration");
      }
      if (
        p.colourFee !== null &&
        p.colourFee !== undefined &&
        (typeof p.colourFee !== "number" || p.colourFee < 0)
      ) {
        problems.push(where + ": colourFee must be null or a number of at least 0");
      }
      if (!p.allowsColourChoice && p.colourFee) {
        problems.push(where + ": has a colourFee but does not allow colour choice");
      }
    });

    return problems;
  }

  window.LHC = window.LHC || {};
  window.LHC.products = {
    all: all,
    getById: getById,
    byCategory: byCategory,
    categories: categories,
    pictureFor: pictureFor,
    validate: validate,
  };
})(window);
