import * as fs from "fs";
import Parser from "./parser.js";
import Analyser from "./analyser.js";
import Generator from "./generator.js";

const content = fs.readFileSync("./app.fgx", "utf-8");
const parser = new Parser(content);
const ast = parser.parse();

const analyser = new Analyser();
const analysis = analyser.analyse(ast);

const generator = new Generator();
const js = generator.generate(ast, analysis);

fs.writeFileSync("./app.js", js, "utf-8");
