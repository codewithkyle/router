export default class BlogArticle extends HTMLElement{
    constructor(tokens, params){
        super();
        console.log(tokens, params);
        this.innerHTML = "Blog article page";
    }
}