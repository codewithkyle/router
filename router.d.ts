export type Router = {
    [route:string]: {
        tagName: string;
        file: string;
    };
}

declare const navigate: (url:string) => void;
declare const configure: (router:Router) => void;