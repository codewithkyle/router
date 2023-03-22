# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.1.1] - 2023-03-22

### Fixed

- token parsing ([#15](https://github.com/codewithkyle/router/issues/15))
- anchor hijacking ([#15](https://github.com/codewithkyle/router/issues/15))
- infinite failed module import loop ([#16](https://github.com/codewithkyle/router/issues/16))

## [2.1.0] - 2022-07-26

### Added

- asynchronous middleware and closure support ([#13](https://github.com/codewithkyle/router/issues/13))
- router event details ([#12](https://github.com/codewithkyle/router/issues/12))
- `router:preloading` event
- `router:redirecting` event
- animation and page transition methods ([#11](https://github.com/codewithkyle/router/issues/11))
    - `transition()`
    - `router.enableTransitions()`
    - `router.disableTransitions()`
    - `router.setTransitionTimer(ms)` (defaults to 5000)

## [2.0.0] - 2022-03-12

Version 2 of this router has been redesigned to mimic some of the functionality of [FastRoute](https://github.com/nikic/FastRoute#defining-routes) and [ExpressJS](http://expressjs.com/en/guide/routing.html).

```javascript
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

### Added

-   `router` export
-   `router.add(route, module, middleware = null)` method
-   `router.redirect(route, url, middleware = null)` method
-   `router.group(settings, closuer)` method
-   route token RegExp support ([#6](https://github.com/codewithkyle/router/issues/6))
-   routes support closures ([#8](https://github.com/codewithkyle/router/issues/8))
-   routes are now checked in the order that they're created
-   router now supports middleware closures ([#9](https://github.com/codewithkyle/router/issues/9))
-   router now supports prefixing ([#9](https://github.com/codewithkyle/router/issues/9))

### Removed

-   `configure()` method

## [1.1.1] - 2022-02-17

### Fixed

-   external link bug
-   missing TypeScript definitions ([#7](https://github.com/codewithkyle/router/issues/7))

## [1.1.0] - 2021-05-22

### Fixed

-   cleaned up console logs ([#2](https://github.com/codewithkyle/routing/issues/2))
-   fixed homepage popstate navigation hijacking bug ([#1](https://github.com/codewithkyle/routing/issues/1))

### Added

-   custom events fired on the `document` ([#4](https://github.com/codewithkyle/routing/issues/4))

## [1.0.0] - 2021-03-27

### Added

-   `mount()` functionality
-   `configure()` functionality
-   `navigateTo()` functionality
-   `pageJump()` functionality
-   `replaceState()` functionality
-   `pushState()` functionality
-   declaritative dynamic routing
-   automatic lazy loading

[unreleased]: https://github.com/codewithkyle/router/compare/v2.1.1...HEAD
[2.1.1]: https://github.com/codewithkyle/router/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/codewithkyle/router/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/codewithkyle/router/compare/v1.1.1...v2.0.0
[1.1.1]: https://github.com/codewithkyle/router/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/codewithkyle/router/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/codewithkyle/router/releases/tag/v1.0.0
