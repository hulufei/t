var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');

var HOME = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
var configFile = path.join(HOME, '.t/config.json');

module.exports = {
  load: function(cb) {
    try {
      return require(configFile);
    }
    catch(e) {
      cb && cb(e);
      return {};
    }
  },
  save: function(conf) {
    try {
      mkdirp.sync(path.dirname(configFile));
    }
    catch(e) {}
    fs.writeFileSync(configFile, JSON.stringify(conf, null, 4));
  }
};
