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

  function createLogFn(server, db) {
    function databaseLogFn(string) {
      server.log(db.tags || ['db'], string)
    }
    return databaseLogFn;
  }

  function setupSequelize(server, db) {
    // make sequelize a good hapi logging citizen
    db.sequelize.options.logging = createLogFn(server, db)
    if (db.sync) {
      // determine if database force sync is enabled
      var force = db.sync === 'force' || db.sync.force;
      return db.sequelize.sync({ force: force }).then(function() {
        // always return server at the end of any promise chain
        return server;
      });
    }
  }

  function setupDatabase(server, db) {
    if (!db) return server;
    // support sequelize
    if (db.sequelize) {
      return setupSequelize(server, db);
    }
  }

  function setupServer() {
    if (config.start) {
      promise.then(function(server) {
        return setupDatabase(server, config.db);
      }).then(function(server) {
        server.start(function(err) {
          if (err) throw err;
          server.log([], 'Server running at: ' + server.info.uri);
        });
      }).catch(function(err) {
        console.error(err.stack);
        process.exit(1);
      });
    }
    return promise;
  }

  return setupServer();
}
