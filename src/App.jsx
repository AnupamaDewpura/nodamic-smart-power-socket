import { useState } from "react";
import Login from "./components/Login";

function App() {
  const [user, setUser] = useState(null);

  return (
    <div>
      <h1>Nodamic Smart Socket</h1>
      <Login onLogin={setUser} />

      {user && (
        <div>
          <h2>Next: Device Control UI here</h2>
          <p>UID: {user.uid}</p>
        </div>
      )}
    </div>
  );
}

export default App;
