import {Plugin, ResolvedConfig, normalizePath, ViteDevServer} from 'vite';
import path from 'path';
import {promises as fs} from 'fs';
import type {HydrogenVitePluginOptions} from '../types.js';
import {viteception} from '../viteception.js';
import type {HydrogenConfig} from '../../config.js';
import {resolvePluginUrl} from '../load-config.js';

export const HYDROGEN_DEFAULT_SERVER_ENTRY =
  process.env.HYDROGEN_SERVER_ENTRY || '/src/App.server';

// The character ":" breaks Vite with Node >= 16.15. Use "_" instead
const VIRTUAL_PREFIX = 'virtual__';
const PROXY_PREFIX = 'proxy__';

const ERROR_FILE = 'error.jsx';
const VIRTUAL_ERROR_FILE = VIRTUAL_PREFIX + ERROR_FILE;

const HYDROGEN_CONFIG_ID = 'hydrogen.config.ts';
const VIRTUAL_HYDROGEN_CONFIG_ID = VIRTUAL_PREFIX + HYDROGEN_CONFIG_ID;
export const VIRTUAL_PROXY_HYDROGEN_CONFIG_ID =
  VIRTUAL_PREFIX + PROXY_PREFIX + HYDROGEN_CONFIG_ID;

const HYDROGEN_ROUTES_ID = 'hydrogen-routes.server.jsx';
const VIRTUAL_HYDROGEN_ROUTES_ID = VIRTUAL_PREFIX + HYDROGEN_ROUTES_ID;
export const VIRTUAL_PROXY_HYDROGEN_ROUTES_ID =
  VIRTUAL_PREFIX + PROXY_PREFIX + HYDROGEN_ROUTES_ID;

export default (pluginOptions: HydrogenVitePluginOptions) => {
  let config: ResolvedConfig;
  let server: ViteDevServer;
  let cachedHydrogenConfig: HydrogenConfig | undefined;

  return {
    name: 'hydrogen:virtual-files',
    configResolved(_config) {
      config = _config;
    },
    configureServer(_server) {
      server = _server;
    },
    resolveId(source, importer) {
      if (source === VIRTUAL_HYDROGEN_CONFIG_ID) {
        return findHydrogenConfigPath(
          config.root,
          pluginOptions.configPath
        ).then((hcPath: string) =>
          // This direct dependency on a real file
          // makes HMR work for the virtual module.
          this.resolve(hcPath, importer, {skipSelf: true})
        );
      }

      if (
        [
          VIRTUAL_PROXY_HYDROGEN_CONFIG_ID,
          VIRTUAL_PROXY_HYDROGEN_ROUTES_ID,
          VIRTUAL_HYDROGEN_ROUTES_ID,
          VIRTUAL_ERROR_FILE,
        ].includes(source)
      ) {
        // Virtual modules convention
        // https://vitejs.dev/guide/api-plugin.html#virtual-modules-convention

        return '\0' + source;
      }
    },
    load(id) {
      // Likely due to a bug in Vite, but virtual modules cannot be loaded
      // directly using ssrLoadModule from a Vite plugin. It needs to be proxied as follows:
      if (id === '\0' + VIRTUAL_PROXY_HYDROGEN_CONFIG_ID) {
        cachedHydrogenConfig = undefined;
        return `import hc from '${VIRTUAL_HYDROGEN_CONFIG_ID}'; export default hc;`;
      }
      if (id === '\0' + VIRTUAL_PROXY_HYDROGEN_ROUTES_ID) {
        return `import hr from '${VIRTUAL_HYDROGEN_ROUTES_ID}'; export default hr;`;
      }

      if (id === '\0' + VIRTUAL_HYDROGEN_ROUTES_ID) {
        return importHydrogenConfig().then(async (hc) => {
          let code = generateRoutesCodeExport(hc.routes);

          if (hc.plugins) {
            for (let index = 0; index < hc.plugins.length; index++) {
              const plugin = hc.plugins[index];
              const [importUrl, absoluteUrl] = resolvePluginUrl(
                plugin,
                config.root
              );

              if (!plugin.routes) {
                try {
                  await fs.access(path.join(absoluteUrl, 'routes'));
                } catch {
                  // Plugin does not provide `routes`
                  continue;
                }
              }

              const routes =
                typeof plugin.routes === 'string'
                  ? {files: plugin.routes}
                  : plugin.routes || {files: './routes'};

              code += generateRoutesCodeExport(routes, importUrl, `p${index}`);
            }
          }

          if (config.command === 'serve') {
            // Add dependency on Hydrogen config for HMR
            code += `\nimport '${VIRTUAL_HYDROGEN_CONFIG_ID}';`;
          }

          return {code};
        });
      }

      if (id === '\0' + VIRTUAL_ERROR_FILE) {
        return importHydrogenConfig().then((hc) => {
          const errorPath = hc.serverErrorPage ?? '/src/Error.{jsx,tsx}';
          const code = `const errorPage = import.meta.glob("${errorPath}");\n export default Object.values(errorPage)[0];`;
          return {code};
        });
      }
    },
  } as Plugin;

  async function importHydrogenConfig() {
    if (!cachedHydrogenConfig) {
      if (server) {
        const loaded = await server.ssrLoadModule(
          VIRTUAL_PROXY_HYDROGEN_CONFIG_ID
        );

        cachedHydrogenConfig = loaded.default;
      } else {
        const {loaded} = await viteception([VIRTUAL_PROXY_HYDROGEN_CONFIG_ID]);
        cachedHydrogenConfig = loaded[0].default;
      }
    }

    return cachedHydrogenConfig as HydrogenConfig;
  }
};

function generateRoutesCodeExport(
  routes: HydrogenConfig['routes'],
  baseResolvePath?: string,
  exportName?: string
) {
  let routesPath: string =
    (typeof routes === 'string' ? routes : routes?.files) ?? '/src/routes';

  if (routesPath.startsWith('./')) {
    routesPath = routesPath.slice(1);
    if (baseResolvePath) {
      routesPath = baseResolvePath + routesPath;
    }
  }

  if (!routesPath.includes('*')) {
    if (!routesPath.endsWith('/')) {
      routesPath += '/';
    }

    routesPath += '**/*.server.[jt](s|sx)';
  }

  const [dirPrefix] = routesPath.split('/*');

  return `export ${
    exportName ? `const ${exportName} =` : 'default'
  } {\n  dirPrefix: '${dirPrefix}',\n  basePath: '${
    (typeof routes !== 'string' && routes?.basePath) || ''
  }',\n  files: import.meta.globEager('${routesPath}')\n};\n`;
}

async function findHydrogenConfigPath(root: string, userProvidedPath?: string) {
  let configPath = userProvidedPath;

  if (!configPath) {
    // Find the config file in the project root
    const files = await fs.readdir(root);
    configPath = files.find((file) => /^hydrogen\.config\.[jt]s$/.test(file));
  }

  if (configPath) {
    configPath = normalizePath(configPath);

    if (!configPath.startsWith('/'))
      configPath = path.resolve(root, configPath);
  }

  return (
    configPath ||
    require.resolve(
      // eslint-disable-next-line node/no-missing-require
      '@shopify/hydrogen/utilities/empty-hydrogen-config'
    )
  );
}
