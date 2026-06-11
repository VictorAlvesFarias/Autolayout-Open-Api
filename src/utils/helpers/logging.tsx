export function logging(message: string, ...optionalParams: any[]) {
    if(message.includes("object") && optionalParams[1]?.path?.includes("address")) {
        console.log(message)
        console.log(new Date().toISOString())
        console.log("obj:", optionalParams[0])
        console.log("child:", optionalParams[1])
    }

    if (message.includes("prev")) {
        console.log(message)
        console.log(new Date().toISOString())
        console.log("location:", optionalParams[0])
        console.log("value:", optionalParams[1])
        console.log("name:", optionalParams[2])
    }

    if (message.includes("object_onchange")) {
        console.log(message)
        console.log(new Date().toISOString())
        console.log("value:", optionalParams[0])
        console.log("child:", optionalParams[1])
        console.log("next:", optionalParams[2])
    }

    if (message.includes("SchemaField") && true) {
        if (optionalParams[0]?.path?.includes("address")) {
            console.log(message)
            console.log(new Date().toISOString())
            console.log("field:", optionalParams[0].name)
            // console.log("value:", optionalParams[1])
        }
    }
}