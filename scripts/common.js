var stitch  = require('stitch');
var fs      = require('fs');

// Loading project information to get name for building
var project = JSON.parse(fs.readFileSync(__dirname + '/../package.json'));

// Stitch everything together
var package = stitch.createPackage({
  paths: [__dirname + '/../lib']
});

module.exports = {
  name: project.name,
  package: package
};