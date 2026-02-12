const getFullTag = (htmlString: string) => {
    const spiltString = htmlString.split(">");

    return spiltString.length > 0 ? spiltString[0] + '>' : null
}

export const addClassToElements = (htmlString: string, className: string) => {
    const tag = getFullTag(htmlString);

    if (!tag)
        return htmlString;

    const newTag = tag.includes('class="') ?
        tag.replace('class="', `class="${className} `) :
        tag.replace('>', ` class="${className}">`);

    return htmlString.replaceAll(tag, newTag);
}

export const addStyleToElements = (props: addStyleProps) => {
    const { htmlString, style, value } = props;

    const tag = getFullTag(htmlString);

    if (!tag)
        return htmlString;

    const hasStyle = tag.includes(`style="`)

    let newTag = '';

    if ("itemsNumber" in props && value instanceof Function) {
        let i = 0

        let newHtmlString = htmlString

        for (; i < props.itemsNumber; i++) {
            newTag = hasStyle ?
                tag.replace(`style="`, `style="${style}: ${value(i, props.itemsNumber)};`) :
                tag.replace(`>`, ` style="${style}: ${value(i, props.itemsNumber)};">`);

            newHtmlString = newHtmlString.replace(tag, newTag);
        }

        return newHtmlString
    }
    else {
        newTag = hasStyle ?
            tag.replace(`style="`, `style="${style}: ${value};`) :
            tag.replace(`>`, ` style="${style}: ${value};">`);

        return htmlString.replaceAll(tag, newTag);
    }
}