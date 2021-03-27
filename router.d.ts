export type Route = {
    tagName: string;
    file: string;
};

export type Router = {
    [route:string]: Route | string;
}

declare const mount: (element:HTMLElement) => void;
declare const configure: (router:Router) => void;
declare const navigateTo: (url:string, history:"replace"|"push") => void;