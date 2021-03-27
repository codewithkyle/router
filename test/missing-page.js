export class MissingPage extends HTMLElement{
    constructor(){
        super();
        this.innerHTML = `
        <div flex="items-center row nowrap" class="font-grey-800">
            <span class="font-bold font-lg inline-block">404</span> <span class="inline-block mx-0.5">|</span> <span class="inline-block">This page does not exist.</span>
        </div>`;
    }
}