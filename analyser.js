import * as periscopic from "periscopic";
import * as estreewalker from "estree-walker";

class Analyser {
  constructor() {
    this.variables = new Set();
    this.willChange = new Set();
    this.willUseInTemplate = new Set();
  }
  analyse(ast) {
    // Get the variables and scopes
    const { scope: rootScope, map } = periscopic.analyze(ast.script);
    this.variables = new Set(rootScope.declarations.keys());
    this.rootScope = rootScope;
    this.map = map;

    // Find variables that will change
    let currentScope = rootScope;
    estreewalker.walk(ast.script, {
      enter: (node) => {
        if (map.has(node)) currentScope = map.get(node);
        if (
          node.type === "UpdateExpression" &&
          currentScope.find_owner(node.argument.name) === rootScope
        ) {
          this.willChange.add(node.argument.name);
        }
      },
      leave: (node) => {
        if (map.has(node)) currentScope = currentScope.parent;
      },
    });

    ast.html.forEach((fragment) => this.traverse(fragment));

    return {
      variables: this.variables,
      willChange: this.willChange,
      willUseInTemplate: this.willUseInTemplate,
      rootScope: this.rootScope,
      map: this.map,
    };
  }
  traverse(fragment) {
    switch (fragment.type) {
      case "Element":
        fragment.children.forEach((child) => this.traverse(child));
        break;
      case "Attribute":
        this.willUseInTemplate.add(fragment.value.name);
        break;
      case "Expression":
        this.willUseInTemplate.add(fragment.expression.name);
        break;
    }
  }
}

export default Analyser;
