/* ==========================================================================
   WhatsApp ordering
   --------------------------------------------------------------------------
   Builds the order message from what the customer actually picked, then opens
   WhatsApp with it pre-filled. The customer still has to press send in
   WhatsApp, so the site never claims an order has been placed.
   ========================================================================== */

(function (window) {
  "use strict";

  var config = window.LHC.config;
  var rand = window.LHC.util.rand;

  /* --- The number --------------------------------------------------------- */

  /**
   * Reduce whatever the owner typed to digits in full international format.
   * South African numbers are the common case, so a leading local zero is
   * converted to the +27 country code.
   */
  function normalizeNumber(raw) {
    var digits = String(raw === null || raw === undefined ? "" : raw)
      .replace(/[^\d+]/g, "")
      .replace(/^\+/, "")
      // "0027..." is the international dialling prefix; wa.me wants it bare.
      .replace(/^00/, "");

    if (!digits) return "";

    if (digits.charAt(0) === "0" && digits.length === 10) {
      return "27" + digits.slice(1); // 0821234567 -> 27821234567
    }
    if (digits.charAt(0) !== "0" && digits.length === 9) {
      return "27" + digits; // 821234567 -> 27821234567
    }
    return digits;
  }

  function number() {
    return normalizeNumber(config.whatsapp.number);
  }

  function isConfigured() {
    return number().length >= 10;
  }

  /** A readable version for the site, e.g. "082 123 4567". */
  function displayNumber() {
    if (config.whatsapp.display) return config.whatsapp.display;
    var digits = number();
    if (!digits) return "";
    if (digits.indexOf("27") === 0 && digits.length === 11) {
      return "0" + digits.slice(2, 4) + " " + digits.slice(4, 7) + " " + digits.slice(7);
    }
    return "+" + digits;
  }

  /* --- Message building --------------------------------------------------- */

  function colourLine(line) {
    if (!line.colour) return "Colour: Not specified";
    if (line.colour.isCustom) {
      return "Colour: " + line.colour.name + " (a colour I'd like — please let me know if you have it)";
    }
    return "Colour: " + line.colour.name;
  }

  /**
   * The full order message. Generated from the live basket so quantities,
   * colours and the total always match what is on screen.
   */
  function buildOrderMessage(lines, subtotal) {
    var out = [];
    out.push("Hello Lucie! \u2764\ufe0f");
    out.push("");
    out.push("I would like to place an order:");
    out.push("");

    lines.forEach(function (line, index) {
      out.push(index + 1 + ". " + line.name);
      out.push("Price: " + rand(line.price));
      out.push("Quantity: " + line.quantity);
      out.push(colourLine(line));
      if (line.colourFee > 0) {
        out.push("Colour change fee: " + rand(line.colourFee) + " per piece");
      }
      out.push("Item total: " + rand(line.lineTotal));
      if (index < lines.length - 1) out.push("");
    });

    out.push("");
    out.push("Estimated order total: " + rand(subtotal));
    out.push("");
    out.push(
      "Please let me know about availability, payment, and collection or delivery options."
    );
    out.push("");
    out.push("Thank you! \u2764\ufe0f");
    return out.join("\n");
  }

  /** A single-product enquiry, for the "ask about this piece" action. */
  function buildEnquiryMessage(product, options) {
    var opts = options || {};
    var quantity = opts.quantity || 1;
    var colour = opts.colour || null;
    var fee = colour ? (opts.colourFee || 0) : 0;
    var unit = product.price + fee;

    var out = [];
    out.push("Hello Lucie! \u2764\ufe0f");
    out.push("");
    out.push("I would like to ask about this piece:");
    out.push("");
    out.push(product.name);
    out.push("Price: " + rand(product.price));
    out.push("Quantity: " + quantity);
    out.push(
      colour ? colourLine({ colour: colour }) : "Colour: Not specified"
    );
    if (fee > 0) out.push("Colour change fee: " + rand(fee) + " per piece");
    out.push("Estimated total: " + rand(unit * quantity));
    out.push("");
    out.push(
      "Could you let me know if it is available, and about payment and collection or delivery?"
    );
    out.push("");
    out.push("Thank you! \u2764\ufe0f");
    return out.join("\n");
  }

  function linkFor(text) {
    var n = number();
    if (!n) return "";
    return "https://wa.me/" + n + "?text=" + encodeURIComponent(text);
  }

  /**
   * Open WhatsApp with the message fitted. Returns an object rather than
   * throwing so the caller can show the right feedback.
   */
  function open(text) {
    if (!isConfigured()) {
      return { ok: false, reason: "unconfigured" };
    }
    var url = linkFor(text);
    var opened = null;
    try {
      opened = window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      opened = null;
    }
    if (!opened) {
      // Pop-up blocked: navigate the current tab instead of failing silently.
      try {
        window.location.href = url;
        return { ok: true, url: url, navigated: true };
      } catch (error2) {
        return { ok: false, reason: "blocked", url: url };
      }
    }
    return { ok: true, url: url };
  }

  window.LHC.wa = {
    normalizeNumber: normalizeNumber,
    number: number,
    isConfigured: isConfigured,
    displayNumber: displayNumber,
    buildOrderMessage: buildOrderMessage,
    buildEnquiryMessage: buildEnquiryMessage,
    linkFor: linkFor,
    open: open,
  };
})(window);
