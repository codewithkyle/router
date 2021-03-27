export type WebComponentTagName = string

export type Route = {
    tagName: string;
    file: string;
};

export type Router = {
    [route:string]: Route | string;
}

export type Tokens = {
    [token:string]: string;
};

export type Params = {
    [param:string]: string | Array<string>;
};

declare const mount: (element:HTMLElement) => void;
declare const configure: (router:Router) => void;
declare const navigateTo: (url:string, history?:"replace"|"push") => void;
declare const pageJump: (hash:string, jump?:"auto"|"smooth") => void;