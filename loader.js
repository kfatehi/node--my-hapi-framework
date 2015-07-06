var Promise = require('bluebird')
var bulkRequire = require('bulk-require');
var _ = require('lodash');
module.exports = function(dirname) {
  var config = null;
  function loadArray(obj, identFn, arr) {
    if (!arr) arr = [];
    if (identFn(obj)) arr.push(obj);
    else if (_.isObject(obj)) _.each(obj, function(v, k) {
      loadArray(v, identFn, arr);
    });
    return arr
  }
  function gatherMatching(glob, leaf) {
    return new Promise(function(resolve, reject) {
      resolve(loadArray(bulkRequire(dirname, [glob]), leaf));
    });
  }
  return {
    configure: function(_config) {
      config = _config
    },
    load: function(name) {
      var c = config[name];
      return gatherMatching(c.glob, c.leaf);
    }
  }
}

