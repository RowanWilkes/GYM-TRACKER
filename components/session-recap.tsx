import { type RecapSession } from "@/lib/lastSession";
import { formatLogDate, toSentenceCase } from "@/lib/types";

type SessionRecapProps = {
  session: RecapSession;
  onClose?: () => void;
};

export function SessionRecap({ session, onClose }: SessionRecapProps) {
  return (
    <section className="session-recap" aria-label="Last session recap">
      <div className="session-recap-head">
        <div className="session-recap-title">
          <p className="t-card">Last session</p>
          <p className="t-meta">
            {toSentenceCase(session.dayName)} · {formatLogDate(session.date)}
          </p>
        </div>
        {onClose ? (
          <button className="session-recap-close" type="button" aria-label="Close last session" onClick={onClose}>
            <CloseIcon />
          </button>
        ) : null}
      </div>

      <div className="session-recap-stats">
        <div className="session-recap-tile">
          <p className="t-label">Exercises</p>
          <p className="t-value">
            {session.loggedCount} of {session.totalCount}
          </p>
        </div>
        <div className="session-recap-tile">
          <p className="t-label">New bests</p>
          <p className="session-recap-bests t-value">{session.newBestCount}</p>
        </div>
      </div>

      <ul className="session-recap-list">
        {session.exercises.map((exercise) => (
          <li key={exercise.id} className="session-recap-row">
            <span className="t-meta">{exercise.name}</span>
            <span className="session-recap-load t-value">
              {exercise.loadLabel}
              {exercise.isNewBest ? <TrophyIcon /> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg className="session-recap-trophy" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M4.5 2.5h7v3.2a3.5 3.5 0 0 1-3.5 3.5h0a3.5 3.5 0 0 1-3.5-3.5V2.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M4.5 3.2H2.8A1.8 1.8 0 0 0 4.6 5M11.5 3.2h1.7A1.8 1.8 0 0 1 11.4 5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 9.2v2.1M5.5 13.2h5M6.5 11.3h3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
