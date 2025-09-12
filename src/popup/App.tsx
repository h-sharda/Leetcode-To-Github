import { useState, useEffect } from "react";
import "./App.css";

interface GitHubAuth {
  githubUsername: string;
  githubRepo: string;
  isAuthorized: boolean;
}

export default function App() {
  const [gitAuth, setGitAuth] = useState<GitHubAuth>({
    githubUsername: "",
    githubRepo: "",
    isAuthorized: false,
  });
  const [isEnabled, setIsEnabled] = useState<boolean>(true);

  useEffect(() => {
    // Load settings
    chrome.storage.local.get(
      ["githubUsername", "githubRepo", "isAuthorized", "extensionEnabled"],
      (data) => {
        setGitAuth({
          githubUsername: data.githubUsername || "",
          githubRepo: data.githubRepo || "",
          isAuthorized: data.isAuthorized || false,
        });
        setIsEnabled(data.extensionEnabled !== false); // Default to true if not set
      }
    );
  }, []);

  const handleOpenSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  const handleOpenGitHub = () => {
    if (gitAuth.isAuthorized && gitAuth.githubUsername && gitAuth.githubRepo) {
      chrome.tabs.create({
        url: `https://github.com/${gitAuth.githubUsername}/${gitAuth.githubRepo}`,
      });
    }
  };

  const handleOpenAbout = () => {
    chrome.tabs.create({
      url: "https://github.com/h-sharda/Leetcode-To-Github",
    });
  };

  const handleOpenFeedback = () => {
    chrome.tabs.create({
      url: "https://github.com/h-sharda/Leetcode-To-Github/issues",
    });
  };

  const handleToggleEnabled = () => {
    const newEnabledState = !isEnabled;
    setIsEnabled(newEnabledState);
    chrome.storage.local.set({ extensionEnabled: newEnabledState });

    // Send message to all content scripts to update their state
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs
          .sendMessage(tabs[0].id, {
            action: "toggleExtension",
            enabled: newEnabledState,
          })
          .catch(() => {
            // Ignore errors if content script is not available
            console.log("Content script not available on this page");
          });
      }
    });
  };

  return (
    <div className="popup-container">
      <header>
        <div className="logo-container">
          <img src="/logo.png" alt="LeetCode to GitHub" className="logo" />
        </div>
        <h3>LeetCode to GitHub</h3>
        <p className="description">
          Automatically sync your LeetCode solutions to GitHub repository to maintain both streaks simultaneously.
        </p>
      </header>

      <div className="toggle-section">
        <div className="toggle-container">
          <span className="toggle-label">Extension Status</span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={handleToggleEnabled}
            />
            <span className="slider"></span>
          </label>
        </div>
        <div
          className={`status-indicator ${isEnabled ? "enabled" : "disabled"}`}
        >
          {isEnabled ? "Enabled" : "Disabled"}
        </div>
      </div>

      {isEnabled && (
        <main>
          <a href="#" onClick={handleOpenAbout}>
            <button type="button">About</button>
          </a>

          <a href="#" onClick={handleOpenSettings}>
            <button type="button">Settings</button>
          </a>

          {gitAuth.isAuthorized && (
            <a href="#" onClick={handleOpenGitHub}>
              <button type="button">View Repository</button>
            </a>
          )}

          <a href="#" onClick={handleOpenFeedback}>
            <button type="button">Send Feedback</button>
          </a>
        </main>
      )}

      {!isEnabled && (
        <div className="disabled-message">
          <p>Extension is disabled. Toggle above to enable.</p>
        </div>
      )}
    </div>
  );
}
