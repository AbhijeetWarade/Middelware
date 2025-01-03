#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yargs = require('yargs/yargs');

/**
 * Main function to generate API services and reducers
 * @param {Object} config
 * @param {string} config.openApiSource - Path or URL to the OpenAPI schema
 * @param {string} config.outputDir - Output directory for generated files
 */

function removeSpecialCharacters(input) {
  return input.replace(/[^a-zA-Z0-9]/g, '');
}

function generateTagReducer(tag, methodsGroup) {
  const actionTypes = methodsGroup.reduce((acc, { actionTypes: methodActionTypes }) => ({ ...acc, ...methodActionTypes }), {});

  tag = removeSpecialCharacters(tag);
  return `
import type { AnyAction } from 'redux';

const initialState: any[] = [];
const SUCCESS_SUFFIX = '_SUCCESS';

const ${tag}Reducer = (state = initialState, action: AnyAction) => {
  switch (action.type) {
    case '${actionTypes.LIST}' + SUCCESS_SUFFIX:
      return action.payload.data;

    case '${actionTypes.ADD}' + SUCCESS_SUFFIX:
      return [...state, action.payload.data];

    case '${actionTypes.UPDATE}' + SUCCESS_SUFFIX:
      return state.map(item => item.id === action.payload.data.id ? action.payload.data : item);

    case '${actionTypes.DELETE}':
      return state.filter(item => item.id !== action.payload.item.id);

    default:
      return state;
  }
};

export default ${tag}Reducer;
  `;
}

function generateTagService(tag, methodsGroup, apiBasePath) {
  const actions = [];

  methodsGroup.forEach(({ method, route, actionTypes }) => {
    const entityName = route
      .split('/')
      .filter(part => part && !part.startsWith('{'))
      .join('_')
      .toLowerCase();

    if (method === 'get') {
      actions.push(`
export const list${capitalize(tag)} = () => ({
  type: '${actionTypes.LIST}',
  payload: {
    request: {
      url: '${route.replace(/^\//, '')}',
      method: 'GET',
    },
  },
});
      `);
    }

    if (method === 'post') {
      actions.push(`
export const add${capitalize(tag)} = (item : any) => ({
  type: '${actionTypes.ADD}',
  payload: {
    request: {
      url: '${route.replace(/^\//, '')}',
      method: 'POST',
      data: item,
    },
  },
});
      `);
    }

    if (method === 'put') {
      actions.push(`
export const update${capitalize(tag)} = (item : any) => ({
  type: '${actionTypes.UPDATE}',
  payload: {
    request: {
      url: \`\${'${route.replace(/^\//, '')}'}/\${item.id}\`,
      method: 'PUT',
      data: item,
    },
  },
});
      `);
    }

    if (method === 'delete') {
      actions.push(`
export const delete${capitalize(tag)} = (item : any) => ({
  type: '${actionTypes.DELETE}',
  payload: {
    item,
    request: {
      url: \`\${'${route.replace(/^\//, '')}'}/\${item.id}\`,
      method: 'DELETE',
    },
  },
});
      `);
    }
  });

  return `// Generated Service for ${tag} \n\n` + actions.join('\n');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function createActionTypes(baseName) {
  return {
    LIST: `LIST_${baseName}`,
    ADD: `ADD_${baseName}`,
    UPDATE: `UPDATE_${baseName}`,
    DELETE: `DELETE_${baseName}`,
  };
}

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

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const tagMethodsMap = {};

  for (const [route, methods] of Object.entries(paths)) {
    Object.keys(methods).forEach((method) => {
      const tags = methods[method].tags;
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
            route,
            actionTypes: createActionTypes(tag.toUpperCase()),
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

  // Ensure folders exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
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

  console.log('All API services and reducers generated successfully!');

  // Generate combined reducers in the reducers folder
  generateCombinedReducers(reducersFolder);
}

// Adjust combinedReducers file generation to use reducersFolder
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
    console.log(`Source: ${source}`);
    console.log(`Output Directory: ${resolvedOutput}`);

    await generateApiServices({ openApiSource: source, outputDir: resolvedOutput });

    console.log('API services and reducers generated successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
