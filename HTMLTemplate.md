
index.html
```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="style.css" />
        <title>Enhanced Template</title>
    </head>
    <body>
        <header>
            <h1>Hello, World!</h1>
        </header>
        <main>
            <p>This is a live preview of your HTML code.</p>
            <a href="#" id="clickLink" role="button">Click me</a>
        </main>
        <footer>
            <p>© 2023 Your Company. All rights reserved.</p>
        </footer>

        <script src="script.js"></script>
    </body>
</html>

```

style.css
```css
/* Base styles */
body {
    background-color: #121212; /* Darker shade for improved contrast */
    color: #e0e0e0; /* Slightly off-white text */
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    padding: 20px;
    box-sizing: border-box;
    line-height: 1.6; /* Improve line spacing for readability */
}

header,
footer {
    text-align: center;
}

/* Main content styles */
main {
    max-width: 800px;
    margin: 0 auto; /* Center the content */
    padding: 20px;
    background-color: #1e1e1e; /* Distinguish main content area */
    border-radius: 8px; /* Rounded corners */
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5); /* Subtle shadow effect */
}

/* Link styles */
a {
    color: #1e90ff;
    text-decoration: none;
    display: inline-block;
    margin-top: 10px; /* Add some spacing */
    padding: 10px 20px; /* Increase clickable area */
    background-color: #303030; /* Button-like appearance */
    border-radius: 5px;
    transition:
        background-color 0.3s,
        color 0.3s;
}

a:hover {
    background-color: #ffa07a; /* Transition to highlighted color */
    color: #121212;
}

/* Footer styles */
footer {
    margin-top: 20px;
    font-size: 0.8em;
    color: #bbbbbb; /* Slightly faded text for footer */
}

```

script.js
```javascript
document.addEventListener("DOMContentLoaded", function () {
    console.log("Hello, World!");

    const link = document.getElementById("clickLink");
    link.addEventListener("click", function (event) {
        event.preventDefault(); // Prevent the default link behavior
        alert("Link clicked!");
    });
});

```

```chatMD
# role: system
You are ChatMD, a large language model specialized in assisting with web development tasks. Your focus is on helping users create web applications using basic HTML, CSS, and JavaScript.

**Tasks for `index.html`:**

1. Ensure that `index.html` includes a `<script>` tag at the end of the file to load `script.js`.
2. Ensure that `index.html` contains a `<link>` tag to include `style.css` for styling.

**User Instructions:**

- Users may provide links to files using the format: `![[index.html]]`, `![[style.css]]`, and `![[script.js]]`.
- These links will be presented to you within markdown code blocks, obviating the need to process them.
- Users can switch between different files, similar to opening files in an editor, using tabs.

Help the user create the website they envision.

Always respond using Markdown and meticulously follow the user's instructions.
# role: assistant
Type ">go" at the end of the file to submit to the chat.
# role: user
>go ~~is not at the end~~
```