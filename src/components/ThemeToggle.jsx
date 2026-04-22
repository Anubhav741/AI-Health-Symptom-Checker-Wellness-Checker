import { useState, useEffect } from 'react';
import './ThemeToggle.css';

const ThemeToggle = () => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('health_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('health_theme', theme);
  }, [theme]);

  const toggle = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <button
      className="theme-toggle-btn"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <span className={`theme-icon ${theme === 'dark' ? 'show' : ''}`}>🌙</span>
      <span className={`theme-icon ${theme === 'light' ? 'show' : ''}`}>☀️</span>
      <span className="theme-toggle-track">
        <span className={`theme-toggle-thumb ${theme}`} />
      </span>
    </button>
  );
};

export default ThemeToggle;
