/* ============================================================
   Unlinked+ — reactions.js
   IIFE exposing window.Reactions.
   LocalStorage keys: sambatin_reactions, sambatin_xp.
   ============================================================ */
(function () {
  'use strict';

  /* --------------------------------------------------------
     Level Thresholds
     -------------------------------------------------------- */
  var LEVELS = [
    { min: 0,   max: 49,       level: 1, name: 'Rapuh',         color: '#9CA3AF' },
    { min: 50,  max: 149,      level: 2, name: 'Tahan Banting',  color: '#60A5FA' },
    { min: 150, max: 299,      level: 3, name: 'Kebal Revisi',   color: '#A78BFA' },
    { min: 300, max: 499,      level: 4, name: 'Kebal PHP HRD',  color: '#F97316' },
    { min: 500, max: 999999,   level: 5, name: 'Suhu Spill',    color: '#EF4444' }
  ];

  /* --------------------------------------------------------
     Private helpers
     -------------------------------------------------------- */
  function _getAll() {
    try {
      return JSON.parse(localStorage.getItem('sambatin_reactions') || '{}');
    } catch (e) {
      return {};
    }
  }

  function _saveAll(obj) {
    try {
      localStorage.setItem('sambatin_reactions', JSON.stringify(obj));
    } catch (e) {}
  }

  function _getXP() {
    return parseInt(localStorage.getItem('sambatin_xp') || '0', 10);
  }

  function _saveXP(n) {
    try {
      localStorage.setItem('sambatin_xp', String(n));
    } catch (e) {}
  }

  function _fireXPEvent() {
    window.dispatchEvent(new CustomEvent('sambatin:xp-changed', { bubbles: true }));
  }

  /* --------------------------------------------------------
     Level helpers
     -------------------------------------------------------- */
  function getLevel(xp) {
    for (var i = 0; i < LEVELS.length; i++) {
      if (xp >= LEVELS[i].min && xp <= LEVELS[i].max) {
        return LEVELS[i];
      }
    }
    return LEVELS[LEVELS.length - 1];
  }

  function getLevelName(xp) {
    return getLevel(xp).name;
  }

  function getLevelColor(xp) {
    return getLevel(xp).color;
  }

  /* --------------------------------------------------------
     Public API
     -------------------------------------------------------- */
  function addReaction(postId, type) {
    var all = _getAll();
    if (!all[postId]) {
      all[postId] = {
        pukpuk: 0,
        ngakak: 0,
        sama: 0,
        myReactions: { pukpuk: false, ngakak: false, sama: false }
      };
    }
    var r = all[postId];
    if (!r.myReactions) {
      r.myReactions = { pukpuk: false, ngakak: false, sama: false };
    }

    if (r.myReactions[type]) {
      r[type] = Math.max(0, r[type] - 1);
      r.myReactions[type] = false;
      _saveXP(Math.max(0, _getXP() - 1));
    } else {
      r[type]++;
      r.myReactions[type] = true;
      _saveXP(_getXP() + 1);
    }

    _saveAll(all);
    _fireXPEvent();
    return r;
  }

  function addXP(amount) {
    _saveXP(_getXP() + amount);
    _fireXPEvent();
  }

  function getReactions(postId) {
    var all = _getAll();
    return all[postId] || {
      pukpuk: 0,
      ngakak: 0,
      sama: 0,
      myReactions: { pukpuk: false, ngakak: false, sama: false }
    };
  }

  /* --------------------------------------------------------
     Export
     -------------------------------------------------------- */
  window.Reactions = {
    addReaction: addReaction,
    addXP: addXP,
    getReactions: getReactions,
    getLevel: getLevel,
    getLevelName: getLevelName,
    getLevelColor: getLevelColor,
    LEVELS: LEVELS
  };

})();
