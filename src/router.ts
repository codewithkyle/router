import { Router as RouterModel, Route, Tokens, Params } from "../router";

class Router {
    public router: RouterModel;
    private mountingPoint:HTMLElement;
    private modules: {
        [tagName:string]: any;
    };

    constructor(){
        this.router = {};
        this.mountingPoint = document.body;
        this.modules = {};
    }

    public configure(router:RouterModel):void{
        this.router = {};
        for (const key in router){
            this.router[key.replace(/^\/|\/$/g, "")] = router[key];
        }
        this.route(location.href, "replace");
        document.addEventListener("click", this.hijackClick, {capture: true});
        window.addEventListener("popstate", this.hijackPopstate);
    }

    public mount(element:HTMLElement):void{
        this.mountingPoint = element;
    }

    public navigateTo(url:string, history:"replace"|"push" = "push"):void{
        if (url.indexOf(location.origin) === 0 || url.indexOf("/") === 0){
            this.route(url, history);
        } else {
            location.href = url;
        }
    }

    public pageJump(hash:string, jump:"auto"|"smooth" = "smooth"){
        const el:HTMLElement = document.body.querySelector(`#${hash.replace(/^\#/, "")}`);
        if (el){
            el.scrollIntoView({
                behavior: jump,
                block: "center",
                inline: "center"
            });
        }
        this.replaceState(`${location.origin}${location.pathname}${hash}`);
    }

    public replaceState(url:string):void{
        url = url.replace(location.origin, "").replace(/^\//, "").trim();
        window.history.replaceState({
            url: url,
        }, document.title, `${location.origin}/${url}`);
    }

    public pushState(url:string):void{
        url = url.replace(location.origin, "").replace(/^\//, "").trim();
        window.history.pushState({
            url: url,
        }, document.title, `${location.origin}/${url}`);
    }

    private hijackPopstate = (e:PopStateEvent) => {
        if (e.state?.url){
            this.route(e.state.url, "replace");
        }
    }
    
    private hijackClick:EventListener = (e:Event) => {
        if (e.target instanceof HTMLAnchorElement && e.target.target !== "_blank" && e.target.getAttribute("href")){
            e.preventDefault();
            e.stopPropagation();
            const url = e.target.getAttribute("href");
            let history = e.target.getAttribute("history");
            if (history === "push" || history === "replace"){
                this.route(url, history);
            } else {
                this.route(url);
            }
        }
    }

    private mountElement(el:HTMLElement, url:string, history:"push"|"replace"):void{
        this.mountingPoint?.firstElementChild?.remove();
        this.mountingPoint.appendChild(el);
        if (history === "replace"){
            this.replaceState(`${location.origin}/${url}`);
        } else {
            this.pushState(`${location.origin}/${url}`);
        }
    }

    private async importModule(url:string): Promise<any>{
        let module = null;
        try{
            module = await import(url);
        } catch (e) {
            console.error(e);
        }
        return module;
    }

    private parseTokens(url:string, route:string):Tokens{
        const tokens:Tokens = {};
        url = url.replace(/\?.*/, "").trim();
        const urlSegments = url.split("/");
        route = route.replace(/^\/|\/$/g, "").trim();
        const routeSegments = route.split("/");
        for (let i = 0; i < routeSegments.length; i++){
            if (routeSegments[i].indexOf("{") === 0 && routeSegments[i].indexOf("}") === routeSegments[i].length - 1){
                const key = routeSegments[i].replace(/^\{|\}$/g, "").trim();
                tokens[key] = urlSegments[i];
            }
        }
        return tokens;
    }

    private parseGetParams(url:string):Params{
        const params:Params = {};
        const urlParams = url.match(/\?.*/)?.[0] ?? null;
        if (!urlParams){
            return params;
        }
        const urlSearchParams = new URLSearchParams(urlParams);
        urlSearchParams.forEach((value, key) => {
            if (!params?.[key]){
                const values = urlSearchParams.getAll(key);
                if (values.length > 1){
                    params[key] = values;
                } else {
                    params[key] = values[0];
                }
            }
        });
        return params;
    }

    private async import(data:string|Route, url:string, route:string): Promise<HTMLElement>{
        if (data === null){
            throw "Missing route data.";
        }

        let tagName = null;
        let file = null;
        if (typeof data === "string"){
            tagName = data;
            file = `./${data}.js`;
        } else {
            tagName = data.tagName;
            file = data.file;
        }

        const tokens = this.parseTokens(url, route);
        const params = this.parseGetParams(url);

        if (tagName === null || file === null){
            throw "Missing route data.";
        }

        if (this.modules?.[tagName]){
            return new this.modules[tagName].default(tokens, params);
        }

        let module = await this.importModule(file);
        if (module === null){
            throw "Failed to dynamically import module.";
        }

        if (!module?.default){
            const key = Object.keys(module)?.[0] ?? null;
            if (!key){
                throw "ES Module is exporting an empty object.";
            }
            module = Object.assign({
                default: module[key],
            }, module);
        }

        this.modules[tagName] = module;

        if (!customElements.get(tagName)){
            customElements.define(tagName, module.default);
        }
        
        return new this.modules[tagName].default(tokens, params);
    }

    private lookupRoute(url:string):string{
        let route = null;
        url = url.replace(/\?.*|\#.*/g, "").replace(/^\/|\/$/g, "").trim();
        const urlSegments = url.split("/");
        for (const key in this.router){
            const routeSegments = key.split("/");
            if (routeSegments.length === urlSegments.length){
                let isMatch = true;
                for (let i = 0; i < routeSegments.length; i++){
                    const routeSegment = routeSegments[i].trim().toLowerCase();
                    if (routeSegment === "*"){
                        break;
                    } else if (routeSegment.indexOf("{") === 0 && routeSegment.indexOf("}") === routeSegment.length - 1){
                        continue;
                    } else if (routeSegment === urlSegments[i].trim().toLowerCase()){
                        continue;
                    } else {
                        isMatch = false;
                        break;
                    }
                }
                if (isMatch){
                    route = key;
                    break;
                }
            }
        }
        return route;
    }

    private async route(url:string, history:"replace"|"push" = "push"){
        url = url.replace(location.origin, "").replace(/^\/|\/$/g, "").trim();
        if (url.indexOf("#") === 0){
            this.pageJump(url);
        } else {
            document.documentElement.setAttribute("router", "loading");
            let route = null;
            if (this.router?.[url]){
                route = url;
            } else {
                route = this.lookupRoute(url);
            }
            if (route === null && this.router?.["404"]){
                url = `404`;
                route = url;
            }
            try{
                const el = await this.import(this.router[route], url, route);
                this.mountElement(el, url, history);
                if (url.indexOf("#") !== -1){
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
        }
    }
}

const router = new Router();
const navigateTo = router.navigateTo.bind(router);
const configure = router.configure.bind(router);
const mount = router.mount.bind(router);
const pageJump = router.pageJump.bind(router);
const replaceState = router.replaceState.bind(router);
const pushState = router.pushState.bind(router);

export { navigateTo, configure, mount, pageJump, replaceState, pushState };
