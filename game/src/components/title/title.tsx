import { useSessionStore } from "../../state/sessionState";
import { useGameStore } from "../../state/gameState";
import { useState } from "react";

function Title() {
  const {
    loggedIn,
    loggingIn,
    stateLoaded,
    attemptLogin,
    attemptSignup,
    setStateLoaded,
  } = useSessionStore();
  const { loadGame } = useGameStore();

  const [loginInput, setLoginInput] = useState<string>("");
  const [signupInput, setSignupInput] = useState<string>("");
  const [errorText, setErrorText] = useState<string>("");
  return (
    <div className="w-screen h-screen flex items-center justify-center flex-col">
      <h1 className="bg-green">Game Title</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErrorText("");
          try {
            await attemptLogin(loginInput);
            await loadGame();
            setStateLoaded();
          } catch (e: any) {
            setErrorText(e?.message ?? String(e));
          }
        }}
        action=""
        className="flex flex-col"
      >
        <input
          className="bg-orange-300 my-3 py-1 px-2 rounded-md text-black"
          type="text"
          value={loginInput}
          onChange={(e) => setLoginInput(e.target.value)}
        />
        {!loggedIn && !loggingIn && <button type="submit">Login</button>}

        {loggingIn && <button>Logging In...</button>}
      </form>
      {loggedIn && !stateLoaded && <button>Loading Game...</button>}
      <br />
      or
      <br />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErrorText("");
          try {
            await attemptSignup(signupInput);
          } catch (e: any) {
            setErrorText(e?.message ?? String(e));
          }
        }}
        action=""
        className="flex flex-col"
      >
        <input
          className="bg-orange-300 my-3 py-1 px-2 rounded-md text-black"
          type="text"
          value={signupInput}
          onChange={(e) => setSignupInput(e.target.value)}
        />
        <button>Create new User</button>
      </form>
      <h1>{errorText}</h1>
    </div>
  );
}

export default Title;
