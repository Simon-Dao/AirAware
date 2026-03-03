import { useState } from "react";
import "./App.css";
import Dashboard from "./components/dashboard/dashboard";
import Game from "./components/game/game";
import Title from "./components/title/title";
import { useSessionStore } from "./state/sessionState";

function App() {

  const { stateLoaded } = useSessionStore();

  return (
    <>
      {
        stateLoaded
        ?
        <div>
          Game!
        </div>
        : 
        <div>
        <Title />
      </div>
      }
    </>
  );
}

export default App;
