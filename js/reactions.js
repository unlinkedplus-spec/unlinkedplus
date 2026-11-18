/* SambatIn — reactions.js (stub — implemented in FEAT-003) */
(function () {
  'use strict';

  function _getReactions(postId) {
    try {
      var all = JSON.parse(localStorage.getItem('sambatin_reactions') || '{}');
      if (!all[postId]) {
        all[postId] = { pukpuk: 0, ngakak: 0, sama: 0, myReactions: {} };
      }
      return all[postId];
    } catch (e) {
      return { pukpuk: 0, ngakak: 0, sama: 0, myReactions: {} };
    }
  }

  function _saveReactions(all) {
    try { localStorage.setItem('sambatin_reactions', JSON.stringify(all)); } catch (e) {}
  }

  function addXP(amount) {
    var xp = parseInt(localStorage.getItem('sambatin_xp') || '0', 10);
    xp += amount;
    if (xp < 0) xp = 0;
    try { localStorage.setItem('sambatin_xp', String(xp)); } catch (e) {}
    window.dispatchEvent(new CustomEvent('sambatin:xp-changed', { bubbles: true }));
  }

  function addReaction(postId, type) {
    try {
      var all = JSON.parse(localStorage.getItem('sambatin_reactions') || '{}');
      if (!all[postId]) {
        all[postId] = { pukpuk: 0, ngakak: 0, sama: 0, myReactions: {} };
      }
      var r = all[postId];
      if (!r.myReactions) r.myReactions = {};

      if (r.myReactions[type]) {
        r[type] = Math.max(0, (r[type] || 0) - 1);
        r.myReactions[type] = false;
        addXP(-1);
      } else {
        r[type] = (r[type] || 0) + 1;
        r.myReactions[type] = true;
        addXP(1);
      }
      _saveReactions(all);
    } catch (e) {}
  }

  function getLevelName(xp) {
    var LEVELS = [
      { min: 0,   max: 49,       name: 'Rapuh' },
      { min: 50,  max: 149,      name: 'Tahan Banting' },
      { min: 150, max: 299,      name: 'Kebal Revisi' },
      { min: 300, max: 499,      name: 'Kebal PHP HRD' },
      { min: 500, max: Infinity, name: 'Suhu Sambat' }
    ];
    for (var i = 0; i < LEVELS.length; i++) {
      if (xp >= LEVELS[i].min && xp <= LEVELS[i].max) return LEVELS[i].name;
    }
    return 'Suhu Sambat';
  }

  function getLevel(xp) {
    if (xp < 50)  return 1;
    if (xp < 150) return 2;
    if (xp < 300) return 3;
    if (xp < 500) return 4;
    return 5;
  }

  window.Reactions = {
    addReaction: addReaction,
    addXP: addXP,
    getReactions: _getReactions,
    getLevelName: getLevelName,
    getLevel: getLevel
  };

})();
