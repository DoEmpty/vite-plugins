# vite-plugins
some vite plugins 

- vite-plugin-word-replace 
这是一个文本替换插件，用于将打了data-replace属性标记的react标签，利用抽象语法树做一个二次编译
例：<div data-replace>xxxx</div>
编译为： <div data-replace><WordReplacement>xxxx</WordReplacement>

> WordReplacement 是一个自定义组件，在该组件内部完成children的替换
目前只实现了对JSX文本节点、JSX字符串类型属性、JSX大括号表达式节点（大括号内表达式是对象属性或者变量）
