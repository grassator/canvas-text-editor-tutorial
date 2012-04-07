describe("CanvasTextEditor", function() {
  var CanvasTextEditor = require('CanvasTextEditor'),
      editor;

  beforeEach(function(){
    editor = new CanvasTextEditor;
  });

  it("should be possible to instatiate", function() {
    expect(editor).toBeTruthy();
  });

  it("should be possible to get current document", function(){
    expect(editor.getDocument()).toBeTruthy();
  });
});