import * as fs from "fs";
import Parser from "./parser.js";
import Analyser from "./analyser.js";

const content = fs.readFileSync("./app.fgx", "utf-8");
const parser = new Parser(content);
const ast = parser.parse();

const analyser = new Analyser();
const result = analyser.analyse(ast);
const js = generate(ast, result);

fs.writeFileSync("./app.js", js, "utf-8");

function generate(ast, analysis) {}
