# Router

A SPA routing library for lazy loading Web Component with functionality similar to [FastRoute](https://github.com/nikic/FastRoute#defining-routes) and [ExpressJS](http://expressjs.com/en/guide/routing.html).

## Install

Install via NPM:

```bash
npm i -S @codewithkyle/router
```

Or via CDN:

```javascript
import {
    router,
    navigateTo,
    mount,
    pageJump,
    replaceState,
    pushState,
} from "https://cdn.jsdelivr.net/npm/@codewithkyle/router@2/router.min.mjs";
```

```html
<script src="https://cdn.jsdelivr.net/npm/@codewithkyle/router@2/router.min.js">
```

## Usage

```typescript
// routes.js

import {
    router,
    navigateTo,
    mount,
    pageJump,
    replaceState,
    pushState,
} from "https://cdn.jsdelivr.net/npm/@codewithkyle/router@2/router.min.mjs";

// Add a route to a custom file (supports external URLs)
router.add("/", {
    tagName: "homepage-component",
    file: "./homepage.js",
});

// Automatically load and mount the demo-page web component from the './demo-page.js' file
router.add("/", "demo-page");

// Routes now support closures
router.add("/closure", (tokens, params) => {
    sessionStorage.setItem("closure", "true");
    alert("You may now access the test pages.");
});

// Routes now support redirecs
router.redirect("/dead-link", "/");

// Create router groups with a prefix and optional middleware (middleware can be an array of functions)
router.group(
    {
        prefix: "/blog",
        middleware: (tokens, params) => {
            if (!sessionStorage.getItem("closure")) {
                alert("Access blocked until you run the closure.");

                // Throw a URL to force a redirect
                throw location.origin;
            }
        },
    },
    (router) => {
        router.redirect("/dead-link", "/");

        // Chain groups to extend prefixs or add additional middleware closures
        router.group({ prefix: "/article" }, (router) => {
            // Route tokens now support RegExp strings (anything after the ':' character)
            router.add("/{SLUG:\\d+}", "blog-number");

            // Route tokens without a RegExp string default to /.*/ (anything)
            router.add("/{SLUG}", "blog-article");
        });
    }
);

// Routes are now checked in the order that they're created
// Add a wildcard (*) route at the bottom to catch any route
router.add("/*", "missing-page");
```

```typescript
// homepage.js

// You can export your Web Components as default or as a named export.
export default class Homepage extends HTMLElement {
    constructor(tokens: Tokens, params: Params) {
        super();
        // ...snip...
    }
}
```

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
document.addEventListener("router:ready", () => {
    console.log("Ready");
});

// Fired when the page has started the loading process
document.addEventListener("router:loading", () => {
    console.log("Loading");
});

// Fired after the page has loaded and the history state has been updated
document.addEventListener("router:loaded", () => {
    console.log("Loaded");
});
```
