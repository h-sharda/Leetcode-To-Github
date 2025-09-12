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

  useEffect(() => {
    // Load settings
    chrome.storage.local.get(
      ["githubUsername", "githubRepo", "isAuthorized"],
      (data) => {
        setGitAuth({
          githubUsername: data.githubUsername || "",
          githubRepo: data.githubRepo || "",
          isAuthorized: data.isAuthorized || false,
        });
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

  return (
    <div className="popup-container">
      <header>
        <h3>Leetcode To GitHub</h3>
      </header>
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
    </div>
  );
}
