import * as acorn from "acorn";

class Parser {
  constructor(content) {
    this.content = content;
    this.index = 0; // Current index in content
    this.ast = {};
  }

  parse() {
    this.ast.html = this.parseFragments(() => this.index < this.content.length);
    return this.ast;
  }

  parseFragments(condition) {
    const fragments = [];
    while (condition()) {
      const fragment = this.parseFragment();
      if (fragment) {
        fragments.push(fragment);
      }
    }
    return fragments;
  }

  parseFragment() {
    return (
      this.parseScript() ??
      this.parseElement() ??
      this.parseExpression() ??
      this.parseText()
    );
  }

  parseScript() {
    if (this.match("<script>")) {
      this.skip("<script>");
      const startIndex = this.index;
      const endIndex = this.content.indexOf("</script>", this.index);
      if (endIndex === -1) {
        throw new Error("Parse error: closing script tag not found");
      }
      const code = this.content.slice(startIndex, endIndex);
      this.ast.script = acorn.parse(code, { ecmaVersion: 2022 });
      this.index = endIndex;
      this.skip("</script>");
    }
  }

  parseElement() {
    if (this.match("<")) {
      this.skip("<");
      const tagName = this.readWhileMatching(/[a-z]/);
      const attributes = this.parseAttributeList();
      this.skip(">");

      const endTag = `</${tagName}>`;

      const element = {
        type: "Element",
        name: tagName,
        attributes,
        children: this.parseFragments(() => !this.match(endTag)),
      };
      this.skip(endTag);
      return element;
    }
  }

  parseAttributeList() {
    const attributes = [];
    this.skipWhitespace();
    while (!this.match(">")) {
      attributes.push(this.parseAttribute());
      this.skipWhitespace();
    }
    return attributes;
  }

  parseAttribute() {
    const name = this.readWhileMatching(/[^=]/);
    this.skip("={");
    const value = this.parseJavascript();
    this.skip("}");
    return {
      type: "Atrribute",
      name,
      value,
    };
  }

  parseExpression() {
    if (this.match("{")) {
      this.skip("{");
      const expression = this.parseJavaScript();
      this.skip("}");
      return {
        type: "Expression",
        expression,
      };
    }
  }

  parseText() {
    const text = this.readWhileMatching(/[^<{]/);
    if (text.trim() !== "") {
      return {
        type: "Text",
        value: text,
      };
    }
  }

  parseJavaScript() {
    const js = acorn.parseExpressionAt(this.content, this.index, {
      ecmaVersion: 2022,
    });
    this.index = js.end;
    return js;
  }

  match(str) {
    return this.content.slice(this.index, this.index + str.length) === str;
  }

  skip(str) {
    if (this.match(str)) {
      this.index += str.length;
    } else {
      throw new Error(`Parse error: expecting "${str}"`);
    }
  }

  readWhileMatching(regex) {
    let startIndex = this.index;
    while (regex.test(this.content[this.index])) {
      this.index++;
    }
    return this.content.slice(startIndex, this.index);
  }

  skipWhitespace() {
    this.readWhileMatching(/[\s\n]/);
  }
}

export default Parser;
