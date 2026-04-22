import { useState, useEffect } from 'react';
import './GamificationBar.css';

/* ─── Gamification Bar ─── */
const GamificationBar = ({ totalCheckups = 0 }) => {
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Calculate XP from checkups (pure UI derivation)
    const storedXp = parseInt(localStorage.getItem('health_xp') || '0', 10);
    const derivedXp = Math.max(storedXp, totalCheckups * 120);
    setXp(derivedXp);
    localStorage.setItem('health_xp', String(derivedXp));

    // Streak from localStorage
    const lastVisit = localStorage.getItem('health_last_visit');
    const today = new Date().toDateString();
    const storedStreak = parseInt(localStorage.getItem('health_streak') || '0', 10);

    if (lastVisit === today) {
      setStreak(storedStreak);
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isConsecutive = lastVisit === yesterday.toDateString();
      const newStreak = isConsecutive ? storedStreak + 1 : 1;
      setStreak(newStreak);
      localStorage.setItem('health_streak', String(newStreak));
      localStorage.setItem('health_last_visit', today);
    }

    // Trigger entrance animation
    setTimeout(() => setAnimate(true), 100);
  }, [totalCheckups]);

  const level = Math.floor(xp / 500) + 1;
  const xpInLevel = xp % 500;
  const xpPercent = Math.round((xpInLevel / 500) * 100);

  const getLevelTitle = (lvl) => {
    if (lvl >= 10) return 'Health Master';
    if (lvl >= 7) return 'Wellness Pro';
    if (lvl >= 4) return 'Health Explorer';
    if (lvl >= 2) return 'Wellness Seeker';
    return 'Health Novice';
  };

  return (
    <div className={`gamification-bar ${animate ? 'gbar-visible' : ''}`}>
      {/* Level Badge */}
      <div className="gbar-item gbar-level">
        <div className="gbar-level-badge">
          <span className="gbar-level-num">{level}</span>
        </div>
        <div className="gbar-level-info">
          <span className="gbar-label">Level</span>
          <span className="gbar-value-sm">{getLevelTitle(level)}</span>
        </div>
      </div>

      {/* XP Progress */}
      <div className="gbar-item gbar-xp">
        <div className="gbar-xp-header">
          <span className="gbar-label">Health XP</span>
          <span className="gbar-xp-value">{xp} XP</span>
        </div>
        <div className="gbar-xp-track">
          <div
            className="gbar-xp-fill"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
        <span className="gbar-xp-next">{500 - xpInLevel} XP to Level {level + 1}</span>
      </div>

      {/* Streak */}
      <div className="gbar-item gbar-streak">
        <span className="gbar-streak-icon">🔥</span>
        <div className="gbar-streak-info">
          <span className="gbar-streak-count">{streak}</span>
          <span className="gbar-label">Day Streak</span>
        </div>
      </div>
    </div>
  );
};

export default GamificationBar;
