export type Route = {
    tagName: string;
    file: string;
};

export type Router = {
    [route:string]: Route | string;
}

declare const navigate: (url:string) => void;
declare const configure: (router:Router) => void;