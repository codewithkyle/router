# Router

A lightweight (2kb) lazy loading Web Component based declarative routing library.

## Install

Install via NPM:

```bash
npm i -S @codewithkyle/router
```

Or via CDN:

```javascript
import { configure, navigateTo, mount, pageJump, replaceState, pushState } from "https://cdn.jsdelivr.net/npm/@codewithkyle/router@1/router.min.mjs";
```

```html
<script src="https://cdn.jsdelivr.net/npm/@codewithkyle/router@1/router.min.js">
```

## Usage

### Example

#### app.js

```typescript
import { configure, navigateTo, mount, pageJump, replaceState, pushState } from "https://cdn.jsdelivr.net/npm/@codewithkyle/router@1/router.min.mjs";

// Mount the router to a specific HTML element
const main = document.body.querySelector("main");
mount(main);

// Configure the router
configure({
    // declare static routes & request components using the WebComponentTagName interface
    "/contact-us": "contact-us",
    // use curly brances to declare routing tokens
    "/blog/article/{SLUG}": "blog-article",
    // use * for wildcard matching
    "/about-us/*": "about-us",
    // request components using the Route interface
    "/": {
        tagName: "home-page",
        file: "/homepage.js",
    },
    // add a 404 route to act as a catch-all
    "404": "missing-page",
});

// Navigate to a page via JavaScript
navigateTo("/blog/article/example");

// Trigger a page jump via JavaScript
pageJump("#page-jump-hash");

// Replace the current history state via JavaScript
replaceState("/manual-url/path-name/updating");

// Push a history state via JavaScript
pushState("/manual-url/path-name/changing");
```

#### homepage.js

```typescript
// You can export your Web Components as default or as a named export.
export default class Homepage extends HTMLElement{
    constructor(tokens:Tokens, params:Params){
        super();
        // ...snip...
    }
}
```

### Interfaces

```typescript
type WebComponentTagName = string;

interface Route {
    tagName: string;
    file: string;
};

interface Router {
    [route:string]: Route | WebComponentTagName;
}

interface Tokens {
    [token:string]: string;
};

interface Params {
    [param:string]: string | Array<string>;
};
```

### Loading Components

Components can be loaded using a `Route` or `WebComponentTagName` interface.

#### Web Component Tag Names

Using the `WebComponentTagName` interface is the easiest way to load components. Simply provide a valid [Custom Elememt](https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name) tag name to the router. When the route is requested the Router will automagically import and mount the lazy loaded component.

It's important to note that the importer is expecting the JavaScript file name to match tag name with a `.js` extenstion (ex: `my-custom-element.js`). Also, files must be located in the same directory as the Router. If they are not located in the same directory or the file name does not match the required naming convention use the `Route` interface instead.

#### Route

Using the `Route` interface allows you to have more control over your files. A `Route` is composed of a valid [Custom Elememt](https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name) tag name and path to the file. The path can either be a file system path (ex: `../../my-file.js`) or it can be a URL (ex; `/components/my-file.js` or `https://cdn.example.com/components/my-file.js`).

### Loading Animation

Since this library bypasses the navive browser navigation functionality you will need to create your own loading state. When loading a route the Router will set a `[router]` attribute on the `<HTML>` element. You can use the snippets blow to create a custom loading animation.

#### CSS

```css
html[router="loading"] * {
    cursor: wait !important;
}
```

#### SCSS

```scss
.my-class {
    color: blue;

    & html[router="loading"] {
        color: grey;
    }
}
```

### Custom Events

```typescript
// Fired after the router has started and is ready to hijack navigation events
document.addEventListener("router:ready", () => { console.log("Ready") });

// Fired when the page has started the loading process
document.addEventListener("router:loading", () => { console.log("Loading") });

// Fired after the page has loaded and the history state has been updated
document.addEventListener("router:loaded", () => { console.log("Loaded") });
```