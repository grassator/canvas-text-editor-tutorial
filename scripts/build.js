var common  = require('./common');
var fs      = require('fs');

common.package.compile(function (err, source){
  var dir = __dirname + '/../build';
  
  // Making sure build dir exists
  try { fs.statSync(dir); }
  catch (e) { fs.mkdirSync(dir, 0755); }
  
  // Generating developer (unminified) version
  var path = dir + '/' + common.name + '.js';
  fs.writeFileSync(path, source);
  console.log('Developer version: ' + path.replace(__dirname + '/../', ''));
});
