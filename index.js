'use strict';

/**
 * Create a new lazy initialisation hook.
 *
 * @param {Object} structure The hook where all initialisation methods are on.
 * @returns {Function} initialisation.
 * @api public
 */
exports.on = function on(structure) {
  /**
   * Lazy load our exports so they are only included when needed.
   *
   * @param {String} name The name or key of the `export`
   * @param {Function} fn The function that needs to be executed once to load
   * @api private
   */
  function initialise(name, fn) {
    Object.defineProperty(structure, name, {
      configurable: true,

      //
      // The lazy initialiser, it will set the value of the returned function for
      // the given name.
      //
      get: function get() {
        return Object.defineProperty(this, name, {
          value: fn.call(structure, function register(cleanup, method) {
            cleanup = cleanup || name;

            //
            // Register that this module needs a clean up.
            //
            initialise.registered[cleanup] = method || true;
          })
        })[name];
      },

      //
      // Simple helper function that will set the value and remove our
      // initialisation structure. This is required to make the `get` working.
      //
      set: function set(val) {
        return Object.defineProperty(this, name, {
          value: val
        })[name];
      }
    });
  }

  //
  // Simple registery that contains the exports that need to be cleaned up.
  //
  initialise.registered = Object.create(null);

  /**
   * This will destroy all references and clean up all the initialised code so we
   * can exit cleanly.
   *
   * @param {Function} done Callback function for when everything is cleared.
   * @api public
   */
  initialise.end = function end(done) {
    Object.keys(initialise.registered).forEach(function each(name) {
      var method = initialise.registered[name]
        , instance = structure[name]
        , type = typeof method;

      //
      // Allow custom clean-up functions to be used. This is useful if you want to
      // gracefully exit first and if that fails, forcefully exit. Or mabye it
      // requires specific arguments etc.
      //
      if ('function' === type) return method();

      //
      // If no clean-up method is provided try to guess the method instead. There
      // are couple of common `api`'s that can be used here.
      //
      if ('string' !== typeof method) {
        if ('end' in instance) method = 'end';
        else if ('close' in instance) method = 'close';
        else if ('destroy' in instance) method = 'destroy';
      }

      // Savely clean it up.
      if (method in instance) instance[method]();
    });

    // Optional callback.
    if (done) done();
  };

  //
  // Expose the initialise function.
  //
  return initialise;
};
