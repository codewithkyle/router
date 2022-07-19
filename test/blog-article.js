export default class BlogArticle extends HTMLElement {
    constructor(tokens, params, data) {
        super();
        console.log("Blog Article", tokens, params, data);
        this.innerHTML = `
            <h1>Blog article page for ${tokens["SLUG"]}</h1>
            <div style="padding:200vh 0;">
                <h2 id="test">Hey you ;)</h2>
            </div>
        `;
    }
}
