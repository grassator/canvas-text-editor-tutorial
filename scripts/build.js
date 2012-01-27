var common  = require('./common');
var fs      = require('fs');
var jsp = require("uglify-js").parser;
var pro = require("uglify-js").uglify;

common.package.compile(function (err, source){
  var dir = __dirname + '/../build';
  
  // Making sure build dir exists
  try { fs.statSync(dir); }
  catch (e) { fs.mkdirSync(dir, 0755); }
  
  // Generating developer (unminified) version
  var path = dir + '/' + common.name + '.js';
  fs.writeFileSync(path, source);
  console.log('Developer version: ' + path.replace(__dirname + '/../', ''));
  
  // And production one
  var minPath = dir + '/' + common.name + '.min.js';
  var ast = jsp.parse(source); // parse code and get the initial AST
  ast = pro.ast_mangle(ast); // get a new AST with mangled names
  ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
  fs.writeFile(minPath, pro.gen_code(ast));
  console.log('Minified version: ' + minPath.replace(__dirname + '/../', ''));
})