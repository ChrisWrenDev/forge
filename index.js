import * as fs from "fs";

const content = fs.readFileSync("./app.fgx", "utf-8");
const parser = new CustomParser(content);
const ast = parser.parse();

const analysis = analyse(ast);
const js = generate(ast, analysis);

fs.writeFileSync("./app.js", js, "utf-8");

function analyse(ast) {}
function generate(ast, analysis) {}
