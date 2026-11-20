/*
 * unlinked+ localStorage compatibility shim.
 *
 * Older builds stored data under `sambatin_*`. This file copies those values
 * to the current `unlinkedplus_*` keys once, then removes the legacy keys.
 * Load it before any script that reads localStorage.
 */
(function () {
  'use strict';

  var CURRENT = 'unlinkedplus_';
  var LEGACY = 'sambatin_';

  function migrate() {
    try {
      // Known keys first, so the order is deterministic.
      var known = [
        'quota', 'waitlist', 'posts', 'avatar',
        'username', 'reactions', 'xp', 'purchases',
      ];
      known.forEach(function (suffix) {
        copy(LEGACY + suffix, CURRENT + suffix);
      });

      // Catch any other key written by an older build.
      var pending = [];
      for (var i = 0; i < localStorage.length; i += 1) {
        var key = localStorage.key(i);
        if (key && key.indexOf(LEGACY) === 0 && key.indexOf(CURRENT) !== 0) {
          pending.push(key);
        }
      }
      pending.forEach(function (oldKey) {
        copy(oldKey, CURRENT + oldKey.slice(LEGACY.length));
      });
    } catch (error) {
      // Storage can be disabled (private mode / quota). Ignore and keep running.
    }
  }

  function copy(oldKey, newKey) {
    var legacyValue = localStorage.getItem(oldKey);
    if (legacyValue === null) return;
    if (localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, legacyValue);
    }
    localStorage.removeItem(oldKey);
  }

  migrate();

  // Small helper for scripts that want an explicit, normalized key.
  window.unlinkedStorageKey = function (key) {
    return key.indexOf(LEGACY) === 0 ? CURRENT + key.slice(LEGACY.length) : key;
  };
}());
