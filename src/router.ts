import type { Route, Tokens, Params, GroupSettings, Module } from "../router";

class RouterGroup {
    private router: Router;
    private prefix: string;
    private middleware: Array<Function>;

    constructor(router: Router) {
        this.router = router;
        this.prefix = "";
        this.middleware = [];
    }

    public addMiddleware(closure: Function): void {
        this.middleware.push(closure);
    }

    public appendPrefix(prefix: string): void {
        this.prefix += `/${prefix.trim().replace(/^\/|\/$/g, "")}`;
    }

    public add(route: string, module: string | Function | Module): void {
        const cleanRoute = `${this.prefix}/${route
            .trim()
            .replace(/^\/|\/$/g, "")}`;
        this.router.add(cleanRoute, module, [...this.middleware]);
    }
}

class Router {
    public routes: Array<Route>;
    private mountingPoint: HTMLElement;
    private modules: {
        [tagName: string]: any;
    };

    constructor() {
        this.routes = [];
        this.mountingPoint = document.body;
        this.modules = {};
    }

    public run(): void {
        this.route(location.href, "replace");
        document.addEventListener("click", this.hijackClick, { capture: true });
        window.addEventListener("popstate", this.hijackPopstate);
        this.dispatchEvent("ready");
    }

    public group(
        settings: GroupSettings,
        closure: (router: Router | RouterGroup) => void
    ) {
        const routerGroup =
            closure.arguments[0] instanceof Router
                ? new RouterGroup(this)
                : closure.arguments[0];
        if (settings?.prefix?.length) {
            routerGroup.appendPrefix(settings.prefix);
        }
        if (settings?.middleware) {
            if (Array.isArray(settings.middleware)) {
                for (let i = 0; i < settings.middleware.length; i++) {
                    routerGroup.addMiddleware(settings.middleware[i]);
                }
            } else {
                routerGroup.addMiddleware(settings.middleware);
            }
        }
        closure(routerGroup);
    }

    public add(
        route: string,
        module: string | Function | Module,
        middleware: Function | Array<Function> = null
    ): void {
        const routeModel = this.prepareRouteModel(route);
        if (typeof module === "string") {
            routeModel.tagName = module;
            if (module.indexOf("http") === 0) {
                routeModel.file = module;
            } else {
                routeModel.file = `./${module
                    .trim()
                    .replace(/(\.js)$/, "")
                    .trim()}.js`;
            }
        } else if (module instanceof Function) {
            routeModel.closure = module;
        } else {
            routeModel.tagName = module.tagName;
            routeModel.file = module.file;
        }
        if (middleware instanceof Function) {
            routeModel.middleware.push(middleware);
        } else if (Array.isArray(middleware)) {
            routeModel.middleware = [...routeModel.middleware, ...middleware];
        }
        this.routes.push(routeModel);
    }

    public redirect(
        route: string,
        url: string,
        middleware: Array<Function> = null
    ): void {
        const routeModel = this.prepareRouteModel(route);
        if (middleware instanceof Function) {
            routeModel.middleware.push(middleware);
        } else if (Array.isArray(middleware)) {
            routeModel.middleware = [...routeModel.middleware, ...middleware];
        }
        routeModel.redirect = url.trim().replace(/^\/|\/$/g, "");
        this.routes.push(routeModel);
    }

    private prepareRouteModel(route: string): Route {
        const routeModel: Route = {
            tokens: [],
            regex: [],
            middleware: [],
            route: route.trim().replace(/^\/|$\//g, ""),
        };
        const tokens = routeModel.route.match(/\{.*?\}/g) ?? [];
        for (let i = 0; i < tokens.length; i++) {
            if (tokens[0].indexOf(":")) {
                const token = tokens[0]
                    .replace(/\{|\}/g, "")
                    .trim()
                    .replace(/\:.*/, "")
                    .trim();
                routeModel.tokens.push(token);
                const regexString = token[0]
                    .replace(/\{|\}/g, "")
                    .trim()
                    .replace(/.*?\:/, "")
                    .trim();
                routeModel.regex.push(new RegExp(regexString));
                routeModel.route.replace(tokens[0], `:${i}`);
            } else {
                routeModel.tokens.push(tokens[0].replace(/\{|\}/g, "").trim());
                routeModel.regex.push(new RegExp(/.*/));
                routeModel.route.replace(tokens[0], `:${i}`);
            }
        }
        return routeModel;
    }

    public mount(element: HTMLElement): void {
        this.mountingPoint = element;
    }

    public navigateTo(url: string, history: "replace" | "push" = "push"): void {
        if (url.indexOf(location.origin) === 0 || url.indexOf("/") === 0) {
            this.route(url, history);
        } else {
            location.href = url;
        }
    }

    public pageJump(hash: string, jump: "auto" | "smooth" = "smooth") {
        const el: HTMLElement = document.body.querySelector(
            `#${hash.replace(/^\#/, "")}`
        );
        if (el) {
            el.scrollIntoView({
                behavior: jump,
                block: "center",
                inline: "center",
            });
        }
        this.replaceState(`${location.origin}${location.pathname}${hash}`);
    }

    public replaceState(url: string): void {
        url = url.replace(location.origin, "").replace(/^\//, "").trim();
        window.history.replaceState(
            {
                url: url,
            },
            document.title,
            `${location.origin}/${url}`
        );
    }

    public pushState(url: string): void {
        url = url.replace(location.origin, "").replace(/^\//, "").trim();
        window.history.pushState(
            {
                url: url,
            },
            document.title,
            `${location.origin}/${url}`
        );
    }

    private hijackPopstate = (e: PopStateEvent) => {
        if ("url" in e.state) {
            this.route(e.state.url, "replace");
        }
    };

    private hijackClick: EventListener = (e: Event) => {
        if (
            e.target instanceof HTMLAnchorElement &&
            e.target.target !== "_blank" &&
            e.target.getAttribute("href") &&
            e.target.href.indexOf(location.origin) !== -1
        ) {
            e.preventDefault();
            e.stopPropagation();
            const url = e.target.getAttribute("href");
            let history = e.target.getAttribute("history");
            if (history === "push" || history === "replace") {
                this.route(url, history);
            } else {
                this.route(url);
            }
        }
    };

    private mountElement(
        el: HTMLElement,
        url: string,
        history: "push" | "replace"
    ): void {
        this.mountingPoint?.firstElementChild?.remove();
        this.mountingPoint.appendChild(el);
        if (history === "replace") {
            this.replaceState(`${location.origin}/${url}`);
        } else {
            this.pushState(`${location.origin}/${url}`);
        }
    }

    private async importModule(url: string): Promise<any> {
        let module = null;
        try {
            module = await import(url);
        } catch (e) {
            console.error(e);
        }
        return module;
    }

    private parseTokens(url: string, route: string): Tokens {
        const tokens: Tokens = {};
        url = url.replace(/\?.*/, "").trim();
        const urlSegments = url.split("/");
        route = route.replace(/^\/|\/$/g, "").trim();
        const routeSegments = route.split("/");
        for (let i = 0; i < routeSegments.length; i++) {
            if (
                routeSegments[i].indexOf("{") === 0 &&
                routeSegments[i].indexOf("}") === routeSegments[i].length - 1
            ) {
                const key = routeSegments[i].replace(/^\{|\}$/g, "").trim();
                tokens[key] = urlSegments[i];
            }
        }
        return tokens;
    }

    private parseGetParams(url: string): Params {
        const params: Params = {};
        const urlParams = url.match(/\?.*/)?.[0] ?? null;
        if (!urlParams) {
            return params;
        }
        const urlSearchParams = new URLSearchParams(urlParams);
        urlSearchParams.forEach((value, key) => {
            if (!params?.[key]) {
                const values = urlSearchParams.getAll(key);
                if (values.length > 1) {
                    params[key] = values;
                } else {
                    params[key] = values[0];
                }
            }
        });
        return params;
    }

    private async import(
        data: string | Route,
        url: string,
        route: string
    ): Promise<HTMLElement> {
        if (data === null) {
            throw "Missing route data.";
        }

        let tagName = null;
        let file = null;
        if (typeof data === "string") {
            tagName = data;
            file = `./${data}.js`;
        } else {
            tagName = data.tagName;
            file = data.file;
        }

        const tokens = this.parseTokens(url, route);
        const params = this.parseGetParams(url);

        if (tagName === null || file === null) {
            throw "Missing route data.";
        }

        if (this.modules?.[tagName]) {
            return new this.modules[tagName].default(tokens, params);
        }

        let module = await this.importModule(file);
        if (module === null) {
            throw "Failed to dynamically import module.";
        }

        if (!module?.default) {
            const key = Object.keys(module)?.[0] ?? null;
            if (!key) {
                throw "ES Module is exporting an empty object.";
            }
            module = Object.assign(
                {
                    default: module[key],
                },
                module
            );
        }

        this.modules[tagName] = module;

        if (!customElements.get(tagName)) {
            customElements.define(tagName, module.default);
        }

        return new this.modules[tagName].default(tokens, params);
    }

    private lookupRoute(url: string): string {
        let route = null;
        url = url
            .replace(/\?.*|\#.*/g, "")
            .replace(/^\/|\/$/g, "")
            .trim();
        const urlSegments = url.split("/");
        for (const key in this.routes) {
            const routeSegments = key.split("/");
            if (routeSegments.length === urlSegments.length) {
                let isMatch = true;
                for (let i = 0; i < routeSegments.length; i++) {
                    const routeSegment = routeSegments[i].trim().toLowerCase();
                    if (routeSegment === "*") {
                        break;
                    } else if (
                        routeSegment.indexOf("{") === 0 &&
                        routeSegment.indexOf("}") === routeSegment.length - 1
                    ) {
                        continue;
                    } else if (
                        routeSegment === urlSegments[i].trim().toLowerCase()
                    ) {
                        continue;
                    } else {
                        isMatch = false;
                        break;
                    }
                }
                if (isMatch) {
                    route = key;
                    break;
                }
            }
        }
        return route;
    }

    private async route(url: string, history: "replace" | "push" = "push") {
        url = url
            .replace(location.origin, "")
            .replace(/^\/|\/$/g, "")
            .trim();
        if (url.indexOf("#") === 0) {
            this.pageJump(url);
        } else {
            document.documentElement.setAttribute("router", "loading");
            this.dispatchEvent("loading");
            let route = null;
            if (this.routes?.[url]) {
                route = url;
            } else {
                route = this.lookupRoute(url);
            }
            if (route === null && this.routes?.["404"]) {
                url = `404`;
                route = url;
            }
            try {
                const el = await this.import(this.routes[route], url, route);
                this.mountElement(el, url, history);
                if (url.indexOf("#") !== -1) {
                    this.pageJump(url.match(/\#.*/)[0], "auto");
                } else {
                    el.scrollIntoView({
                        block: "start",
                        inline: "start",
                        behavior: "auto",
                    });
                }
            } catch (e) {
                console.error(e);
                location.href = `${location.origin}/404`;
            }
            document.documentElement.setAttribute("router", "idling");
            this.dispatchEvent("loaded");
        }
    }

    private dispatchEvent(type: "loading" | "loaded" | "ready") {
        var event = new CustomEvent(`router:${type}`);
        document.dispatchEvent(event);
    }
}

const router = new Router();
const navigateTo = router.navigateTo.bind(router);
const mount = router.mount.bind(router);
const pageJump = router.pageJump.bind(router);
const replaceState = router.replaceState.bind(router);
const pushState = router.pushState.bind(router);

export { navigateTo, router, mount, pageJump, replaceState, pushState };

// TEMP TEST DATA
router.group({ prefix: "/v1/" }, (router) => {});
