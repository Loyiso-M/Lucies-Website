/* ==========================================================================
   Small shared helpers
   ========================================================================== */

(function (window, document) {
  "use strict";

  var NBSP = "\u00a0"; // keeps "R1 200" from wrapping mid-price

  /**
   * Format a number for display, South African style: a space between
   * thousands and no trailing ".00".
   *   180      -> "180"
   *   1200     -> "1 200"
   *   127.5    -> "127.50"
   */
  function money(value) {
    var n = Number(value);
    if (!isFinite(n)) return "0";
    var negative = n < 0;
    n = Math.abs(n);
    var whole = Math.floor(n + 1e-9);
    var cents = Math.round((n - whole) * 100);
    if (cents === 100) {
      whole += 1;
      cents = 0;
    }
    var text = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
    if (cents > 0) text += "." + (cents < 10 ? "0" + cents : String(cents));
    return (negative ? "-" : "") + text;
  }

  /** Money with the rand symbol: 180 -> "R180" */
  function rand(value) {
    var n = Number(value);
    return (n < 0 ? "-R" : "R") + money(Math.abs(n));
  }

  /** Escape text for safe use inside an HTML template string. */
  function esc(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $$(selector, scope) {
    return Array.prototype.slice.call(
      (scope || document).querySelectorAll(selector)
    );
  }

  /** Clamp a quantity into the allowed range. */
  function clampQuantity(value, max) {
    var n = parseInt(value, 10);
    if (isNaN(n)) n = 1;
    var ceiling = max && max > 0 ? max : 99;
    return Math.min(ceiling, Math.max(1, n));
  }

  /**
   * Copy text to the clipboard, with a fallback for browsers that block the
   * async clipboard API (older Android browsers, or non-secure origins).
   */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text)
        .then(function () {
          return true;
        })
        .catch(function () {
          return legacyCopy(text);
        });
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    try {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.top = "-1000px";
      document.body.appendChild(area);
      area.select();
      var ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch (error) {
      return false;
    }
  }

  /** Text nodes that hold a live-updating number, e.g. "3 items". */
  function plural(count, singular, pluralWord) {
    return count === 1 ? singular : pluralWord || singular + "s";
  }

  window.LHC = window.LHC || {};
  window.LHC.util = {
    money: money,
    rand: rand,
    esc: esc,
    $: $,
    $$: $$,
    clampQuantity: clampQuantity,
    copyText: copyText,
    plural: plural,
  };
})(window, document);
