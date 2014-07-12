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
  function initialise(name, fn, options) {
    Object.defineProperty(structure, name, {
      configurable: true,

      //
      // The lazy initialiser, it will set the value of the returned function for
      // the given name.
      //
      get: function get() {
        /**
         * Simple clean up method.
         *
         * @param {String} cleanup
         * @param {String} method
         * @api private
         */
        function register(cleanup, method) {
          cleanup = cleanup || name;

          //
          // Register that this module needs a clean up.
          //
          initialise.registered[cleanup] = {
            method: method || true,
            async: this === 'async'
          };
        }

        //
        // Allow an more awesome clean up interface by telling that shit is
        // async:
        //
        // initialise('foo', function (cleanup) {
        //  cleanup('method');
        //  cleanup.async('method');
        // });
        //
        register.async = register.bind('async');

        return Object.defineProperty(this, name, {
          value: fn.call(structure, register, options || {})
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
   * @param {Function} fn Callback function for when everything is cleared.
   * @api public
   */
  initialise.end = function end(fn) {
    var todo = 0
      , done = 0;

    /**
     * A poor man's async helper. It stores the last error and calls the
     * callback once all async cleanup has finished.
     *
     * @param {Error} err Optional error
     * @api private
     */
    function next(err) {
      if (err) next.err = err;
      if (++done === todo && fn) fn(next.err);
    }

    Object.keys(initialise.registered).forEach(function each(name) {
      var unregister = initialise.registered[name]
        , method = unregister.method
        , instance = structure[name]
        , async = unregister.async
        , type = typeof method;

      //
      // Allow custom clean-up functions to be used. This is useful if you want to
      // gracefully exit first and if that fails, forcefully exit. Or mabye it
      // requires specific arguments etc.
      //
      if ('function' === type) {
        if (!async) return method();

        todo++;
        return method(next);
      }

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
      if (method in instance) {
        if (!async) return instance[method]();

        todo++;
        return instance[method](next);
      }
    });

    // Optional callback.
    if (fn && todo === done) fn();
  };

  //
  // Expose the initialise function.
  //
  return initialise;
};
