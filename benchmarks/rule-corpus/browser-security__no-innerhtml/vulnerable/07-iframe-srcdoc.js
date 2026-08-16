/**
 * VULNERABLE - srcdoc is a full HTML document parsed in the frame.
 */
const preview = document.createElement('iframe');
preview.srcdoc = editorContents;
document.body.append(preview);
