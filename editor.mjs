import Split from 'split.js';
import { format } from "prettier/standalone";
import htmlPlugin from "prettier/plugins/html";
import cssPlugin from "prettier/plugins/postcss";
import babelPlugin from "prettier/plugins/babel";
import estreePlugin from "prettier/plugins/estree";

import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { indentWithTab } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import { indentUnit } from "@codemirror/language";
import { acceptCompletion } from "@codemirror/autocomplete";
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';

const fixedHeightEditor = EditorView.theme({
    "&": { height: "100%", width: "100%" },
    ".cm-scroller": { overflow: "auto" }
});

function createEditor(parentId, langExtension) {
    return new EditorView({
        extensions: [
            basicSetup,
            keymap.of([{ key: "Tab", run: acceptCompletion }, indentWithTab]),
            langExtension,
            oneDark,
            fixedHeightEditor,
            indentUnit.of("    "),
            EditorView.updateListener.of(handleEditorChange),
            EditorView.lineWrapping,
        ],
        parent: document.getElementById(parentId),
    });
}

const editors = {
    editor: createEditor("editor", html()),
    cssEditor: createEditor("cssEditor", css()),
    jsEditor: createEditor("jsEditor", javascript()),
    chatMD: createEditor("chatMDEditor", markdown({ codeLanguages: languages })),
};

Object.values(editors).forEach(e => e.dom.style.display = "none");
document.getElementById("editor").style.display = "block";

const buttons = [
    { buttonId: "HTMLFileTab", order: ["editor", "cssEditor", "jsEditor", "chatMDEditor"] },
    { buttonId: "CSSFileTab", order: ["cssEditor", "editor", "jsEditor", "chatMDEditor"] },
    { buttonId: "JSFileTab", order: ["jsEditor", "cssEditor", "editor", "chatMDEditor"] },
    { buttonId: "chatMDTab", order: ["chatMDEditor", "editor", "cssEditor", "jsEditor"] },
];

function setButtonEvents(buttons) {
    buttons.forEach(({ buttonId, order }) => {
        const button = document.getElementById(buttonId);
        button.addEventListener("click", () => {
            buttons.forEach(({ buttonId }) => document.getElementById(buttonId).classList.remove("selected"));
            button.classList.add("selected");
            order.forEach((id, idx) => document.getElementById(id).style.display = idx === 0 ? "block" : "none");
        });
    });
}

setButtonEvents(buttons);

async function fetchText(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Network response was not ok for ${url}`);
    return response.text();
}

function initializeClipboard() {
    document.getElementById("CopyAsMarkdown").addEventListener("click", () => {
        const markdownContent = `
# HTML, CSS, and JavaScript Code Files

Below are the full code contents for each file in our web project:

---

## HTML File: \`index.html\`

\`\`\`html
${editors.editor.state.doc}
\`\`\`

---

## CSS File: \`style.css\`

\`\`\`css
${editors.cssEditor.state.doc}
\`\`\`

---

## JavaScript File: \`script.js\`

\`\`\`javascript
${editors.jsEditor.state.doc}
\`\`\``;

        navigator.clipboard.writeText(markdownContent).then(() => {
            console.log("Copied to clipboard");
        }).catch(err => {
            console.error("Failed to copy: ", err);
        });
    });

    document.getElementById("GetFromMarkdownCodeblock").addEventListener("click", () => {
        navigator.clipboard.readText().then(text => {
            const htmlContent = extractCodeBlockMD(text, "html");
            const cssContent = extractCodeBlockMD(text, "css");
            const jsContent = extractCodeBlockMD(text, "javascript");
            console.log(htmlContent, cssContent, jsContent);
            setEditorContent(htmlContent, cssContent, jsContent);
            saveToLocalStorage(htmlContent, cssContent, jsContent);
            handleEditorChange({ docChanged: true });
        }).catch(err => {
            console.error("Failed to read clipboard: ", err);
        });
    });
}

function extractCodeBlockMD(text, language) {
    const regex = new RegExp(`\`\`\`${language}\\n([\\s\\S]*?)\\n\`\`\``, 'im');
    const match = text.match(regex);
    return match ? match[1] : null;
}

document.getElementById("Download").addEventListener("click", async () => {
    const htmlContent = editors.editor.state.doc.toString().replace(/ contenteditable="true"/g, "");
    const cssContent = editors.cssEditor.state.doc.toString();
    const jsContent = editors.jsEditor.state.doc.toString();

    const zipFileWriter = new BlobWriter();
    const files = [
        { name: 'index.html', content: htmlContent, type: "text/html" },
        { name: 'style.css', content: cssContent, type: "text/css" },
        { name: 'script.js', content: jsContent, type: "text/javascript" }
    ];

    for (const { name, content, type } of files) {
        await new ZipWriter(zipFileWriter).add(name, new TextReader(new Blob([content], { type })));
    }

    const zipBlob = await zipFileWriter.getData();
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "project.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log("Download complete");
});

let isSynchronizing = false;

function setPreviewContent(content, cssContent, jsContent) {
    if (isSynchronizing) return;
    isSynchronizing = true;
    const cssBlob = new Blob([cssContent], { type: "text/css" });
    const jsBlob = new Blob([jsContent], { type: "text/javascript" });
    const cssUrl = URL.createObjectURL(cssBlob);
    const jsUrl = URL.createObjectURL(jsBlob);
    const cssRegex = /<link\s+rel=["']stylesheet["']\s+href=["'][^"']*["'][^>]*>/gi;
    const scriptRegex = /<script\s+src=["'][^"']*["'][^>]*><\/script>/gi;
    const processedContent = content
        .replace(cssRegex, `<link rel="stylesheet" href="${cssUrl}">`)
        .replace(scriptRegex, `<script src="${jsUrl}"></script>`);

    const blob = new Blob([processedContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const previewFrame = document.getElementById("previewFrame");
    previewFrame.src = url;
    previewFrame.onload = () => {
        const livePreview = previewFrame.contentDocument || previewFrame.contentWindow.document;
        livePreview.body.contentEditable = true;
        livePreview.body.addEventListener("input", handleLivePreviewChange);
        livePreview.body.addEventListener("contextmenu", handleContextMenu);
    };
    isSynchronizing = false;
}

function setEditorContent(html, css, js) {
    if (isSynchronizing) return;
    isSynchronizing = true;
    editors.editor.dispatch({
        changes: { from: 0, to: editors.editor.state.doc.length, insert: html }
    });
    editors.cssEditor.dispatch({
        changes: { from: 0, to: editors.cssEditor.state.doc.length, insert: css }
    });
    editors.jsEditor.dispatch({
        changes: { from: 0, to: editors.jsEditor.state.doc.length, insert: js }
    });
    isSynchronizing = false;
}

function saveToLocalStorage(htmlContent, cssContent, jsContent) {
    localStorage.setItem("savedHTML", htmlContent);
    localStorage.setItem("savedCSS", cssContent);
    localStorage.setItem("savedJS", jsContent);
}

function loadFromLocalStorage() {
    return {
        html: localStorage.getItem("savedHTML") || "",
        css: localStorage.getItem("savedCSS") || "",
        js: localStorage.getItem("savedJS") || ""
    };
}

function prettifyContent(content, parser) {
    return format(content, {
        parser,
        plugins: [htmlPlugin, cssPlugin, babelPlugin, estreePlugin],
        tabWidth: 4,
    });
}

function handleEditorChange(update) {
    if (!update.docChanged || isSynchronizing) return;
    const doc = editors.editor.state.doc.toString();
    const jsDoc = editors.jsEditor.state.doc.toString();
    const cssDoc = editors.cssEditor.state.doc.toString();
    if (update.view === editors.chatMD) {
        //console.log("ChatMD editor changed");
        const markdownContent = editors.chatMD.state.doc.toString();
        if (!markdownContent) return;
        if (markdownContent.endsWith(">go")) {
            processOpenAIChatResponse(markdownContent, { doc, cssDoc, jsDoc });
        }
        return;
    }

    Object.assign(currentStrings, { html: doc, css: cssDoc, js: jsDoc });

    setPreviewContent(doc, cssDoc, jsDoc);
    saveToLocalStorage(doc, cssDoc, jsDoc);
}

const currentStrings = {
    html: editors.editor.state.doc.toString(),
    css: editors.cssEditor.state.doc.toString(),
    js: editors.jsEditor.state.doc.toString()
};

async function handleLivePreviewChange() {
    if (isSynchronizing) return;

    const iframe = document.getElementById("previewFrame");
    const livePreviewDoc = iframe.contentDocument || iframe.contentWindow.document;
    const cssRegex = /<link\s+rel=["']stylesheet["']\s+href=["'][^"']*["'][^>]*>/gi;
    const scriptRegex = /<script\s+src=["'][^"']*["'][^>]*><\/script>/gi;
    const htmlContent = "<!DOCTYPE html>\n" + livePreviewDoc.documentElement.outerHTML
        .replace(/ contenteditable="true"/g, "")
        .replace(cssRegex, `<link rel="stylesheet" href="style.css">`)
        .replace(scriptRegex, `<script src="script.js"></script>`);

    const cssContent = currentStrings.css;
    const jsContent = currentStrings.js;

    const formattedContent = await prettifyContent(htmlContent, "html");
    const formattedCSS = await prettifyContent(cssContent, "css");
    const formattedJS = await prettifyContent(jsContent, "babel");
    setEditorContent(formattedContent, formattedCSS, formattedJS);
    saveToLocalStorage(formattedContent, formattedCSS, formattedJS);
}

function handleContextMenu(event) {
    event.preventDefault();
    const iframe = document.getElementById("previewFrame");
    const livePreviewDoc = iframe.contentDocument || iframe.contentWindow.document;
    const editMenu = document.getElementById('contextMenu');
    if (event.target === livePreviewDoc.body) {
        editMenu.style.display = 'none';
        return;
    }

    const { left, top } = iframe.getBoundingClientRect();
    editMenu.style.display = 'block';
    editMenu.style.left = `${event.pageX + left}px`;
    editMenu.style.top = `${event.pageY + top}px`;

    document.addEventListener('click', () => editMenu.style.display = 'none', { once: true });
    livePreviewDoc.body.addEventListener('click', () => editMenu.style.display = 'none', { once: true });

    const targetElement = event.target;
    const [removeOption, editOption, changeTagOption, classNameLi] = editMenu.querySelectorAll('li');
    removeOption.onclick = () => targetElement.remove() & handleLivePreviewChange();

    const setupInput = (listItem, currentValue, setAttr) => {
        const input = listItem.querySelector('input');
        input.value = "";
        input.onclick = (e) => (e.stopPropagation(), input.value = currentValue, input.select());
        input.onchange = () => (setAttr(input.value), handleLivePreviewChange(), editMenu.style.display = 'none');
    };

    setupInput(editOption, targetElement.outerHTML, newValue => targetElement.outerHTML = newValue);
    setupInput(changeTagOption, targetElement.tagName.toLowerCase(), newValue => {
        const newElem = document.createElement(newValue);
        Array.from(targetElement.attributes).forEach(attr => newElem.setAttribute(attr.name, attr.value));
        newElem.innerHTML = targetElement.innerHTML;
        targetElement.parentNode.replaceChild(newElem, targetElement);
    });
    setupInput(classNameLi, targetElement.className, newValue => targetElement.className = newValue);
}

/**
 * Flag indicating if an OpenAI response is currently being processed.
 * @type {boolean}
 */
let isProcessingOpenAIResponse = false;

/**
 * Updates the content of the chat markdown editor.
 *
 * @param {Object} chatMD - The markdown editor instance.
 * @param {string} content - The content to set in the editor.
 */
function updateEditorContent(chatMD, content) {
    chatMD.dispatch({
        changes: {
            from: 0,
            to: chatMD.state.doc.length,
            insert: content
        }
    });
}

/**
 * Parses the settings from the given parts array.
 *
 * @param {string[]} parts - An array containing parts of the markdown content.
 * @returns {Object} The parsed settings object.
 */
function parseSettings(parts) {
    try {
        return JSON.parse(parts[0].trim());
    } catch {
        try {
            return { apiKey: parts[0].trim() }; // Treat as apiKey if parsing fails
        } catch (error) {
            return { apiKey: null }; // Default to null if parsing fails
        }
    }
}

/**
 * Prepares options for the OpenAI API request by extracting and validating settings.
 *
 * @param {Object} rawSettings - The raw settings object.
 * @returns {Object} An object containing API key and processed options.
 */
function prepareOptions(rawSettings) {
    const options = { ...rawSettings };
    const apiKey = options.apiKey;
    return { apiKey, options };
}

/**
 * Prepares chat messages from the given parts array.
 *
 * @param {string[]} parts - An array containing parts of the markdown content.
 * @returns {Array<Object>} An array of message objects with role and content.
 */
const prepareMessages = (parts) => {
    return parts.slice(1).map(text => {
        const [role, ...content] = text.split(/\n/);
        return { role: role.toLowerCase(), content: content.join("\n").trim() };
    });
}

/**
 * Processes an OpenAI chat response, updating the editor with the results.
 * It manages API communication and handles settings and message preparations.
 *
 * @param {string} markdownContent - The markdown content from the editor containing the prompt and settings.
 * @param {Object} editorsContent - An object containing HTML, CSS, and JS content for dynamic replacements in prompts.
 * @returns {void}
 */
function processOpenAIChatResponse(markdownContent, editorsContent) {
    if (isProcessingOpenAIResponse) return;
    isProcessingOpenAIResponse = true;

    // Remove the trailing '>go' from the markdown input content.
    const prompt = markdownContent.slice(0, -3);
    const { chatMD } = editors;

    // Update the editor to reflect that processing has started.
    updateEditorContent(chatMD, prompt + "Working...");

    // Separate sections based on roles for processing.
    const parts = prompt.split(/^# role: (?=system|user|assistant|developer)/im);

    // Parse settings from the markdown content parts.
    const rawSettings = parseSettings(parts);
    const { apiKey, options } = prepareOptions(rawSettings);

    console.log("API Key:", apiKey);

    // Set default API options if not present.
    options.model = options.model || "gpt-4o";
    options.max_tokens = options.max_tokens || 2000;
    options.messages = prepareMessages(parts);
    if (!apiKey) {
        // If there's no API key, prompt the user to provide one.
        const fullChat = [
            ...options.messages,
            { role: "assistant", content: "Please provide an apiKey put it right before the system prompt." },
            { role: "user", content: "\n" }
        ];
        delete options.messages;
        const updatedMarkdown = `${JSON.stringify(options, null, 4)}\n${fullChat.map(m => `# role: ${m.role}\n${m.content}`).join("\n")}`;
        updateEditorContent(chatMD, updatedMarkdown);
        isProcessingOpenAIResponse = false;
        return;
    }

    // Prepare options for the API request.
    const optionsToSend = { ...options };
    optionsToSend.messages = options.messages.map(m => {
        if (m.role === "user") {
            // Perform dynamic replacements in user content.
            const regex = /!\[\[(.*?)\]\]/g;
            const replacements = {
                "index.html": "\nindex.html\n```html\n" + editorsContent.doc + "\n```\n",
                "style.css": "\nstyle.css\n```css\n" + editorsContent.cssDoc + "\n```\n",
                "script.js": "\nscript.js\n```javascript\n" + editorsContent.jsDoc + "\n```\n"
            };
            return {
                role: m.role,
                content: m.content.replace(regex, (match, p1) => {
                    const fileName = p1.trim();
                    return replacements[fileName] || match;
                })
            };
        }
        return m;
    });

    // Remove sensitive or unnecessary data before sending.
    delete optionsToSend.apiKey;
    delete optionsToSend.availableModels;

    // Retrieve available models then proceed with API requests.
    listAvailableModels(apiKey).then(availableModels => {
        console.log("Using settings:", options);

        fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(optionsToSend)
        })
            .then(res => res.ok ? res.json() : Promise.reject(`Network error: ${res.statusText}`))
            .then(data => {
                const content = data.choices[0].message.content;
                const fullChat = [...options.messages, { role: "assistant", content }, { role: "user", content: "\n" }];

                // Update available models and rebuild markdown content.
                delete options.messages;
                options.availableModels = availableModels;

                const updatedMarkdown = `${JSON.stringify(options, null, 4)}\n${fullChat.map(m => `# role: ${m.role}\n${m.content}`).join("\n")}`;
                updateEditorContent(chatMD, updatedMarkdown);

                // Save state for future reference.
                localStorage.setItem("savedChatMD", updatedMarkdown);
                console.log("ChatMD updated");
                isProcessingOpenAIResponse = false;
            })
            .catch(err => {
                console.error("OpenAI API error:", err);
                alert("OpenAI API error: " + err);
                isProcessingOpenAIResponse = false;
            });
    });
}


/**
 * Fetches a list of available models from the OpenAI API.
 *
 * @param {string} apiKey - The API key for authentication with OpenAI.
 * @returns {Promise<string[]>} A promise that resolves to an array of available model IDs.
 */
async function listAvailableModels(apiKey) {
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const excludedPrefixes = ["dall-e", "whisper", "tts", "text-embedding", "code-embedding", "omni-mod"];

        const availableModels = data.data
            .map(model => model.id)
            .filter(model => {
                const keepBySuffix = model.endsWith("mini") || model.endsWith("turbo");
                const isNotSubModel = !data.data.some(otherModel => model.startsWith(otherModel.id) && otherModel.id !== model);
                const isNotExcluded = !excludedPrefixes.some(prefix => model.startsWith(prefix));

                return (keepBySuffix || isNotSubModel) && isNotExcluded;
            });

        return availableModels;
    } catch (error) {
        console.error('Error fetching available models:', error);
    }
}




function initialize() {
    if (localStorage.getItem("savedHTML")) {
        const { html, css, js } = loadFromLocalStorage();
        //const [savedContent, savedCSS, savedJS] = ['savedHTML', 'savedCSS', 'savedJS'].map(item => localStorage.getItem(item));
        const markdownChat = localStorage.getItem("savedChatMD");
        if (markdownChat) {
            editors.chatMD.dispatch({
                changes: { from: 0, to: editors.chatMD.state.doc.length, insert: markdownChat }
            });
        }
        setEditorContent(html, css, js);
        handleEditorChange({ docChanged: true });
    } else {
        (async () => {
            const markdownTemplate = await fetchText("HTMLTemplate.md");
            const htmlTemplate = extractCodeBlockMD(markdownTemplate, "html");
            const cssTemplate = extractCodeBlockMD(markdownTemplate, "css");
            const jsTemplate = extractCodeBlockMD(markdownTemplate, "javascript");
            setEditorContent(htmlTemplate, cssTemplate, jsTemplate);
            handleEditorChange({ docChanged: true });
        })();
    }
}

Split(['#editors', '#preview'], {
    sizes: [50, 50],
    direction: 'vertical',
    minSize: 100,
    gutterSize: 20,
});

initializeClipboard();
initialize();

export { editors };
