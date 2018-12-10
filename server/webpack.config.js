var webpack = require('webpack');
var path = require('path');
var fs = require('fs');

var nodeModules = {};
fs.readdirSync('node_modules')
  .filter(function(x) {
    return ['.bin'].indexOf(x) === -1;
  })
  .forEach(function(mod) {
    nodeModules[mod] = 'commonjs ' + mod;
  });

module.exports = {
  entry: path.join(__dirname, 'app.js'),
  target: 'node',
  output: {
    path: __dirname,
    filename: 'dist/backend.js'
  },
  externals: nodeModules,
  plugins: [
    new webpack.IgnorePlugin(/\.(css|less)$/),
    new webpack.BannerPlugin({banner: 'require("source-map-support").install();', raw: true, entryOnly: false})
  ],
  devtool: 'sourcemap'
}
