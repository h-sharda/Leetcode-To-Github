document
  .getElementById("git-auth-info-show-btn")
  .addEventListener("click", () => {
    const infoMessage = document.getElementById("git-auth-info-msg");
    const infoButton = document.getElementById("git-auth-info-show-btn");
    const status = window.getComputedStyle(infoMessage).display;

    if (status === "none") {
      infoMessage.style.display = "block";
      infoButton.textContent = "Hide Setup Guide";
    } else {
      infoMessage.style.display = "none";
      infoButton.textContent = "Show Setup Guide";
    }
  });

document
  .getElementById("user-options-info-show-btn")
  .addEventListener("click", () => {
    const infoMessage = document.getElementById("user-options-info-msg");
    const infoButton = document.getElementById("user-options-info-show-btn");
    const status = window.getComputedStyle(infoMessage).display;

    if (status === "none") {
      infoMessage.style.display = "block";
      infoButton.textContent = "Hide Configurations";
    } else {
      infoMessage.style.display = "none";
      infoButton.textContent = "Show Configurations";
    }
  });

document
  .getElementById("save-git-auth-btn")
  .addEventListener("click", async () => {
    const username = document.getElementById("username-input").value.trim();
    const repo = document.getElementById("repo-input").value.trim();
    const token = document.getElementById("token-input").value.trim();

    if (!token || !username || !repo) {
      alert("Please fill all fields.");
      return;
    }

    // Disable button during validation
    const saveButton = document.getElementById("save-git-auth-btn");
    const originalText = saveButton.textContent;
    saveButton.disabled = true;
    saveButton.textContent = "Validating...";

    try {
      const response = await fetch(
        `https://api.github.com/repos/${username}/${repo}/contents/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Leetcode-To-GitHub-Extension",
          },
        }
      );

      if (response.ok) {
        chrome.storage.local.set(
          {
            githubToken: token,
            githubUsername: username,
            githubRepo: repo,
            isAuthorized: true,
          },
          () => {
            alert("Token is valid. Settings saved!");
            document.getElementById("clear-git-auth-btn").style.display =
              "inline";
            document.getElementById("user-options").style.display = "block";
          }
        );
      } else {
        const error = await response.json();
        alert(
          `Failed to validate token: ${error.message || response.statusText}`
        );
      }
    } catch (err) {
      alert("Error validating token: " + err.message);
    } finally {
      // Re-enable button
      saveButton.disabled = false;
      saveButton.textContent = originalText;
    }
  });

document.getElementById("clear-git-auth-btn").addEventListener("click", () => {
  if (confirm("Are you sure you want to clear git authorization settings?")) {
    chrome.storage.local.remove(
      ["githubToken", "githubUsername", "githubRepo", "isAuthorized"],
      () => {
        alert("Settings cleared!");
        // Clear form fields
        document.getElementById("username-input").value = "";
        document.getElementById("repo-input").value = "";
        document.getElementById("token-input").value = "";
        document.getElementById("clear-git-auth-btn").style.display = "none";
        document.getElementById("user-options").style.display = "none";
      }
    );
  }
});

document
  .getElementById("save-user-options-btn")
  .addEventListener("click", () => {
    const defaultPath = document.getElementById("path-input").value.trim();
    const defaultFile = document.getElementById("file-input").value.trim();
    const defaultCommit = document.getElementById("commit-input").value.trim();
    const defaultComments = document
      .getElementById("comments-input")
      .value.trim();

    // Validate minimum requirements
    if (defaultFile && defaultFile.length < 1) {
      alert("Default file name must be at least 1 character long!");
      return;
    }

    if (defaultCommit && defaultCommit.length < 1) {
      alert("Default commit message must be at least 1 character long!");
      return;
    }

    chrome.storage.local.set(
      {
        defaultPath: defaultPath,
        defaultFile: defaultFile,
        defaultCommit: defaultCommit,
        defaultComments: defaultComments,
      },
      () => {
        alert("User options saved successfully!");
      }
    );
  });

document
  .getElementById("restore-user-options-btn")
  .addEventListener("click", () => {
    if (confirm("Are you sure you want to restore default user options?")) {
      chrome.storage.local.remove(
        ["defaultPath", "defaultFile", "defaultCommit", "defaultComments"],
        () => {
          alert("Settings cleared!");
          // Clear form fields
          document.getElementById("path-input").value = "";
          document.getElementById("file-input").value = "";
          document.getElementById("commit-input").value = "";
          document.getElementById("comments-input").value = "";
        }
      );
    }
  });

// Initialize form when page loads
window.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(
    [
      "githubToken",
      "githubUsername",
      "githubRepo",
      "isAuthorized",
      "defaultPath",
      "defaultFile",
      "defaultCommit",
      "defaultComments",
    ],
    (data) => {
      // Populate GitHub auth fields
      document.getElementById("token-input").value = data.githubToken || "";
      document.getElementById("username-input").value =
        data.githubUsername || "";
      document.getElementById("repo-input").value = data.githubRepo || "";

      // Show/hide sections based on authorization status
      if (data.isAuthorized) {
        document.getElementById("clear-git-auth-btn").style.display = "inline";
        document.getElementById("user-options").style.display = "block";
      } else {
        document.getElementById("clear-git-auth-btn").style.display = "none";
        document.getElementById("user-options").style.display = "none";
      }

      // Populate user options with saved values or defaults
      document.getElementById("path-input").value = data.defaultPath || "";
      document.getElementById("file-input").value = data.defaultFile || "";
      document.getElementById("commit-input").value = data.defaultCommit || "";
      document.getElementById("comments-input").value =
        data.defaultComments || "";
    }
  );
});
