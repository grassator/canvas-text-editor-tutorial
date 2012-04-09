
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
    Selection = require('Selection');

/**
 * Simple plain-text text editor using html5 canvas.
 * @constructor
 */
var CanvasTextEditor = function(doc, options) {
  this._document = doc || (new Document);

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
    for(key in options) {
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
    var ranges = this._selection.lineRanges(),
        line = '';
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
  if (lineCount < maxHeight) maxHeight = lineCount;

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
      )

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
};

/**
 * Inserts text into arbitrary position in the document
 * @param  {string} text
 * @param  {number} column
 * @param  {number} row
 * @return {Array} new position in the document
 */
Document.prototype.insertText = function(text, column, row) {
  // First we need to split inserting text into array lines
  text = Document.prepareText(text);

  // First we calculate new column position because
  // text array will be changed in the process
  var newColumn = text[text.length - 1].length;
  if (text.length === 1) newColumn += column;

  // append remainder of the current line to last line in new text
  text[text.length - 1] += this.storage[row].substr(column);

  // append first line of the new text to current line up to "column" position
  this.storage[row] = this.storage[row].substr(0, column) + text[0];

  // now we are ready to splice other new lines
  // (not first and not last) into our storage
  var args = [row + 1, 0].concat(text.slice(1));
  this.storage.splice.apply(this.storage, args);

  // Finally we calculate new position
  column = newColumn;
  row += text.length - 1;

  return [column, row];
};

/**
 * Deletes text with specified range from the document.
 * @param  {number} startColumn
 * @param  {number} startRow
 * @param  {number} endColumn
 * @param  {number} endRow
 */
Document.prototype.deleteRange = function(startColumn, startRow, endColumn, endRow) {

  // Check bounds
  startRow >= 0 || (startRow = 0);
  startColumn >= 0 || (startColumn = 0);
  endRow < this.storage.length || (endRow = this.storage.length - 1);
  endColumn <= this.storage[endRow].trim('\n').length || (endColumn = this.storage[endRow].length);

  // Little optimization that does nothing if there's nothing to delete
  if(startColumn === endColumn && startRow === endRow) {
    return [startColumn, startRow];
  }

  // Now we append start of start row to the remainder of endRow
  this.storage[startRow] = this.storage[startRow].substr(0, startColumn) + 
                           this.storage[endRow].substr(endColumn);

  // And remove everything inbetween
  this.storage.splice(startRow + 1, endRow - startRow);

  // Return new position
  return [startColumn, startRow];
};

/**
 * Deletes one char forward or backward
 * @param  {boolean} forward
 * @param  {number}  column
 * @param  {number}  row
 * @return {Array}   new position
 */
Document.prototype.deleteChar = function(forward, startColumn, startRow) {
  var endRow = startRow,
      endColumn = startColumn;

  if (forward) {
    var characterCount = this.storage[startRow].trim('\n').length;
    // If there are characters after cursor on this line we simple remove one
    if (startColumn < characterCount) {
      ++endColumn;
    }
    // if there are rows after this one we append it
    else {
      startColumn = characterCount;
      if (startRow < this.storage.length - 1) {
        ++endRow;
        endColumn = 0;
      }
    }
  }
  // Deleting backwards
  else {
    // If there are characters before the cursor on this line we simple remove one
    if (startColumn > 0) {
      --startColumn;
    }
    // if there are rwos before we append current to previous one
    else if (startRow > 0) {
      --startRow;
      startColumn = this.storage[startRow].length - 1;
    }
  }

  return this.deleteRange(startColumn, startRow, endColumn, endRow);
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
}, "Selection": function(exports, require, module) {/**
 * Creates new selection for the editor.
 * @param {Editor} editor.
 * @constructor
 */
Selection = function(editor, color) {
  this.editor = editor;
  color || (color = '#000');

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
  this.el.style.backgroundColor = color;

  this.editor.getEl().appendChild(this.el);
  this.setPosition(0, 0);
};

/**
 * Hold blink interval for the cursor
 * @type {Number}
 */
Selection.prototype.blinkInterval = 500;

/**
 * This callback called when selection size has changed
 * @type {Function}
 */
Selection.prototype.onchange = null;

/**
 * If true that means that we currently manipulate right side of the selection
 * @type {Boolean}
 */
Selection.prototype.activeEndSide = true;

/**
 * Responsible for blinking
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
 * Returns selection split into line ranges
 * @return {Array}
 */
Selection.prototype.lineRanges = function() {
  if (this.isEmpty()) return {};
  var ranges = {},
      character = this.start.character,
      line = this.start.line;
  for (; line <= this.end.line ; line++) {
    ranges[line] = ([character, line !== this.end.line || this.end.character]);
    character = 0;
  };
  return ranges;
};

/**
 * Comparator for two cursor positions
 * @return {number}
 */
Selection.prototype.comparePosition = function(one, two) {
  if (one.line < two.line) {
    return -1;
  } else if (one.line > two.line) {
    return 1;
  } else {
    if (one.character < two.character) {
      return -1;
    } else if (one.character > two.character) {
      return 1;
    } else {
      return 0;
    }
  }
};

/**
 * Determines if selection is emtpy (zero-length)
 * @return {boolean}
 */
Selection.prototype.isEmpty = function() {
  return this.comparePosition(this.start, this.end) === 0;
};

/**
 * Moves both start and end to a specified position inside document.
 * @param {number} line
 * @param {number} character
 */
Selection.prototype.setPosition = function(character, line, keepSelection) {

  var position = this._forceBounds(character, line);

  // Calling private setter that does the heavy lifting
  this._doSetPosition(position[0], position[1], keepSelection);

  // Making a callback if necessary
  if (typeof this.onchange === 'function') {
    this.onchange(this, this.start, this.end);
  }
};

/**
 * Checks and forces bounds for proposed position updates
 * @return {Array}
 */
Selection.prototype._forceBounds = function(character, line) {
  var position = this.getPosition();

  // Checking lower bounds
  line >= 0 || (line = 0);
  if (character < 0) {
    // Wraparound for lines
    if (line === position[1] && line > 0) {
      --line;
      character = this.editor.getDocument().getLine(line).trim('\n').length;
    } else {
      character = 0;
    }
  }

  // Checking upper bounds
  var lineCount = this.editor.getDocument().getLineCount();
  line < lineCount || (line = lineCount - 1);
  var characterCount = this.editor.getDocument().getLine(line).trim('\n').length;
  if (character > characterCount) {
    // Wraparound for lines
    if (line === position[1] && line < this.editor.getDocument().getLineCount() - 1) {
      ++line;
      character = 0;
    } else {
      character = characterCount;
    }
  }
  return [character, line];
};

/**
 * Updates cursor styles so it matches current position
 */
Selection.prototype.updateCursorStyle = function() {
  // Calculating new position on the screen
  var metrics = this.editor.getFontMetrics(),
      position = this.getPosition(),
      offsetX = (position[0] - this.editor.scrollLeft()) * metrics.getWidth(),
      offsetY = (position[1] - this.editor.scrollTop()) * metrics.getHeight();
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
 * Private unconditional setter for cursor position
 * @param  {number} character
 * @param  {number} line
 * @param  {boolean} keepSelection
 */
Selection.prototype._doSetPosition = function(character, line, keepSelection) {
  // If this is a selection range
  if (keepSelection) {

    compare = this.comparePosition({
      line: line,
      character: character
    }, this.start);

    // Determining whether we should make the start side of the range active
    // (have a cursor). This happens when we start the selection be moving
    // left, or moving up.
    if (compare === -1 && (this.isEmpty() || line < this.start.line)) {
      this.activeEndSide = false;
    } 

    // Assign new value to the side that is active
    if (this.activeEndSide) {
      this.end.line = line;
      this.end.character = character;
    } else {
      this.start.line = line;
      this.start.character = character;
    }

    // Making sure that end is further than start and swap if necessary
    if (this.comparePosition(this.start, this.end) > 0) {
      this.activeEndSide = !this.activeEndSide;
      var temp = {
        line: this.start.line,
        character: this.start.character
      }
      this.start.line = this.end.line;
      this.start.character = this.end.character;
      this.end.line = temp.line;
      this.end.character = temp.character;
    }
  } else { // Simple cursor move
    this.activeEndSide = true;
    this.start.line = this.end.line = line;
    this.start.character = this.end.character = character;
  }
};

/**
 * Returns current position of the end of the selection
 * @return {Array}
 */
Selection.prototype.getPosition = function() {
  if (this.activeEndSide) {
    return [this.end.character, this.end.line];
  } else {
    return [this.start.character, this.start.line];
  }
}

/**
 * Moves up specified amount of lines.
 * @param  {number} length
 */
Selection.prototype.moveUp = function(length, keepSelection) {
  arguments.length || (length = 1);
  var position = this.getPosition();
  this.setPosition(position[0], position[1] - length, keepSelection);
};

/**
 * Moves down specified amount of lines.
 * @param  {number} length
 */
Selection.prototype.moveDown = function(length, keepSelection) {
  arguments.length || (length = 1);
  var position = this.getPosition();
  this.setPosition(position[0], position[1] + length, keepSelection);
};

/**
 * Moves up specified amount of lines.
 * @param  {number} length
 */
Selection.prototype.moveLeft = function(length, keepSelection) {
  arguments.length || (length = 1);
  var position = this.getPosition();
  this.setPosition(position[0] - length, position[1], keepSelection);
};

/**
 * Moves down specified amount of lines.
 * @param  {number} length
 */
Selection.prototype.moveRight = function(length, keepSelection) {
  arguments.length || (length = 1);
  var position = this.getPosition();
  this.setPosition(position[0] + length, position[1], keepSelection);
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
}});
