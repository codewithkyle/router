# Router

A lightweight Web Component based SPA routing library.

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

```typescript
import { configure, navigateTo, mount } from "https://cdn.jsdelivr.net/npm/@codewithkyle/router@1/router.min.mjs";

const main = document.body.querySelector("main");
mount(main);

configure({
    "/blog/article/{SLUG}": "blog-article",
});

navigateTo("/blog/article/example");
```

## Interfaces

```typescript
interface Route = {
    tagName: string;
    file: string;
};

interface Router = {
    [route:string]: Route | string;
}
```
