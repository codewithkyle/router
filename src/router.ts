import { Router as RouterModel } from "../router";

class Router {
    public router: RouterModel;
    private mountingPoint:HTMLElement;

    constructor(){
        this.router = {};
        this.mountingPoint = document.body;
        this.hijack();
        this.hijackPopstates();
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

    private hijackPopstates():void{
        // TODO: hijack popsates
    }

    private hijack():void{
        const links = document.body.querySelectorAll(`a[href]:not([target="_blank"]):not([tracked])`);
        for (let i = 0; i < links.length; i++){
            links[i].addEventListener("click", this.hijackAnchorClick);
        }
        setTimeout(this.hijack.bind(this), 50);
    }
    
    private hijackAnchorClick:EventListener = (e:Event) => {
        e.preventDefault();
        e.stopPropagation();
        const target:HTMLAnchorElement = e.currentTarget as HTMLAnchorElement;
        this.route(target.href);
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

    private async import(file:string, tagName:string): Promise<HTMLElement>{
        const module = await import(file);
        if (!customElements.get(tagName)){
            customElements.define(tagName, module.default);
        }
        return new module.default();
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
                el = await this.import(this.router[url].file, this.router[url].tagName);
            } else {
                // TODO: dynamically determine the correct route
            }
            if (el === null && this.router?.["*"]){
                el = await this.import(this.router["*"].file, this.router["*"].tagName);
            } else if (this.router?.["404"]){
                url = `404`;
                el = await this.import(this.router["404"].file, this.router["404"].tagName);
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
