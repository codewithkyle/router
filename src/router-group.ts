export default class RouterGroup {
    private router: Router;
    private prefix: string;
    private middleware: Array<Function>;

    constructor(router: Router, prefix = "", middleware = []) {
        this.router = router;
        this.prefix = prefix;
        this.middleware = middleware;
    }

    public addMiddleware(closure: Function): void {
        this.middleware.push(closure);
    }

    public appendPrefix(prefix: string): void {
        this.prefix += `/${prefix.trim().replace(/^\/|\/$/g, "")}`;
    }

    public group(settings: GroupSettings, closure: Function) {
        const routerGroup = new RouterGroup(this.router, this.prefix, [
            ...this.middleware,
        ]);
        if (settings?.prefix?.length) {
            routerGroup.appendPrefix(settings.prefix);
        }
        if (settings?.middleware) {
            if (Array.isArray(settings.middleware)) {
                for (let i = 0; i < settings.middleware.length; i++) {
                    routerGroup.addMiddleware(settings.middleware[i]);
                }
            } else {
                routerGroup.addMiddleware(settings.middleware);
            }
        }
        closure(routerGroup);
    }

    public add(route: string, module: string | Function | Module): void {
        const cleanRoute = `${this.prefix}/${route
            .trim()
            .replace(/^\/|\/$/g, "")}`;
        this.router.add(cleanRoute, module, [...this.middleware]);
    }

    public redirect(
        route: string,
        url: string,
        middleware: Array<Function> = null
    ): void {
        const cleanRoute = `${this.prefix}/${route
            .trim()
            .replace(/^\/|\/$/g, "")}`;
        this.router.redirect(cleanRoute, url, [...this.middleware]);
    }
}
