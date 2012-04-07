describe("Document", function() {
  var Document = require('Document'),
      testText = 'Line1\n\nLine3\nLine4',
      doc = null;

  beforeEach(function () {
    doc = new Document(testText);
  });

  it("should have static method for parsing text into array of lines", function() {
    var lines = Document.prepareText(testText);
    expect(lines.length).toEqual(4);
    expect(lines[0]).toEqual('Line1\n');
    expect(lines[1]).toEqual('\n');
    expect(lines[2]).toEqual('Line3\n');
    expect(lines[3]).toEqual('Line4');
  });

  it("should support getting lines and characters at positions", function(){
    expect(doc.getLineCount()).toEqual(4);
    expect(doc.charAt(0,2)).toEqual('L');
    expect(doc.charAt(4,2)).toEqual('3');
    expect(doc.charAt(100,2)).toBeFalsy();

    expect(doc.getLine(3)).toEqual('Line4');
    expect(doc.getLine(4)).toBeFalsy();
  });

  it("should support deleting one character forward", function() {
    // Regular delete
    doc.deleteChar(true, 0, 2);
    expect(doc.getLine(2)).toEqual('ine3\n');

    // Delete line break
    doc.deleteChar(true, 6, 2);
    expect(doc.getLine(2)).toEqual('ine3Line4');
  });

  it("should support deleting one character backward", function() {
    // Outside of bounds
    doc.deleteChar(false, 6, 3);
    expect(doc.getLine(3)).toEqual('Line4');

    // Regular delete
    doc.deleteChar(false, 5, 3);
    expect(doc.getLine(3)).toEqual('Line');

    // Delete line break
    doc.deleteChar(false, 0, 3);
    expect(doc.getLine(2)).toEqual('Line3Line');
  });

  it("should support deleting character range", function() {
    doc.deleteRange(2, 2, 1, 3);
    expect(doc.getLine(2)).toEqual('Liine4');
  });

  it("should support inserting text", function() {
    // Empty line
    doc.insertText('', 1, 0);
    expect(doc.getLine(0)).toEqual('Line1\n');

    // Single character
    doc.insertText('$', 1, 0);
    expect(doc.getLine(0)).toEqual('L$ine1\n');

    // Single line break
    doc.insertText('\n', 1, 0);
    expect(doc.getLine(0)).toEqual('L\n');
    expect(doc.getLine(1)).toEqual('$ine1\n');

    // Complex text with line breaks
    doc.insertText('a\n\nb', 1, 0);
    expect(doc.getLine(0)).toEqual('La\n');
    expect(doc.getLine(1)).toEqual('\n');
    expect(doc.getLine(2)).toEqual('b\n');
  });

});