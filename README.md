# Router

A lightweight (1.9kb) lazy loading Web Component based declarative routing library.

## Install

Install via NPM:

```bash
npm i -S @codewithkyle/router
```

Or via CDN:

```javascript
import { configure, navigate } from "https://cdn.jsdelivr.net/npm/@codewithkyle/router@1/router.min.mjs";
```

```html
<script src="https://cdn.jsdelivr.net/npm/@codewithkyle/router@1/router.min.js">
```

## Usage

### Example

```typescript
import { configure, navigateTo, mount, pageJump } from "https://cdn.jsdelivr.net/npm/@codewithkyle/router@1/router.min.mjs";

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

// Navigate to a page using JavaScript
navigateTo("/blog/article/example");

// Trigger a page jump using JavaScript
pageJump("#page-jump-hash");
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

It's important to note that the importer is expecting the JavaScript file name to be the tag name with an appended `.js` extenstion (ex: `my-custom-element.js`). Also, files must be located in the same directory as the Router. If they are not located in the same directory or the file name does not match the required naming convention use the `Route` interface instead.

#### Route

Using the `Route` interface allows you to have more control over your files. A `Route` is composed of a valid [Custom Elememt](https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name) tag name and path to the file. The path can either be a file system path (ex: `../../my-file.js`) or it can be a URL (ex; `/components/my-file.js` or `https://cdn.example.com/components/my-file.js`).