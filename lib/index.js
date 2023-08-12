import CanvasTextEditor from "./CanvasTextEditor.js";
import Document from "./Document.js";

document.addEventListener(
  "DOMContentLoaded",
  function () {
    var text = "",
      characterCount = 0,
      aCharCode = "a".charCodeAt(0);
    for (var i = 0; i < 100; i++) {
      characterCount = Math.floor(Math.random() * 120);
      for (var j = 0; j < characterCount; j++) {
        text += String.fromCharCode(aCharCode + Math.floor(Math.random() * 26));
      }
      text += "\n";
    }
    var doc = new Document(text),
        editor = new CanvasTextEditor(doc);
    document.body.appendChild(editor.getEl());
    editor.focus();
  },
  false
);
