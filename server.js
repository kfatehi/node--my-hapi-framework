var Promise = require('bluebird');
var Hapi = require('hapi');

module.exports = function(root, config) {
  return new Promise(function(resolve, reject) {
    var loader = require('./loader')(root);
    var server = new Hapi.Server(config.server);
    server.connection(config.connection);
    loader.configure(config.loader);
    loader.load('plugins').then(function(plugins) {
      return Promise.fromNode(server.register.bind(server, plugins));
    }).then(function() {
      return loader.load('auth').map(function(strategy) {
        server.auth.strategy.apply(this, strategy);
      })
    }).then(function() {
      return loader.load('routes').then(function(routes) {
        server.route(routes);
      });
    }).then(function() {
      resolve(server);
    }).catch(function(err) {
      reject(err);
    });
  });
}
