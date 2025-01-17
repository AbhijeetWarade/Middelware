#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yargs = require('yargs/yargs');



function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// function generateTagService(tag, methodsGroup) {
//     const actions = [];
//     methodsGroup.forEach(({ method, Uri, actionTypes, operationId, pathParams, queryparams, requestBodySchema }) => {
//         let requestBodySchemaDto = '';
//         let requestBodySchemaarray = '';
//         if (requestBodySchema?.$ref) {
//             requestBodySchemaDto = requestBodySchema.$ref.split('/').pop();
//         }
//         if (requestBodySchema?.type === 'array') {
//             requestBodySchemaarray = requestBodySchema.items.$ref.split('/').pop();
//         }

//         console.log(requestBodySchemaDto);
//         console.log(requestBodySchemaarray);

//         let url = Uri;
//         // add query params here
//         let result = ""; // Initialize an empty string to store all parameter strings
//         if (pathParams && pathParams.length > 0) {

//             pathParams.forEach(param => {
//                 url = url.replace(`{`, '${');
//             });




//             // Iterate over each entry in pathParams
//             for (const [propName, propDetails] of Object.entries(pathParams)) {
//                 // Assuming mapType is a function that maps schema type to a valid TypeScript type
//                 const propType = mapType(propDetails.schema.type, propDetails.format);
//                 // Create the parameter string
//                 const paramString = `${propDetails.name}: ${propType};`;
//                 // Append the paramString with a comma only if it's not the last one
//                 result += paramString + (pathParams.length > 1 ? "," : "");
//             }
//             result = result.slice(0, -1);
//             console.log(result); // Log the final result
//         }
//         else if (queryparams && queryparams.length > 0) {
//             // Iterate over each entry in pathParams
//             for (const [propName, propDetails] of Object.entries(queryparams)) {
//                 // Assuming mapType is a function that maps schema type to a valid TypeScript type
//                 let propType = mapType(propDetails.schema.type, propDetails.format);
//                 // Create the parameter string
//                 if (propDetails.schema.enum) {
//                     propType = `${capitalizeFirstLetter(tag)}${capitalizeFirstLetter(propDetails.name)}Enum`;
//                 }
//                 const paramString = `${propDetails.name}: ${propType};`;
//                 // Append the paramString with a comma only if it's not the last one
//                 result += paramString + (queryparams.length > 1 ? "," : "");
//             }
//             // Remove the last comma if there is one
//             result = result.slice(0, -1);

//         }

//         if (method === 'get') {
//             actions.push(`
// export const list${capitalize(operationId)} = (${result !== "" ? result : ""}${requestBodySchemaarray ? `data: ${requestBodySchemaarray},` : ''}${requestBodySchemaDto ? `data: ${requestBodySchemaDto},` : ''} ) => ({
// type: '${actionTypes.LIST}',
// payload: {
//     request: {
//         url: \`${url}\`,
//         method: 'GET',
//         ${requestBodySchemaarray ? `data:data ` : ''}${requestBodySchemaDto ? `data: data` : ''}
//     },
// },
// });
//         `);
//         }

//         if (method === 'post') {
//             actions.push(`
// export const add${capitalize(operationId)} = (${result !== "" ? result : ""}${requestBodySchemaarray ? `data: ${requestBodySchemaarray},` : ''}${requestBodySchemaDto ? `data: ${requestBodySchemaDto},` : ''} ) => ({
// type: '${actionTypes.ADD}',
// payload: {
//     request: {
//         url: '${url}',
//         method: 'POST',
//         ${requestBodySchemaarray ? `data: data,` : ''}${requestBodySchemaDto ? `data: data` : ''}
//     },
// },
// });
//         `);
//         }

//         if (method === 'put') {
//             actions.push(`
// export const update${capitalize(operationId)} = (${result !== "" ? result : ""}${requestBodySchemaarray ? `data: ${requestBodySchemaarray},` : ''}${requestBodySchemaDto ? `data: ${requestBodySchemaDto},` : ''} ) => ({
// type: '${actionTypes.UPDATE}',
// payload: {
//     request: {
//         url: \`${url}\`,
//         method: 'PUT',
//         ${requestBodySchemaarray ? `data: data` : ''}${requestBodySchemaDto ? `data: data` : ''}
//     },
// },
// });
//         `);
//         }

//         if (method === 'delete') {
//             actions.push(`
// export const delete${capitalize(operationId)} = (${result !== "" ? result : ""}${requestBodySchemaarray ? `data: ${requestBodySchemaarray},` : ''}   ${requestBodySchemaDto ? `data: ${requestBodySchemaDto},` : ''} )) => ({
// type: '${actionTypes.DELETE}',
// payload: {
//     request: {
//         ${requestBodySchemaarray ? `data: data,` : ''}${requestBodySchemaDto ? `data: data,` : ''}
//         url: \`${url}\`,
//         method: 'DELETE',
//     },
// },
// });
//         `);
//         }
//     });

//     return `// Generated Service for ${tag} \n\n` + actions.join('\n');
// }




function generateTagService(tag, methodsGroup) {
    const actions = [];
    const imports = new Set(); // To collect unique DTOs or Enums for import

    methodsGroup.forEach(({ method, Uri, actionTypes, operationId, pathParams, queryparams, requestBodySchema }) => {
        let requestBodySchemaDto = '';
        let requestBodySchemaarray = '';

        if (requestBodySchema?.$ref) {
            requestBodySchemaDto = requestBodySchema.$ref.split('/').pop();
            imports.add(requestBodySchemaDto);
        }

        if (requestBodySchema?.type === 'array') {
            requestBodySchemaarray = requestBodySchema.items.$ref.split('/').pop();
            imports.add(requestBodySchemaarray);
        }

        let url = Uri;
        let result = ""; // To store path and query parameters

        if (pathParams && pathParams.length > 0) {
            pathParams.forEach(param => {
                url = url.replace(`{`, '${');
            });

            for (const [propName, propDetails] of Object.entries(pathParams)) {
                const propType = mapType(propDetails.schema.type, propDetails.format);
                const paramString = `${propDetails.name}: ${propType}`;
                result += paramString + (pathParams.length > 1 ? "," : "");
            }
            result = result.replace(/,$/, '');
        } else if (queryparams && queryparams.length > 0) {
            for (const [propName, propDetails] of Object.entries(queryparams)) {
                let propType = mapType(propDetails.schema.type, propDetails.format);
                if (propDetails.schema.enum) {
                    propType = `${capitalizeFirstLetter(tag)}${capitalizeFirstLetter(propDetails.name)}Enum`;
                    imports.add(propType);
                }
                const paramString = `${propDetails.name}: ${propType}`;
                result += paramString + (queryparams.length > 1 ? "," : "");
            }
            result = result.replace(/,$/, '');
        }
        var paramater = `${result !== "" ? result : ""}${requestBodySchemaarray ? `,data: ${requestBodySchemaarray}` : ''}${requestBodySchemaDto ? `,data: ${requestBodySchemaDto}` : ''} `;

        //it it contain any data at the start then  also remove only ,
        paramater = paramater.replace(/^,/, '');

        // same thing form end
        paramater = paramater.replace(/,$/, '');

        if (method === 'get') {
            actions.push(`
export const list${removeSpecialCharacters(capitalize(operationId))} = (${paramater}) => ({
type: '${removeSpecialCharacters(actionTypes.LIST)}',
payload: {
    request: {
        url: \`${url}\`,
        method: 'GET',
        ${requestBodySchemaarray ? `data:data ` : ''}${requestBodySchemaDto ? `data: data` : ''}
    },
},
});
            `);
        }

        if (method === 'post') {
            actions.push(`
export const add${removeSpecialCharacters(capitalize(operationId))} = (${paramater}) => ({
type: '${removeSpecialCharacters(actionTypes.ADD)}',
payload: {
    request: {
        url: '${url}',
        method: 'POST',
        ${requestBodySchemaarray ? `data: data,` : ''}${requestBodySchemaDto ? `data: data` : ''}
    },
},
});
            `);
        }

        if (method === 'put') {
            actions.push(`
export const update${removeSpecialCharacters(capitalize(operationId))} = (${paramater}) => ({
type: '${removeSpecialCharacters(actionTypes.UPDATE)}',
payload: {
    request: {
        url: \`${url}\`,
        method: 'PUT',
        ${requestBodySchemaarray ? `data: data` : ''}${requestBodySchemaDto ? `data: data` : ''}
    },
},
});
            `);
        }

        if (method === 'delete') {
            actions.push(`
export const delete${removeSpecialCharacters(capitalize(operationId))} = (${paramater}) => ({
type: '${removeSpecialCharacters(actionTypes.DELETE)}',
payload: {
    request: {
        ${requestBodySchemaarray ? `data: data,` : ''}${requestBodySchemaDto ? `data: data,` : ''}
        url: \`${url}\`,
        method: 'DELETE',
    },
},
});
            `);
        }
    });

    const importStatements = Array.from(imports)
        .map(importItem => `import { ${importItem} } from "../Models/Model";`)
        .join('\n');

    return `// Generated Service for ${tag} \n\n${importStatements}\n\n` + actions.join('\n');
}




function createActionTypes(baseName) {
    return {
        LIST: `LIST_${baseName}`,
        ADD: `ADD_${baseName}`,
        UPDATE: `UPDATE_${baseName}`,
        DELETE: `DELETE_${baseName}`,
    };
}






/**
 * Main function to generate API services and reducers
 * @param {Object} config
 * @param {string} config.openApiSource - Path or URL to the OpenAPI schema
 * @param {string} config.outputDir - Output directory for generated files
 */

async function generateApiServices({ openApiSource, outputDir }) {
    let openApiSchema;

    if (openApiSource?.startsWith('http') || openApiSource?.startsWith('https')) {
        const response = await axios.get(openApiSource);
        openApiSchema = response.data;
    } else {
        openApiSchema = JSON.parse(fs.readFileSync(openApiSource, 'utf8'));
    }

    const apiBasePath = openApiSchema.servers[0].url || '';
    const paths = openApiSchema.paths;
    // Ensure folders exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }
    generateDTO(openApiSchema, outputDir);


    const tagMethodsMap = {};

    for (let [route, methods] of Object.entries(paths)) {
        Object.keys(methods).forEach((method) => {
            const tags = methods[method].tags;
            var Uri = route;
            const operationId = methods[method].operationId;
            const parameters = methods[method].parameters;
            const requestBody = methods[method].requestBody;
            // how to get the request body schema

            let requestBodySchema = requestBody?.content?.['application/json']?.schema;


            var queryparams = parameters?.filter(param => param.in === 'query');
            var pathParams = parameters?.filter(param => param.in === 'path');
            if (queryparams && queryparams.length > 0) {
                Uri = route + '?' + queryparams.map(param => param.name + '=${' + param.name + '}').join('&');
            }





            if (tags && tags.length > 0) {
                tags.forEach((tag) => {
                    if (!tagMethodsMap[tag]) {
                        tagMethodsMap[tag] = {
                            list: false,
                            add: false,
                            update: false,
                            delete: false,
                            methods: [],
                        };
                    }

                    const methodInfo = {
                        method,
                        Uri,
                        operationId,
                        pathParams,
                        queryparams,
                        requestBodySchema,
                        actionTypes: createActionTypes(operationId.toUpperCase()),
                    };

                    if (method === 'get' && !tagMethodsMap[tag].list) {
                        tagMethodsMap[tag].list = true;
                        tagMethodsMap[tag].methods.push(methodInfo);
                    }
                    if (method === 'post' && !tagMethodsMap[tag].add) {
                        tagMethodsMap[tag].add = true;
                        tagMethodsMap[tag].methods.push(methodInfo);
                    }
                    if (method === 'put' && !tagMethodsMap[tag].update) {
                        tagMethodsMap[tag].update = true;
                        tagMethodsMap[tag].methods.push(methodInfo);
                    }
                    if (method === 'delete' && !tagMethodsMap[tag].delete) {
                        tagMethodsMap[tag].delete = true;
                        tagMethodsMap[tag].methods.push(methodInfo);
                    }
                });
            }
        });
    }

    const reducersFolder = path.join(outputDir, 'reducers');
    const servicesFolder = path.join(outputDir, 'services');


    if (!fs.existsSync(reducersFolder)) {
        fs.mkdirSync(reducersFolder);
    }
    if (!fs.existsSync(servicesFolder)) {
        fs.mkdirSync(servicesFolder);
    }
    for (const [tag, methodsGroup] of Object.entries(tagMethodsMap)) {
        const serviceContent = generateTagService(tag, methodsGroup.methods, apiBasePath);
        fs.writeFileSync(path.join(servicesFolder, `${tag}Service.ts`), serviceContent);

      const reducerContent = generateTagReducer(tag, methodsGroup.methods);
          fs.writeFileSync(path.join(reducersFolder, `${tag}Reducer.ts`), reducerContent);
    }
    generateCombinedReducers(reducersFolder);
    console.log('All API services and reducers generated successfully!');
}



function removeSpecialCharacters(input) {
    return input.replace(/[^a-zA-Z0-9]/g, '');
  }

function generateTagReducer(tag, methodsGroup) {
    const actionTypes = methodsGroup.reduce((acc, { operationId }) => {
        const types = createActionTypes(operationId.toUpperCase());
        return { ...acc, ...types };
    }, {});
    tag = removeSpecialCharacters(tag);
    return `
  import type { Action } from 'redux';

  interface ${tag}Action extends Action {
    payload?: {
      data?: any;
      item?: { id: number };
      error?: string;
    };
    error?: {
      data?: string;
    };
  }

  interface ${tag}State {
    data: any[];
    status: 'idle' | 'loading' | 'success' | 'failure';
    error: string | null;
  }

  const initialState: ${tag}State = {
    data: [],
    status: 'idle',
    error: null,
  };

  const SUCCESS_SUFFIX = '_SUCCESS';
  const FAILURE_SUFFIX = '_FAIL';

  const ${tag}Reducer = (state = initialState, action: ${tag}Action): ${tag}State => {
    switch (action.type) {
      ${methodsGroup.map(({ operationId }) => {
        const types = createActionTypes(operationId.toUpperCase());
        return `
      case '${removeSpecialCharacters(types.LIST)}':
        return { ...state, status: 'loading', error: null };
      case '${removeSpecialCharacters(types.LIST)}' + SUCCESS_SUFFIX:
        return { ...state, data: action.payload?.data || [], status: 'success', error: null };
      case '${removeSpecialCharacters(types.LIST)}' + FAILURE_SUFFIX:
        return { ...state, status: 'failure', error: action.error?.data || null };
      
      case '${removeSpecialCharacters(types.ADD)}':
        return { ...state, status: 'loading', error: null };
      case '${removeSpecialCharacters(types.ADD)}' + SUCCESS_SUFFIX:
        return {
          ...state,
          data: [...state.data, action.payload?.data],
          status: 'success',
          error: null,
        };
      case '${removeSpecialCharacters(types.ADD)}' + FAILURE_SUFFIX:
        return { ...state, status: 'failure', error: action.error?.data || null };
      
      case '${removeSpecialCharacters(types.UPDATE)}':
        return { ...state, status: 'loading', error: null };
      case '${removeSpecialCharacters(types.UPDATE)}' + SUCCESS_SUFFIX:
        return {
          ...state,
          data: state.data.map(item =>
            item.id === action.payload?.data?.id ? action.payload?.data : item
          ),
          status: 'success',
          error: null,
        };
      case '${removeSpecialCharacters(types.UPDATE)}' + FAILURE_SUFFIX:
        return { ...state, status: 'failure', error: action.error?.data || null };
      
      case '${removeSpecialCharacters(types.DELETE)}':
        return { ...state, status: 'loading', error: null };
      case '${removeSpecialCharacters(types.DELETE)}' + SUCCESS_SUFFIX:
        return {
          ...state,
          data: state.data.filter(item => item.id !== action.payload?.item?.id),
          status: 'success',
          error: null,
        };
      case '${removeSpecialCharacters(types.DELETE)}' + FAILURE_SUFFIX:
        return { ...state, status: 'failure', error: action.payload?.error || null };
        `;
      }).join('')}
      
      case 'RESET_${tag.toUpperCase()}_STATE':
        return initialState;

      default:
        return state;
    }
  };

  export default ${tag}Reducer;
    `;
}



function generateDTO(jsonData, dtopath) {
    const schemas = jsonData.components.schemas;
    let dtoClasses = "";
    let enums = "";
    let classpath = path.join(dtopath, 'Models');
    for (const [schemaName, schema] of Object.entries(schemas)) {
        const properties = schema.properties || {};

        // Start defining the class
        let classDef = `export class ${schemaName} {\n`;

        for (const [propName, propDetails] of Object.entries(properties)) {
            let propType;
            if (propDetails.enum) {
                const enumName = `${schemaName}${capitalizeFirstLetter(propName)}Enum`;
                propType = enumName;
                enums += generateEnum(enumName, propDetails.enum);
            } else if (propDetails.type === 'array' && propDetails.items) {
                if (propDetails.items.$ref) {
                    const refType = propDetails.items.$ref.split('/').pop();
                    propType = `${refType}[]`;
                } else {
                    const itemType = mapType(propDetails.items.type, propDetails.items.format);
                    propType = `${itemType}[]`;
                }
            } else if (propDetails.$ref) {
                const refType = propDetails.$ref.split('/').pop();
                propType = refType;
            } else {
                propType = mapType(propDetails.type, propDetails.format);
            }
            classDef += `    ${removeSpecialCharacters(propName)}!: ${propType};\n`;
        }

        classDef += "}\n\n";
        dtoClasses += classDef;

    }
    if (!fs.existsSync(classpath)) {
        fs.mkdirSync(classpath);
    }
    const outputPath = path.join(classpath, `Model.ts`);
    fs.writeFileSync(outputPath, enums + dtoClasses);
}

function mapType(jsonType, jsonFormat) {
    const typeMapping = {
        integer: "number",
        string: "string",
        boolean: "boolean",
        array: "any[]",
        object: "any",
    };
    const formatMapping = {
        int64: "number",
        int32: "number",
        "date-time": "string",
    };

    return formatMapping[jsonFormat] || typeMapping[jsonType] || "any";
}

function generateEnum(enumName, enumValues) {
    let enumDef = `export enum ${enumName} {\n`;
    for (const value of enumValues) {
        enumDef += `    ${capitalizeFirstLetter(removeSpecialCharacters(value))} = "${value}",\n`;
    }
    enumDef += "}\n\n";
    return enumDef;
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
// end of enum generation and dtogenration code




function generateCombinedReducers(folderPath) {
    const reducerFiles = fs.readdirSync(folderPath).filter((file) => file.endsWith('Reducer.ts'));
  
    const imports = [];
    const combineReducersContent = [];
  
    reducerFiles.forEach((file) => {
      const reducerName = path.basename(file, path.extname(file));
      imports.push(`import ${removeSpecialCharacters(reducerName)} from './${file.replace('.ts', '')}';`);
      combineReducersContent.push(`  ${removeSpecialCharacters(reducerName)}`);
    });
  
    const combinedReducersContent = `
  ${imports.join('\n')}
  
  import { combineReducers } from 'redux';
  
  export default combineReducers({
  ${combineReducersContent.join(',\n')}
  });
  `;
  
    fs.writeFileSync(path.join(folderPath, 'combinedReducers.ts'), combinedReducersContent);
    console.log('Combined reducers file generated successfully!');
  }
  


// Parse command-line arguments
const args = yargs(process.argv.slice(2))
    .usage('Usage: api-generator --source <path or URL> --output <directory>')
    .option('source', {
        alias: 's',
        describe: 'Path or URL to the OpenAPI schema',
        type: 'string',
        demandOption: true,
    })
    .option('output', {
        alias: 'o',
        describe: 'Output directory for generated files',
        type: 'string',
        demandOption: true,
    })
    .help('h')
    .alias('h', 'help')
    .argv;

(async () => {
    try {
        const { source, output } = args;
        const resolvedOutput = path.resolve(output);
        console.log(`Generating API services and reducers...`);
        console.log(`Output Directory: ${resolvedOutput}`);

        await generateApiServices({ openApiSource: source, outputDir: resolvedOutput });

        console.log('API services and reducers generated successfully!');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
})();
