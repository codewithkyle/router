export type Router = {
    [route:string]: HTMLElement | Router;
}

declare const navigate: (url:string) => void;
declare const configure: (router:Router) => void;