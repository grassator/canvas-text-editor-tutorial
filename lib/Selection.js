/**
 * Creates new selection for the editor.
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
 * Moves both start and end to a specified position inside document.
 * @param {number?} line
 * @param {number?} character
 */
Selection.prototype.setPosition = function(character, line) {
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
 * Returns current position of the end of the selection
 * @return {Array}
 */
Selection.prototype.getPosition = function() {
  return [this.end.character, this.end.line];
}

/**
 * Moves up specified amount of lines.
 * @param  {number} length
 */
Selection.prototype.moveUp = function(length) {
  arguments.length || (length = 1);
  this.setPosition(this.end.character, this.end.line - length);
};

/**
 * Moves down specified amount of lines.
 * @param  {number} length
 */
Selection.prototype.moveDown = function(length) {
  arguments.length || (length = 1);
  this.setPosition(this.end.character, this.end.line + length);
};

/**
 * Moves up specified amount of lines.
 * @param  {number} length
 */
Selection.prototype.moveLeft = function(length) {
  arguments.length || (length = 1);
  this.setPosition(this.end.character - length, this.end.line);
};

/**
 * Moves down specified amount of lines.
 * @param  {number} length
 */
Selection.prototype.moveRight = function(length) {
  arguments.length || (length = 1);
  this.setPosition(this.end.character + length, this.end.line);
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
