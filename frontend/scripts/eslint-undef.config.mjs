/**
 * Catches "X is not defined" — the class of bug `yarn build` lets through.
 *
 * CRA compiles a missing component or constant without complaint; it only blows
 * up in the browser when the page renders. Run `yarn lint:undef` after any edit
 * that moves or deletes a block of code.
 */
const browser = ["window","document","localStorage","sessionStorage","navigator","console",
 "fetch","setTimeout","clearTimeout","setInterval","clearInterval","requestAnimationFrame",
 "cancelAnimationFrame","performance","Image","FileReader","FormData","Blob","URL","File",
 "IntersectionObserver","MutationObserver","ResizeObserver","AbortController","CustomEvent",
 "atob","btoa","alert","confirm","prompt","location","history","matchMedia","Audio","Notification",
 "process","module","require","__dirname","globalThis","structuredClone","queueMicrotask","crypto"];
export default [{
  files: ["**/*.js","**/*.jsx"],
  languageOptions: {
    ecmaVersion: 2022, sourceType: "module",
    parserOptions: { ecmaFeatures: { jsx: true } },
    globals: Object.fromEntries(browser.map(g => [g, "readonly"])),
  },
  rules: { "no-undef": "error" },
}];
