"use strict";

var FontMetrics = require('FontMetrics'),
    Document = require('Document'),
    Selection = require('Selection');

/**
 * Simple plain-text text editor using html5 canvas.
 * @constructor
 */
var CanvasTextEditor = function(doc, options) {
  this._document = doc || (new Document());

  this.options = {
    textColor: 'WindowText',
    backgroundColor: 'Window',
    selectionColor: 'Highlight',
    focusColor: '#09f',
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: 14,
    padding: 5,
    width: 640,
    height: 480
  };

  if (typeof options === 'object') {
    for(var key in options) {
      this.options[key] = options[key];
    }
  }

  this._metrics = new FontMetrics(this.options.fontFamily, this.options.fontSize);
  this._createWrapper();
  this._selection = new Selection(this, this.options.textColor);
  this._selection.onchange = this.selectionChange.bind(this);
  this._createCanvas();
  this._createInput();
  document.addEventListener('keydown', this.addKeyModifier.bind(this), true);
  document.addEventListener('keyup', this.removeKeyModfier.bind(this), true);
  window.addEventListener('focus', this.clearKeyModifiers.bind(this), true);
  window.addEventListener('focus', this.render.bind(this), true);
};

module.exports = CanvasTextEditor;

/**
 * Top offset in lines
 * @type {Number}
 */
CanvasTextEditor.prototype._scrollTop = 0;

/**
 * Left offset in characters
 * @type {Number}
 */
CanvasTextEditor.prototype._scrollLeft = 0;

/**
 * Determines if current browser is Opera
 * @type {Boolean}
 */
CanvasTextEditor.prototype.isOpera = ('opera' in window) && ('version' in window.opera);

/**
 * CSS class that is assigned to the wrapper.
 * @type {String}
 */
CanvasTextEditor.prototype.className = 'canvas-text-editor';

/**
 * Determines if user holds shift key at the moment
 * @type {Boolean}
 */
CanvasTextEditor.prototype.shiftPressed = false;

/**
 * Marks important for us key modfiers as pressed
 * @param {Event} e
 */
CanvasTextEditor.prototype.addKeyModifier = function(e) {
  if (e.keyCode === 16) {
    this.shiftPressed = true;
  }
};

/**
 * Unmarks important for us key modfiers as pressed
 * @param {Event} e
 */
CanvasTextEditor.prototype.removeKeyModfier = function(e) {
  if (e.keyCode === 16) {
    this.shiftPressed = false;
  }
};

/**
 * Clears all key modifiers
 */
CanvasTextEditor.prototype.clearKeyModifiers = function() {
  this.shiftPressed = false;
};

/**
 * Returns selection for this editor
 * @return {Selection}
 */
CanvasTextEditor.prototype.getSelection = function() {
  return this._selection;
};

/**
 * Returns current top offset
 * @return {number}
 */
CanvasTextEditor.prototype.scrollTop = function() {
  return this._scrollTop;
};

/**
 * Returns current left offset
 * @return {number}
 */
CanvasTextEditor.prototype.scrollLeft = function() {
  return this._scrollLeft;
};

/**
 * Handles selection change
 */
CanvasTextEditor.prototype.selectionChange = function() {
  // Assume that selection is empty
  var selectedText = '';

  // if it's not we put together selected text from document
  if (!this._selection.isEmpty()) {
    var ranges = this._selection.lineRanges();
    for(var key in ranges) {
      selectedText += this._document.getLine(parseInt(key)).slice(
        ranges[key][0], ranges[key][1] === true ? undefined : ranges[key][1]
      );
    }
  }

  this._checkScroll();
  this.setInputText(selectedText, true);

  // Updating canvas to show selection
  this.render();
};

/**
 * Creates wrapper element for all parts of the editor
 * @private
 */
CanvasTextEditor.prototype._createWrapper = function() {
  this.wrapper = document.createElement('div');
  this.wrapper.className = this.className;
  this.wrapper.style.display = 'inline-block';
  this.wrapper.style.position = 'relative';
  this.wrapper.style.backgroundColor = this.options.backgroundColor;
  this.wrapper.style.border = this.options.padding + 'px solid ' + this.options.backgroundColor;
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
  this.resize(this.options.width, this.options.height);
  this.render();
  this.wrapper.appendChild(this.canvas);
};

/**
 * Makes sure that cursor is visible
 * @return {[type]} [description]
 */
CanvasTextEditor.prototype._checkScroll = function() {
  var maxHeight = Math.ceil(this.canvas.height / this._metrics.getHeight()) - 1,
      maxWidth = Math.ceil(this.canvas.width / this._metrics.getWidth()) - 1,
      cursorPosition = this._selection.getPosition();
  if (cursorPosition[0] > this._scrollLeft + maxWidth ) {
    this._scrollLeft = cursorPosition[0] - maxWidth;
  } else if (cursorPosition[0] < this._scrollLeft) {
    this._scrollLeft = cursorPosition[0];
  }
  if (cursorPosition[1] > this._scrollTop + maxHeight) {
    this._scrollTop = cursorPosition[1] - maxHeight;
  } else if (cursorPosition[1] < this._scrollTop) {
    this._scrollTop = cursorPosition[1];
  }
  this._selection.updateCursorStyle();
};

/**
 * Renders document onto the canvas
 * @return {[type]} [description]
 */
CanvasTextEditor.prototype.render = function() {
  var baselineOffset = this._metrics.getBaseline(),
      lineHeight = this._metrics.getHeight(),
      characterWidth = this._metrics.getWidth(),
      maxHeight = Math.ceil(this.canvas.height / lineHeight) + this._scrollTop,
      lineCount = this._document.getLineCount(),
      selectionRanges = this._selection.lineRanges(),
      selectionWidth = 0;

  // Making sure we don't render something that we won't see
  if (lineCount < maxHeight) {
    maxHeight = lineCount;
  }

  // Clearing previous iteration
  this.context.fillStyle = this.options.backgroundColor;
  this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  this.context.fillStyle = this.options.textColor;

  // Looping over document lines
  for(var i = this._scrollTop; i < maxHeight; ++i) {
    var topOffset = lineHeight * (i - this._scrollTop);

    // Rendering selection for this line if one is present
    if (selectionRanges[i]) {
      this.context.fillStyle = this.options.selectionColor;

      // Check whether we should select to the end of the line or not
      if(selectionRanges[i][1] === true) {
        selectionWidth = this.canvas.width;
      } else {
        selectionWidth = (selectionRanges[i][1] - selectionRanges[i][0]) * characterWidth;
      }

      // Drawing selection
      this.context.fillRect(
        (selectionRanges[i][0] - this._scrollLeft) * characterWidth,
        topOffset,
        selectionWidth,
        lineHeight
      );

      // Restoring fill color for the text
      this.context.fillStyle = this.options.textColor;
    }

    // Drawing text
    this.context.fillText(
      this._document.getLine(i).slice(this._scrollLeft), 0, topOffset + baselineOffset
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
  this.inputEl.style.top = '-25px';
  this.inputEl.style.left = '-25px';
  this.inputEl.style.height = '10px';
  this.inputEl.style.width = '10px';
  this.inputEl.addEventListener('input', this.handleInput.bind(this), false);
  this.inputEl.addEventListener('blur', this.blur.bind(this), false);
  this.inputEl.addEventListener('focus', this._inputFocus.bind(this), false);
  this.inputEl.addEventListener('keydown', this.keydown.bind(this), false);
  this.inputEl.addEventListener('keypress', this.setInputText.bind(this, ''), false);
  this.inputEl.tabIndex = -1; // we don't want input to get focus by tabbing
  this.wrapper.appendChild(this.inputEl);
  this.setInputText('', true);
};

/**
 * Handles regular text input into our proxy field
 * @param  {Event} e
 */
CanvasTextEditor.prototype.handleInput = function(e) {
  var value = e.target.value;
  if (this.isOpera) {
    // Opera doesn't need a placeholder
    value = value.substring(0, value.length);
  } else {
    // Compensate for placeholder
    value = value.substring(0, value.length - 1);
  }
  this.insertTextAtCurrentPosition(value);
  this.needsClearing = true;
};

/**
 * Makes input contain only placeholder character and places cursor at start
 */
CanvasTextEditor.prototype.setInputText = function(text, force) {
  if(this.needsClearing || force === true) {
    if (this.isOpera) {
      this.inputEl.value = text;
      this.inputEl.select();
    } else {
      this.inputEl.value = text + '#';
      this.inputEl.selectionStart = 0;
      this.inputEl.selectionEnd = text.length;
    }
  }
  this.needsClearing = false;
};

/**
 * Inserts text at the current cursor position
 * @param  {string} text
 */
CanvasTextEditor.prototype.insertTextAtCurrentPosition = function(text) {
  // If selection is not empty we need to "replace" selected text with inserted
  // one which means deleting old selected text before inserting new one
  if (!this._selection.isEmpty()) {
    this.deleteCharAtCurrentPosition();
  }

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
  // If there is a selection we just remove it no matter what direction is
  if (!this._selection.isEmpty()) {
    this._selection.setPosition.apply(
      this._selection,
      this._document.deleteRange(
        this._selection.start.character, this._selection.start.line,
        this._selection.end.character, this._selection.end.line
      )
    );
  } else {
    var pos = this._selection.getPosition();
    // Deleting text and changing position of cursor to a new one
    this._selection.setPosition.apply(
      this._selection,
      this._document.deleteChar(forward, pos[0], pos[1])
    );
  }
  this.render();
};

/**
 * Real handler code for editor gaining focus.
 * @private
 */
CanvasTextEditor.prototype._inputFocus = function() {
  this.wrapper.style.outline = '1px solid ' + this.options.focusColor;
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
 * Main keydown handler
 * @param  {Event} e
 */
CanvasTextEditor.prototype.keydown = function(e) {
  var handled = true;
  switch(e.keyCode) {
    case 8: // Backspace
      this.deleteCharAtCurrentPosition(false);
      break;
    case 46: // Delete
      this.deleteCharAtCurrentPosition(true);
      break;
    case 13: // Enter
      this.insertTextAtCurrentPosition('\n');
      break;
    case 37: // Left arrow
      this._selection.moveLeft(1, this.shiftPressed);
      break;
    case 38: // Up arrow
      this._selection.moveUp(1, this.shiftPressed);
      break;
    case 39: // Right arrow
      this._selection.moveRight(1, this.shiftPressed);
      break;
    case 40: // Down arrow
      this._selection.moveDown(1, this.shiftPressed);
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
  this.wrapper.style.outline = 'none';
  this._selection.setVisible(false);
};

/**
 * Focus handler. Acts as a proxy to input focus.
 */
CanvasTextEditor.prototype.focus = function() {
  this.inputEl.focus();
};

