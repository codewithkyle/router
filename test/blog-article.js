export default class BlogArticle extends HTMLElement{
    constructor(tokens, params){
        super();
        console.log(tokens, params);
        this.innerHTML = `
            <h1>Blog article page</h1>
            <div style="padding:200vh 0;">
                <h2 id="test">Hey you ;)</h2>
            </div>
        `;
    }
}