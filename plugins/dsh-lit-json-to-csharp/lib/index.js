/**
 * 字面量：json to csharp — 数据字面量生成
 */

export const name = "dsh-lit-json-to-csharp";
export const inject = ["tools"];

const NL = String.fromCharCode(10);
const SITE = "https://deepseekbase.com/zh/tools/";
const TEXT_OUTPUT = {
  schema: { type: "object", additionalProperties: false, properties: { text: { type: "string" } }, required: ["text"] },
  render: (_args, value) => [{ type: "text", text: (value && value.text) || "" }],
};

function parse(t) { try { return JSON.parse(t); } catch (e) { throw new Error("JSON 无效"); } }
function pad(n) { return "    ".repeat(n); }

function go(v, ind) {
  if (v === null) return "nil";
  if (Array.isArray(v)) return "[]interface{}{" + v.map((x) => go(x, ind)).join(", ") + "}";
  if (typeof v === "object") return "map[string]interface{}{" + Object.keys(v).map((k) => '"' + k + '": ' + go(v[k], ind)).join(", ") + "}";
  if (typeof v === "string") return '"' + v.replace(/"/g, '\\"') + '"';
  return String(v);
}
function py(v, ind) {
  if (v === null) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (Array.isArray(v)) return "[" + v.map((x) => py(x, ind)).join(", ") + "]";
  if (typeof v === "object") return "{" + Object.keys(v).map((k) => '"' + k + '": ' + py(v[k], ind)).join(", ") + "}";
  if (typeof v === "string") return '"' + v.replace(/"/g, '\\"') + '"';
  return String(v);
}
function php(v) {
  if (v === null) return "null";
  if (v === true) return "true";
  if (v === false) return "false";
  if (Array.isArray(v)) return "[" + v.map(php).join(", ") + "]";
  if (typeof v === "object") return "[" + Object.keys(v).map((k) => '"' + k + '" => ' + php(v[k])).join(", ") + "]";
  if (typeof v === "string") return "'" + v.replace(/'/g, "\\'") + "'";
  return String(v);
}
function tok(v) { return JSON.stringify(v); }

const OPS = {
  json_to_python: (t) => "data = " + py(parse(t), 0),
  json_to_go: (t) => "var data = " + go(parse(t), 0),
  json_to_php: (t) => "<?php" + NL + "$data = " + php(parse(t)) + ";",
  json_to_ruby: (t) => "data = " + JSON.stringify(parse(t)).replace(/:/g, " => ").replace(/"/g, "'"),
  json_to_js: (t) => "const data = " + JSON.stringify(parse(t), null, 2) + ";",
  json_to_java: (t) => "// 用 Map.of / List.of 表达" + NL + "var data = " + JSON.stringify(parse(t)) + ";",
  json_to_csharp: (t) => "// 字典字面量" + NL + "var data = " + JSON.stringify(parse(t)) + ";",
  json_to_swift: (t) => "let data: [String: Any] = " + JSON.stringify(parse(t)),
  json_to_kotlin: (t) => "val data = " + JSON.stringify(parse(t)),
  json_to_xml: (t) => {
    const o = parse(t);
    const walk = (k, v) => {
      if (Array.isArray(v)) return v.map((x) => walk(k, x)).join("");
      if (v && typeof v === "object") return "<" + k + ">" + Object.keys(v).map((x) => walk(x, v[x])).join("") + "</" + k + ">";
      return "<" + k + ">" + String(v) + "</" + k + ">";
    };
    return '<?xml version="1.0" encoding="UTF-8"?>' + NL + "<root>" + Object.keys(o).map((k) => walk(k, o[k])).join("") + "</root>";
  },
  xml_to_json: (t) => {
    const s = String(t).replace(/<\?xml[^>]*\?>/g, "").trim();
    const parseEl = (xml) => {
      const m = xml.match(/^<([\w:-]+)>([\s\S]*)<\/\1>$/);
      if (!m) return xml.trim();
      const [, name, inner] = m;
      const children = [...inner.matchAll(/<([\w:-]+)>([\s\S]*?)<\/\1>/g)];
      if (!children.length) return inner.trim();
      const o = {};
      children.forEach((c) => { const v = parseEl(c[0]); if (o[c[1]] === undefined) o[c[1]] = v; else if (Array.isArray(o[c[1]])) o[c[1]].push(v); else o[c[1]] = [o[c[1]], v]; });
      return o;
    };
    let o = parseEl(s);
    if (o && typeof o === "object" && Object.keys(o).length === 1 && o.root !== undefined) o = o.root;
    return JSON.stringify(o, null, 2);
  },
  json_to_toml: (t) => { const o = parse(t); const out = []; Object.keys(o).forEach((k) => { const v = o[k]; if (v && typeof v === "object" && !Array.isArray(v)) { out.push("[" + k + "]"); Object.keys(v).forEach((x) => out.push(x + " = " + tok(v[x]))); } else out.push(k + " = " + tok(v)); }); return out.join(NL); },
  json_to_env: (t) => { const o = parse(t); return Object.keys(o).map((k) => k.toUpperCase().replace(/[^A-Z0-9]/g, "_") + "=" + (typeof o[k] === "object" ? JSON.stringify(o[k]) : o[k])).join(NL); },
  json_to_properties: (t) => { const o = parse(t); const out = []; const walk = (p, v) => { if (v && typeof v === "object" && !Array.isArray(v)) Object.keys(v).forEach((k) => walk(p ? p + "." + k : k, v[k])); else out.push((p || "value") + "=" + v); }; walk("", o); return out.join(NL); },
};

export function apply(ctx, config) {
  void config;
  ctx.tools.register({
    name: "json_to_csharp",
    description: "json to csharp",
    parameters: {
      text: { "type": "string", required: true, "description": "JSON / XML" },
    },
    output: TEXT_OUTPUT,
    async execute(args) {
      const t = args && args.text != null ? String(args.text) : "";
      try {
        const fn = OPS["json_to_csharp"];
        if (!fn) throw new Error("未知操作");
        return { text: ["字面量：json to csharp", "=".repeat(52), String(fn(t)), "", "更多工具：" + SITE].join(NL) };
      } catch (e) {
        return { text: "处理失败: " + String((e && e.message) || e) };
      }
    },
  });
}
