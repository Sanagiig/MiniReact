import {FiberType, workSpace} from "../work";

export type HookType = any

export function useState(initial) {
  const {wipFiber, hookIndex} = workSpace
  const oldHook = wipFiber && wipFiber.alternate && wipFiber.alternate.hooks[hookIndex]
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  }

  const actions = oldHook ? oldHook.queue : []
  actions.forEach(action => {
    hook.state = action(hook.state)
  })

  const setState = action => {
    hook.queue.push(action)
    workSpace.wipRoot = {
      dom: workSpace.currentRoot["dom"],
      props: workSpace.currentRoot["props"],
      alternate: workSpace.currentRoot,
    } as unknown as FiberType

    workSpace.nextUnitOfWork = workSpace.wipRoot
    workSpace.deletions = []
  }

  wipFiber["hooks"].push(hook)
  workSpace.hookIndex++
  return [hook.state, setState]
}