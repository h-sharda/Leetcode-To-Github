function cleanWhitespace(text) {
  return (
    text
      // Replace various types of spaces with regular spaces
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ")
      // Remove zero-width characters
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
      // Normalize line endings
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
  );
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "uploadToGitHub") {
    chrome.storage.local.get(
      [
        "githubToken",
        "githubUsername",
        "githubRepo",
        "defaultPath",
        "defaultFile",
      ],
      async (data) => {
        let { githubToken, githubUsername, githubRepo } = data;
        const {
          content,
          title,
          customPath,
          customFilename,
          customRepo,
          customUsername,
        } = msg.payload;

        // Use custom values if provided, otherwise fall back to defaults
        const finalUsername = customUsername || githubUsername;
        const finalRepo = customRepo || githubRepo;
        const finalPath = customPath || data.defaultPath || "Leetcode";
        const finalFilename =
          customFilename || `${new Date().getUTCDate()}.txt`;

        const cleanedContent = cleanWhitespace(content);
        const encodedContent = btoa(
          String.fromCharCode(...new TextEncoder().encode(cleanedContent))
        );

        const url = `https://api.github.com/repos/${finalUsername}/${finalRepo}/contents/${finalPath}/${finalFilename}`;

        try {
          // Check if file exists to get SHA for update
          let sha = null;
          try {
            const existingFile = await fetch(url, {
              headers: {
                Authorization: `token ${githubToken}`,
              },
            });
            if (existingFile.ok) {
              const fileData = await existingFile.json();
              sha = fileData.sha;
            }
          } catch (e) {
            // File doesn't exist, that's fine
          }

          const requestBody = {
            message: title,
            content: encodedContent,
          };

          if (sha) {
            requestBody.sha = sha;
          }

          const response = await fetch(url, {
            method: "PUT",
            headers: {
              Authorization: `token ${githubToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });

          if (response.ok) {
            console.log("Successfully committed to GitHub!");

            // Create success notification with unique ID
            const successNotificationId = `github-success-${Date.now()}`;
            const githubUrl = `https://github.com/${finalUsername}/${finalRepo}/tree/main/${finalPath}/${finalFilename}`;

            chrome.notifications.create(successNotificationId, {
              type: "basic",
              iconUrl: "icon.png",
              title: "GitHub Commit Successful",
              message: `File ${finalFilename} committed to ${finalUsername}/${finalRepo}`,
            });

            // Store the success URL for this notification
            chrome.storage.local.set({
              [successNotificationId]: {
                type: "success",
                url: githubUrl,
              },
            });
          } else {
            console.error("Failed to commit:", await response.text());

            // Create failure notification with unique ID
            const failureNotificationId = `github-failure-${Date.now()}`;
            const errorResponse = await response.text();

            chrome.notifications.create(failureNotificationId, {
              type: "basic",
              iconUrl: "icon.png",
              title: "GitHub Commit Failed",
              message: `Failed to commit ${finalFilename}. Click to view error details.`,
            });

            // Store the failure URL and error details
            chrome.storage.local.set({
              [failureNotificationId]: {
                type: "failure",
                url: `https://github.com/${finalUsername}/${finalRepo}/issues`,
                error: errorResponse,
                filename: finalFilename,
                repo: `${finalUsername}/${finalRepo}`,
              },
            });
          }
        } catch (error) {
          console.error("Error committing to GitHub:", error);

          // Create network error notification
          const errorNotificationId = `github-error-${Date.now()}`;

          chrome.notifications.create(errorNotificationId, {
            type: "basic",
            iconUrl: "icon.png",
            title: "GitHub Connection Error",
            message: `Network error occurred. Click to view GitHub status.`,
          });

          // Store the error URL
          chrome.storage.local.set({
            [errorNotificationId]: {
              type: "error",
              url: "https://www.githubstatus.com/",
              error: error.message,
              filename: finalFilename,
              repo: `${finalUsername}/${finalRepo}`,
            },
          });
        }
      }
    );
  }

  if (msg.action === "openSettings") {
    chrome.runtime.openOptionsPage();
  }
});

// Add notification click handler at the top level of background.js
chrome.notifications.onClicked.addListener(function (notificationId) {
  // Get the stored notification data
  chrome.storage.local.get([notificationId], (result) => {
    const notificationData = result[notificationId];

    if (notificationData) {
      // Open the appropriate URL based on notification type
      chrome.tabs.create({ url: notificationData.url });

      // Clear the notification and stored data
      chrome.notifications.clear(notificationId);
      chrome.storage.local.remove([notificationId]);
    }
  });
});
