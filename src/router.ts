import { Router as RouterModel } from "../router";

class Router {
    public router: RouterModel;

    constructor(){
        this.router = {};
        this.hijack();
        this.hijackPopstates();
    }

    public configure(router:RouterModel):void{
        this.router = router;
        this.route(location.href);
    }

    public navigate(url:string):void{
        if (url.indexOf(location.origin) === 0){
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

    private route(url:string):void{
        url = url.replace(location.origin, "").replace(/^\//, "");
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
            // TODO: break down routes & test until one matches, then append the web component to the mounting point/body w/ injected params
            this.pushState(`${location.origin}/${url}`);
        }
    }
}

const router = new Router();
const navigate = router.navigate.bind(router);
const configure = router.configure.bind(router);

export { navigate, configure };