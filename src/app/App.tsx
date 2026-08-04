import { useEffect, useState } from "react";
import { SceneHost } from "./SceneHost";
type Route = "diagnostic" | "boundaries";
function routeFromHash(): Route {
  return location.hash === "#/boundaries" ? "boundaries" : "diagnostic";
}
export function App() {
  const [route, setRoute] = useState<Route>(routeFromHash);
  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);
  const go = (next: Route) => {
    location.hash = next === "diagnostic" ? "#/" : "#/boundaries";
  };
  return (
    <div className="shell">
      <header className="shell__header">
        <span className="brand">DSPDS</span>
        <nav className="nav" aria-label="Diagnostic navigation">
          <button
            onClick={() => go("diagnostic")}
            aria-current={route === "diagnostic" ? "page" : undefined}
          >
            Diagnostic
          </button>
          <button
            onClick={() => go("boundaries")}
            aria-current={route === "boundaries" ? "page" : undefined}
          >
            Boundaries
          </button>
        </nav>
      </header>
      <main className="main">
        {route === "diagnostic" ? (
          <>
            <div className="eyebrow">Milestone 0 · architecture proof</div>
            <h1>Real-time engine diagnostic</h1>
            <p className="lede">
              A restrained abstract scene verifies that React can mount and
              dispose an independently owned Three.js lifecycle. It is not an
              assessment or training scenario.
            </p>
            <section className="diagnostic">
              <SceneHost />
              <aside className="diagnostic__aside">
                <h2>Boundary checks</h2>
                <ul className="checks">
                  <li>Engine-owned render loop</li>
                  <li>Observed container resizing</li>
                  <li>Explicit resource disposal</li>
                  <li>Local system font stack</li>
                </ul>
              </aside>
            </section>
          </>
        ) : (
          <>
            <div className="eyebrow">Architecture contract</div>
            <h1>Separated by responsibility</h1>
            <div className="boundary">
              <p>
                <strong>React</strong> owns this shell, navigation, and engine
                mounting.
              </p>
              <p>
                <strong>Three.js</strong> owns its scene, render loop, resizing,
                and disposal.
              </p>
              <p>
                Input, scenarios, analysis, coaching, telemetry, and storage
                remain deliberately deferred.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
