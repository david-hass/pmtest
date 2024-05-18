import { Fragment, Node, Schema } from 'prosemirror-model'
import './style.css'
import { EditorView } from 'prosemirror-view'
import { EditorState } from 'prosemirror-state'
import { rawContent } from './content'

function shuffle<T>(a: T[]) {
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = a[i];
    a[i] = a[j];
    a[j] = temp;
  }
}

function nodesBetweenUpdate(this: Node, from: number, to: number,
  f: (node: Node, start: number, parent: Node | null, index: number) => boolean | Node | void,
  nodeStart = 0,
  parent?: Node,
) {

  for (let i = 0, pos = 0; pos < to; i++) {
    let child = this.content.content[i], end = pos + child.nodeSize
    let res = f(child, nodeStart + pos, parent || null, i);
    if (end > from && res !== false && child.content.size) {
      child = (res instanceof Node ? res : child);
      let start = pos + 1
      child.nodesBetweenUpdate(Math.max(0, from - start),
        Math.min(child.content.size, to - start),
        f, nodeStart + start)
    }
    pos = end
  }
}

function descendantsUpdate(this: Node, f: (node: Node, pos: number, parent: Node | null, index: number) => void | boolean, root = true) {
  if (root) {
    let res = f(this, 0, null, 0);
    this.content = (res instanceof Node ? res : this).content
  }
  this.nodesBetweenUpdate(0, this.content.size, f)
}

Node.prototype.nodesBetweenUpdate = nodesBetweenUpdate;
Node.prototype.descendantsUpdate = descendantsUpdate;


const schema = new Schema({
  nodes: {
    text: {},
    child: {
      content: "text*",
      toDOM() { return ["div", { class: "child" }, 0] },
      parseDOM: [{ tag: "div.child" }]
    },
    childparent: {
      content: "child*",
      attrs: { color: {} },
      toDOM(node) { return ["div", { class: "childparent", style: "border-style: dotted;border-color:" + node.attrs.color }, 0] },
      parseDOM: [{ tag: "div.childparent", getAttrs(dom) { return { color: dom.style.borderColor } } }]
    },
    parent: {
      content: "childparent*",
      attrs: { color: {} },
      toDOM(node) { return ["div", { class: "parent", style: "border-style: solid;border-color:" + node.attrs.color }, 0] },
      parseDOM: [{ tag: "div.parent", getAttrs(dom) { return { color: dom.style.borderColor } } }]
    },
    doc: {
      content: "parent*"
    }
  }
})

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div id="editor"></div>
`

const VIEW = new EditorView(document.querySelector("#editor"), {
  state: EditorState.create({
    doc: schema.nodeFromJSON(rawContent),
    plugins: []
  }),
  plugins: []
})



const { tr } = VIEW.state

tr.doc.descendantsUpdate((node, pos, parent) => {
  if (node.childCount <= 1) {
    return false
  }

  let indexMap: number[] = []

  node.forEach((_, __, i) => indexMap.push(i))

  shuffle(indexMap)

  let content = node.content

  indexMap.forEach((i, ii) => { content = content.replaceChild(ii, node.content.child(i)) })

  const newNode = node.copy(content)
  tr.replaceWith(pos, pos + node.content.size, newNode)

  return newNode
})

VIEW.dispatch(tr)







