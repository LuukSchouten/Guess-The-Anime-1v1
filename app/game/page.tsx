"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Category = { id: string; label: string };
type AnimeCard = { id: string; title: string; image: string; category: string; kind?: "image" };
const DEFAULT_CATEGORIES: Category[] = [
  { id: "isekai", label: "Isekai" }, { id: "shounen", label: "Shounen" },
  { id: "sport", label: "Sport" }, { id: "yaoi-yuri", label: "Yaoi / Yuri" },
  { id: "anime-landschappen", label: "Anime Landschappen" }, { id: "emojis", label: "Emojis" }, { id: "quotes", label: "Quotes" },
];
const BANK_SECONDS = 60;
const CORRECT_BONUS = 2; // seconds added to your clock for a correct answer (never above BANK_SECONDS)
const SOUND_KINDS = ["correct", "wrong", "reveal", "win", "draw"] as const;
type SoundKind = typeof SOUND_KINDS[number];

export default function GamePage() {
  const [names, setNames] = useState(["PLAYER 1", "PLAYER 2"]);
  const [scores, setScores] = useState([0, 0]);
  const [library, setLibrary] = useState<AnimeCard[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>(DEFAULT_CATEGORIES[0].id);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [activePlayer, setActivePlayer] = useState(0);
  const [timerBanks, setTimerBanks] = useState<Record<string, number>>({});
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [finishReason, setFinishReason] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | "time" | "reveal" | "">("");
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [soundInfo, setSoundInfo] = useState<{ found: Record<string, string | null>; files: string[] }>({ found: {}, files: [] });
  const soundUrls = useRef<Partial<Record<SoundKind, string>>>({});
  const [winner, setWinner] = useState<number | null>(null); // null = draw (only meaningful once finished)
  const [timedOutPlayer, setTimedOutPlayer] = useState<number | null>(null);
  const [answeredPlayer, setAnsweredPlayer] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [round, setRound] = useState(1);
  const [deckState, setDeckState] = useState<AnimeCard[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingRef = useRef(false);
  const timerExpiredRef = useRef(false);
  const resolveRef = useRef<(outcome: "correct" | "wrong" | "timeout") => void>(() => {});
  const musicRef = useRef<{ ctx: AudioContext; timer: ReturnType<typeof setInterval> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/anime-library", { cache: "no-store" }).then(r => r.json()).then(data => {
      if (cancelled) return;
      if (Array.isArray(data.categories)) setCategories(data.categories);
      if (Array.isArray(data.cards)) setLibrary(data.cards);
    }).catch(error => console.error("Could not scan anime folders", error)).finally(() => { if (!cancelled) setLibraryLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { void loadSounds(); }, []);

  const selectedCards = useMemo(() => library.filter(card => card.category === selectedCategory), [library, selectedCategory]);
  const cards = useMemo(() => selectedCards, [selectedCards]);
  const timerKey = (player: number, category: string) => `${player}:${category}`;
  const gameCards = started || finished ? deckState : cards;
  const activeCard = gameCards[cardIndex];
  const activeCategory = categories.find(c => c.id === activeCard?.category)?.label ?? activeCard?.category ?? "";
  const activeTime = activeCard ? (timerBanks[timerKey(activePlayer, activeCard.category)] ?? BANK_SECONDS) : BANK_SECONDS;
  const clearTimer = () => { if (timer.current) clearInterval(timer.current); timer.current = null; };

  useEffect(() => {
    if (!started || finished || feedback || !activeCard) return;
    const key = timerKey(activePlayer, activeCard.category);
    timerExpiredRef.current = false;
    timer.current = setInterval(() => {
      setTimerBanks(previous => {
        const remaining = Math.max(0, (previous[key] ?? BANK_SECONDS) - 0.1);
        if (remaining <= 0 && !timerExpiredRef.current) {
          timerExpiredRef.current = true;
          window.setTimeout(() => resolveRef.current("timeout"), 0);
        }
        return { ...previous, [key]: remaining };
      });
    }, 100);
    return clearTimer;
  }, [started, finished, feedback, activePlayer, cardIndex, activeCard?.category, activeCategory, names]);

  useEffect(() => () => { clearTimer(); if (musicRef.current) { clearInterval(musicRef.current.timer); void musicRef.current.ctx.close(); } }, []);

  // Custom sounds live in public/sounds (correct / wrong / reveal / win / draw). They are loaded through /api/sounds
  // so new files work without restarting the server. A missing or broken file stays silent.
  async function loadSounds() {
    try {
      const info = await fetch("/api/sounds", { cache: "no-store" }).then(r => r.json());
      Object.values(soundUrls.current).forEach(url => url && URL.revokeObjectURL(url));
      soundUrls.current = {};
      for (const kind of SOUND_KINDS) {
        if (!info.found?.[kind]) continue;
        try {
          const res = await fetch(`/api/sounds?kind=${kind}`, { cache: "no-store" });
          if (res.ok) soundUrls.current[kind] = URL.createObjectURL(await res.blob());
        } catch (error) { console.warn(`Could not load ${kind} sound`, error); }
      }
      setSoundInfo({ found: info.found ?? {}, files: info.files ?? [] });
    } catch (error) { console.warn("Could not scan sounds folder", error); }
  }

  function playSound(kind: SoundKind) {
    const url = soundUrls.current[kind];
    if (!url) return;
    try {
      const audio = new Audio(url);
      audio.addEventListener("error", () => console.warn(`"${kind}" sound file could not be decoded`), { once: true });
      audio.play().catch(error => console.warn(`Could not play "${kind}" sound`, error));
    } catch {}
  }

  useEffect(() => {
    if (finished) playSound(winner === null ? "draw" : "win");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  function toggleMusic() {
    if (musicRef.current) { clearInterval(musicRef.current.timer); void musicRef.current.ctx.close(); musicRef.current = null; setMusicOn(false); return; }
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [220, 261.63, 329.63, 293.66, 196, 246.94, 293.66, 261.63]; let step = 0;
      const play = () => { const now = ctx.currentTime; const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = "sine"; osc.frequency.value = notes[step++ % notes.length]; gain.gain.setValueAtTime(.0001, now); gain.gain.linearRampToValueAtTime(.035, now + .04); gain.gain.exponentialRampToValueAtTime(.0001, now + .48); osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + .5); };
      play(); const id = setInterval(play, 420); musicRef.current = { ctx, timer: id }; setMusicOn(true);
    } catch {}
  }

  function start() {
    if (!selectedCategory) return;
    const deck = [...selectedCards].sort(() => Math.random() - .5);
    if (!deck.length) return;
    // Shuffle the selected question deck for this match.
    setScores([0, 0]); setCardIndex(0); setActivePlayer(0); setWrongAttempts(0); setWinner(null); setTimedOutPlayer(null);
    const banks: Record<string, number> = {};
    for (const player of [0, 1]) banks[timerKey(player, selectedCategory)] = BANK_SECONDS;
    setTimerBanks(banks); setFeedback(""); setFinished(false); setFinishReason(""); setStarted(true); setRound(1); processingRef.current = false;
    setDeckState(deck);
  }

  // Chess-clock rules: a correct answer adds CORRECT_BONUS seconds (max BANK_SECONDS), a wrong answer costs 3 seconds,
  // and the player whose clock reaches zero loses immediately, whatever the score is.
  function resolveTurn(outcome: "correct" | "wrong" | "timeout") {
    if (processingRef.current || !started || finished || !activeCard) return;
    processingRef.current = true;
    clearTimer();

    const a = activePlayer;
    const other = 1 - a;
    const key = timerKey(a, activeCard.category);
    const bankBefore = timerBanks[key] ?? BANK_SECONDS;
    const bankAfter = outcome === "wrong" ? Math.max(0, bankBefore - 3) : outcome === "timeout" ? 0 : Math.min(BANK_SECONDS, bankBefore + CORRECT_BONUS);
    const missed = outcome !== "correct";
    const timeUp = missed && bankAfter <= 0;
    const canPass = missed && !timeUp && wrongAttempts === 0;   // same card goes to the other player
    const nobodyGotIt = missed && !timeUp && !canPass;          // show the answer
    const newScores = outcome === "correct" ? scores.map((v, i) => i === a ? v + 1 : v) : scores;

    setTimerBanks(previous => ({ ...previous, [key]: outcome === "timeout" ? 0 : outcome === "wrong" ? Math.max(0, (previous[key] ?? BANK_SECONDS) - 3) : Math.min(BANK_SECONDS, (previous[key] ?? BANK_SECONDS) + CORRECT_BONUS) }));

    if (outcome === "correct") {
      setScores(newScores);
      setAnsweredPlayer(a);
      setFeedback("correct");
      playSound("correct");
    } else if (nobodyGotIt) {
      setFeedback("reveal");
      playSound("reveal");
    } else {
      setFeedback(outcome === "timeout" ? "time" : "wrong");
      playSound("wrong");
    }

    window.setTimeout(() => {
      setFeedback("");
      setAnsweredPlayer(null);
      if (timeUp) {
        setTimedOutPlayer(a);
        setWinner(other);
        setFinishReason(`${names[a]} ran out of time.`);
        setFinished(true);
        setStarted(false);
        setShowSettings(true);
        processingRef.current = false;
        return;
      }
      if (canPass) {
        setWrongAttempts(1);
        setActivePlayer(other);
        processingRef.current = false;
        return;
      }
      setWrongAttempts(0);
      if (cardIndex + 1 >= deckState.length) {
        setTimedOutPlayer(null);
        setWinner(newScores[0] === newScores[1] ? null : newScores[0] > newScores[1] ? 0 : 1);
        setFinished(true);
        setStarted(false);
        setFinishReason("All questions in the selected category have been completed.");
        setShowSettings(true);
      } else {
        setCardIndex(i => i + 1);
        setActivePlayer(other);
        setRound(r => r + 1);
      }
      processingRef.current = false;
    }, outcome === "correct" ? 1200 : nobodyGotIt ? 2000 : 1000);
  }
  resolveRef.current = resolveTurn;
  function nextTurn(wasCorrect: boolean) { resolveTurn(wasCorrect ? "correct" : "wrong"); }

  useEffect(() => {
    const projectorState = {
      names, scores, current: activeCard && (started || finished) ? { image: activeCard.image, title: feedback === "reveal" ? activeCard.title : undefined, kind: activeCard.kind } : undefined, cardIndex, cardCount: deckState.length, activePlayer,
      seconds: BANK_SECONDS, timeLeft: activeTime, started, finished, feedback, answeredPlayer, wrongAttempts, winner, timedOutPlayer, bonus: CORRECT_BONUS, showAnswer: false, round,
      category: activeCategory, timerBanks, selectedCategory,
    };
    try { localStorage.setItem("anime-floor-projector-state", JSON.stringify(projectorState)); } catch {}
    try { const channel = new BroadcastChannel("anime-floor-projector"); channel.postMessage(projectorState); channel.close(); } catch {}
  }, [names, scores, activeCard, cardIndex, deckState.length, activePlayer, activeTime, started, finished, feedback, answeredPlayer, wrongAttempts, winner, timedOutPlayer, round, activeCategory, timerBanks, selectedCategory]);

  function resetRound() {
    clearTimer();
    processingRef.current = false;
    timerExpiredRef.current = false;
    setStarted(false);
    setFinished(false);
    setFinishReason("");
    setWinner(null);
    setTimedOutPlayer(null);
    setFeedback("");
    setScores([0, 0]);
    setCardIndex(0);
    setActivePlayer(0);
    setWrongAttempts(0);
    setTimerBanks({});
    setDeckState([]);
    setRound(1);
    setShowSettings(true);
  }

  function openProjector() { window.open("/projector", "anime-floor-projector", "popup,width=1280,height=720"); }

  const bankRows = [0, 1].map(player => ({ player, time: activeCard ? timerBanks[timerKey(player, activeCard.category)] ?? BANK_SECONDS : BANK_SECONDS }));

  return (
    <main className="arena">
      <div className="arena-top">
        <a className="brand" href="/">✦ ANIME FLOOR</a>
        <div className="top-actions">
          <span className="live-pill"><i /> {started ? "GAME LIVE" : finished ? "GAME COMPLETE" : "READY TO PLAY"}</span>
          <button className="button button-primary" onClick={openProjector}>↗ OPEN PROJECTOR</button>
          <button className="button button-primary" onClick={toggleMusic}>{musicOn ? "♫ MUSIC ON" : "♫ MUSIC OFF"}</button>
          <button className="button button-reset-round" onClick={resetRound}>↻ RESET ROUND / CHANGE CATEGORY</button>
          <button className="icon-button" onClick={() => setShowSettings(!showSettings)} aria-label="Settings">⚙</button>
        </div>
      </div>

      {showSettings && <section className="settings-panel">
        <div className="settings-heading"><div><p className="eyebrow">CUSTOMIZE YOUR GAME</p><h2>Game setup</h2></div><button className="icon-button" onClick={() => setShowSettings(false)}>✕</button></div>
        <div className="settings-grid">
          <label>PLAYER ONE<input value={names[0]} maxLength={18} onChange={e => setNames(n => [e.target.value, n[1]])} /></label>
          <label>PLAYER TWO<input value={names[1]} maxLength={18} onChange={e => setNames(n => [n[0], e.target.value])} /></label>
        </div>
        <div className="add-card">
          <h3>SELECT CATEGORY</h3>
          <p className="help-text">Each player gets 60 seconds in this category. The timer only runs during their own guessing turns. Every wrong answer costs that player 3 seconds and every correct answer gives +2 seconds (never above 60). The player whose time runs out loses, whatever the score.</p>
          <label style={{ display: "grid", gap: 8, maxWidth: 420 }}>CATEGORY
            <select value={selectedCategory} disabled={started} onChange={e => setSelectedCategory(e.target.value)}>
              {categories.map(category => {
                const count = library.filter(card => card.category === category.id).length;
                return <option key={category.id} value={category.id}>{category.label} ({count} images)</option>;
              })}
            </select>
          </label>
          <p className="help-text">Choose exactly one category per game. Add images directly to <code>public/anime/[category]/</code>. The image filename becomes the correct answer. Supported formats: JPG, JPEG, PNG, WEBP, GIF and AVIF.</p>
          <p className="help-text">Example: <code>public/anime/isekai/Re-Zero.jpg</code> → answer: <b>Re Zero</b>.</p>
          <button className="button button-primary" onClick={() => { fetch("/api/anime-library", { cache: "no-store" }).then(r => r.json()).then(data => setLibrary(data.cards ?? [])); }}>↻ REFRESH IMAGE FOLDERS</button>
        </div>
        <div className="add-card">
          <h3>SOUNDS</h3>
          <p className="help-text">Put your own sounds in <code>public/sounds/</code> named <code>correct</code>, <code>wrong</code>, <code>reveal</code>, <code>win</code> and <code>draw</code> (mp3, wav, ogg, m4a). Missing ones stay silent.</p>
          {SOUND_KINDS.map(kind => <div key={kind} style={{ display: "flex", alignItems: "center", gap: 12, margin: "6px 0" }}>
            <b style={{ width: 80 }}>{kind.toUpperCase()}</b>
            <span style={{ flex: 1, color: soundInfo.found[kind] ? "#65e6a5" : "#9b9ba7" }}>{soundInfo.found[kind] ? `✓ ${soundInfo.found[kind]}` : "✕ no file found - silent"}</span>
            <button className="button button-primary" onClick={() => playSound(kind)}>▶ TEST</button>
          </div>)}
          <p className="help-text">Files seen in the folder: {soundInfo.files.length ? soundInfo.files.join(", ") : "none"}</p>
          <button className="button button-primary" onClick={() => void loadSounds()}>↻ REFRESH SOUNDS</button>
        </div>
      </section>}

      <header className="game-heading">
        <p className="eyebrow">THE ULTIMATE ANIME SHOWDOWN</p>
        <h1>GUESS THE <span>ANIME.</span></h1>
        <p className="subheading">Two players. One image. Do you know your anime?</p>
      </header>

      <section className="scoreboard">
        {[0, 1].map(p => <div key={p} className={`player-card ${activePlayer === p && started ? "player-active" : ""} ${(feedback === "correct" && answeredPlayer === p) || (finished && winner === p) ? "player-winner" : ""} ${p === 1 ? "player-right" : ""}`}>
          <div className="player-avatar">{p === 0 ? "壱" : "弐"}</div>
          <div className="player-meta"><span className="player-label">PLAYER 0{p + 1} {activePlayer === p && started ? <b>• YOUR TURN</b> : ""}</span><input aria-label={`Player ${p + 1} name`} value={names[p]} maxLength={18} onChange={e => setNames(n => p === 0 ? [e.target.value, n[1]] : [n[0], e.target.value])} /></div>
          <div className="score">{scores[p].toString().padStart(2, "0")}</div>
        </div>)}
      </section>

      <section className="round-strip"><span>ROUND <b>{String(round).padStart(2, "0")}</b></span><span className="round-line" /><span>QUESTION <b>{String(Math.min(cardIndex + 1, Math.max(1, gameCards.length))).padStart(2, "0")} / {String(gameCards.length).padStart(2, "0")}</b></span></section>

      <section className={`image-stage ${feedback === "correct" ? "answer-correct" : ""} ${feedback === "wrong" || feedback === "time" ? "answer-wrong" : ""}`}>
        <div className="stage-top"><span className="image-tag">{activeCategory || "MYSTERY FRAME"}</span><span className="timer-label">{started ? `${Math.ceil(activeTime)} SEC LEFT · ${names[activePlayer]}` : "60 SEC PER PLAYER / CATEGORY"}</span></div>
        <div className="image-frame">
          <img src={(started || finished) && activeCard?.image ? activeCard.image : "/default-mystery.svg"} alt={started || finished ? "Guess the anime" : "Get ready to play"} className="anime-image" />
          {feedback === "correct" && answeredPlayer !== null && <div className="round-winner-overlay"><span>ROUND WINNER</span><strong>{names[answeredPlayer] || `PLAYER ${answeredPlayer + 1}`}</strong><em>✓ CORRECT! +1 POINT · +{CORRECT_BONUS} SEC</em></div>}
          {(feedback === "wrong" || feedback === "time") && <div className="round-winner-overlay wrong"><span>{names[activePlayer] || `PLAYER ${activePlayer + 1}`}</span><strong>{feedback === "time" ? "⌛ TIME'S UP!" : "✕ WRONG!"}</strong><em>{(timerBanks[timerKey(activePlayer, selectedCategory)] ?? BANK_SECONDS) <= 0 ? `${names[1 - activePlayer]} WINS!` : wrongAttempts === 0 ? "OTHER PLAYER'S TURN" : ""}</em></div>}
          {feedback === "reveal" && activeCard && <div className="round-winner-overlay reveal"><span>NOBODY GOT IT · THE ANSWER WAS</span><strong>{activeCard.title}</strong></div>}
          {finished && !feedback && <div className={`round-winner-overlay ${winner === null ? "draw" : ""}`}><span>{winner === null ? "FINAL RESULT" : "WINNER"}</span><strong>{winner === null ? "IT'S A DRAW!" : `${names[winner]} WINS!`}</strong><em>{timedOutPlayer !== null ? `${names[timedOutPlayer]} ran out of time · ` : ""}{scores[0]} — {scores[1]}</em></div>}
          <div className="frame-corner corner-tl" /><div className="frame-corner corner-tr" /><div className="frame-corner corner-bl" /><div className="frame-corner corner-br" />
        </div>
        <div className="stage-footer"><span><i className="status-dot" /> {started ? `${names[activePlayer] || `PLAYER ${activePlayer + 1}`} IS GUESSING` : finished ? "FINAL SCORE" : "READY WHEN YOU ARE"}</span><span>{activeCard ? `CATEGORY: ${activeCategory}` : "NO QUESTIONS LOADED"}</span></div>
      </section>

      <section className="settings-panel" style={{ marginTop: 16 }}>
        <div className="settings-heading"><div><p className="eyebrow">HOST ONLY · NOT SHOWN ON PROJECTOR</p><h2>Correct answer</h2></div></div>
        <div style={{ fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 900 }}>{activeCard?.title ?? "—"}</div>
        <p className="help-text">Use this answer to decide whether to press Correct or Wrong.</p>
        <div className="host-timer-grid">{bankRows.map(row => <div className={`host-timer-card ${started && activePlayer === row.player ? "host-timer-active" : ""}`} key={row.player}><span>{names[row.player]} {row.time <= 0 ? "· OUT OF TIME" : started && activePlayer === row.player ? "· GUESSING" : "· PAUSED"}</span><strong>{Math.ceil(row.time)}<small>s</small></strong><em>TIME REMAINING</em></div>)}</div>
      </section>

      {finished ? <section className="finish-panel"><p className="eyebrow">THAT'S A WRAP</p><h2>{winner === null ? "IT'S A DRAW!" : `${names[winner]} WINS!`}</h2><p>{finishReason}</p><p>Final score: {scores[0]} — {scores[1]}</p><button className="button button-primary" onClick={resetRound}>↻ BACK TO SETUP / NEW ROUND</button></section> :
        <section className="controls">
          {!started ? <button className="button button-start" onClick={start} disabled={!libraryLoaded || !selectedCards.length}>▶ START GAME <span>→</span></button> :
            <><button className="button button-correct" onClick={() => nextTurn(true)}>✓ CORRECT <small>+1 POINT</small></button><button className="button button-wrong" onClick={() => nextTurn(false)}>✕ WRONG / PASS</button></>}
          <p className="control-note">{started ? "The answer is private to this host screen. The projector shows only the mystery image." : !libraryLoaded ? "Loading image folders…" : !selectedCards.length ? "Add images to the selected category folder to begin." : "Select one category in Game setup, open the projector, then start."}</p>
        </section>}
      <footer className="arena-footer"><span>GUESS THE ANIME</span><span>SET THE TIMER. SETTLE THE DEBATE.</span></footer>
    </main>
  );
}
