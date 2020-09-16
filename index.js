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
  // Timing
  const timeStart = Date.now();

  // Results
  let protocol = null;
  let domain = null;
  let path = null;
  let queryPart = null;
  let fragment = null;

  let scanPos = 0;
  let map = [];

  const eatTill = (str, tag) => {
    const index = text.substring(scanPos).indexOf(str);
    if (index == -1) throw new Error(`Expected to find an occurance of '${str}'`);

    const result = text.substring(scanPos, scanPos + index);

    map.push([scanPos, scanPos + index - 1, tag]);
    scanPos += index;

    return result;
  }

  const eat = (str, tag) => {
    if (!text.substring(scanPos).startsWith(str)) throw new Error(`Cannot eat because expected to find '${str}'`);

    map.push([scanPos, scanPos + str.length - 1, tag]);
    scanPos += str.length;
  }

  const eatAll = (tag) => {
    const value = text.substring(scanPos);

    map.push([scanPos, text.length - 1, tag]);
    scanPos = text.length;

    return value;
  }

  const has = (str) => {
    return text.substring(scanPos).includes(str);
  }

  // Actual parsing grammar
  try {
    protocol = eatTill("://", "PROTOCOL");
    eat("://", "TEXT");

    domain = eatTill("/", "DOMAIN");
    eat("/", "TEXT");
    
    if (has("?")) {
      path = eatTill("?", "PATH");

      eat("?", "TEXT");

      if (has("#")) {
        queryPart = eatTill("#", "QUERY");

        eat("#", "TEXT");

        fragment = eatAll("FRAGMENT");
      } else {
        queryPart = eatAll("QUERY");
      }
    } else {
      if (has("#")) {
        path = eatTill("#", "PATH");

        fragment = eatAll("FRAGMENT");
      } else {
        path = eatAll("PATH");
      }
    }
    
    eatAll("TEXT");

    parseErrors = null;
  } catch (e) {
    parseErrors = e;
    eatAll("TEXT");
  }


  // Timing
  parseTime = Date.now() - timeStart;

  return {
    protocol,
    domain,
    queryPart,
    fragment,
    map
  }
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

  const output = parseData.map.map(([start, end, protocol]) => {
    return `<span class='highlight highlight-${protocol}'>${fixedText.substring(start, end + 1)}</span>`
  })

  return output.join('');
}

updateEditor();
