import { useEffect } from "react";
import "./App.css";
import Game from "./components/game/game";
import Title from "./components/title/title";
import { useSessionStore } from "./state/sessionState";
import { useGameStore } from "./state/gameState";

function App() {
  const { stateLoaded, username } = useSessionStore();
  const { fetchAirQualityHistory } = useGameStore();

  useEffect(() => {
    if (!stateLoaded || !username) return;
    fetchAirQualityHistory(username);
    const id = setInterval(() => fetchAirQualityHistory(username), 10_000);
    return () => clearInterval(id);
  }, [stateLoaded, username]);

  return (
    <div className="">
      {stateLoaded ? (
        <Game/>
      ) : (
        <div>
          <Title />
        </div>
      )}
    </div>
  );
}

export default App;
