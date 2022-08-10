import path_ from 'path';
import generate from '@babel/generator';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

const DataReplaceIdentifier = '~!@#$%^&*()_+~!@#$%^&*()_+~!@#$%^&*()_+';
const BlankReg = /^\s*$/;
const IgnoreAttributes = ['key', 'className', 'id', 'type', 'name', 'valuePropName'];

const wordReplace = (replaceAttr = 'data-replace') => {
  return {
    name: 'vite:wordReplace',
    transform(src, id) {
      // 非tsx文件，或者文件不包含replaceAttr直接返回
      if (!/\.tsx$/.test(id) || !src.includes(replaceAttr)) {
        return src;
      }

      const ast = parser.parse(src, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
      // 是否已经注入了需要的import
      let hasInsertImport = false;
      // 先筛选出来包含replaceAttr的jsx标签，该节点用特殊字符串替换掉
      let replaceNode;
      // 第一次遍历注入需要的import，并筛选出打了replaceAttr标记的节点
      traverse(ast, {
        enter(path) {
          if (t.isImportDeclaration(path.node) && !hasInsertImport) {
            // 引入replacement hook
            const specImport1 = t.importSpecifier(
              t.identifier('useWordReplacement'),
              t.identifier('useWordReplacement')
            );
            // 引入replacement component
            const specImport2 = t.importSpecifier(
              t.identifier('WordReplacement'),
              t.identifier('WordReplacement')
            );
            path.insertBefore(
              t.importDeclaration(
                [specImport1, specImport2],
                t.stringLiteral(path_.join(__dirname, '../components/word-replacement'))
              )
            );
            hasInsertImport = true;
          }

          // 筛选出打了replaceAttr标记的节点
          if (t.isJSXOpeningElement(path.node)) {
            const attributes = path.node.attributes || [];
            if (attributes.find((attr) => attr.name?.name === replaceAttr)) {
              replaceNode = path.container;
              path.parentPath.replaceWith(t.identifier(DataReplaceIdentifier));
              path.skip();
            }
          }
        },
      });
      if (!replaceNode) return src;

      // 得到替换了特殊字符串的源代码
      const orgSrc = generate(ast).code;
      // 将筛选出来的包含replaceAttr属性的节点整个摘出来转成ast
      const replaceAst = parser.parse(generate(replaceNode).code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
      });
      // 遍历包含replaceAttr的抽象语法树，处理文本节点、字符串属性
      traverse(replaceAst, {
        enter(path) {
          const openingElement = t.jsxOpeningElement(t.jsxIdentifier('WordReplacement'), [], false);
          const closingElement = t.jsxClosingElement(t.jsxIdentifier('WordReplacement'));
          // JSX文本节点
          if (t.isJSXText(path.node)) {
            const nodeVal = path.node.value;
            if (BlankReg.test(nodeVal)) {
              return;
            }
            const element = t.jsxElement(openingElement, closingElement, [
              t.jsxText(path.node.value),
            ]);
            path.replaceWith(element);
            path.skip();
          }
          // JSX字符串类型的属性
          if (
            t.isJSXAttribute(path.parent) &&
            t.isStringLiteral(path.node) &&
            !IgnoreAttributes.includes(path.parent.name.name)
          ) {
            const element = t.jsxExpressionContainer(
              t.jsxElement(openingElement, closingElement, [t.jsxText(path.node.value)])
            );
            path.replaceWith(element);
            path.skip();
          }
          // JSX大括号类型节点，并且大括号内的是对象.属性表达式或者变量表达式
          if (
            t.isJSXElement(path.parent) &&
            t.isJSXExpressionContainer(path.node) &&
            (t.isMemberExpression(path.node.expression) || t.isIdentifier(path.node.expression))
          ) {
            const element = t.jsxElement(openingElement, closingElement, [path.node]);
            path.replaceWith(element);
            path.skip();
          }
        },
      });
      const replaceSrc = generate(replaceAst).code.replace(/;$/, '');
      // console.log(111, replaceSrc)
      const returnSrc = orgSrc.replace(DataReplaceIdentifier, replaceSrc);
      return returnSrc;
    },
  };
};

export default wordReplace;
