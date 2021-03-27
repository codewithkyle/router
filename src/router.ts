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
        document.addEventListener("click", this.hijackClick, {capture: true});
        window.addEventListener("popstate", this.hijackPopstate);
    }

    public configure(router:RouterModel):void{
        this.router = {};
        for (const key in router){
            this.router[key.replace(/^\/|\/$/g, "")] = router[key];
        }
        this.route(location.href, "replace");
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

    private hijackPopstate = (e:PopStateEvent) => {
        if (e.state?.url){
            this.route(e.state.url, "replace");
        }
    }
    
    private hijackClick:EventListener = (e:Event) => {
        if (e.target instanceof HTMLAnchorElement && e.target.target !== "_blank" && e.target?.href?.length){
            e.preventDefault();
            e.stopPropagation();
            let history = e.target.getAttribute("history");
            if (history === "push" || history === "replace"){
                this.route(e.target.href, history);
            } else {
                this.route(e.target.href);
            }
        }
    }

    private replaceState(url:string):void{
        window.history.replaceState({
            url: url,
        }, document.title, url);
    }

    private pushState(url:string):void{
        window.history.pushState({
            url: url,
        }, document.title, url);
    }

    private mountElement(el, url, history):void{
        this.mountingPoint?.firstElementChild?.remove();
        this.mountingPoint.appendChild(el);
        if (history === "replace"){
            this.replaceState(`${location.origin}/${url}`);
        } else {
            this.pushState(`${location.origin}/${url}`);
        }
    }

    private async importModule(file): Promise<any>{
        let module = null;
        try{
            module = await import(file);
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
            return null;
        }

        if (this.modules?.[tagName]){
            return new this.modules[tagName].default(tokens, params);
        }

        let module = await this.importModule(file);
        if (module === null){
            return null;
        }

        if (!module?.default){
            const key = Object.keys(module)?.[0] ?? null;
            if (!key){
                return null;
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

    private pageJump(hash:string){
        const el:HTMLElement = document.body.querySelector(hash);
        if (el){
            el.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "center"
            });
        }
        this.replaceState(`${location.origin}${location.pathname}${hash}`);
    }

    private async route(url:string, history:"replace"|"push" = "push"){
        url = url.replace(location.origin, "").replace(/^\/|\/$/g, "").trim();
        if (url.indexOf("#") === 0){
            this.pageJump(url);
        } else if (url.indexOf("#") !== -1 && url.indexOf(location.pathname.replace(/^\/|\/$/g, "").trim()) === 0) {
            this.pageJump(url.match(/\#.*/)[0]);
        } else {
            document.documentElement.setAttribute("router", "loading");
            let route = null;
            if (this.router?.[url]){
                route = url;
            } else {
                // TODO: dynamically determine the correct route
            }
            if (route === null && this.router?.["404"]){
                url = `404`;
                route = url;
            }
            if (route !== null){
                const el = await this.import(this.router[route], url, route);
                if (el !== null){
                    this.mountElement(el, url, history);
                } else {
                    location.href = `${location.origin}/404`;
                }
            } else {
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

export { navigateTo, configure, mount };
