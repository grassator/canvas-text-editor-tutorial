var common  = require('./common');
var express = require('express');

var app = express.createServer();
var url = '/lib.js';
var port = 4000;
app.get(url, common.package.createServer());
app.listen(port);

console.log('\nYou can load stitched file from:');
console.log('http://localhost:' + port + url);