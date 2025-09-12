import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./views/App.tsx";

console.log("[CRXJS] Hello world from content script!");

let container: HTMLDivElement | null = null;
let root: any = null;

const injectContent = () => {
  // Check if content already exists and remove it first
  const existingContainer = document.getElementById("crxjs-app");
  if (existingContainer) {
    existingContainer.remove();
  }

  // Remove any existing GitHub button before injecting new content
  const existingGitHubButton = document.getElementById("github-post-button");
  if (existingGitHubButton) {
    existingGitHubButton.remove();
  }

  container = document.createElement("div");
  container.id = "crxjs-app";
  document.body.appendChild(container);
  root = createRoot(container);

  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );

  console.log("[CRXJS] Content successfully injected");
};

const removeContent = () => {
  // Always check for existing container in DOM
  const existingContainer = document.getElementById("crxjs-app");
  if (existingContainer) {
    existingContainer.remove();
  }

  // Remove the GitHub button from LeetCode navbar
  const githubButton = document.getElementById("github-post-button");
  if (githubButton) {
    githubButton.remove();
    console.log("[CRXJS] GitHub button removed from navbar");
  }

  if (root) {
    try {
      root.unmount();
    } catch (error) {
      console.log("[CRXJS] Error unmounting React component:", error);
    }
  }

  container = null;
  root = null;
  console.log("[CRXJS] Content successfully removed");
};

// Check if extension is enabled before injecting content
chrome.storage.local.get(["extensionEnabled"], (data) => {
  const isEnabled = data.extensionEnabled !== false; // Default to true if not set

  if (isEnabled) {
    injectContent();
  } else {
    console.log("[CRXJS] Extension is disabled, skipping content injection");
  }
});

// Listen for toggle changes from popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "toggleExtension") {
    const isEnabled = message.enabled;

    if (isEnabled) {
      console.log("[CRXJS] Extension enabled, injecting content");
      // Remove any existing content first, then inject new content
      removeContent();
      setTimeout(() => {
        injectContent();
      }, 100);
    } else {
      console.log("[CRXJS] Extension disabled, removing content");
      removeContent();
    }
  }
});
