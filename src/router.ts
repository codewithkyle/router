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
    }

    public configure(router:RouterModel):void{
        this.router = {};
        for (const key in router){
            this.router[key.replace(/^\/|\/$/g, "")] = router[key];
        }
        this.route(location.href);
    }

    public mount(element:HTMLElement):void{
        this.mountingPoint = element;
    }

    public navigateTo(url:string):void{
        if (url.indexOf(location.origin) === 0 || url.indexOf("/") === 0){
            this.route(url);
        } else {
            location.href = url;
        }
    }
    
    private hijackClick:EventListener = (e:Event) => {
        if (e.target instanceof HTMLAnchorElement){
            e.preventDefault();
            e.stopPropagation();
            this.route(e.target.href);
        }
    }

    private replaceState(url:string):void{
        window.history.replaceState(null, document.title, url);
    }

    private pushState(url:string):void{
        window.history.pushState(null, document.title, url);
    }

    private mountElement(el, url):void{
        this.mountingPoint?.firstElementChild?.remove();
        this.mountingPoint.appendChild(el);
        this.pushState(`${location.origin}/${url}`);
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

        const module = await import(file);
        this.modules[tagName] = module;

        if (!customElements.get(tagName)){
            customElements.define(tagName, module.default);
        }
        
        return new this.modules[tagName].default();
    }

    private async route(url:string){
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
                this.mountElement(el, url);
            } else {
                location.href = `${location.origin}/404`;
            }
        }
    }
}

const router = new Router();
const navigateTo = router.navigateTo.bind(router);
const configure = router.configure.bind(router);
const mount = router.mount.bind(router);

export { navigateTo, configure, mount };
