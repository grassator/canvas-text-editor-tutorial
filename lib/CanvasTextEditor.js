"use strict";

var FontMetrics = require('FontMetrics'),
    Document = require('Document'),
    Selection = require('Selection');

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
  this._selection = new Selection(this);
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
  this.wrapper.style.position = 'relative';
  this.wrapper.style.backgroundColor = '#eee';
  this.wrapper.style.border = '5px solid #eee';
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
  this.render();
  this.wrapper.appendChild(this.canvas);
};

/**
 * Renders document onto the canvas
 * @return {[type]} [description]
 */
CanvasTextEditor.prototype.render = function() {
  var baselineOffset = this._metrics.getBaseline(),
      lineHeight = this._metrics.getHeight(),
      characterWidth = this._metrics.getWidth(),
      maxHeight = Math.ceil(640 / lineHeight),
      lineCount = this._document.getLineCount();

  // Making sure we don't render somethign that we won't see
  if (lineCount < maxHeight) maxHeight = lineCount;

  // Clearing previous iteration
  this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

  // Looping over document lines
  for(var i = 0; i < maxHeight; ++i) {
    this.context.fillText(
      this._document.getLine(i), 0, lineHeight * i + baselineOffset
    );
  }
};

/**
 * Creates textarea that will handle user input and copy-paste actions
 * @private
 */
CanvasTextEditor.prototype._createInput = function() {
  this.inputEl = document.createElement('textarea');
  this.inputEl.style.position = 'absolute';
  this.inputEl.style.top = '-10px';
  this.inputEl.style.height = 0;
  this.inputEl.style.width = 0;
  this.inputEl.addEventListener('input', this.handleInput.bind(this), false);
  this.inputEl.addEventListener('blur', this.blur.bind(this), false);
  this.inputEl.addEventListener('focus', this._inputFocus.bind(this), false);
  this.inputEl.addEventListener('keydown', this.keydown.bind(this), false);
  this.inputEl.tabIndex = -1; // we don't want input to get focus by tabbing
  this.wrapper.appendChild(this.inputEl);
};

/**
 * Handles regular text input into our proxy field
 * @param  {Event} e
 */
CanvasTextEditor.prototype.handleInput = function(e) {
  this.insertTextAtCurrentPosition(e.target.value);
  e.target.value = '';
};

/**
 * Inserts text at the current cursor position
 * @param  {string} text
 */
CanvasTextEditor.prototype.insertTextAtCurrentPosition = function(text) {
  var pos = this._selection.getPosition();
  // Inserting new text and changing position of cursor to a new one
  this._selection.setPosition.apply(
    this._selection,
    this._document.insertText(text, pos[0], pos[1])
  );
  this.render();
};

/**
 * Deletes text at the current cursor position
 * @param  {string} text
 */
CanvasTextEditor.prototype.deleteCharAtCurrentPosition = function(forward) {
  var pos = this._selection.getPosition();
  // Deleting text and changing position of cursor to a new one
  this._selection.setPosition.apply(
    this._selection,
    this._document.deleteChar(forward, pos[0], pos[1])
  );
  this.render();
};

/**
 * Real handler code for editor gaining focus.
 * @private
 */
CanvasTextEditor.prototype._inputFocus = function() {
  this.wrapper.style.outline = '1px solid #09f';
  this._selection.setVisible(true);
};

/**
 * Returns main editor node so it can be inserted into document.
 * @return {HTMLElement} 
 */
CanvasTextEditor.prototype.getEl = function() {
  return this.wrapper;
};

/**
 * Returns font metrics used in this editor.
 * @return {FontMetrics} 
 */
CanvasTextEditor.prototype.getFontMetrics = function() {
  return this._metrics;
};

/**
 * Returns current document.
 * @return {Document} 
 */
CanvasTextEditor.prototype.getDocument = function() {
  return this._document;
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
 * Main keydown handler.
 */
CanvasTextEditor.prototype.keydown = function(e) {
  var handled = true;
  switch(e.keyCode) {
    case 8: // backspace
      this.deleteCharAtCurrentPosition(false);
      break;
    case 46: // delete
      this.deleteCharAtCurrentPosition(true);
      break;
    case 13: // Enter
      this.insertTextAtCurrentPosition('\n');
      break;
    case 37: // Left arrow
      this._selection.moveLeft();
      break;
    case 38: // Up arrow
      this._selection.moveUp();
      break;
    case 39: // Up arrow
      this._selection.moveRight();
      break;
    case 40: // Down arrow
      this._selection.moveDown();
      break;
    default:
      handled = false;
  }
  if(handled) {
    e.preventDefault();
  }
};

/**
 * Blur handler.
 */
CanvasTextEditor.prototype.blur = function() {
  this.inputEl.blur();
  this.wrapper.style.outline = 'none';
  this._selection.setVisible(false);
};

/**
 * Focus handler. Acts as a proxy to input focus.
 */
CanvasTextEditor.prototype.focus = function() {
  this.inputEl.focus();
};

