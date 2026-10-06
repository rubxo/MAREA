const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// SQLite's optional web preview uses WASM and SharedArrayBuffer.
config.resolver.assetExts.push('wasm');
const previousEnhancer = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const enhanced = previousEnhancer ? previousEnhancer(middleware, server) : middleware;
  return (request, response, next) => {
    response.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return enhanced(request, response, next);
  };
};
module.exports = config;
