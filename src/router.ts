import { Router as RouterModel, Route } from "../router";

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
            this.route(e.target.href);
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

    private async import(data:string|Route): Promise<HTMLElement>{
        let tagName = null;
        let file = null;
        if (typeof data === "string"){
            tagName = data;
            file = `./${tagName}.js`;
        } else {
            tagName = data.tagName;
            file = data.file;
        }

        if (tagName === null || file === null){
            return null;
        }

        if (this.modules?.[tagName]){
            return new this.modules[tagName].default();
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
        
        return new this.modules[tagName].default();
    }

    private async route(url:string, history:"replace"|"push" = "push"){
        url = url.replace(location.origin, "").replace(/^\//, "").replace(/\/$/, "");
        if (url.indexOf("#") === 0){
            const el:HTMLElement = document.body.querySelector(url);
            if (el){
                el.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                    inline: "center"
                });
            }
            this.replaceState(`${location.origin}${location.pathname}${url}`);
        } else {
            document.documentElement.setAttribute("router", "loading");
            let el = null;
            if (this.router?.[url]){
                el = await this.import(this.router[url]);
            } else {
                // TODO: dynamically determine the correct route
            }
            if (el === null && this.router?.["*"]){
                el = await this.import(this.router["*"]);
            } else if (this.router?.["404"]){
                url = `404`;
                el = await this.import(this.router["404"]);
            }
            if (el !== null){
                this.mountElement(el, url, history);
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
