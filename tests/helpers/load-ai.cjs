/* eslint-disable @typescript-eslint/no-require-imports -- Controlled CommonJS loading for isolated SDK tests. */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Exercise the production generator with controlled model responses, without API calls.
function generator(batches = []) {
  const requests = [];
  const rawRequests = [];
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const loadedModule = { exports: {} };
    cache.set(file, loadedModule.exports);
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    const localRequire = (name) => {
      if (name === "openai") return class {
        responses = { create: async (request) => {
          rawRequests.push(request);
          requests.push(JSON.parse(request.input[1].content));
          const batch = batches.shift() ?? [];
          return { status: "completed", output_text: typeof batch === "string" ? batch : JSON.stringify(Array.isArray(batch) ? { questions: batch } : batch) };
        } };
      };
      if (name.startsWith("@/")) {
        const target = path.resolve(__dirname, "../..", name.slice(2));
        return name.endsWith(".json") ? JSON.parse(fs.readFileSync(target, "utf8")) : load(`${target}.ts`);
      }
      return require(name);
    };
    vm.runInThisContext(`(function(require,module,exports,process){${code}\n})`, { filename: file })(
      localRequire, loadedModule, loadedModule.exports, { env: { OPENAI_API_KEY: "test-only" } },
    );
    return loadedModule.exports;
  }
  return { ...load(path.resolve(__dirname, "../../lib/ai/client.ts")), requests, rawRequests, load: (name) => load(path.resolve(__dirname, "../..", name)) };
}

module.exports = { generator };
