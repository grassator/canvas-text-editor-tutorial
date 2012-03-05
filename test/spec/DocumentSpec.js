describe("CanvasTextEditor", function() {
  var Document = require('Document');
  var testText = 'Line1\n\nLine3\nLine4'

  it("should have static method for parsing text into array of lines", function() {
    var lines = Document.prepareText(testText);
    expect(lines.length).toEqual(4);
    expect(lines[0]).toEqual('Line1\n');
    expect(lines[1]).toEqual('\n');
    expect(lines[2]).toEqual('Line3\n');
    expect(lines[3]).toEqual('Line4');
  });

  it("should support getting lines and characters at positions", function(){
    var doc = new Document(testText);

    expect(doc.getLineCount()).toEqual(4);
    expect(doc.charAt(0,2)).toEqual('L');
    expect(doc.charAt(4,2)).toEqual('3');
    expect(doc.charAt(100,2)).toBeFalsy();

    expect(doc.getLine(3)).toEqual('Line4');
    expect(doc.getLine(4)).toBeFalsy();
  });

});