/**
 * Creates new selection for the editor.
 * @param {Editor} editor.
 * @constructor
 */
var Selection = function(editor, color) {
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
  if (this.isEmpty()) {
    return {};
  }
  var ranges = {},
      character = this.start.character,
      line = this.start.line;
  for(; line <= this.end.line ; line++) {
    ranges[line] = ([character, line !== this.end.line || this.end.character]);
    character = 0;
  }
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

    var compare = this.comparePosition({
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
      };
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
};

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
