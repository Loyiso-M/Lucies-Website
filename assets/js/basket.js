/* ==========================================================================
   The order basket
   --------------------------------------------------------------------------
   A small, dependency-free store. It holds what the customer has picked, works
   out the totals, and keeps itself in sessionStorage so a refresh — or a
   wander off to another tab — does not lose the selection.

   Nothing here reserves stock or takes payment. It only describes what the
   customer would like to ask Lucie for.
   ========================================================================== */

(function (window) {
  "use strict";

  var STORAGE_KEY = "lhc.basket.v1";

  var config = window.LHC.config;
  var products = window.LHC.products;
  var clampQuantity = window.LHC.util.clampQuantity;

  var items = [];
  var listeners = [];
  var memoryOnly = false; // set when the browser blocks sessionStorage

  /* --- Storage ------------------------------------------------------------ */

  function readStorage() {
    try {
      return window.sessionStorage.getItem(STORAGE_KEY);
    } catch (error) {
      memoryOnly = true;
      return null;
    }
  }

  function writeStorage() {
    if (memoryOnly) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      // Private mode or a full quota: carry on in memory for this page view.
      memoryOnly = true;
    }
  }

  /* --- Keys --------------------------------------------------------------- */

  /**
   * One basket line per product *and* colour, so two of the same hat in two
   * shades stay separate instead of silently merging.
   */
  function keyFor(productId, colour) {
    return productId + "::" + (colour && colour.name ? colour.name : "-");
  }

  /* --- Notifications ------------------------------------------------------ */

  function notify(reason, detail) {
    listeners.forEach(function (listener) {
      try {
        listener(items.slice(), reason, detail);
      } catch (error) {
        if (window.console && console.error) console.error(error);
      }
    });
  }

  function subscribe(listener) {
    listeners.push(listener);
    return function unsubscribe() {
      listeners = listeners.filter(function (l) {
        return l !== listener;
      });
    };
  }

  /* --- Queries ------------------------------------------------------------ */

  function all() {
    return items.slice();
  }

  function find(productId, colour) {
    var key = keyFor(productId, colour);
    for (var i = 0; i < items.length; i++) {
      if (items[i].key === key) return items[i];
    }
    return null;
  }

  function count() {
    return items.reduce(function (total, item) {
      return total + item.quantity;
    }, 0);
  }

  function isEmpty() {
    return items.length === 0;
  }

  function feeFor(product) {
    if (!product.allowsColourChoice) return 0;
    if (product.colourFee !== null && product.colourFee !== undefined) {
      return product.colourFee;
    }
    return config.customisation.colourFee;
  }

  /**
   * Items enriched with the numbers the UI and the order message need.
   * `colourFee` is only charged when the customer has actually chosen a colour.
   */
  function lines() {
    return items.map(function (item) {
      var product = products.getById(item.productId);
      var chosenColour = item.colour ? item.colour : null;
      var colourFee = chosenColour ? item.colourFee : 0;
      return {
        key: item.key,
        productId: item.productId,
        product: product,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        colour: chosenColour,
        colourFee: colourFee,
        unitPrice: item.price + colourFee,
        lineTotal: (item.price + colourFee) * item.quantity,
        isCustomColour: !!(chosenColour && chosenColour.isCustom),
      };
    });
  }

  function subtotal() {
    return lines().reduce(function (total, line) {
      return total + line.lineTotal;
    }, 0);
  }

  function colourFeeTotal() {
    return lines().reduce(function (total, line) {
      return total + line.colourFee * line.quantity;
    }, 0);
  }

  /* --- Mutations ---------------------------------------------------------- */

  /**
   * Add a product. Adding the same product in the same colour increases the
   * quantity rather than creating a second line.
   */
  function add(product, options) {
    var opts = options || {};
    var quantity = clampQuantity(opts.quantity || 1, config.customisation.maxQuantity);
    var colour = opts.colour || null;
    var key = keyFor(product.id, colour);
    var existing = find(product.id, colour);
    var max = config.customisation.maxQuantity;

    if (existing) {
      existing.quantity = Math.min(max, existing.quantity + quantity);
      writeStorage();
      notify("update", existing);
      return existing;
    }

    var item = {
      key: key,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: quantity,
      colour: colour,
      colourFee: feeFor(product),
    };
    items.push(item);
    writeStorage();
    notify("add", item);
    return item;
  }

  function setQuantity(key, quantity) {
    var item = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].key === key) item = items[i];
    }
    if (!item) return;
    item.quantity = clampQuantity(quantity, config.customisation.maxQuantity);
    writeStorage();
    notify("update", item);
  }

  /** Remove a line and return it, so the UI can offer an undo. */
  function remove(key) {
    var removed = null;
    items = items.filter(function (item) {
      if (item.key === key) {
        removed = item;
        return false;
      }
      return true;
    });
    if (removed) {
      writeStorage();
      notify("remove", removed);
    }
    return removed;
  }

  /** Put a previously removed line back (used by the undo action). */
  function restore(item) {
    if (!item) return;
    var existing = find(item.productId, item.colour);
    if (existing) {
      existing.quantity = Math.min(
        config.customisation.maxQuantity,
        existing.quantity + item.quantity
      );
    } else {
      items.push(item);
    }
    writeStorage();
    notify("add", item);
  }

  function clear() {
    items = [];
    writeStorage();
    notify("clear");
  }

  /** Rebuild from sessionStorage, dropping anything that no longer exists. */
  function load() {
    var raw = readStorage();
    if (!raw) return;
    try {
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      items = parsed
        .filter(function (item) {
          return (
            item &&
            typeof item.productId === "string" &&
            products.getById(item.productId) &&
            typeof item.price === "number" &&
            typeof item.quantity === "number"
          );
        })
        .map(function (item) {
          return {
            key: keyFor(item.productId, item.colour),
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: clampQuantity(item.quantity, config.customisation.maxQuantity),
            colour: item.colour || null,
            colourFee: typeof item.colourFee === "number" ? item.colourFee : 0,
          };
        });
    } catch (error) {
      items = [];
    }
  }

  window.LHC.basket = {
    all: all,
    lines: lines,
    add: add,
    remove: remove,
    restore: restore,
    setQuantity: setQuantity,
    clear: clear,
    count: count,
    isEmpty: isEmpty,
    subtotal: subtotal,
    colourFeeTotal: colourFeeTotal,
    feeFor: feeFor,
    subscribe: subscribe,
    load: load,
    keyFor: keyFor,
  };
})(window);
