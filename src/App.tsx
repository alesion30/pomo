import { Popover } from "./popover/Popover";
import { useTimer } from "./useTimer";

function App() {
  const timer = useTimer();
  return <Popover {...timer} />;
}

export default App;
