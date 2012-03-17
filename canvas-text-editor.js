
(function(/*! Stitch !*/) {
  if (!this.require) {
    var modules = {}, cache = {}, require = function(name, root) {
      var path = expand(root, name), module = cache[path], fn;
      if (module) {
        return module.exports;
      } else if (fn = modules[path] || modules[path = expand(path, './index')]) {
        module = {id: path, exports: {}};
        try {
          cache[path] = module;
          fn(module.exports, function(name) {
            return require(name, dirname(path));
          }, module);
          return module.exports;
        } catch (err) {
          delete cache[path];
          throw err;
        }
      } else {
        throw 'module \'' + name + '\' not found';
      }
    }, expand = function(root, name) {
      var results = [], parts, part;
      if (/^\.\.?(\/|$)/.test(name)) {
        parts = [root, name].join('/').split('/');
      } else {
        parts = name.split('/');
      }
      for (var i = 0, length = parts.length; i < length; i++) {
        part = parts[i];
        if (part == '..') {
          results.pop();
        } else if (part != '.' && part != '') {
          results.push(part);
        }
      }
      return results.join('/');
    }, dirname = function(path) {
      return path.split('/').slice(0, -1).join('/');
    };
    this.require = function(name) {
      return require(name, '');
    }
    this.require.define = function(bundle) {
      for (var key in bundle)
        modules[key] = bundle[key];
    };
  }
  return this.require.define;
}).call(this)({"CanvasTextEditor": function(exports, require, module) {"use strict";

var FontMetrics = require('FontMetrics'),
    Document = require('Document'),
    Cursor = require('Cursor');

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
  this._cursor = new Cursor(this);
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

  // For now just very dumb implementation of rendering
  var baselineOffset = this._metrics.getBaseline(),
      lineHeight = this._metrics.getHeight(),
      characterWidth = this._metrics.getWidth(),
      maxHeight = Math.ceil(640 / lineHeight),
      lineCount = this._document.getLineCount();

  if (lineCount < maxHeight) maxHeight = lineCount;

  for(var i = 0; i < maxHeight; ++i) {
    this.context.fillText(
      this._document.getLine(i), 0, lineHeight * i + baselineOffset
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
  this.inputEl.addEventListener('keydown', this.keydown.bind(this), false);
  this.inputEl.tabIndex = -1; // we don't want input to get focus by tabbing
  this.wrapper.appendChild(this.inputEl);
};

/**
 * Real handler code for editor gaining focus.
 * @private
 */
CanvasTextEditor.prototype._inputFocus = function() {
  this.wrapper.style.outline = '1px solid #09f';
  this._cursor.setVisible(true);
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
    case 37: // Left arrow
      this._cursor.moveLeft();
      break;
    case 38: // Up arrow
      this._cursor.moveUp();
      break;
    case 39: // Up arrow
      this._cursor.moveRight();
      break;
    case 40: // Down arrow
      this._cursor.moveDown();
      break;
    default:
      handled = false;
  }
  return !handled;
};

/**
 * Blur handler.
 */
CanvasTextEditor.prototype.blur = function() {
  this.inputEl.blur();
  this.wrapper.style.outline = 'none';
  this._cursor.setVisible(false);
};

/**
 * Focus handler. Acts as a proxy to input focus.
 */
CanvasTextEditor.prototype.focus = function() {
  this.inputEl.focus();
};

}, "Cursor": function(exports, require, module) {/**
 * Creates new cursor for the editor.
 * @param {Editor} editor.
 * @constructor
 */
Selection = function(editor) {
  this.editor = editor;
  this.blinkInterval = 500;

  this.start = {
    line: 0,
    character: 0
  };

  this.end = {
    line: 0,
    character: 0
  };

  this.el = document.createElement('div');
  this.el.style.position = 'absolute';
  this.el.style.width = '1px';
  this.el.style.height = this.editor.getFontMetrics().getHeight() + 'px';
  this.el.style.backgroundColor = '#000';

  this.editor.getEl().appendChild(this.el);
  this.setPosition(0, 0);
};

/**
 * Responsible for cursor blinking
 * @return {void}
 */
Selection.prototype.blink = function() {
  if (parseInt(this.el.style.opacity, 10)) {
    this.el.style.opacity = 0;
  } else {
    this.el.style.opacity = 1;
  }
};

/**
 * Moves cursor to a specified position inside document.
 * @param {number} position Offset from the start of the document.
 */
Selection.prototype.setPosition = function(line, character) {
  // Providing defaults for both line and character parts of position
  if (typeof line === 'undefined') line = this.end.line
  if (typeof character === 'undefined') character = this.end.character

  // Checking lower bounds
  line >= 0 || (line = 0);
  character >= 0 || (character = 0);

  // Checking upper bounds
  var lineCount = this.editor.getDocument().getLineCount();
  line < lineCount || (line = lineCount - 1);
  var characterCount = this.editor.getDocument().getLine(line).trim('\n').length;
  character <= characterCount || (character = characterCount);

  // Saving new value
  this.start.line = this.end.line = line;
  this.start.character = this.end.character = character;

  // Calculating new position on the screen
  var metrics = this.editor.getFontMetrics(),
      offsetX = character * metrics.getWidth(),
      offsetY = line * metrics.getHeight();
  this.el.style.left = offsetX + 'px';
  this.el.style.top = offsetY + 'px';

  // This helps to see moving cursor when it is always in blink on
  // state on a new position. Try to move cursror in any editor and you
  // will see this in action.
  if(this.isVisible()) {
    this.el.style.opacity = 1;
    clearInterval(this.interval);
    this.interval = setInterval(this.blink.bind(this), this.blinkInterval);
  }
};

/**
 * Moves cursor up specified amount of lines.
 * @param  {number} length
 */
Selection.prototype.moveUp = function(length) {
  arguments.length || (length = 1);
  var line = this.end.line - length;
  this.setPosition(line);
};

/**
 * Moves cursor down specified amount of lines.
 * @param  {number} length
 */
Selection.prototype.moveDown = function(length) {
  arguments.length || (length = 1);
  this.setPosition(this.end.line + length);
};

/**
 * Moves cursor up specified amount of lines.
 * @param  {number} length
 */
Selection.prototype.moveLeft = function(length) {
  arguments.length || (length = 1);
  this.setPosition(undefined, this.end.character - length);
};

/**
 * Moves cursor down specified amount of lines.
 * @param  {number} length
 */
Selection.prototype.moveRight = function(length) {
  arguments.length || (length = 1);
  this.setPosition(undefined, this.end.character + length);
};

/**
 * Shows or hides cursor.
 * @param {void} visible Whether cursor should be visible
 */
Selection.prototype.setVisible = function(visible) {
  clearInterval(this.interval);
  if(visible) {
    this.el.style.display = 'block';
    this.el.style.opacity = 1;
    this.interval = setInterval(this.blink.bind(this), this.blinkInterval);
  } else {
    this.el.style.display = 'none';
  }
  this.visible = visible;
};

/**
 * Returns visibility of the cursor.
 * @return {Boolean}
 */
Selection.prototype.isVisible = function() {
  return this.visible;
};

module.exports = Selection;
}, "Document": function(exports, require, module) {
/**
 * Creates new document from provided text.
 * @param {string} text Full document text.
 * @constructor
 */
Document = function(text) {
  text || (text = '');
  this.storage = Document.prepareText(text);
};

module.exports = Document;

/**
 * Splits text into array of lines. Can't use .split('\n') because
 * we want to keep trailing \n at the ends of lines.
 * @param  {string} text
 * @return {Array.{string}}
 */
Document.prepareText = function(text) {
  var lines = [],
      index = 0,
      newIndex;
  do {
    newIndex = text.indexOf('\n', index);
    // Adding from previous index to new one or to the end of the string
    lines.push(text.substr(index,  newIndex !== -1 ? newIndex - index + 1 : void 0));
    // next search will be after found newline
    index = newIndex + 1; 
  } while (newIndex !== -1);

  return lines;
};

/**
 * Returns line count for the document
 * @return {number}
 */
Document.prototype.getLineCount = function() {
  return this.storage.length;
};

/**
 * Returns line on the corresponding index.
 * @param  {number} 0-based index of the line
 * @return {string}
 */
Document.prototype.getLine = function(index) {
  return this.storage[index];
};

/**
 * Returns linear length of the document.
 * @return {number}
 */
Document.prototype.getLength = function() {
  var sum = 0;
  for (var i = this.storage.length - 1; i >= 0; --i) {
    sum += this.storage[i].length
  };
  return sum;
};

/**
 * Returns char at specified offset.
 * @param  {number} offset
 * @return {string|undefined}
 */
Document.prototype.charAt = function(column, row) {
  var row = this.storage[row];
  if (row) return row.charAt(column);
};}, "FontMetrics": function(exports, require, module) {"use strict";

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
  line.innerHTML = 'm'; // It doesn't matter what text goes here
  this._width = line.offsetWidth;
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
}});
