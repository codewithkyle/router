export type Route = {
    middleware: Array<Function>;
    redirect?: string;
    tagName?: string;
    file?: string;
    regex: Array<RegExp>;
    tokens: Array<string>;
    closure?: Function;
    route: string;
    segments: Array<string>;
};

export type PreloadingDetails = {
    path: string,
    hash: string,
    params: Params,
};
export type LoadingDetails = {
    path: string,
    hash: string,
    params: Params,
    tokens: Tokens,
};

export type LoadedDetails = {
    path: string,
    hash: string,
    tokens: Tokens,
    params: Params,
    data: Data,
};

export type Module = {
    tagName: string;
    file: string;
};

export type Tokens = {
    [token: string]: string;
};

export type Params = {
    [param: string]: string | Array<string>;
};

export type Data = {
    [key:string]: any;
};

export type GroupSettings = {
    prefix?: string;
    middleware?: Array<Function> | Function;
};

declare class RouterGroup {
    public group(
        settings: GroupSettings,
        closure: (router: Router | RouterGroup) => void
    ): RouterGroup;
    public add(
        route: string,
        module: string | Function | Module,
        middleware?: Function | Array<Function>
    ): void;
    public redirect(
        route: string,
        url: string,
        middleware?: Array<Function>
    ): void;
}

declare class Router {
    public group(
        settings: GroupSettings,
        closure: (router: Router | RouterGroup) => void
    ): RouterGroup;
    public add(
        route: string,
        module: string | Function | Module,
        middleware?: Function | Array<Function>
    ): void;
    public redirect(
        route: string,
        url: string,
        middleware?: Array<Function>
    ): void;
}

declare const mount: (element: HTMLElement) => void;
declare const navigateTo: (url: string, history?: "replace" | "push") => void;
declare const pageJump: (hash: string, jump?: "auto" | "smooth") => void;
declare const replaceState: (url: string) => void;
declare const pushState: (url: string) => void;
declare const router: Router;
