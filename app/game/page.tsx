"use client";

import { useEffect, useRef, useState } from "react";

type AnimeCard = { id: string; title: string; image: string; imageName?: string };
const initialCards: AnimeCard[] = [
  { id: "1", title: "Demon Slayer", image: "" },
  { id: "2", title: "One Piece", image: "" },
  { id: "3", title: "Jujutsu Kaisen", image: "" },
  { id: "4", title: "Attack on Titan", image: "" },
  { id: "5", title: "Naruto", image: "" },
];

function openCardsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("anime-floor-storage", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export default function GamePage() {
  const [names, setNames] = useState(["PLAYER 1", "PLAYER 2"]);
  const [scores, setScores] = useState([0, 0]);
  const [cards, setCards] = useState<AnimeCard[]>(initialCards);
  const [cardsLoaded, setCardsLoaded] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [activePlayer, setActivePlayer] = useState(0);
  const [seconds, setSeconds] = useState(10);
  const [timeLeft, setTimeLeft] = useState(10);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | "time" | "">("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newImage, setNewImage] = useState("");
  const [newImageName, setNewImageName] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [round, setRound] = useState(1);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [musicOn, setMusicOn] = useState(false);
  const musicRef = useRef<{ ctx: AudioContext; timer: ReturnType<typeof setInterval> } | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);
  const cardsLoadedRef = useRef(false);

  const current = cards[cardIndex];
  const clearTimer = () => { if (timer.current) clearInterval(timer.current); timer.current = null; };

  useEffect(() => {
    let cancelled = false;
    const isValidCards = (value: unknown): value is AnimeCard[] => Array.isArray(value) && value.every((c) => c && typeof c.id === "string" && typeof c.title === "string" && typeof c.image === "string");

    async function loadCards() {
      try {
        // Prefer the project-folder copy. It survives browser resets and can be backed up with the repo.
        const response = await fetch("/api/sample-list", { cache: "no-store" });
        if (response.ok) {
          const payload = await response.json();
          if (isValidCards(payload.cards)) {
            if (!cancelled) setCards(payload.cards);
            return;
          }
        }
      } catch {
        // Continue with the browser-storage migration fallback below.
      } finally {
        // Loading is finalized after trying both the project file and browser storage.
      }

      try {
        const db = await openCardsDb();
        const saved = await new Promise<AnimeCard[] | undefined>((resolve, reject) => {
          const request = db.transaction("settings", "readonly").objectStore("settings").get("sample-list");
          request.onsuccess = () => resolve(request.result as AnimeCard[] | undefined);
          request.onerror = () => reject(request.error);
        });
        db.close();
        let migrated: AnimeCard[] | undefined = isValidCards(saved) ? saved : undefined;
        if (!migrated) {
          const legacy = localStorage.getItem("anime-floor-sample-list");
          if (legacy) {
            const parsed: unknown = JSON.parse(legacy);
            if (isValidCards(parsed)) migrated = parsed;
          }
        }
        if (!cancelled && migrated) {
          setCards(migrated);
          // Copy existing browser data into the project folder so it persists on disk from now on.
          const response = await fetch("/api/sample-list", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cards: migrated }),
          });
          if (!response.ok) console.error("Could not migrate the saved sample list to the project folder.");
        }
      } catch (error) {
        console.error("Could not load the sample list from browser storage.", error);
      } finally {
        if (!cancelled) setCardsLoaded(true);
      }
    }
    void loadCards().finally(() => { if (!cancelled) setCardsLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!cardsLoaded) return;
    let cancelled = false;
    async function saveCards() {
      try {
        const response = await fetch("/api/sample-list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cards }),
        });
        if (!response.ok) throw new Error("Project-folder save failed");
        const payload = await response.json();
       if (!cancelled && Array.isArray(payload.cards)) {
  const hasChanged = payload.cards.some(
    (saved: AnimeCard, index: number) =>
      saved.id !== cards[index]?.id ||
      saved.title !== cards[index]?.title ||
      saved.image !== cards[index]?.image
  );

  if (hasChanged) {
    setCards((current) => {
      const stillMatches =
        current.length === cards.length &&
        current.every(
          (card, index) =>
            card.id === cards[index]?.id &&
            card.title === cards[index]?.title &&
            card.image === cards[index]?.image
        );

      return stillMatches ? payload.cards : current;
    });
  }
}
      } catch (error) {
        console.error("Could not save to the project folder; saving in this browser instead.", error);
        try {
          const db = await openCardsDb();
          await new Promise<void>((resolve, reject) => {
            const request = db.transaction("settings", "readwrite").objectStore("settings").put(cards, "sample-list");
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
          db.close();
        } catch {
          try { localStorage.setItem("anime-floor-sample-list", JSON.stringify(cards)); } catch {}
        }
      }
    }
    if (!cancelled) void saveCards();
    return () => { cancelled = true; };
  }, [cards, cardsLoaded]);

  useEffect(() => {
    if (!started || finished || feedback) return;
    const deadline = Date.now() + timeLeft * 1000;
    timer.current = setInterval(() => {
      const remaining = Math.max(0, (deadline - Date.now()) / 1000);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearTimer();
        nextTurn(false, true);
      }
    }, 33);
    return clearTimer;
  }, [started, finished, feedback, cardIndex, activePlayer]);

  useEffect(() => () => { clearTimer(); if (musicRef.current) { clearInterval(musicRef.current.timer); void musicRef.current.ctx.close(); } }, []);

  function playSound(kind: "correct" | "wrong") {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      const makeTone = (frequency: number, at: number, duration: number, type: OscillatorType, volume: number) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(frequency, at);
        gain.gain.setValueAtTime(volume, at);
        gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
        osc.connect(gain); gain.connect(ctx.destination); osc.start(at); osc.stop(at + duration + 0.02);
      };
      if (kind === "correct") {
        // Short bright three-note victory chime.
        makeTone(660, now, 0.24, "triangle", 0.22);
        makeTone(880, now + 0.12, 0.28, "triangle", 0.22);
        makeTone(1320, now + 0.25, 0.42, "sine", 0.18);
      } else {
        // Harsh descending double-buzz, like a game-show wrong-answer buzzer.
        makeTone(180, now, 0.38, "sawtooth", 0.27);
        makeTone(145, now + 0.20, 0.42, "square", 0.24);
      }
      window.setTimeout(() => { void ctx.close(); }, 1000);
    } catch {}
  }

  function toggleMusic() {
    if (musicRef.current) {
      clearInterval(musicRef.current.timer);
      void musicRef.current.ctx.close();
      musicRef.current = null;
      setMusicOn(false);
      return;
    }
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const notes = [220, 261.63, 329.63, 293.66, 196, 246.94, 293.66, 261.63];
      let step = 0;
      const playNote = () => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = "sine"; osc.frequency.value = notes[step % notes.length];
        gain.gain.setValueAtTime(0.0001, now); gain.gain.linearRampToValueAtTime(0.035, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
        osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + 0.5);
        step++;
      };
      playNote();
      const timer = setInterval(playNote, 420);
      musicRef.current = { ctx, timer };
      setMusicOn(true);
    } catch {}
  }

  function start() {
    clearTimer();
    processingRef.current = false;
    setCards((previous) => [...previous].sort(() => Math.random() - 0.5));
    setScores([0, 0]); setCardIndex(0); setActivePlayer(0); setWrongAttempts(0); setTimeLeft(seconds);
    setFeedback(""); setShowAnswer(false); setFinished(false); setWrongAttempts(0); setStarted(true); setRound(1);
  }

  function nextTurn(wasCorrect: boolean, wasTime = false) {
    if (processingRef.current || !started || finished) return;
    processingRef.current = true;
    clearTimer();
    if (wasCorrect) {
      setScores((s) => s.map((v, i) => i === activePlayer ? v + 1 : v));
      setFeedback("correct");
      playSound("correct");
    } else {
      setFeedback(wasTime ? "time" : "wrong");
      playSound("wrong");
    }
    window.setTimeout(() => {
      setFeedback("");
      setShowAnswer(false);
      if (!wasCorrect && wrongAttempts === 0) {
        // First player missed: keep the same image and give the other player a full turn.
        setWrongAttempts(1);
        setActivePlayer((p) => 1 - p);
        setTimeLeft(seconds);
        processingRef.current = false;
        return;
      }
      setWrongAttempts(0);
      setTimeLeft(seconds);
      setCardIndex((i) => {
        if (i + 1 >= cards.length) {
          setFinished(true); setStarted(false); return i;
        }
        return i + 1;
      });
      setActivePlayer((p) => 1 - p);
      setRound((r) => r + 1);
      processingRef.current = false;
    }, wasCorrect ? 900 : 650);
  }

  useEffect(() => {
    const projectorState = {
      names, scores, current, cardIndex, cardCount: cards.length, activePlayer,
      seconds, timeLeft, started, finished, feedback, showAnswer, round,
    };
    try { localStorage.setItem("anime-floor-projector-state", JSON.stringify(projectorState)); } catch {}
    try {
      const channel = new BroadcastChannel("anime-floor-projector");
      channel.postMessage(projectorState);
      channel.close();
    } catch {}
  }, [names, scores, current, cardIndex, cards.length, activePlayer, seconds, timeLeft, started, finished, feedback, showAnswer, round]);

  function openProjector() {
    window.open("/projector", "anime-floor-projector", "popup,width=1280,height=720");
  }

  function addCard() {
    if (!newTitle.trim()) return;
    setCards((c) => [...c, { id: `${Date.now()}`, title: newTitle.trim(), image: newImage.trim(), ...(newImageName ? { imageName: newImageName } : {}) }]);
    setNewTitle(""); setNewImage(""); setNewImageName("");
  }

  function importImage(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setNewImage(String(reader.result || "")); setNewImageName(file.name); };
    reader.readAsDataURL(file);
  }

  return (
    <main className="arena">
      <div className="arena-top">
        <a className="brand" href="/">✦ ANIME FLOOR</a>
        <div className="top-actions">
          <span className="live-pill"><i /> {started ? "GAME LIVE" : finished ? "ROUND COMPLETE" : "READY TO PLAY"}</span>
          <button className="button button-primary" onClick={openProjector}>↗ OPEN PROJECTOR</button><button className="button button-primary" onClick={toggleMusic}>{musicOn ? "♫ MUSIC ON" : "♫ MUSIC OFF"}</button><button className="icon-button" onClick={() => setShowSettings(!showSettings)} aria-label="Settings">⚙</button>
        </div>
      </div>

      {showSettings && <section className="settings-panel">
        <div className="settings-heading"><div><p className="eyebrow">CUSTOMIZE YOUR GAME</p><h2>Game setup</h2></div><button className="icon-button" onClick={() => setShowSettings(false)}>✕</button></div>
        <div className="settings-grid">
          <label>PLAYER ONE<input value={names[0]} maxLength={18} onChange={(e) => setNames(n => [e.target.value, n[1]])} /></label>
          <label>PLAYER TWO<input value={names[1]} maxLength={18} onChange={(e) => setNames(n => [n[0], e.target.value])} /></label>
          <label>SECONDS PER TURN<select value={seconds} onChange={(e) => {setSeconds(Number(e.target.value)); setTimeLeft(Number(e.target.value));}}><option value={3}>3 seconds</option><option value={5}>5 seconds</option><option value={8}>8 seconds</option><option value={10}>10 seconds</option><option value={15}>15 seconds</option><option value={20}>20 seconds</option><option value={30}>30 seconds</option></select></label>
        </div>
        <div className="add-card">
          <h3>Add an anime image</h3>
          <div className="add-fields"><input placeholder="Anime title / correct answer" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <input placeholder="Paste image URL (optional)" value={newImage.startsWith("data:") ? "Image selected ✓" : newImage} onChange={(e) => { setNewImage(e.target.value); setNewImageName(""); }} />
            <button className="button button-primary" onClick={() => fileRef.current?.click()}>Upload</button><input ref={fileRef} hidden type="file" accept="image/*" onChange={(e) => importImage(e.target.files?.[0])} />
            <button className="button button-primary" onClick={addCard}>+ Add image</button></div>
          <p className="help-text">Add image URLs or upload your own files. Your sample list and uploaded images are saved in the project folder (data/sample-list.json and public/uploads).</p>
          <div className="card-list">{cards.map((c, i) => <div key={c.id} className="card-row"><span className="card-number">{String(i + 1).padStart(2, "0")}</span><span>{c.title}</span><button onClick={() => setCards(all => all.filter(x => x.id !== c.id))} aria-label={`Remove ${c.title}`}>×</button></div>)}</div>
          <button className="text-button" onClick={() => setCards(initialCards)}>Reset sample list</button>
        </div>
      </section>}

      <header className="game-heading">
        <p className="eyebrow">THE ULTIMATE ANIME SHOWDOWN</p>
        <h1>GUESS THE <span>ANIME.</span></h1>
        <p className="subheading">Two players. One image. Do you know your anime?</p>
      </header>

      <section className="scoreboard">
        {[0,1].map((p) => <div key={p} className={`player-card ${activePlayer === p && started ? "player-active" : ""} ${p === 1 ? "player-right" : ""}`}>
          <div className="player-avatar">{p === 0 ? "壱" : "弐"}</div>
          <div className="player-meta"><span className="player-label">PLAYER 0{p + 1} {activePlayer === p && started ? <b>• YOUR TURN</b> : ""}</span><input aria-label={`Player ${p+1} name`} value={names[p]} maxLength={18} onChange={(e) => setNames(n => p === 0 ? [e.target.value,n[1]] : [n[0],e.target.value])} /></div>
          <div className="score">{scores[p].toString().padStart(2,"0")}</div>
        </div>)}
      </section>

      <section className="round-strip"><span>ROUND <b>{String(round).padStart(2,"0")}</b></span><span className="round-line" /><span>IMAGE <b>{String(Math.min(cardIndex + 1, cards.length)).padStart(2,"0")} / {String(cards.length).padStart(2,"0")}</b></span></section>

      <section className={`image-stage ${feedback === "correct" ? "answer-correct" : ""}`}>
        <div className="stage-top"><span className="image-tag">MYSTERY FRAME</span><span className="timer-label">TIME LEFT</span></div>
        <div className="timer-track"><div className={`timer-fill ${timeLeft <= 5 ? "timer-danger" : ""}`} style={{width: `${Math.max(0, (timeLeft / seconds) * 100)}%`, transition: "width 33ms linear"}} /></div>
        <div className="image-frame">
          {current?.image ? <img src={current.image} alt="Guess the anime" className="anime-image" /> :
            <div className="anime-placeholder"><div className="sun-disc" /><div className="mountain mountain-one" /><div className="mountain mountain-two" /><div className="placeholder-copy"><span>YOUR NEXT</span><strong>ANIME</strong><span>GOES HERE</span></div><div className="placeholder-stamp">?</div></div>}
          {feedback === "correct" && <div className="feedback-banner success">✓ CORRECT! +1 POINT</div>}
          {(feedback === "wrong" || feedback === "time") && <div className="feedback-banner miss">{feedback === "time" ? "⌛ TIME'S UP" : "✕ NOT THIS TIME"}</div>}
          {showAnswer && <div className="answer-reveal"><span>THE ANSWER WAS</span><strong>{current?.title}</strong></div>}
          <div className="frame-corner corner-tl" /><div className="frame-corner corner-tr" /><div className="frame-corner corner-bl" /><div className="frame-corner corner-br" />
        </div>
        <div className="stage-footer"><span><i className="status-dot" /> {started ? `${names[activePlayer] || `PLAYER ${activePlayer + 1}`} IS GUESSING` : finished ? "FINAL SCORE" : "READY WHEN YOU ARE"}</span><span>NO HINTS. JUST KNOWLEDGE.</span></div>
      </section>

      {finished ? <section className="finish-panel"><p className="eyebrow">THAT'S A WRAP</p><h2>{scores[0] === scores[1] ? "IT'S A DRAW!" : `${names[scores[0] > scores[1] ? 0 : 1]} WINS!`}</h2><p>Final score: {scores[0]} — {scores[1]}</p><button className="button button-primary" onClick={start}>↻ PLAY AGAIN</button></section> :
      <section className="controls">
        {!started ? <button className="button button-start" onClick={start}>▶ START GAME <span>→</span></button> :
          <><button className="button button-correct" onClick={() => nextTurn(true)}>✓ CORRECT <small>+1 POINT</small></button><button className="button button-wrong" onClick={() => nextTurn(false)}>✕ WRONG / PASS</button><button className="button button-reveal" onClick={() => setShowAnswer(!showAnswer)}>{showAnswer ? "HIDE ANSWER" : "REVEAL ANSWER"}</button></>}
        <p className="control-note">{started ? "Use the controls on this host window. The projector window shows only the game." : "Open the projector window, then start when both players are ready."}</p>
      </section>}

      <footer className="arena-footer"><span>GUESS THE ANIME</span><span>SET THE TIMER. SETTLE THE DEBATE.</span></footer>
    </main>
  );
}
