var path = require('path');
module.exports = function(config) {
  var promise = setup(require('./server')(
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

  if (config.db && typeof config.db.seed === 'object' && config.db.seed[0]) {
    var seed = config.db.seed[1]
    if (typeof seed === 'function') { // can return promise or use node-style callback
      return promise.spread(function(server, db) {
        return seedDatabase(db, seed);
      });
    } else {
      throw new Error('Seed attribute, if set, must be in the form [bool shouldSeed, function seedFunction]');
    }
  } else if (config.repl) {
    var repl = require('repl');
    return promise.spread(function(server, db) {
      var r = repl.start({ prompt: "> " });
      r.context.server = server;
      r.context.db = db
    });
  } else if (config.start) {
    return promise.spread(function(server, database) {
      server.start(config.ready || function(err) {
        if (err) throw err;
        server.log(['info'], 'Server running at: ' + server.info.uri);
      });
      return [server, database];
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
    console.log('setting up database', { db: 'sequelize' });
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
    var options = { force: !!force };
    console.log('syncing database', options);
    return db.sequelize.sync(options).then(function() {
      // always return [server, ...] at the end of any promise chain
      return [server, db.sequelize];
    });
  }
}

function seedDatabase(db, seed) {
  var fail = function(err) {
    console.log(err.errors);
    console.error(err.stack);
    process.exit(1);
  }
  var success = function() {
    console.log('Database seeded successfully');
    process.exit(0);
  }
  var callback = function(err) {
    if (err) fail(err);
    else success();
  };
  var ret = seed(db, callback);
  if (ret && typeof ret.then === 'function') {
    ret.then(function() {
      success();
    }).catch(function(err) {
      fail(err);
    });
  }
}
