"use strict";

var FontMetrics = require('FontMetrics'),
    Document = require('Document');

/**
 * Simple plain-text text editor using html5 canvas.
 * @constructor
 */
var CanvasTextEditor = function(doc) {
  this._document = doc || (new Document);
  this._metrics = new FontMetrics('"Courier New", Courier, monospace', 14);
  this._createWrapper();
  this._createCanvas();
  this._createInput();
};

module.exports = CanvasTextEditor;

/**
 * CSS class that is assigned to the wrapper.
 * @type {String}
 */
CanvasTextEditor.prototype.className = 'canvas-text-editor';

/**
 * Creates wrapper element for all parts of the editor
 * @private
 */
CanvasTextEditor.prototype._createWrapper = function() {
  this.wrapper = document.createElement('div');
  this.wrapper.className = this.className;
  this.wrapper.style.display = 'inline-block';
  this.wrapper.style.backgroundColor = '#eee';
  this.wrapper.style.overflow = 'hidden';
  this.wrapper.tabIndex = 0; // tabindex is necessary to get focus
  this.wrapper.addEventListener('focus', this.focus.bind(this), false);
};

/**
 * Creates canvas for drawing
 * @private
 */
CanvasTextEditor.prototype._createCanvas = function() {
  this.canvas = document.createElement('canvas');
  this.canvas.style.display = 'block';
  this.context = this.canvas.getContext('2d');
  this.resize(640, 480);

  // For now just very dumb implementation of rendering
  var baselineOffset = this._metrics.getBaseline(),
      lineHeight = this._metrics.getHeight(),
      characterWidth = this._metrics.getWidth(),
      maxHeight = Math.ceil(640 / lineHeight),
      lineCount = this._document.getLineCount();

  if (lineCount < maxHeight) maxHeight = lineCount;

  for(var i = 0; i < maxHeight; ++i) {
    this.context.fillText(
      this._document.getLine(i), 2, lineHeight * i + baselineOffset
    );
  }

  this.wrapper.appendChild(this.canvas);
};

/**
 * Creates textarea that will handle user input and copy-paste actions
 * @private
 */
CanvasTextEditor.prototype._createInput = function() {
  this.inputEl = document.createElement('textarea');
  this.inputEl.style.position = 'absolute';
  this.inputEl.style.top = '-100px';
  this.inputEl.style.height = 0;
  this.inputEl.style.width = 0;
  this.inputEl.addEventListener('blur', this.blur.bind(this), false);
  this.inputEl.addEventListener('focus', this._inputFocus.bind(this), false);
  this.inputEl.tabIndex = -1; // we don't want input to get focus by tabbing
  this.wrapper.appendChild(this.inputEl);
};

/**
 * Real handler code for editor gaining focus.
 * @private
 */
CanvasTextEditor.prototype._inputFocus = function() {
  this.wrapper.style.outline = '1px solid #09f';
};

/**
 * Returns main editor node so it can be inserted into document.
 * @return {HTMLElement} 
 */
CanvasTextEditor.prototype.getEl = function() {
  return this.wrapper;
};

/**
 * Resizes editor to provided dimensions.
 * @param  {Number} width 
 * @param  {Number} height
 */
CanvasTextEditor.prototype.resize = function(width, height) {
  this.canvas.width = width;
  this.canvas.height = height;
  // We need to update context settings every time we resize
  this.context.font = this._metrics.getSize() + 'px ' + this._metrics.getFamily();
};

/**
 * Blur handler.
 */
CanvasTextEditor.prototype.blur = function() {
  this.inputEl.blur();
  this.wrapper.style.outline = 'none';
};

/**
 * Focus handler. Acts as a proxy to input focus.
 */
CanvasTextEditor.prototype.focus = function() {
  this.inputEl.focus();
};

