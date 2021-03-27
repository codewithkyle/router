export default class BlogArticle extends HTMLElement{
    constructor(tokens){
        super();
        console.log(tokens);
        this.innerHTML = "Blog article page";
    }
}