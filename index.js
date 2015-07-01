var path = require('path');
module.exports = function(config) {
  var promise = setup(require('my-hapi-server')(
    config.path || path.dirname(require.main.filename), {
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
    }
  ), config.db);

  if (config.repl) {
    var repl = require('repl');
    return promise.spread(function(server, db) {
      var r = repl.start({ prompt: "> " });
      r.context.server = server;
      r.context.db = db
    });
  } else if (config.start) {
    return promise.spread(function(server, database) {
      server.start(function(err) {
        if (err) throw err;
        server.log([], 'Server running at: ' + server.info.uri);
      });
    });
  } else {
    promise.then = promise.spread;
    return promise
  }
}

function setup(promise, dbConfig) {
  return promise.then(function(server) {
    return setupDatabase(server, dbConfig);
  }).catch(function(err) {
    console.error(err.stack);
    process.exit(1);
  });
}

function setupDatabase(server, db) {
  if (!db) return [server];
  // support sequelize
  if (db.sequelize) {
    return setupSequelize(server, db);
  }
}

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
      // always return [server, ...] at the end of any promise chain
      return [server, db.sequelize];
    });
  }
}
