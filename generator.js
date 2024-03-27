import * as acorn from "acorn";
import * as estreewalker from "estree-walker";
import * as escodegen from "escodegen";

class Generator {
  constructor() {
    this.counter = 1;
    this.variables = [];
    this.create = [];
    this.update = [];
    this.destroy = [];
  }
  generate(ast, analysis) {
    this.analysis = analysis;
    ast.html.forEach((fragment) => this.traverse(fragment, "target"));
    this.handleScript(ast, analysis);
    return this.template(ast);
  }

  traverse(node, parent) {
    switch (node.type) {
      case "Element":
        this.handleElement(node, parent);
        break;
      case "Text":
        this.handleText(node, parent);
        break;
      case "Attribute":
        this.handleAttribute(node, parent);
        break;
      case "Expression":
        this.handleExpression(node, parent);
        break;
    }
  }

  uniqueVariableName(prefix) {
    return `${prefix}_${this.counter++}`;
  }

  handleElement(node, parent) {
    const variableName = this.uniqueVariableName(node.name);
    this.variables.push(variableName);
    this.create.push(
      `${variableName} = document.createElement('${node.name}');`
    );
    node.attributes.forEach((attribute) =>
      this.traverse(attribute, variableName)
    );
    node.children.forEach((child) => this.traverse(child, variableName));
    this.create.push(`${parent}.appendChild(${variableName});`);
    this.destroy.push(`${parent}.removeChild(${variableName});`);
  }

  handleText(node, parent) {
    const variableName = this.uniqueVariableName("txt");
    this.variables.push(variableName);
    this.create.push(
      `${variableName} = document.createTextNode('${node.value}');`
    );
    this.create.push(`${parent}.appendChild(${variableName});`);
  }

  handleAttribute(node, parent) {
    if (node.name.startsWith("on:")) {
      const eventName = node.name.slice(3);
      const eventHandler = node.value.name;
      this.create.push(
        `${parent}.addEventListener('${eventName}', ${eventHandler});`
      );
      this.destroy.push(
        `${parent}.removeEventListener('${eventName}', ${eventHandler});`
      );
    }
  }

  handleExpression(node, parent) {
    const variableName = this.uniqueVariableName("txt");
    const expression = node.expression.name;
    this.variables.push(variableName);
    this.create.push(
      `${variableName} = document.createTextNode(${expression});`
    );
    this.create.push(`${parent}.appendChild(${variableName});`);
    if (this.analysis.willChange.has(node.expression.name)) {
      this.update.push(`if(changed.includes('${expression}')){
                  ${variableName}.data = ${expression};
              }`);
    }
  }

  handleScript(ast, analysis) {
    const { rootScope, map } = analysis;
    let currentScope = rootScope;
    estreewalker.walk(ast.script, {
      enter(node) {
        if (map.has(node)) currentScope = map.get(node);
        if (
          node.type === "UpdateExpression" &&
          currentScope.find_owner(node.argument.name) === rootScope &&
          analysis.willUseInTemplate.has(node.argument.name)
        ) {
          this.replace({
            type: "SequenceExpression",
            expressions: [
              node,
              acorn.parseExpressionAt(
                `lifecycle.update(['${node.argument.name}'])`,
                0,
                {
                  ecmaVersion: 2022,
                }
              ),
            ],
          });
          this.skip();
        }
      },
      leave(node) {
        if (map.has(node)) currentScope = currentScope.parent;
      },
    });
  }

  template(ast) {
    return `
    export default function(){
      ${escodegen.generate(ast.script)}
      ${this.variables.map((variable) => `let ${variable};`).join("\n")}
        const lifecycle = {
            create(target){
                ${this.create.join("\n")}
            },
            update(changed){
                ${this.update.join("\n")}
            },
            destroy(){
                ${this.destroy.join("\n")}
            }
        }
        return lifecycle;
    }
    `;
  }
}

export default Generator;
