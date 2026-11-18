"use client";

import { useState } from "react";
import { makeCandidate } from "../lib/candidate.mjs";

type NextMove = "capture" | "try" | "decide";

const moves: { id: NextMove; title: string; detail: string }[] = [
  { id: "capture", title: "Catch it", detail: "Hold onto the thought" },
  { id: "try", title: "Try it", detail: "Make a small experiment" },
  { id: "decide", title: "Choose it", detail: "Put a decision in focus" },
];

export default function Home() {
  const [idea, setIdea] = useState("");
  const [move, setMove] = useState<NextMove | "">("");
  const candidate = makeCandidate(idea, move);

  function reset() {
    setIdea("");
    setMove("");
  }

  return (
    <main className="shell">
      <header className="masthead">
        <span className="wordmark">
          QUIRK<span aria-hidden="true">✳</span>
        </span>
        <span className="eyebrow">A GOOD PLACE TO BEGIN</span>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <div className="badge">
          <span aria-hidden="true">●</span> YOUR NEXT MOVE
        </div>
        <h1 id="page-title">
          Let the strange
          <br />
          <em>start somewhere.</em>
        </h1>
        <p>
          A thought, a question, a half-formed what-if. Give it a little room to
          become something.
        </p>
      </section>

      <section className="workspace" aria-labelledby="workspace-title">
        <div className="workspace-head">
          <div>
            <span className="step">01 / THE SPARK</span>
            <h2 id="workspace-title">What&apos;s on your mind?</h2>
          </div>
          <span className="scribble" aria-hidden="true">
            ✷
          </span>
        </div>
        <label htmlFor="idea">Start wherever you are</label>
        <textarea
          id="idea"
          rows={4}
          maxLength={500}
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          placeholder="I keep thinking about..."
        />
        <div className="field-note">
          <span>No perfect wording required.</span>
          <span>{idea.length}/500</span>
        </div>

        <fieldset>
          <legend>What would you like to do with it?</legend>
          <div className="move-grid">
            {moves.map((item) => (
              <label
                className={`move ${move === item.id ? "selected" : ""}`}
                key={item.id}
              >
                <input
                  type="radio"
                  name="move"
                  value={item.id}
                  checked={move === item.id}
                  onChange={() => setMove(item.id)}
                />
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="candidate" aria-live="polite">
          {candidate ? (
            <>
              <span className="candidate-label">
                CANDIDATE / READY TO SHAPE
              </span>
              <p>“{candidate.idea}”</p>
              <small>
                Next move:{" "}
                {moves.find((item) => item.id === candidate.nextMove)?.title}
              </small>
            </>
          ) : (
            <>
              <span className="candidate-label">A LITTLE PREVIEW</span>
              <p>Your idea can take shape here.</p>
              <small>Add a thought and choose a next move.</small>
            </>
          )}
        </div>
        <div className="workspace-foot">
          <p>This is a local preview. Nothing is saved or sent.</p>
          <button type="button" onClick={reset}>
            Clear and start again <span aria-hidden="true">↗</span>
          </button>
        </div>
      </section>

      <footer>
        <span>MADE FOR WHAT&apos;S NEXT.</span>
        <span>GOOD IDEAS ARE ALLOWED TO BE WEIRD.</span>
      </footer>
    </main>
  );
}
