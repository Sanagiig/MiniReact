import MReact from './packages'
import {useState} from "./packages/hooks";

function App() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <button onclick={() => {
        setCount(() => count + 1)
      }}>++++
      </button>
      <ul>
        {
          Array(100).fill(0).map((_, i) => {
            return (
              <li>第{i + count}个</li>
            )
          })
        }
      </ul>
    </div>

  )
}

console.log(<App/>)
export default App