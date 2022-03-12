import type { Route, Tokens, Params, GroupSettings, Module } from "../router";

class RouterGroup {
    public router: Router;
    public prefix: string;
    public middleware: Array<Function>;

    constructor(router: Router, prefix = "", middleware = []) {
        this.router = router;
        this.prefix = prefix;
        this.middleware = middleware;
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

    public redirect(
        route: string,
        url: string,
        middleware: Array<Function> = null
    ): void {
        const cleanRoute = `${this.prefix}/${route
            .trim()
            .replace(/^\/|\/$/g, "")}`;
        this.router.redirect(cleanRoute, url, [...this.middleware]);
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
        this.mountingPoint = null;
        this.modules = {};
    }

    public group(
        settings: GroupSettings,
        router: Router | RouterGroup,
        closure: Function
    ) {
        const routerGroup =
            router instanceof Router
                ? new RouterGroup(router)
                : new RouterGroup(
                      router.router,
                      router.prefix,
                      router.middleware
                  );
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
            segments: [],
        };
        const tokens = routeModel.route.match(/\{.*?\}/g) ?? [];
        for (let i = 0; i < tokens.length; i++) {
            if (tokens[i].indexOf(":") !== -1) {
                const token = tokens[i]
                    .replace(/\{|\}/g, "")
                    .trim()
                    .replace(/\:.*/, "")
                    .trim();
                routeModel.tokens.push(token);
                const regexString = tokens[i]
                    .replace(/^\{|\}$/g, "")
                    .trim()
                    .replace(/.*?\:/, "")
                    .trim();
                routeModel.regex.push(new RegExp(regexString));
                routeModel.route = routeModel.route.replace(tokens[i], `:${i}`);
            } else {
                routeModel.tokens.push(tokens[i].replace(/\{|\}/g, "").trim());
                routeModel.regex.push(new RegExp(/.*/));
                routeModel.route = routeModel.route.replace(tokens[i], `:${i}`);
            }
        }
        routeModel.route = routeModel.route
            .trim()
            .replace(/\/+/g, "/")
            .toLowerCase();
        routeModel.segments = routeModel.route.split("/");
        return routeModel;
    }

    public mount(element: HTMLElement): void {
        if (this.mountingPoint === null) {
            document.addEventListener("click", this.hijackClick, {
                capture: true,
            });
            window.addEventListener("popstate", this.hijackPopstate);
        }
        this.mountingPoint = element;
        this.route(location.href, "replace");
        this.dispatchEvent("ready");
    }

    public navigateTo(url: string, history: "replace" | "push" = "push"): void {
        if (
            url.indexOf(location.origin) === 0 ||
            url.indexOf("/") === 0 ||
            url.indexOf("#") === 0
        ) {
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

    private parseTokens(url: string, route: Route): Tokens {
        const tokens: Tokens = {};
        url = url
            .replace(/\?.*|\#.*/, "")
            .trim()
            .replace(/\/+/g, "/");
        const segments = url.split("/");
        for (let i = 0; i < segments.length; i++) {
            if (route.segments[i].indexOf(":") !== -1) {
                const index = parseInt(route.segments[i].substring(1));
                tokens[route.tokens[index]] = segments[i];
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
        route: Route,
        url: string,
        tokens: Tokens,
        params: Params
    ): Promise<HTMLElement> {
        if (this.modules?.[route.tagName]) {
            return new this.modules[route.tagName].default(tokens, params);
        }

        let module = await this.importModule(route.file);
        if (module === null) {
            throw "/404";
        }

        if (!module?.default) {
            const key = Object.keys(module)?.[0] ?? null;
            if (!key) {
                throw "/404";
            }
            module = Object.assign(
                {
                    default: module[key],
                },
                module
            );
        }

        this.modules[route.tagName] = module;

        if (!customElements.get(route.tagName)) {
            customElements.define(route.tagName, module.default);
        }

        return new this.modules[route.tagName].default(tokens, params);
    }

    private findRouteModel(url: string): Route {
        let model = null;
        const cleanUrl = url
            .replace(/\?.*|\#.*/g, "")
            .trim()
            .replace(/^\/|\/$/g, "")
            .trim()
            .replace(/\/+/g, "/")
            .toLowerCase();
        const segments = cleanUrl.split("/");
        for (let i = 0; i < this.routes.length; i++) {
            const route = this.routes[i];
            if (
                route.segments.includes("*") ||
                route.segments.length === segments.length
            ) {
                let failed = false;
                for (let s = 0; s < segments.length; s++) {
                    if (route.segments[s] === "*") {
                        break;
                    } else if (route.segments[s].indexOf(":") !== -1) {
                        const index = parseInt(route.segments[s].substring(1));
                        if (route.regex[index].test(segments[s])) {
                            continue;
                        } else {
                            failed = true;
                            break;
                        }
                    } else if (route.segments[s] === segments[s]) {
                        continue;
                    } else {
                        failed = true;
                        break;
                    }
                }
                if (!failed) {
                    model = route;
                    break;
                }
            }
        }
        return model;
    }

    private async route(
        url: string,
        history: "replace" | "push" = "push"
    ): Promise<void> {
        url = url
            .replace(location.origin, "")
            .replace(/^\/|\/$/g, "")
            .trim();
        if (url.indexOf("#") === 0) {
            this.pageJump(url);
        } else {
            document.documentElement.setAttribute("router", "loading");
            this.dispatchEvent("loading");
            try {
                const route = this.findRouteModel(url);
                if (route === null) {
                    throw "/404";
                }
                if (route?.redirect != undefined) {
                    this.route(route.redirect, history);
                    return;
                }
                const tokens = this.parseTokens(url, route);
                const params = this.parseGetParams(url);
                if (route.middleware.length) {
                    for (let i = 0; i < route.middleware.length; i++) {
                        route.middleware[i](tokens, params);
                    }
                }
                if (route?.closure) {
                    route.closure(tokens, params);
                } else {
                    const el = await this.import(route, url, tokens, params);
                    this.mountElement(el, url, history);
                    if (url.indexOf("#") !== -1) {
                        this.pageJump(url.match(/\#.*/)[0], "auto");
                    } else {
                        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
                    }
                }
            } catch (e) {
                console.error(`Failed to navigate pages. Redirecting to ${e}`);
                this.navigateTo(e);
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
