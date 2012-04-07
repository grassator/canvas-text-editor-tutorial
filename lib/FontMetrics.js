"use strict";

/**
 * A simple wrapper for system fonts to provide
 * @param {String} family Font Family (same as in CSS)
 * @param {Number} size Size in px
 * @constructor
 */
var FontMetrics = function(family, size) {
  this._family = family || (family = "Monaco, 'Courier New', Courier, monospace");
  this._size = parseInt(size) || (size = 12);

  // Preparing container
  var line = document.createElement('div'),
      body = document.body;
  line.style.position = 'absolute';
  line.style.whiteSpace = 'nowrap';
  line.style.font = size + 'px ' + family;
  body.appendChild(line);

  // Now we can measure width and height of the letter
  var text = 'mmmmmmmmmm'; // 10 symbols to be more accurate with width
  line.innerHTML = text;
  this._width = line.offsetWidth / text.length;
  this._height = line.offsetHeight;

  // Now creating 1px sized item that will be aligned to baseline
  // to calculate baseline shift
  var span = document.createElement('span');
  span.style.display = 'inline-block';
  span.style.overflow = 'hidden';
  span.style.width = '1px';
  span.style.height = '1px';
  line.appendChild(span);

  // Baseline is important for positioning text on canvas
  this._baseline = span.offsetTop + span.offsetHeight;

  document.body.removeChild(line);
};

module.exports = FontMetrics;

/**
 * Returns font family
 * @return {String}
 */
FontMetrics.prototype.getFamily = function() {
  return this._family;
};

/**
 * Returns font family
 * @return {Number}
 */
FontMetrics.prototype.getSize = function() {
  return this._size;
};

/**
 * Returns line height in px
 * @return {Number}
 */
FontMetrics.prototype.getHeight = function() {
  return this._height;
};

/**
 * Returns line height in px
 * @return {Number}
 */
FontMetrics.prototype.getWidth = function() {
  return this._width;
};

/**
 * Returns line height in px
 * @return {Number}
 */
FontMetrics.prototype.getBaseline = function() {
  return this._baseline;
};
