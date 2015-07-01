var path = require('path');
module.exports = function(config) {
  var root = config.path || path.dirname(require.main.filename);
  var promise = require('my-hapi-server')(root, {
    server: config.server || {
      connections: { routes: { cors: true } }
    },
    connection: config.connection || {
      port: process.env.PORT
    },
    loader: config.loader || {
      auth: {
        glob: 'auth/**/*.js',
        leaf: function(i) { return i.length === 3; }
      },
      routes: {
        glob: 'routes/**/*.js',
        leaf: function(i) { return i.handler; }
      },
      plugins: {
        glob: 'plugins/**/*.js',
        leaf: function(i) { return i.register; }
      }
    }
  })

  if (config.start) {
    promise.then(function(server) {
      var db = config.db;
      if (db) {
        // sequelize
        if (db.sequelize) {
          db.sequelize.options.logging = function(string) {
            server.log(['db'], string)
          }
          if (db.sync) {
            var force = null; try {
              force = config.db.sync === 'force' || config.db.sync.force
            } catch(e) {}
            return db.sequelize.sync({ force: force }).then(function() {
              return server;
            });
          }
        }
      }
      return server;
    }).then(function(server) {
      server.start(function(err) {
        if (err) throw err;
        server.log([], 'Server running at: ' + server.info.uri);
      });
    }).catch(function(err) {
      console.error(err.stack);
      process.exit(1);
    });
  } else {
    return promise;
  }
}
