import type { Route, Tokens, Params, GroupSettings, Module, Data, LoadedDetails, LoadingDetails, PreloadingDetails, RedirectingDetails } from "../router";
import RouterGroup from "./router-group";

class Router {
    public routes: Array<Route>;
    private mountingPoint: HTMLElement;
    private modules: {
        [tagName: string]: any;
    };
    private lastRoute: {
        path: string,
        hash: string,
        tokens: Tokens,
        params: Params,
    };
    private useTransitions:boolean;
    private autoTransitionTimer: number|null; // ms
    private transitionPromises: {
        resolve: Function,
        timeoutId: number|null,
    };

    constructor() {
        this.routes = [];
        this.mountingPoint = null;
        this.modules = {};
        this.lastRoute = null;
        this.autoTransitionTimer = 5000;
        this.useTransitions = false;
        this.transitionPromises = {
            resolve: () => {},
            timeoutId: null,
        };
        window.addEventListener("click", this.hijackClick, {
            capture: true,
        });
        window.addEventListener("popstate", this.hijackPopstate, {
            capture: true,
        });
    }

    public enableTransitions(): void {
        this.useTransitions = true;
    }

    public disableTransitions():void {
        this.useTransitions = false;
    }

    /**
     * Amount of time (milliseconds) that can pass before automatically resolving the transition.
     * Accepts any number greater or equal to -1, null, or Infinity.
     * Values of -1, null, or Infinity will prevent the automatic transition resolution. This is NOT recommended.
    */
    public setTransitionTimer(ms:number|null): void {
        if (ms < -1){
            throw "Timer value out of bounds. Value must be greater than or equal to -1.";
        }
        this.autoTransitionTimer = ms;
    }

    public transition(){
        if (this.transitionPromises.timeoutId !== null){
            clearTimeout(this.transitionPromises.timeoutId);
        }
        this.transitionPromises.resolve(); 
    }

    public group(settings: GroupSettings, closure: Function) {
        const routerGroup = new RouterGroup(this);
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
        this.mountingPoint = element;
        this.route(location.href, "replace");
        this.dispatchEvent("ready");
    }

    public navigateTo(url: string, history: "replace" | "push" = "push"): void {
        if (
            url.indexOf(location.origin) === 0 ||
            url.indexOf("/") === 0 ||
            url.indexOf("#") === 0 || 
            url === "" || 
            url.indexOf("http") === -1
        ) {
            this.route(url, history);
        } else {
            console.error(`Invalid URL: ${url}`);
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
        const el = e.target as HTMLElement;
        const target = el.closest("[href]");
        if (
            target instanceof HTMLAnchorElement &&
            target.target !== "_blank" &&
            target.getAttribute("href") !== null
        ) {
            if (
                target.href.indexOf(location.origin) === 0 ||
                target.href.indexOf("/") === 0 ||
                target.href.indexOf("#") === 0 ||
                target.href === "" ||
                target.href.indexOf("http") === -1
            ) {
                e.preventDefault();
                e.stopPropagation();
                const url = target.getAttribute("href");
                let history = target.getAttribute("history");
                if (history === "push" || history === "replace") {
                    this.route(url, history);
                } else {
                    this.route(url);
                }
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
        if (route === null || route.segments[0] === "*"){
            return tokens;
        }
        url = url
            .replace(/\?.*|\#.*/, "")
            .trim()
            .replace(/\/+/g, "/");
        const segments = url.split("/");
        for (let i = 0; i < segments.length; i++) {
            if (route.segments?.[i]?.indexOf(":") !== -1) {
                const index = parseInt(route.segments[i].substring(1));
                tokens[route.tokens[index]] = segments[i];
            }
        }
        return tokens;
    }

    private parseGetParams(url: string): Params {
        const params: Params = {};
        const urlParams = url?.match(/\?.*(?=\#|$)/)?.[0] ?? null;
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
        params: Params,
        data: Data,
    ): Promise<HTMLElement|null> {
        try{
            if (this.modules?.[route.tagName]) {
                return new this.modules[route.tagName].default(tokens, params, data);
            }

            let module = await this.importModule(route.file);
            if (module === null) {
                console.error(`Failed to import module: ${route.file}`);
                return null;
            }

            if (!module?.default) {
                const key = Object.keys(module)?.[0] ?? null;
                if (!key) {
                    console.error(`Failed to find module export: ${route.file}`);
                    return null;
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

            return new this.modules[route.tagName].default(tokens, params, data);
        } catch (e) {
            console.error(e);
            return null;
        }
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
                for (let s = 0; s < route.segments.length; s++) {
                    if (route.segments[s] === segments[s]) {
                        continue;
                    } else if (route.segments[s].indexOf(":") !== -1) {
                        const index = parseInt(route.segments[s].substring(1));
                        if (route.regex[index].test(segments[s])) {
                            continue;
                        } else {
                            failed = true;
                            break;
                        } 
                    } else if (route.segments[s] === "*") {
                        break;
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
        // Clean URL
        url = url
            .replace(location.origin, "")
            .replace(/^\/|\/$/g, "")
            .trim();
        // Begin routing
        const data:Data = {};
        let params:Params = this.parseGetParams(url);
        let tokens:Tokens = {};
        let hash = "";
        let path = `/${url.replace(/(\?|\#).*/, "").trim()}`;
        if (url.indexOf("#") !== -1) {
            hash = url.match(/\#.*/)[0];
        }
        if (url.indexOf("#") === 0) {
            this.pageJump(url);
        } else {
            document.documentElement.setAttribute("router", "loading");
            this.dispatchEvent("preloading", {
                path: path,
                hash: hash,
                params: params,
            });
            try {
                // Begin routing logic
                const route = this.findRouteModel(url);
                tokens = this.parseTokens(url, route);

                // Begin optional transition animation logic
                let transitionPromise = null;
                if (this.useTransitions && this.lastRoute !== null){
                    transitionPromise = new Promise(resolve => {
                        let timeoutId:number|null = null;
                        if (this.autoTransitionTimer !== null && this.autoTransitionTimer !== Infinity && this.autoTransitionTimer !== -1){
                            timeoutId = setTimeout(resolve, this.autoTransitionTimer);
                        }
                        this.transitionPromises = {
                            resolve: resolve,
                            timeoutId: timeoutId,
                        };
                    });
                }

                // Notify devs that we are now loading
                // Dispatched after transition logic to prevent race conditions
                this.dispatchEvent("loading", {
                    path: path.length ? path : "/",
                    hash: hash,
                    params: params,
                    tokens: tokens,
                    data: data,
                });

                // Dead route redirect
                if (route === null) {
                    throw "/404";
                }

                // Routing logic
                if (route.middleware.length) {
                    for (const middleware of route.middleware) {
                        await middleware({...tokens}, {...params}, data);
                    }
                }
                if (route?.redirect != undefined) {
                    // Announce redirect
                    let params:Params = this.parseGetParams(route.redirect);
                    let hash = route.redirect.match(/\#.*/)?.[0] ?? "";;
                    let path = `/${route.redirect.replace(/(\?|\#).*/, "").trim()}`;
                    this.dispatchEvent("redirecting", {
                        path: path,
                        params: params,
                        hash: hash,
                    });
                    this.navigateTo(route.redirect, history);
                    return;
                }
                if (route?.closure) {
                    await route.closure({...tokens}, {...params}, data);
                } else {
                    const el = await this.import(route, url, {...tokens}, {...params}, {...data});

                    if (el === null) {
                        return;
                    }
                    
                    // End transition animation logic
                    if (transitionPromise != null){
                        await transitionPromise;
                    }

                    this.mountElement(el, url, history);
                    if (hash.length) {
                        this.pageJump(hash, "auto");
                    } else {
                        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
                    }
                }

                // Routing finished successfully
                document.documentElement.setAttribute("router", "idling");
                this.dispatchEvent("loaded", {
                    path: path.length ? path : "/",
                    hash: hash,
                    tokens: tokens,
                    params: params,
                    data: data,
                });
                this.lastRoute = {
                    path: path.length ? path : "/",
                    hash: hash,
                    tokens: tokens,
                    params: params,
                };
            } catch (url) {
                let params:Params = this.parseGetParams(url);
                let hash = url.match(/\#.*/)?.[0] ?? "";
                let path = `/${url.replace(/(\?|\#).*/, "").trim()}`;
                this.dispatchEvent("redirecting", {
                    path: path,
                    hash: hash,
                    params: params,
                });
                this.navigateTo(url);
            }
        }
    }

    private dispatchEvent(type: "loading" | "loaded" | "ready" | "preloading" | "redirecting", details:LoadingDetails|LoadedDetails|PreloadingDetails|RedirectingDetails = null) {
        let event:CustomEvent;
        switch(type) {
            case "ready":
                event = new CustomEvent(`router:${type}`);
                break;
            default:
                event = new CustomEvent(`router:${type}`, {
                    detail: {
                        outgoing: this.lastRoute,
                        incoming: details,
                    },
                });
                break;
        }
        document.dispatchEvent(event);
    }
}

const router = new Router();
const navigateTo = router.navigateTo.bind(router);
const mount = router.mount.bind(router);
const pageJump = router.pageJump.bind(router);
const replaceState = router.replaceState.bind(router);
const pushState = router.pushState.bind(router);
const transition = router.transition.bind(router);

export { navigateTo, router, mount, pageJump, replaceState, pushState, transition };
