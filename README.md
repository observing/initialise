# initialize

Initialize is a small module that allows you to lazy require/initialize modules
when they are accessed. This allows you to easily build light weight `core`
modules that can be shared with various of parts of your infrastructure
/ services.

### Installation

```
npm install initialize --save
```

### Example

The following example illustrates the power and usage of initialize.

```js
//
// Require the module and hook it on to the exports object
//
var initialize = require('initialize').on(exports);

//
// You can now define lazy loaded modules:
//
initialize('foo', function foo() {
  return require('./foo');
});
```

We now have a `exports.foo` method. When you access it, it will load the module
`foo` once and store the result of it. But this is just a simple example of it's
use. You can could also use it to require pre-configured database connections,
loggers, configuration files and what more. It comes with a small `register`
function that you can use to register a destruction handler. This ensures that
every initialized module is cleaned up correctly when `initialize.end` is
called.

```js
var initialize = require('initialize').on(exports);

initialize('config', function () {
  return require('./configuration.json');
});

initialize(function redisClient(register) {
  var config = this.config.get('redis')
    , auth = config.auth || config.password || config.pass
    , redis = require('redis').createClient(config.port, config.host)
    , self = this;

  if (auth) redis.auth(auth);

  redis.on('error', function error(err) {
    console.error(err);
  });

  //
  // Add a clean-up hook. The `redis.quit()` method will wait until all replies
  // have been read instead of forcefully close the connection.
  //
  register('redis', 'quit');

  return redis;
});
```

In the example above you also see `this.config`, this is actually a reference to
the `exports.config` and will lazy load the `./configuration.json` file that
contains our example redis configuration. It passes the string `quit` to the
register method as that's the method for `redis` to savely nuke the connection.

If you want to do more advanced clean up operations or need to clean up
something that is not `method` on the returned object you can pass it
a function as well:

```js
register('redis', function () {
  // This function will be called when initialize.end() is called.
});
```

### License

MIT
