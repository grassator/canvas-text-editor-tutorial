# Canvas Text Editor Tutorial

1. [Why write another editor?](#intro)
2. [Data Structure](#part0)
3. [Dealing with DOM](#part1)
4. [Font Metrics](#part2)
5. [Read-only document and naive rendering](#part3)
6. [Zero-width selection (cursor) support](#part4)
7. [Text insert and delete operations](#part5)
8. [Text selection](#part6)
8. [Simple scroll](#part7)

<a name="intro"></a>

## Why write another editor?

It's surprising how little information you can find on the subject of creating a proper, fast, and feature complete plain text editor. All available information is either very old and not indicative of recent trends, or just very vague and unhelpful.

I'm going to try to fix that by creating a series of tutorials explaining all important aspects of text editors while creating a usable application using HTML5 canvas and a lot of JavaScript code.

I'm well aware of the existence of [Bespin](https://github.com/bespin/bespin) and choose to actively ignore it because my goal is not creation of a new editor but rather showing a general approach to creating a text editor.

Here's a list of feature requirements for the editor in order of priority:

1. keyboard cursor navigation and selection;
2. mouse cursor navigation and selection;
3. copy & paste support;
4. simple search & replace;
5. line numbering.

And these are technical requirements:

1. fast enough to handle at least 100 kb of text;
2. no external dependencies;
3. works in all modern browsers;
4. built with BDD or TDD.

I don't plan to have any of the following functionality to make task more realistic because each of these topics has enough problems to write a book about:

1. support for RTL text, hieroglyphs and vertical text;
2. regular expression search;
3. syntax highlighting.

<a name="part0"></a>

## Data Structure

Before we can start programming text editor itself we need to decide on a  data structure that will hold text document. Plain string won't work because it will be too slow on any decent text document and additionally string is an immutable data type in JavaScript so any modification will require creating a new copy. Let's see what our options are.


There's an [excellent paper](http://ned.rubyforge.org/doc/crowley98data.ps.gz) by Charles Crowley on data structures for text editors, complete with benchmarks and thorough descriptions. If you are serious about writing a good editor I highly recommend reading it.

Here are four viable options for storing document data:

1. array of lines;
2. buffer gap;
3. fixed-size buffers;
4. piece table.

Each of these methods has it's strong and weak sides described in a paper mentioned earlier in this post, but due to immutability of the strings in JavaScript I have to exclude numbers 2 and 3. This leaves us with either *array of lines* or a *piece table*. Latter one is generally more attractive but also is more complex both in terms of understanding and programming.

Array of lines is very straightforward to implement and doesn't need any explanation on what it is which is ideal for a tutorial.

Next time I'm going to setup project structure and provide a link on github for this project.

<a name="part1"></a>

## Dealing with DOM

Writing text editor in JavaScript has some unfortunate side effects:

* having to deal with DOM;
* handling text input and especially copy & paste.

I'm not going into details on creating DOM structure in JavaScript since there are a [lot of tutorials](http://www.google.com/search?q=dom%20manipulation%20javascript) on the subject explaining it much better than I would be able to do. Here's what we need to create:

```html
<div class="canvas-text-editor" tabindex="0">
    <canvas />
    <textarea></textarea>
</div>
```

Let's go over interesting parts. We add `class` to wrapper div so it would be easier to find and style our editor inside a real page. `tabindex` is necessary in order for our wrapper to be able to receive input focus. Value of `0` means that it's real index will be auto calculated based on document structure.

Since our wrapper is able to receive focus and thus any keyboard events you might be wondering why do we need a `textarea`. The answer lies in the fact that browsers have very poor or even non-existent clipboard support. In order to avoid these problem we introduce a native input element that supports clipboard quite nicely. So whenever our wrapper gains focus we just proxy that event to `textarea`. One last trick to make all that work seamlessly is to always have text selected inside our editor copied and selected inside a `textarea`. This may sound very complex and confusing if you are not familiar DOM events, but I will have one or more posts on this very subject explaining everything in detail.

Source code for this part is available on [github](https://github.com/grassator/canvas-text-editor) under `part-2` tag. Don't forget that in order for demo to work you need to run `npm install` if you haven't done that already and start **express** server first by running `make serve` in your console. If all is done right you should see a slightly grey canvas element with word *“Test”* written at top left corner.

There has also been a change in a test framework from [mocha](http://visionmedia.github.com/mocha/) to [jasmine](http://pivotal.github.com/jasmine/) because as it turns out it is impossible to test canvas-related code outside of browser. To run tests start **express** server by running `make serve` and simply open `test/runner.html` in your browser. Since there's no algorithmic code right now the only test is to make sure that `CanvasTextEditor` object can be created:

```javascript
describe("CanvasTextEditor", function() {
    var CanvasTextEditor = require('editor');

    it("should be possible to instatiate", function() {
        var editor = new CanvasTextEditor;
        expect(typeof editor).toEqual('object');
    });
});
```

<a name="part2"></a>

## Font Metrics 

HTML 5 canvas doesn't offer much when it comes to rendering text. It has no layouting
engine and very poor text metrics support. On top of that the only vertical alignment option well supported is *baseline* which is rather inconvenient to work with. To summarize all that in order for us to render text properly a custom font metrics interface is required.

I'm assuming that we are only going to be dealing with monospace fonts to make this as simple as possible. That means that when presented with font name and size we need to be able to calculate line height, character width and [baseline](http://en.wikipedia.org/wiki/Typeface#Font_metrics) offset from top of the line.

Getting these font characteristics is a tricky business. To get line height and character width we can create an absolutely positioned `<div>` with a single character inside and then measure it's dimensions. Absolute positioning is necessary to get `<div>` width to be only the width of it's content instead of full wind width. Here's excerpt from `FontMetrics.js` that does just that:

```javascript
var line = document.createElement('div'),
    body = document.body;
line.style.position = 'absolute';
line.style.whiteSpace = 'nowrap';
line.style.font = size + 'px ' + family;
body.appendChild(line);
    
line.innerHTML = 'm'; // It doesn't matter what text goes here
this._width = line.offsetWidth;
this._height = line.offsetHeight;
```

Baseline offset requires even more elaborate hack — using an empty `inline-block` element that acts like a character (and thus gets aligned to text baseline) and also gets correct `offsetTop` property that gives you offset from parent element. By adding to that height of element itself we get what we wanted — text baseline:

![Text Metrics](/associated-files/canvas-text-editor/text-metrics.png)

Here's the code that does the calculation:

```javascript
var span = document.createElement('span');
span.style.display = 'inline-block';
span.style.overflow = 'hidden';
span.style.width = '1px';
span.style.height = '1px';
line.appendChild(span);
    
this._baseline = span.offsetTop + span.offsetHeight;
```

You can see full source code for `FontMetrics.js` on [github](https://github.com/grassator/canvas-text-editor/blob/master/lib/FontMetrics.js). Now that we have all necessary metrics can instantiate **FontMetrics** object for desired font:

```javascript
this._metrics = new FontMetrics('"Courier New", Courier, monospace', 14);
```

And we can use to replace hard-coded offset in our canvas test with calculated values:

```javascript
this.context.font = this._metrics.getSize() + 'px ' + this._metrics.getFamily()
this.context.fillText('Test', 0, this._metrics.getBaseline());
```

Result is the word "Test" rendered at appropriate offset form the top of the canvas:

![Demo](/associated-files/canvas-text-editor/demo.png)

Source code for this part is available on [github](https://github.com/grassator/canvas-text-editor) under `part-3` tag.


<a name="part3"></a>

## Read-only document and naive rendering

Now that we have [font metrics](#part2) we can actually render something meaningful text. But before that we need to store that text somewhere, so it's finally time to actually start implementing the line-based data structure I described earlier. 

We want to store our document as an array lines, so first and foremost we need a function that would split input text accordingly. While `split('\n')` seems like an obvious and simple choice it does remove `\n` from the lines and we want to keep it to make position calculations and editing of the document simpler in the future, so here's a substitute that keeps line breaks in place.

```javascript
var lines = [],
    index = 0,
    newIndex;
    
do {
  newIndex = text.indexOf('\n', index);
  lines.push(text.substr(index,  newIndex !== -1 ? newIndex - index + 1 : void 0));
  index = newIndex + 1; 
} while (newIndex !== -1);

return lines;
```

Basically we just search for a newline here and copy push the part from previous index to new one to `lines` array including `\n` itself. The rest of the class interface at this point is just getters for character, line, line count and document length. All of these are few lines long maximum and don't require an explanation.

Now that we have a document class we need to update `CanvasTextEditor` constructor to accept an instance of that class as only argument or create instance on itself when none is passed:

```javascript
var CanvasTextEditor = function(doc) {
  this._document = doc || (new Document);
```

Lets also implement a very simple and naive version of rendering of our document. All we need to do here is calculate amount of lines that can be shown on the editor canvas. It will be based either canvas height or number of lines in the document if it is short. After that it's just simple loop that retrieves lines from the document and renders at offsets calculated based on the info we got from [FontMetrics class](/web/writing-a-text-editor-part-3-font-metrics/):

```javascript
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
```

Now we can update demo code to see how this works:

```javascript
var CanvasTextEditor = require('CanvasTextEditor'),
    Document = require('Document'),
    doc = new Document('Line1\nLine that is little bit longer\nLine4'),
    editor = new CanvasTextEditor(doc);
```

This is the screenshot from the browser of working demo:

![Demo](/associated-files/canvas-text-editor/document-rendering.png)

Source code for this part is available on [github](https://github.com/grassator/canvas-text-editor) under `part-4` tag.


<a name="part4"></a>

## Zero-width selection (cursor) support

It's finally time to add some interactivity to our text editor. First thing that we need in order to allow user to edit a document is a cursor, which is also called a zero-width selection because well, that's what it is, really. Let's go.

Before we proceed any further I should mention that I intentionally ignore any scrolling issues and mouse interactions because they will bloat the code quite significantly without providing any useful information. I will deal with both of them later on.

Since we are dealing with new entity here let's create a new class called `Selection` with following constructor:

```javascript
Selection = function(editor) {
  this.editor = editor;
  this.blinkInterval = 500;

  this.el = document.createElement('div');
  this.el.style.position = 'absolute';
  this.el.style.width = '1px';
  this.el.style.height = this.editor.getFontMetrics().getHeight() + 'px';
  this.el.style.backgroundColor = '#000';

  this.editor.getEl().appendChild(this.el);

  this.start = {
    line: 0,
    character: 0
  };

  this.end = {
    line: 0,
    character: 0
  };
  
  this.setPosition(0, 0);
};
```

There's quite a bit of code here but in a nutshell it just creates a new DOM element that will be positioned on top of the editor to represent cursor position. Then we just initialize some defaults (start and end of the selection).

The reason I chose to use a DOM element for cursor and not just paint it on canvas is because otherwise we would be required to update canvas each time the cursor moves or blinks which would cause high CPU load or usage of some kind of cache. It might be a good idea in a real editor but will only slow us down right now.

Let's take a look at `setPosition` method, which is the heart of this class:

```javascript
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
  // state on a new position. Try to move cursor in any editor and you
  // will see this in action.
  if(this.isVisible()) {
    this.el.style.opacity = 1;
    clearInterval(this.interval);
    this.interval = setInterval(this.blink.bind(this), this.blinkInterval);
  }
};
```
    
Important part here is that we always force position to be a valid one. This may not be the best user experience but it makes writing code that moves cursor quite easy. I'm saying that it's not good for the user because it's not how the most editors work nowadays — they keep invalid character offset between line changes so if you jump from the end of longer line to a shorter one and back you will be in exact same position, whereas in our case cursor will be at offset equal to short line length inside that longer line.

There is not much else to comment here, except may be explain this expression:

```javascript
this.editor.getDocument().getLine(line).trim('\n').length;
```

Since we store our lines with `\n` at the end except for the last line we need to somehow normalize it here, so we just trim that last `\n`. It is also worth mentioning that we are allowing positioning cursor after the last character in lines.

As I mentioned earlier creating code to move cursor is very easy, here's example for moving cursor down(other three directions are very similar):

```javascript
Selection.prototype.moveDown = function(length) {
  arguments.length || (length = 1);
  this.setPosition(this.end.line + length);
};
```

There is a bunch of support methods inside `Selection` but I'm not going to list it here to save time and instead I highly recommend checking out [source code for part-5](https://github.com/grassator/canvas-text-editor/tags). What is important is to create an instance of `Selection` in our main editor class like this:

```javascript
this._selection = new Selection(this);
```

Then we need to listen to user keyboard input:

```javascript
this.inputEl.addEventListener('keydown', this.keydown.bind(this), false);
```

And finally we map arrow keys to method calls on our selection object:

```javascript
CanvasTextEditor.prototype.keydown = function(e) {
  var handled = true;
  switch(e.keyCode) {
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
  return !handled;
};
```

That's it — it's now possible to move cursor inside text editor. I've created a live [demo page](http://grassator.github.com/canvas-text-editor/) that will showcase current state of the project from now on.

Source code for this part is available on [github](https://github.com/grassator/canvas-text-editor) under `part-5` tag.

<a name="part5"></a>

## Text insert and delete operations

This part six of this series of tutorials on creating a text editor but sadly we haven't done any text editing yet. Let's change that by implementing inserting and deleting functionality in our text editor.

### Inserting Text

Since our text is split into lines for storage insertion algorithm is not as easy as splicing some one string into another but it is pretty straightforward:

1. split input into lines;
2. join first line to the current line under cursor;
3. join last line of new text to the appropriate line in storage;
4. add lines in-between to the storage.

This is pretty much line for lines what happens in new `insertText` method of the `Document` class:

```javascript
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
```

We return new position here because usually after inserting text we want to move cursor that position.

Now we need to proxy user keyboard input to our method. It's done by listening to `input` event on our `textarea`. Great thing about `input` event is that it captures any kind of input into the `textarea` whether it's regular keyboard input, text drag’n’drop or pasting from clipboard. All we have to is create a simple handler and bind it:

```javascript
this.inputEl.addEventListener('input', this.handleInput.bind(this), false);
```

`handleInput` method simply reads new input, passes it to another method that will get position of the cursor, passes it to our `insertText` method and empties `textarea` for any future input:

```javascript
CanvasTextEditor.prototype.handleInput = function(e) {
  this.insertTextAtCurrentPosition(e.target.value);
  e.target.value = '';
};

CanvasTextEditor.prototype.insertTextAtCurrentPosition = function(text) {
  var pos = this._selection.getPosition();
  // Inserting new text and changing position of cursor to a new one
  this._selection.setPosition.apply(
    this._selection, this._document.insertText(text, pos[0], pos[1])
  );
  this.render();
};
```

This is done in two stages because there are other scenarios besides direct input where we would want to insert something at current cursor position. Additionally due to a certain browser behavior we have to process `Enter` key inside our `keydown` handler and not here and we would want to reuse `insertTextAtCurrentPosition` like this:

```javascript
case 13: // Enter
  this.insertTextAtCurrentPosition('\n');
  break;
```

You may have also noticed a new `render` method. It's doesn't contain any new code — I just moved rendering loop from `_createCanvas` method into a separate one. At this point we should be able to insert text without any problems.

### Deleting text

Text removal is even easier than inserting. We just take start and end position, glue them together and remove everything in-between:

```javascript
this.storage[startRow] = this.storage[startRow].substr(0, startColumn) + 
                         this.storage[endRow].substr(endColumn);
this.storage.splice(startRow + 1, endRow - startRow);
```

The rest is just support stuff like checking for bounds. Here's full version of `deleteRange` methods on our `Document` class:

```javascript
Document.prototype.deleteRange = function(startColumn, startRow, endColumn, endRow) {

  // Check bounds
  startRow >= 0 || (startRow = 0);
  startColumn >= 0 || (startColumn = 0);
  endRow < this.storage.length || (endRow = this.storage.length - 1);
  endColumn <= this.storage[endRow].length || (
    endColumn = this.storage[endRow].length
  );

  // Little optimization that does nothing if there's nothing to delete
  if(startColumn === endColumn && startRow === endRow) {
    return [startColumn, startRow];
  }

  // Now we append start of start row to the remainder of endRow
  this.storage[startRow] = this.storage[startRow].substr(0, startColumn) + 
                           this.storage[endRow].substr(endColumn);

  // And remove everything in-between
  this.storage.splice(startRow + 1, endRow - startRow);

  // Return new position
  return [startColumn, startRow];
};
```

This method is cool and all but it doesn't help much with most common delete operations which are deleting one character forward or backward (usually done by `delete` and `backspace` keys). To handle that we create a wrapper method called `deleteChar` which calculates other side of the range from current cursor position when deleting a single character:

```javascript
Document.prototype.deleteChar = function(forward, startColumn, startRow) {
  var endRow = startRow,
      endColumn = startColumn;

  if (forward) {
    // If there are characters after cursor on this line we remove one
    if (startColumn < this.storage[startRow].trim('\n').length) {
      ++endColumn;
    }
    // if there are rows after this one we append it
    else if (startRow < this.storage.length - 1) {
      ++endRow;
      endColumn = 0;
    }
  }
  // Deleting backwards
  else {
    // If there are characters before the cursor on this line we remove one
    if (startColumn > 0) {
      --startColumn;
    }
    // if there are rows before we append current to previous one
    else if (startRow > 0) {
      --startRow;
      startColumn = this.storage[startRow].length - 1;
    }
  }

  return this.deleteRange(startColumn, startRow, endColumn, endRow);
};
```

Now we need a `deleteCharAtCurrentPosition` method that is similar to one we did for insertion:

```javascript
CanvasTextEditor.prototype.deleteCharAtCurrentPosition = function(forward) {
  var pos = this._selection.getPosition();
  // Deleting text and changing position of cursor to a new one
  this._selection.setPosition.apply(
    this._selection,
    this._document.deleteChar(forward, pos[0], pos[1])
  );
  this.render();
};
```

All that's left to do is to add to new keys to our `keydown` handler:

```javascript
case 8: // backspace
  this.deleteCharAtCurrentPosition(false);
  break;
case 46: // delete
  this.deleteCharAtCurrentPosition(true);
  break;
```

That's all – deletion should be working now.

### Summary

We now have ability insert (and paste from clipboard) and delete text. There's a live [demo page](http://grassator.github.com/canvas-text-editor/) that you can play with.

Source code for this part is available on [github](https://github.com/grassator/canvas-text-editor) under `part-6` tag.



<a name="part6"></a>

## Text selection

Now that we can use cursor and insert text it's time to tackle the most complex aspect of text editing – selection. Handling the selection can be split into two major parts that need to work together:

* calculations and adjustment of selection range within document;
* rendering selection highlight and handling user input.

I will show you how to implement code that handles both of this aspects.

### Selection range

Most of heavy lifting is going to be done inside `setPosition` method of a `Selection` class that we started to write in a [previous part](/web/writing-a-text-editor-part-6-text-insert-and-delete-operations/). This is the new version:

```javascript
Selection.prototype.setPosition = function(character, line, keepSelection) {

  var position = this._forceBounds(character, line);

  // Calling private methods that do the heavy lifting
  this._doSetPosition(position[0], position[1], keepSelection);
  this._updateCursorStyle();

  // Making a callback if necessary
  if (typeof this.onchange === 'function') {
    this.onchange(this, this.start, this.end);
  }
};
```

As you can see `setPosition` is now split into a couple of private functions because it has gotten quite big while writing this part and i had to refactor. Additionally there's a new parameter called `keepSelection` that determines if moving to a new position should keep one of the range edges (start or end) in place (extending selection) or move both of them (moving a cursor). `onchange` callback is going to be used by main editor class for and ability to copy selected text to the buffer.

`_updateCursorStyle` is just an excerpt from original `setPosition` that handles positioning of the cursor relative to the wrapper and it doesn't contain any new code. `_forceBounds` is an enhanced version of bounds control code that was in place in `setPosition` before that also handles ability to jump to next or previous line when moving cursor left or right at line edges. `_doSetPosition` is where all the magic happens:

```javascript
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
```

Here's what's happening here. Whenever you have a selection in a text editor it has an active side (edge) that will be moving when you move your cursor while holding down `shift` key and an opposite stationary side — this what the `activeEndSide` property is for.

`this.comparePosition` is a typical comparator that returns `-1` if first position is smaller than second one, `0` if they are equal and `1` if second is greater than the first therefore looking at the result of this function helps us determine direction . 

After we've determined currently active side we assign new values to it. Since we distinguish selection sides we also need to make sure start is always smaller than end in order for the rest of the logic to work.

This all for `setPosition`. Now the only other thing we need to add to `Selection` class is `keepSelection` parameter to our move helper functions like this:

```javascript
Selection.prototype.moveRight = function(length, keepSelection) {
  arguments.length || (length = 1);
  var position = this.getPosition();
  this.setPosition(position[0] + length, position[1], keepSelection);
};
```

### Rendering selection and handling user input

First of all we need to a way to determine if `shift` key is pressed at the moment because it is that key that determines whether we move cursor or create a selection. This quite simple – we just create a flag property called `shiftPressed` and keep it in sync with real state of `shift` key by listening to `keydown` and `keyup` events on the `document` object. So we just add subscribing code to the constructor:

```javascript
document.addEventListener('keydown', this.addKeyModifier.bind(this), true);
document.addEventListener('keyup', this.removeKeyModfier.bind(this), true);
```

And implement simple handlers:

```javascript
CanvasTextEditor.prototype.addKeyModifier = function(e) {
  if (e.keyCode === 16) {
    this.shiftPressed = true;
  }
};

CanvasTextEditor.prototype.removeKeyModfier = function(e) {
  if (e.keyCode === 16) {
    this.shiftPressed = false;
  }
};
```

Now we can update main keydown handler to make a selection whenever shift key is pressed:

```javascript
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
```

Since we are able to pass user input to the selection object, it's time to adjust the rendering loop to highlight selected range:

```javascript
var selectionRanges = this._selection.lineRanges();

// Looping over document lines
for(var i = 0; i < maxHeight; ++i) {
  var topOffset = lineHeight * i;

  // Rendering selection for this line if one is present
  if (selectionRanges[i]) {
    this.context.fillStyle = '#cce6ff';

    // Check whether we should select to the end of the line or not
    if(selectionRanges[i][1] === true) {
      selectionWidth = this.canvas.width;
    } else {
      selectionWidth = (selectionRanges[i][1] - selectionRanges[i][0]) *
                       characterWidth;
    }

    // Drawing selection
    this.context.fillRect(
      selectionRanges[i][0] * characterWidth,
      i * lineHeight,
      selectionWidth,
      lineHeight
    )

    // Restoring fill color for the text
    this.context.fillStyle = '#000';
  }

  // Drawing text
  this.context.fillText(
    this._document.getLine(i), 0, topOffset + baselineOffset
  );
}
```

We should re-render canvas on every selection change so we subscribe to `onchange` callback on our selection inside the `CanvasTextEditor` constructor:

```javascript
this._selection.onchange = this.selectionChange.bind(this);
```

Handler for selection change must do two things:

1. update contents of our proxy textarea with contents of the selection and make browser selection inside that textarea so that when user tries to copy selection to the buffer it will work as expected;
2. call `render` method.

Here's how it's done:

```javascript
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

  this.setInputText(selectedText, true);

  // Updating canvas to show selection
  this.render();
};
```

The implementation details of `setInputText` aren't really important because ideally it should just set value textarea to selected text and select everything inside but due to bugs in various browser code there is very obscure and won't help understanding overall picture in any way. There's a lot of other changes that had to be made in order to overcome problems of browser environment. I strongly encourage you to check out [source code](https://github.com/grassator/canvas-text-editor) to better understand inner workings of the editor.

### Summary

If you want to see the latest version of the editor in action – visit a live [demo page](http://grassator.github.com/canvas-text-editor/).

Please note that code for this part also contains a lot of fixes for compatibility issues in Opera and Firefox that made text editor previously unusable there.

Source code for this part is available on [github](https://github.com/grassator/canvas-text-editor) under `part-7` tag.


<a name="part7"></a>

## Simple scroll

The only thing left that keeps editor from doing all the things it should is lack of ability to scroll contents when they don't fit into the view. Let's implement a simple console-style scroll that just always keeps cursor incised visible area.

We are going to start by adding two private properties with getters for scroll offsets:

```javascript
CanvasTextEditor.prototype._scrollTop = 0;
CanvasTextEditor.prototype._scrollLeft = 0;
CanvasTextEditor.prototype.scrollTop = function() {
  return this._scrollTop;
};
CanvasTextEditor.prototype.scrollLeft = function() {
  return this._scrollLeft;
};
```

Now we need to change the code that renders the cursor so it's aware of possible scroll:

```javascript
Selection.prototype.updateCursorStyle = function() {
  // Calculating new position on the screen
  var metrics = this.editor.getFontMetrics(),
      position = this.getPosition(),
      offsetX = (position[0] - this.editor.scrollLeft()) * metrics.getWidth(),
      offsetY = (position[1] - this.editor.scrollTop()) * metrics.getHeight();
```

Basically here we are just subtracting scroll offset from real cursor position when rendering it. It's also necessary to remove call to `updateCursorStyle` from `setPosition` because scroll will be calculated in `CanvasTextEditor` class upon cursor change by calling a private function that will do the calculation inside our `selectionChange` handler in main editor class:

```javascript
this._checkScroll();
this.setInputText(selectedText, true);

// Updating canvas to show selection
this.render();
```

And here's the implementation of `_checkScroll` which is pretty straightforward — we just calculate bounds based on canvas size and make sure cursor is visible. After that we update it's position on the screen by calling `updateCursorStyle` selection method:

```javascript
CanvasTextEditor.prototype._checkScroll = function() {
  var maxHeight = Math.ceil(this.canvas.height / this._metrics.getHeight()) - 1,
      maxWidth = Math.ceil(this.canvas.width / this._metrics.getWidth()) - 1,
      cursorPosition = this._selection.getPosition();
  // Horizontal bounds
  if (cursorPosition[0] > this._scrollLeft + maxWidth ) {
    this._scrollLeft = cursorPosition[0] - maxWidth;
  } else if (cursorPosition[0] < this._scrollLeft) {
    this._scrollLeft = cursorPosition[0];
  }
  // Vertical bounds
  if (cursorPosition[1] > this._scrollTop + maxHeight) {
    this._scrollTop = cursorPosition[1] - maxHeight;
  } else if (cursorPosition[1] < this._scrollTop) {
    this._scrollTop = cursorPosition[1];
  }
  this._selection.updateCursorStyle();
};
```

The only thing left is adjust a render loop a little bit by making sure we respect scroll offset when choosing lines to start from and also making a slice of the document string from necessary position. I've marked changed lines with comments with arrows:

```javascript
CanvasTextEditor.prototype.render = function() {
  var baselineOffset = this._metrics.getBaseline(),
      lineHeight = this._metrics.getHeight(),
      characterWidth = this._metrics.getWidth(),
      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ v
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
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ v
    var topOffset = lineHeight * (i - this._scrollTop);

    // Rendering selection for this line if one is present
    if (selectionRanges[i]) {
      this.context.fillStyle = this.options.selectionColor;

      // Check whether we should select to the end of the line or not
      if(selectionRanges[i][1] === true) {
        selectionWidth = this.canvas.width;
      } else {
        selectionWidth = (selectionRanges[i][1] - selectionRanges[i][0]) * 
                         characterWidth;
      }

      // Drawing selection
      this.context.fillRect(
        // ~~~~~~~~~~~~~~~~~~~~~~ v
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
      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ v
      this._document.getLine(i).slice(this._scrollLeft), 0, topOffset + baselineOffset
    );
  }
};
```

### Summary

That's it, we now have simple but fully functional scroll. If you want to see it in action – visit a live [demo page](http://grassator.github.com/canvas-text-editor/).

Source code for this part is available on [github](https://github.com/grassator/canvas-text-editor) under `part-8` tag.

## Afterword

At this point all the major parts are working properly, all that's left is UI and probably some refactoring and optimization and both of these things are very project and platform specific. If you have any questions on specific issues or you notice a bug in the code, please don't hesitate to contact me.
