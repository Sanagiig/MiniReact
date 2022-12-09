import {createDOM, Props, updateDOM} from "../element"
import {HookType} from "../hooks";

enum EffectTagEnum {
  UPDATE = "UPDATE",
  PLACEMENT = "PLACEMENT",
  DELETION = "DELETION",
}

export type FiberType = {
  dom?: any | void;
  parent: FiberType;
  sibling?: FiberType | void;
  child?: FiberType | void;
  alternate?: FiberType | void;
  effectTag?: EffectTagEnum
  hooks?: HookType[];
  type: string | any;
  props: Props;
}

export type WorkSpace = {
  nextUnitOfWork: FiberType | void
  wipRoot: FiberType | void
  currentRoot: FiberType | void
  deletions: FiberType[]
  wipFiber: FiberType | void
  hookIndex: number
  hooks: HookType[];
}

export const workSpace: WorkSpace = {
  nextUnitOfWork: undefined,
  wipRoot: undefined,
  currentRoot: undefined,
  deletions: [],
  wipFiber: undefined,
  hookIndex: 0,
  hooks: [],
}

const isFunctionComponent = (fiber) => fiber.type instanceof Function


export function workLoop(deadline: IdleDeadline) {
  let sholdYield = false;
  while (workSpace.nextUnitOfWork && !sholdYield) {
    workSpace.nextUnitOfWork = performUnitOfWork(workSpace.nextUnitOfWork)
    sholdYield = deadline.timeRemaining() < 1;
  }

  if (!workSpace.nextUnitOfWork && workSpace.wipRoot) {
    commitRoot()
  }

  requestIdleCallback(workLoop)
}

function reconcileChildren(wipFiber: FiberType, elements: FiberType[]) {
  const {deletions} = workSpace

  let index = 0
  let oldFiber: FiberType | void = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling: FiberType

  while (index < elements.length) {
    const element = elements[index]
    let newFiber: FiberType

    const sameType =
      oldFiber &&
      element &&
      element.type === oldFiber.type

    if (sameType) {
      newFiber = {
        type: oldFiber["type"],
        props: element.props,
        dom: oldFiber["dom"],
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: EffectTagEnum.UPDATE
      }
    }
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: EffectTagEnum.PLACEMENT
      }
    }
    if (oldFiber && !sameType) {
      oldFiber.effectTag = EffectTagEnum.DELETION
      deletions.push(oldFiber)
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }

    if (index == 0) {
      wipFiber.child = newFiber
    } else {
      prevSibling.sibling = newFiber
    }
    prevSibling = newFiber
    ++index
  }
}

function performUnitOfWork(fiber: FiberType): FiberType | void {
  if (isFunctionComponent(fiber)) {
    updateFunctionComponent(fiber)
  } else {
    updateHostComponent(fiber)
  }

  // // fiber 分批生成dom 会导致UI 不完整的情况
  // if (!fiber.dom) {
  //   fiber.dom = createDOM(fiber)
  // }

  reconcileChildren(fiber, fiber.props.children)
  if (fiber.child) {
    return fiber.child
  }

  //  为字节的创建对应的 fiber
  let nextFiber: FiberType | void = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber["parent"]
  }
}

export function updateFunctionComponent(fiber: FiberType) {
  workSpace.wipFiber = fiber;
  workSpace.hookIndex = 0;
  workSpace.wipFiber.hooks = [];
  const children = [fiber.type(fiber.props)]
  reconcileChildren(fiber, children)
}

export function updateHostComponent(fiber: FiberType) {
  if (!fiber.dom) {
    fiber.dom = createDOM(fiber)
  }
  reconcileChildren(fiber, fiber.props.children)
}

function commitRoot() {
  const {deletions} = workSpace;
  deletions.forEach(f => commitWork(f))
  commitWork(workSpace.wipRoot["child"])
  workSpace.currentRoot = workSpace.wipRoot
  workSpace.wipRoot = null
}

function commitWork(fiber: FiberType | void) {
  if (!fiber) {
    return
  }

  let domParentFiber = fiber.parent
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent
  }
  const domParent = domParentFiber.dom

  switch (fiber.effectTag) {
    case EffectTagEnum.PLACEMENT: {
      if (fiber.dom) {
        domParent.appendChild(fiber.dom)
      }
      break;
    }
    case EffectTagEnum.UPDATE: {
      updateDOM(fiber.dom, fiber.alternate["props"], fiber.props)
      break;
    }
    case EffectTagEnum.DELETION: {
      commitDeletion(fiber, domParent)
      break;
    }
  }

  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber.child, domParent)
  }
}