// $FlowFixMe it exists!
const Module = require("module");

const path = require("path");
const pnp = require("pnpapi");

// import type {ResolutionContext} from './types';

const builtinModules = new Set(
  // $FlowFixMe "process.binding" exists
  Module.builtinModules || Object.keys(process.binding("natives"))
);

const makePnpResolver = pnp => (context, request, platform) => {
  // We don't support builtin modules, so we force pnp to resolve those
  // modules as regular npm packages by appending a `/` character
  if (builtinModules.has(request)) {
    request += "/";
  }

  const unqualifiedPath = pnp.resolveToUnqualified(
    request,
    context.originModulePath
  );

  const baseExtensions = context.sourceExts.map(extension => `.${extension}`);
  let finalExtensions = [...baseExtensions];

  if (context.preferNativePlatform) {
    finalExtensions = [
      ...baseExtensions.map(extension => `.native${extension}`),
      ...finalExtensions
    ];
  }

  if (platform) {
    // We must keep a const reference to make Flow happy
    const p = platform;

    finalExtensions = [
      ...baseExtensions.map(extension => `.${p}${extension}`),
      ...finalExtensions
    ];
  }

  try {
    return {
      type: "sourceFile",
      filePath: pnp.resolveUnqualified(unqualifiedPath, {
        extensions: finalExtensions
      })
    };
  } catch (error) {
    // Only catch the error if it was caused by the resolution process
    if (error.code !== "QUALIFIED_PATH_RESOLUTION_FAILED") {
      throw error;
    }

    const dirname = path.dirname(unqualifiedPath);
    const basename = path.basename(unqualifiedPath);

    const assetResolutions = context.resolveAsset(dirname, basename, platform);

    if (assetResolutions) {
      return {
        type: "assetFiles",
        filePaths: assetResolutions.map(name => `${dirname}/${name}`)
      };
    } else {
      throw error;
    }
  }
};

module.exports = {
  resolver: {
    resolveRequest: (context, realModuleName, platform, moduleName) => {
      const pnpResolver = makePnpResolver(pnp);
      const resolution = pnpResolver(context, realModuleName, platform);
      console.log("resolution", resolution);
      return resolution;
    },
    useWatchman: false
    /* resolver options */
  },
  transformer: {
    /* transformer options */
  },
  serializer: {
    /* serializer options */
  },
  server: {
    /* server options */
  }

  /* general options */
};
