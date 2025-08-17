import { useState } from "react";
import Login from "./components/Login";
import Devices from "./components/Devices";

function App() {
  const [user, setUser] = useState(null);

  return (
    <div>
      <h1>Nodamic Smart Socket</h1>
      <Login onLogin={setUser} />

      {user && (
        <div>
          <Devices user={user} />
        </div>
      )}
    </div>
  );
}

export default App;
