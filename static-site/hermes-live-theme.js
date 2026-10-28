// Hermes live theme preview. While a person edits the look in Hermes's Design panel, Hermes
// posts the new theme variables to this preview frame, and this file applies them at once.
// Nothing is saved here: saving writes hermes-theme.json and the theme CSS as a new version.
// The same file ships in every Hermes starter. Its <script> tag says how the app turns dark:
// data-dark="class" (a `.dark` class on <html>) or data-dark="media" (the system setting).
(function () {
  if (window.parent === window) return;
  var script = document.currentScript;
  var darkRule = script && script.dataset.dark === "class" ? "class" : "media";
  var styles = ["vega", "nova", "maia", "lyra", "mira", "luma", "sera", "rhea", "minimal", "brutalist", "bold", "neumorphic", "glass"];
  var modes = ["system", "light", "dark"];
  var functions = ["oklch", "hsl", "hsla", "rgb", "rgba", "var", "calc", "color-mix"];
  var namePattern = /^--[a-z0-9-]{1,40}$/;
  var system = window.matchMedia("(prefers-color-scheme: dark)");
  var currentMode = null;

  function own(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function isPlainObject(value) {
    return typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
  }

  function validValue(value) {
    if (typeof value !== "string" || value.length > 160 || /[;{}<\\]/.test(value)) return false;
    var calls = value.match(/[a-zA-Z_-][a-zA-Z0-9_-]*\s*\(/g) || [];
    for (var i = 0; i < calls.length; i++) {
      if (functions.indexOf(calls[i].replace(/\s*\($/, "").toLowerCase()) === -1) return false;
    }
    return true;
  }

  function declarations(block) {
    if (!isPlainObject(block)) return null;
    var names = Object.keys(block);
    if (names.length > 80) return null;
    var text = "";
    for (var i = 0; i < names.length; i++) {
      if (!namePattern.test(names[i]) || !validValue(block[names[i]])) return null;
      text += names[i] + ":" + block[names[i]] + ";";
    }
    return text;
  }

  function applyMode() {
    var root = document.documentElement;
    root.dataset.mode = currentMode;
    root.classList.toggle("dark", currentMode === "dark" || (currentMode === "system" && system.matches));
  }

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (event.source !== window.parent || !isPlainObject(data)) return;
    if (data.type !== "hermes-theme" || data.version !== 1) return;
    if (!own(data, "style") || styles.indexOf(data.style) === -1) return;
    if (!own(data, "mode") || modes.indexOf(data.mode) === -1) return;
    var light = declarations(data.light);
    var dark = declarations(data.dark);
    if (light === null || dark === null) return;

    var css = ":root{color-scheme:light;" + light + "}";
    if (darkRule === "class") css += ".dark{color-scheme:dark;" + dark + "}";
    else if (data.mode === "system") css += "@media (prefers-color-scheme: dark){:root{color-scheme:dark;" + dark + "}}";
    else if (data.mode === "dark") css += ":root{color-scheme:dark;" + dark + "}";

    var element = document.getElementById("hermes-live-theme") || document.createElement("style");
    element.id = "hermes-live-theme";
    element.textContent = css;
    // Last in <head>, so it wins over the theme CSS that loaded before it.
    document.head.appendChild(element);

    var root = document.documentElement;
    root.className = root.className.replace(/(^|\s)style-[a-z]+(?=\s|$)/g, "");
    root.classList.add("style-" + data.style);
    if (darkRule === "class") {
      if (currentMode === null) system.addEventListener("change", applyMode);
      currentMode = data.mode;
      applyMode();
    }
  });
})();
