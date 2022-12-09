import {FiberType, workLoop, workSpace} from "../work";

enum ElementTypes {
  TextElement = "TEXT_ELEMENT",
}

export type Props = {
  [k: string]: any;
}
type MReactElement = {
  type: any;
  props: Props;
  children?: MReactElement[]
}

const getEventName = (key: string) => key.toLowerCase().substring(2);
const isText = (e) => typeof e === "string" || typeof e === "number"
const isEvent = key => key.startsWith("on")
const isProperty = key => key !== "children" && !isEvent(key)
const isNew = (...props: any[]) => {
  return function (k: string) {
    for (let i = 1; i < props.length; i++) {
      const prop = props[i]
      if (prop[k] != props[0][k]) {
        return true
      }
    }
    return false
  }
}

export function createElement(type: any, props: any, ...children: Array<MReactElement | string>) {
  // if (typeof type === "function") {
  //   return type({...props, children})
  // }

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (Array.isArray(child)) {
      children.splice(i, 1, ...child)
      --i;
    }
  }

  return {
    type,
    props: {
      ...props,
      children: children.map(child => {
        if (isText(child)) {
          return createTextElement(child as any)
        }
        return child
      })
    }
  }
}

export function createTextElement(text: string | number) {
  return {
    type: ElementTypes.TextElement,
    props: {
      nodeValue: text,
      children: []
    }
  }
}

export function createDOM(fiber) {
  let dom: any
  const {props} = fiber
  if (fiber.type == ElementTypes.TextElement) {
    dom = document.createTextNode("")
  } else {
    dom = document.createElement(fiber.type)
  }

  updateDOM(dom, {}, props)
  return dom
}

export function updateDOM(dom: HTMLElement, oldProps: Props, newProps: Props) {
  const isChange = isNew(oldProps, newProps)
  const newKeys = Object.keys(newProps)
  const oldKeys = Object.keys(oldProps)
  const modifyKeys: string[] = oldKeys.filter(isChange)

  newKeys.forEach(k => {

    if (isProperty(k)) {
      dom[k] = newProps[k]
    } else if (isEvent(k) && isChange(k)) {
      const eventName = getEventName(k);
      dom.addEventListener(eventName, newProps[k])
    }
  })

  modifyKeys.forEach(k => {
    if (isProperty(k) && !newProps[k]) {
      dom[k] = undefined
    } else if (isEvent(k)) {
      const eventName = getEventName(k);
      dom.removeEventListener(eventName, oldProps[k])
    }
  })
}

export function render(element: MReactElement, container: Element) {
  workSpace.wipRoot = {
    type: element.type,
    dom: container,
    alternate: workSpace.currentRoot,
    props: {
      children: [element]
    }
  } as unknown as FiberType

  workSpace.nextUnitOfWork = workSpace.wipRoot;
}

requestIdleCallback(workLoop)