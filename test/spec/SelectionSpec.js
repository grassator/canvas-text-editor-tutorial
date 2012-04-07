describe("Selection", function() {
  var CanvasTextEditor = require('CanvasTextEditor'),
      Document = require('Document'),
      testText = 'Line1\nLine2\nLine3',
      selection;

  beforeEach(function(){
    selection = (new CanvasTextEditor(new Document(testText))).getSelection();
  });

  it("should be possible to move cursor", function() {
    var pos = selection.getPosition();
    // Initial position
    expect(pos[0]).toEqual(0);
    expect(pos[1]).toEqual(0);

    // Moving in all directions clockwise
    selection.moveRight(1);
    pos = selection.getPosition();
    expect(pos[0]).toEqual(1);
    expect(pos[1]).toEqual(0);

    selection.moveDown(1);
    pos = selection.getPosition();
    expect(pos[0]).toEqual(1);
    expect(pos[1]).toEqual(1);

    selection.moveLeft(1);
    pos = selection.getPosition();
    expect(pos[0]).toEqual(0);
    expect(pos[1]).toEqual(1);
  });

  it("should respect document bounds", function() {
    selection.moveUp(1);
    var pos = selection.getPosition();
    expect(pos[0]).toEqual(0);
    expect(pos[1]).toEqual(0);

    selection.moveLeft(1);
    pos = selection.getPosition();
    expect(pos[0]).toEqual(0);
    expect(pos[1]).toEqual(0);
  });

  it("should wrap from one line to another when moving left or right", function(){
    selection.moveDown(1);
    selection.moveLeft(1);
    var pos = selection.getPosition();
    expect(pos[0]).toEqual(5);
    expect(pos[1]).toEqual(0);

    selection.moveRight(1);
    pos = selection.getPosition();
    expect(pos[0]).toEqual(0);
    expect(pos[1]).toEqual(1);
  });

  it("should support text selection", function(){
    selection.moveRight(1);
    selection.moveRight(2, true);
    var ranges = selection.lineRanges();
    expect(ranges[0][0]).toEqual(1);
    expect(ranges[0][1]).toEqual(3);

    selection.moveDown(1, true);
    ranges = selection.lineRanges();
    expect(ranges[1][0]).toEqual(0);
    expect(ranges[1][1]).toEqual(3);

    selection.moveLeft(3, true);
    ranges = selection.lineRanges();
    expect(ranges[1][0]).toEqual(0);
    expect(ranges[1][1]).toEqual(0);

    selection.moveLeft(1, true);
    ranges = selection.lineRanges();
    expect(ranges[0][0]).toEqual(1);
    expect(ranges[0][1]).toEqual(5);
  });

});