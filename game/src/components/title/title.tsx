import { useSessionStore } from "../../state/sessionState";
import { useGameStore } from "../../state/gameState";

function Title() {
  const { loggedIn, loggingIn, stateLoaded, testLogin, setStateLoaded } =
    useSessionStore();
  const { initialize } = useGameStore();

  return (
    <div className="w-screen h-screen flex items-center justify-center flex-col">
      <h1 className="bg-green">Game Title</h1>

      {!loggedIn && !loggingIn && (
        <button
          onClick={async () => {
            await testLogin();
            await initialize();
            setStateLoaded();
          }}
        >
          Login
        </button>
      )}

      {loggingIn && <button>Logging In...</button>}

      {loggedIn && !stateLoaded && <button>Loading Game...</button>}
    </div>
  );
}

export default Title;
