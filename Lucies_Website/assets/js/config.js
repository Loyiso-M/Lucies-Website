/* ==========================================================================
   Business configuration
   --------------------------------------------------------------------------
   This is the ONE file to edit for contact details, fees and shop wording.
   Nothing here is a guess: anything not yet confirmed by Lucie is left empty,
   and the site shows a calm "to confirm" note in its place rather than
   inventing a fact. Empty values are listed in the setup bar at the top of
   the page so they cannot be forgotten.
   ========================================================================== */

(function (window) {
  "use strict";

  var CONFIG = {
    brand: {
      name: "Lucie's Handmade Creations",
      shortName: "Lucie's",
      tagline: "Handmade with love, made just for you.",
      supportingPhrase: "Made with love.",
      // Shown in the footer. Deliberately general: no unverified claims.
      statement:
        "Knitted and crocheted pieces, made by hand in small batches and finished one at a time.",
      market: "South Africa",
      currency: "ZAR",
      currencySymbol: "R",
      // The live address of the site, used for the canonical tag and the
      // share preview. Leave empty until the domain is decided.
      siteUrl: "",
    },

    /* --- WhatsApp ----------------------------------------------------------
       The number must be in full international format, digits only.
       South Africa: country code 27 + the number WITHOUT its leading zero.
         082 123 4567  ->  "27821234567"
       Leave empty until Lucie confirms the public business number.
       ---------------------------------------------------------------------- */
    whatsapp: {
      // Lucie's business number — digits only, international format, no "+".
      number: "27814110936",
      // Shown as text on the site.
      display: "+27 81 411 0936",
    },

    /* --- Social ------------------------------------------------------------ */
    social: {
      tiktokUrl: "",
      tiktokHandle: "",
    },

    /* --- Customisation -----------------------------------------------------
       The price list confirms an extra R30 for a colour chosen by the customer.
       The shades below are a request menu, NOT a statement of stock — the
       wording on the site tells customers Lucie confirms what she has. Trim,
       rename or recolour this list to match Lucie's actual yarn.
       ---------------------------------------------------------------------- */
    customisation: {
      colourFee: 30,
      maxQuantity: 10,
      colours: [
        { name: "Cream", hex: "#f2e7db" },
        { name: "Off-white", hex: "#faf6f0" },
        { name: "Blush pink", hex: "#eec7c9" },
        { name: "Dusty rose", hex: "#c98a93" },
        { name: "Berry", hex: "#a9505f" },
        { name: "Chocolate", hex: "#5a4038" },
        { name: "Mustard", hex: "#d9a43b" },
        { name: "Sage", hex: "#9bae94" },
        { name: "Denim blue", hex: "#6c86a8" },
        { name: "Lilac", hex: "#b9a3c4" },
        { name: "Charcoal", hex: "#4a4a4a" },
      ],
      // Always offered last: customers can simply describe what they want.
      otherOptionLabel: "Another colour",
    },

    /* --- Fulfilment --------------------------------------------------------
       Not confirmed yet. Leave empty and the site says Lucie will confirm it.
       ---------------------------------------------------------------------- */
    fulfilment: {
      deliveryNote: "",
      collectionNote: "",
    },

    /* --- Ordering flow ----------------------------------------------------- */
    ordering: {
      steps: [
        {
          title: "Browse the collection",
          text: "Four pieces, all made by hand. Prices are for the piece as shown.",
        },
        {
          title: "Choose your piece",
          text: "Tap any item to see it bigger, pick a quantity and read what you need to know.",
        },
        {
          title: "Add a colour request",
          text: "Want a different shade? Choose one for an extra R30 per piece.",
        },
        {
          title: "Send it on WhatsApp",
          text: "We build the message for you. Lucie replies to confirm everything.",
        },
      ],
    },

    /* --- Wording -----------------------------------------------------------
       Editable copy. Kept here so the owner can adjust tone without touching
       any layout code.
       ---------------------------------------------------------------------- */
    copy: {
      heroHeadline: "Handmade with love, <em>made just for you.</em>",
      heroText:
        "Discover lovingly crafted knitted and crocheted pieces, made to add warmth, personality, and a little something special to your style.",
      heroNote:
        "Simply send your request on WhatsApp — Lucie will personally help you with the details.",
      storyLead: "Every stitch tells a story.",
      storyBody: [
        "Each piece here is made by hand — knitted and crocheted one at a time, rather than printed by a machine. That is why no two pieces are quite identical, and why your hat can be the shade you actually wanted.",
        "Customisation is part of the craft, not an afterthought: tell Lucie the colour you have in mind and she will make your piece to suit.",
      ],
      // Shown as an honest, editable prompt rather than an invented biography.
      storyPlaceholder:
        "Lucie's own story — how she started, what she loves making and where she works — will be added here. It is left blank on purpose rather than filled in with guesses.",
      customiseIntro:
        "Most pieces can be made in the shade of your choice for an extra R30. Pick a colour and it goes straight into your order message — Lucie will confirm which shades she has available.",
      customiseNote:
        "The shades shown are examples of what you can ask for, not a promise of stock.",
      pdpConfirmNote:
        "Made to order. Lucie will confirm sizing, yarn and the exact shade when she replies.",
      orderConfirmNote:
        "Nothing is charged here and no order is placed yet. Sending the message starts the conversation — Lucie confirms availability, the final price, payment and collection or delivery.",
      deliveryPlaceholder:
        "Arranged with Lucie when she confirms your order.",
    },

    /* --- Social proof ------------------------------------------------------
       Left empty on purpose. There are no real reviews yet, and inventing
       them would be dishonest. Add real ones in this shape when they exist:
         { quote: "...", name: "...", detail: "..." }
       ---------------------------------------------------------------------- */
    reviews: [],
  };

  window.LHC = window.LHC || {};
  window.LHC.config = CONFIG;
})(window);
