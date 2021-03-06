let parseTime = 0;
let renderTime = 0;
let parsedData = {};
let parseErrors = null;

const timings = document.getElementById("timings");
const data = document.getElementById("parseData");
const editor = document.getElementById('editor');
const selectionOutput = document.getElementById('selection');
const errors = document.getElementById("errors");

function parseURL(text) {
  const timeBegin = Date.now();

  const map = [];
  const regex = /<<\w+>>/;

  let match;
  let index = 0;
  while (match = text.substring(index).match(regex)) {
    map.push([index, index + (match.index - 1), 'TEXT']);
    map.push([index + match.index, index + match.index + match[0].length - 1, 'VAR']);
    index += match.index + match[0].length;

    if (index >= text.length - 1) break;
  }

  if (text.length > index && !text.substring(index).match(regex)) {
    map.push([index, text.length, 'TEXT']);
  }

  parseTime = Date.now() - timeBegin;

  parsedData = map;
  return { map };
}


function getTextSegments(element) {
    const textSegments = [];
    Array.from(element.childNodes).forEach((node) => {
        switch(node.nodeType) {
            case Node.TEXT_NODE:
                textSegments.push({text: node.nodeValue, node});
                break;
                
            case Node.ELEMENT_NODE:
                textSegments.splice(textSegments.length, 0, ...(getTextSegments(node)));
                break;
                
            default:
                throw new Error(`Unexpected node type: ${node.nodeType}`);
        }
    });
    return textSegments;
}

editor.addEventListener('input', updateEditor);

function updateEditor() {
    const timeStart = Date.now();


    const sel = window.getSelection();
    const textSegments = getTextSegments(editor);
    const textContent = textSegments.map(({text}) => text).join('');
    let anchorIndex = null;
    let focusIndex = null;
    let currentIndex = 0;
    textSegments.forEach(({text, node}) => {
        if (node === sel.anchorNode) {
            anchorIndex = currentIndex + sel.anchorOffset;
        }
        if (node === sel.focusNode) {
            focusIndex = currentIndex + sel.focusOffset;
        }
        currentIndex += text.length;
    });
    
    editor.innerHTML = renderText(textContent);
    
    restoreSelection(anchorIndex, focusIndex);

    renderTime = Date.now() - timeStart;

    renderDebugging();
}

function renderDebugging() {
  timings.textContent = `Parsing: ${parseTime}ms | Render: ${renderTime - parseTime}ms | Total: ${renderTime}ms`;
  data.textContent = JSON.stringify(parsedData, null, 4);
  errors.textContent = parseErrors ? parseErrors : "";
}

function restoreSelection(absoluteAnchorIndex, absoluteFocusIndex) {
    const sel = window.getSelection();
    const textSegments = getTextSegments(editor);
    let anchorNode = editor;
    let anchorIndex = 0;
    let focusNode = editor;
    let focusIndex = 0;
    let currentIndex = 0;
    textSegments.forEach(({text, node}) => {
        const startIndexOfNode = currentIndex;
        const endIndexOfNode = startIndexOfNode + text.length;
        if (startIndexOfNode <= absoluteAnchorIndex && absoluteAnchorIndex <= endIndexOfNode) {
            anchorNode = node;
            anchorIndex = absoluteAnchorIndex - startIndexOfNode;
        }
        if (startIndexOfNode <= absoluteFocusIndex && absoluteFocusIndex <= endIndexOfNode) {
            focusNode = node;
            focusIndex = absoluteFocusIndex - startIndexOfNode;
        }
        currentIndex += text.length;
    });
    
    sel.setBaseAndExtent(anchorNode,anchorIndex,focusNode,focusIndex);
}

function renderText(text) {
  const fixedText = text.replace(/(\r\n|\n|\r)/gm, "").trim();
  const parseData = parseURL(fixedText);

  parsedData = parseData;

  const convertSpan = document.createElement('span');
  
  const output = parseData.map.map(([start, end, protocol]) => {

    convertSpan.textContent = fixedText.substring(start, end + 1);
    console.log(convertSpan.innerHTML);
    return `<span class='highlight-${protocol}'>${convertSpan.innerHTML}</span>`;
  })

  return output.join('');
}

updateEditor();
