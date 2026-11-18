/* ============================================================
   unlinked+ — avatar-builder.js
   IIFE module. Exposes window.AvatarBuilder.
   All character bodies drawn with SVG primitives — no emoji.
   ViewBox: 0 0 300 300
   Head center: (150,115) r~65
   Body polygon: 110,195 190,195 205,290 95,290
   ============================================================ */
(function () {
  'use strict';

  /* --------------------------------------------------------
     Internal State
     -------------------------------------------------------- */
  var _state = {
    character: 'panda',
    accessories: []
  };

  var _bound = false;

  var _PREMIUM = ['kacamata'];

  /* --------------------------------------------------------
     Shared Body Parts
     skinColor — hex string for skin tone
     shirtColor — hex string for shirt/top color
     -------------------------------------------------------- */
  function _bodyParts(skinColor, shirtColor) {
    return (
      /* Neck */
      '<rect x="135" y="170" width="30" height="25" fill="' + skinColor + '"/>' +
      /* Body trapezoid */
      '<polygon points="108,192 192,192 207,292 93,292" fill="' + shirtColor + '"/>' +
      /* Left arm */
      '<rect x="74" y="192" width="30" height="82" rx="14" fill="' + shirtColor + '" transform="rotate(-8 89 192)"/>' +
      /* Right arm */
      '<rect x="196" y="192" width="30" height="82" rx="14" fill="' + shirtColor + '" transform="rotate(8 211 192)"/>' +
      /* Left leg */
      '<rect x="105" y="285" width="36" height="42" rx="10" fill="#374151"/>' +
      /* Right leg */
      '<rect x="159" y="285" width="36" height="42" rx="10" fill="#374151"/>'
    );
  }

  /* --------------------------------------------------------
     Character Definitions
     Each function(equipped) returns SVG inner content string.
     -------------------------------------------------------- */
  var _characters = {

    /* -- Karyawan Kantung Mata Panda -- */
    panda: function () {
      return (
        _bodyParts('#FDDCB0', '#2D4080') +
        /* Head */
        '<circle cx="150" cy="115" r="65" fill="#FDDCB0"/>' +
        /* Hair blob */
        '<path d="M90,100 Q100,55 150,50 Q200,55 210,100 Q195,70 150,65 Q105,70 90,100" fill="#2D2D2D"/>' +
        /* Left eye bag */
        '<ellipse cx="127" cy="120" rx="17" ry="9" fill="#1A1A1A" opacity="0.32"/>' +
        /* Right eye bag */
        '<ellipse cx="173" cy="120" rx="17" ry="9" fill="#1A1A1A" opacity="0.32"/>' +
        /* Left eye white */
        '<circle cx="127" cy="117" r="9" fill="white"/>' +
        /* Right eye white */
        '<circle cx="173" cy="117" r="9" fill="white"/>' +
        /* Left pupil */
        '<circle cx="129" cy="118" r="5" fill="#1A1A1A"/>' +
        /* Right pupil */
        '<circle cx="175" cy="118" r="5" fill="#1A1A1A"/>' +
        /* Left eye shine */
        '<circle cx="131" cy="115" r="2" fill="white"/>' +
        /* Right eye shine */
        '<circle cx="177" cy="115" r="2" fill="white"/>' +
        /* Left eyebrow */
        '<rect x="118" y="104" width="18" height="4" rx="2" fill="#2D2D2D"/>' +
        /* Right eyebrow */
        '<rect x="163" y="104" width="18" height="4" rx="2" fill="#2D2D2D"/>' +
        /* Tired mouth */
        '<path d="M136,140 Q150,148 164,140" fill="none" stroke="#5C4033" stroke-width="2.5" stroke-linecap="round"/>' +
        /* Tie */
        '<polygon points="150,170 144,180 150,195 156,180" fill="#EF4444"/>'
      );
    },

    /* -- Anak Magang Polos -- */
    intern: function () {
      return (
        _bodyParts('#FFE0B2', '#93C5FD') +
        /* Head */
        '<circle cx="150" cy="115" r="65" fill="#FFE0B2"/>' +
        /* Neat hair rectangle */
        '<rect x="100" y="58" width="100" height="40" rx="20" fill="#4A3728"/>' +
        /* Left eye white */
        '<circle cx="127" cy="117" r="11" fill="white"/>' +
        /* Right eye white */
        '<circle cx="173" cy="117" r="11" fill="white"/>' +
        /* Left pupil */
        '<circle cx="127" cy="118" r="5" fill="#1A1A1A"/>' +
        /* Right pupil */
        '<circle cx="173" cy="118" r="5" fill="#1A1A1A"/>' +
        /* Left shine */
        '<circle cx="129" cy="115" r="2" fill="white"/>' +
        /* Right shine */
        '<circle cx="175" cy="115" r="2" fill="white"/>' +
        /* Left eyebrow */
        '<rect x="119" y="102" width="16" height="3" rx="1.5" fill="#4A3728"/>' +
        /* Right eyebrow */
        '<rect x="165" y="102" width="16" height="3" rx="1.5" fill="#4A3728"/>' +
        /* Wide smile */
        '<path d="M135,138 Q150,150 165,138" fill="none" stroke="#C0845C" stroke-width="2.5" stroke-linecap="round"/>' +
        /* Left rosy cheek */
        '<ellipse cx="113" cy="132" rx="10" ry="6" fill="#FFB7B2" opacity="0.5"/>' +
        /* Right rosy cheek */
        '<ellipse cx="187" cy="132" rx="10" ry="6" fill="#FFB7B2" opacity="0.5"/>'
      );
    },

    /* -- Korban PHP HRD -- */
    'php-victim': function () {
      return (
        _bodyParts('#FDDCB0', '#374151') +
        /* Head */
        '<circle cx="150" cy="115" r="65" fill="#FDDCB0"/>' +
        /* Disheveled hair */
        '<path d="M87,105 Q95,55 150,52 Q200,55 212,100 L208,85 Q200,60 170,58 Q155,45 140,55 Q110,58 95,80 Z" fill="#5C4033"/>' +
        /* Hair spikes */
        '<path d="M200,80 Q215,60 205,45 Q198,65 190,72 M185,65 Q195,42 180,30 Q178,52 173,62" stroke="#5C4033" stroke-width="3" fill="none"/>' +
        /* Worried left eyebrow */
        '<path d="M115,105 Q127,100 135,106" stroke="#5C4033" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        /* Worried right eyebrow */
        '<path d="M165,106 Q173,100 185,105" stroke="#5C4033" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        /* Left eye white */
        '<circle cx="127" cy="117" r="8" fill="white"/>' +
        /* Right eye white */
        '<circle cx="173" cy="117" r="8" fill="white"/>' +
        /* Left pupil */
        '<circle cx="127" cy="118" r="4" fill="#1A1A1A"/>' +
        /* Right pupil */
        '<circle cx="173" cy="118" r="4" fill="#1A1A1A"/>' +
        /* Left under-eye bag */
        '<ellipse cx="127" cy="123" rx="10" ry="5" fill="#C0A090" opacity="0.4"/>' +
        /* Right under-eye bag */
        '<ellipse cx="173" cy="123" rx="10" ry="5" fill="#C0A090" opacity="0.4"/>' +
        /* Worried mouth */
        '<path d="M137,142 Q150,138 163,142" fill="none" stroke="#5C4033" stroke-width="2" stroke-linecap="round"/>' +
        /* Open collar */
        '<path d="M136,170 L150,185 L164,170" fill="none" stroke="#FDDCB0" stroke-width="3"/>'
      );
    },

    /* -- Freelancer Kurang Tidur -- */
    freelancer: function () {
      return (
        _bodyParts('#FFE0B2', '#6B7280') +
        /* Head */
        '<circle cx="150" cy="115" r="65" fill="#FFE0B2"/>' +
        /* Messy hair blob */
        '<path d="M85,115 Q82,65 110,52 Q130,38 150,45 Q170,38 190,52 Q218,65 215,110 Q205,70 185,62 Q165,52 150,55 Q135,52 115,62 Q95,70 85,115 Q80,100 85,115Z" fill="#2D2D2D"/>' +
        /* Hoodie hood left */
        '<path d="M82,160 Q78,110 90,80 Q70,100 68,150 Q70,185 90,195 L108,192 Q90,180 82,160Z" fill="#5a6372"/>' +
        /* Hoodie hood right */
        '<path d="M218,160 Q222,110 210,80 Q230,100 232,150 Q230,185 210,195 L192,192 Q210,180 218,160Z" fill="#5a6372"/>' +
        /* Left massive eye bag */
        '<ellipse cx="127" cy="120" rx="20" ry="11" fill="#1A1A1A" opacity="0.42"/>' +
        /* Right massive eye bag */
        '<ellipse cx="173" cy="120" rx="20" ry="11" fill="#1A1A1A" opacity="0.42"/>' +
        /* Left half-open eye */
        '<rect x="118" y="113" width="18" height="9" rx="4" fill="white"/>' +
        /* Right half-open eye */
        '<rect x="164" y="113" width="18" height="9" rx="4" fill="white"/>' +
        /* Left pupil */
        '<circle cx="127" cy="117" r="4" fill="#1A1A1A"/>' +
        /* Right pupil */
        '<circle cx="173" cy="117" r="4" fill="#1A1A1A"/>' +
        /* Left eyebrow (nearly flat) */
        '<rect x="118" y="104" width="18" height="3" rx="1.5" fill="#2D2D2D"/>' +
        /* Right eyebrow */
        '<rect x="164" y="104" width="18" height="3" rx="1.5" fill="#2D2D2D"/>' +
        /* Slight frown */
        '<path d="M138,140 Q150,145 162,140" fill="none" stroke="#5C4033" stroke-width="2" stroke-linecap="round"/>' +
        /* Laptop hint */
        '<rect x="108" y="250" width="84" height="52" rx="6" fill="#172B4D" opacity="0.7"/>' +
        '<rect x="112" y="254" width="76" height="42" rx="3" fill="#60a5fa" opacity="0.5"/>'
      );
    }
  };

  /* --------------------------------------------------------
     Accessory Definitions
     Each is a <g id="acc-NAME"> SVG string.
     -------------------------------------------------------- */
  var _accessories = {

    'id-card': (
      '<g id="acc-id-card">' +
        '<polyline points="150,165 142,188 158,188" fill="none" stroke="#9CA3AF" stroke-width="2"/>' +
        '<rect x="129" y="188" width="42" height="30" rx="4" fill="white" stroke="#172B4D" stroke-width="2" transform="rotate(12,150,203)"/>' +
        '<line x1="135" y1="198" x2="165" y2="198" stroke="#9CA3AF" stroke-width="1.5" transform="rotate(12,150,203)"/>' +
        '<line x1="135" y1="206" x2="158" y2="206" stroke="#9CA3AF" stroke-width="1" transform="rotate(12,150,203)"/>' +
        '<rect x="133" y="190" width="10" height="8" rx="2" fill="#60A5FA" transform="rotate(12,150,203)"/>' +
      '</g>'
    ),

    'kardus': (
      '<g id="acc-kardus">' +
        '<rect x="170" y="210" width="58" height="48" rx="4" fill="#B08040" stroke="#8B6914" stroke-width="2"/>' +
        '<path d="M170,228 L228,228" stroke="#8B6914" stroke-width="1.5"/>' +
        '<path d="M199,210 L199,222" stroke="#8B6914" stroke-width="1.5"/>' +
        '<rect x="176" y="214" width="18" height="12" rx="2" fill="#60A5FA"/>' +
        '<rect x="198" y="216" width="14" height="8" rx="2" fill="#FCD34D"/>' +
        '<path d="M170,210 Q199,202 228,210" fill="#C69040" stroke="#8B6914" stroke-width="1.5"/>' +
      '</g>'
    ),

    'kopi': (
      '<g id="acc-kopi">' +
        '<polygon points="78,192 100,192 95,250 83,250" fill="#D2691E"/>' +
        '<rect x="75" y="186" width="28" height="10" rx="5" fill="white" stroke="#D2691E" stroke-width="1.5"/>' +
        '<line x1="88" y1="186" x2="84" y2="165" stroke="#9CA3AF" stroke-width="2"/>' +
        '<circle cx="84" cy="163" r="3" fill="#374151"/>' +
        '<text x="89" y="228" text-anchor="middle" font-size="7" fill="white" font-weight="bold">XXL</text>' +
      '</g>'
    ),

    'bendera': (
      '<g id="acc-bendera">' +
        '<line x1="232" y1="152" x2="232" y2="238" stroke="#8B6914" stroke-width="3"/>' +
        '<path d="M232,152 L266,164 L232,178Z" fill="white" stroke="#9CA3AF" stroke-width="1.5"/>' +
      '</g>'
    ),

    'kacamata': (
      '<g id="acc-kacamata" transform="rotate(5,150,118)">' +
        '<circle cx="127" cy="118" r="18" fill="none" stroke="#1A1A1A" stroke-width="3"/>' +
        '<circle cx="173" cy="118" r="18" fill="none" stroke="#1A1A1A" stroke-width="3"/>' +
        '<line x1="145" y1="119" x2="155" y2="119" stroke="#1A1A1A" stroke-width="2"/>' +
        '<line x1="109" y1="116" x2="95" y2="120" stroke="#1A1A1A" stroke-width="2"/>' +
        '<line x1="191" y1="116" x2="205" y2="120" stroke="#1A1A1A" stroke-width="2"/>' +
      '</g>'
    )
  };

  /* --------------------------------------------------------
     SVG Builder
     -------------------------------------------------------- */
  function _getSVG(characterId, equippedAccessories) {
    var charFn = _characters[characterId] || _characters['panda'];
    var content = charFn();

    var accIds = equippedAccessories || [];
    for (var i = 0; i < accIds.length; i++) {
      var acc = _accessories[accIds[i]];
      if (acc) {
        content += acc;
      }
    }
    return content;
  }

  /* --------------------------------------------------------
     Render into the avatar SVG element
     -------------------------------------------------------- */
  function _render() {
    var svgEl = document.getElementById('avatar-svg');
    if (!svgEl) return;
    svgEl.innerHTML = _getSVG(_state.character, _state.accessories);
  }

  /* --------------------------------------------------------
     Persistence
     -------------------------------------------------------- */
  function _saveState() {
    try {
      localStorage.setItem('sambatin_avatar', JSON.stringify(_state));
    } catch (e) {}
  }

  function _loadState() {
    try {
      var raw = localStorage.getItem('sambatin_avatar');
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.character) {
          _state = parsed;
        }
      }
    } catch (e) {}
  }

  /* --------------------------------------------------------
     Check if premium item is owned
     -------------------------------------------------------- */
  function _isPurchased(itemId) {
    try {
      var purchases = JSON.parse(localStorage.getItem('sambatin_purchases') || '[]');
      return purchases.indexOf(itemId) !== -1;
    } catch (e) {
      return false;
    }
  }

  /* --------------------------------------------------------
     Update character card selected state
     -------------------------------------------------------- */
  function _updateCharacterCards() {
    var cards = document.querySelectorAll('.character-card');
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      if (card.getAttribute('data-character') === _state.character) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    }
  }

  /* --------------------------------------------------------
     Update accessory row equipped state
     -------------------------------------------------------- */
  function _updateAccessoryRows() {
    var rows = document.querySelectorAll('.accessory-row');
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var accId = row.getAttribute('data-accessory');
      if (_state.accessories.indexOf(accId) !== -1) {
        row.classList.add('equipped');
      } else {
        row.classList.remove('equipped');
      }
    }
  }

  /* --------------------------------------------------------
     Init — bind UI and render
     -------------------------------------------------------- */
  function init() {
    _loadState();
    _render();
    _updateCharacterCards();
    _updateAccessoryRows();

    if (_bound) return;
    _bound = true;

    /* Character card clicks */
    var cards = document.querySelectorAll('.character-card');
    for (var i = 0; i < cards.length; i++) {
      (function (card) {
        card.addEventListener('click', function () {
          var charId = card.getAttribute('data-character');
          _state.character = charId;
          _render();
          _saveState();
          _updateCharacterCards();
        });
      })(cards[i]);
    }

    /* Accessory row clicks */
    var rows = document.querySelectorAll('.accessory-row');
    for (var j = 0; j < rows.length; j++) {
      (function (row) {
        row.addEventListener('click', function () {
          var accId = row.getAttribute('data-accessory');

          /* Premium gate */
          if (_PREMIUM.indexOf(accId) !== -1 && !_isPurchased(accId)) {
            window.dispatchEvent(new CustomEvent('sambatin:open-shop', { detail: { itemId: accId } }));
            return;
          }

          /* Toggle equipped */
          var idx = _state.accessories.indexOf(accId);
          if (idx === -1) {
            _state.accessories.push(accId);
          } else {
            _state.accessories.splice(idx, 1);
          }
          _render();
          _saveState();
          _updateAccessoryRows();
        });
      })(rows[j]);
    }
  }

  /* --------------------------------------------------------
     Public API
     -------------------------------------------------------- */
  window.AvatarBuilder = {
    init: init,

    getAvatarSVG: function (characterId, equippedAccessories) {
      return _getSVG(characterId, equippedAccessories);
    },

    unlockAccessory: function (id) {
      /* Called by Shop after purchase — just re-render accessory rows */
      _updateAccessoryRows();
    },

    equipAccessory: function (id) {
      if (_state.accessories.indexOf(id) === -1) {
        _state.accessories.push(id);
        _render();
        _saveState();
        _updateAccessoryRows();
      }
    },

    unequipAccessory: function (id) {
      _state.accessories = _state.accessories.filter(function (a) {
        return a !== id;
      });
      _render();
      _saveState();
      _updateAccessoryRows();
    }
  };

})();
