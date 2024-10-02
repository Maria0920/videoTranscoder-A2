document.addEventListener("DOMContentLoaded", () => {
  // Check if the user is already logged in
  const token = localStorage.getItem("token");
  if (token) {
    showMainContent();
  } else {
    showLoginPage();
  }
});

function showLoginPage() {
  // Display the login page and hide the main content
  document.getElementById("loginPage").style.display = "block";
  document.getElementById("mainContent").style.display = "none";

  // Update the browser URL to the login page
  history.pushState(null, "Login", "/login");
}

function showMainContent() {
  const username = localStorage.getItem("username");
  document
    .getElementById("profileSection")
    .querySelector("h2").textContent = `Welcome, ${username}!`;

  document.getElementById("loginPage").style.display = "none";
  document.getElementById("mainContent").style.display = "block";

  // Load the default page (Your Videos) and the video list
  showPage("videosList");
  loadFiles();
}

function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  // Authenticate the user
  fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })
    .then((response) => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error("Login failed");
      }
    })
    .then((data) => {
      localStorage.setItem("token", data.token); // Store the token
      localStorage.setItem("username", username); // Store the username
      showMainContent(); // Display the main content
    })
    .catch((error) => {
      console.error("Login error:", error);
      alert("An error occurred during login");
    });
}

function showPage(pageId) {
  // Hide all sections and show the selected one
  const sections = document.querySelectorAll(".page-section");
  sections.forEach((section) => {
    section.style.display = "none"; // Hide all sections
  });

  const selectedSection = document.getElementById(pageId);
  if (selectedSection) {
    selectedSection.style.display = "block"; // Show the selected section
  }

  // Update the browser URL without reloading the page
  history.pushState(null, pageId, `/${pageId}`);
}

// Handle the back/forward buttons in the browser
window.addEventListener("popstate", (event) => {
  const path = window.location.pathname.replace("/", "");
  if (path) {
    showPage(path);
  } else {
    showPage("videosList"); // Default page
  }
});

async function loadFiles() {
  try {
    const response = await fetch("/files", {
      method: "GET",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (response.ok) {
      const files = await response.json();
      renderFileList(files);
    } else {
      alert("Failed to load files");
    }
  } catch (error) {
    console.error("Load files error:", error);
    alert("An error occurred while loading files");
  }
}

function renderFileList(files) {
  const fileList = document.getElementById("fileList");
  fileList.innerHTML = ""; // Clear the existing list

  files.forEach((file) => {
    // Create and populate the file list with thumbnails and buttons
    const div = document.createElement("div");
    div.classList.add("file-item");

    const fileNameWithoutExtension = file.filename
      .split(".")
      .slice(0, -1)
      .join(".");
    const img = document.createElement("img");
    img.src = file.thumbnailUrl;
    img.alt = file.filename;
    img.classList.add("thumbnail");

    const filename = document.createElement("div");
    filename.textContent = file.filename;

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.classList.add("delete-button"); // Add the delete button class
    deleteButton.onclick = () => deleteFile(file.id);

    const downloadButton = document.createElement("button");
    downloadButton.textContent = "Download";
    downloadButton.classList.add("download-button"); // Add the download button class
    downloadButton.onclick = () => downloadFile(file.id, file.filename);

    div.appendChild(img);
    div.appendChild(filename);
    div.appendChild(deleteButton);
    div.appendChild(downloadButton);

    fileList.appendChild(div);

    // Option element for the "Transcode Video" dropdown
    const option = document.createElement("option");
    option.value = file.id; // or file.filename if needed
    option.textContent = file.filename;

    // Option to the dropdown
    videoSelect.appendChild(option);
  });
}

async function deleteFile(fileId) {
  if (!confirm("Are you sure you want to delete this file?")) return;

  try {
    const response = await fetch(`/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (response.ok) {
      alert("File deleted successfully");
      loadFiles(); // Reload the files after deletion
    } else {
      alert("Failed to delete file");
    }
  } catch (error) {
    console.error("Delete file error:", error);
    alert("An error occurred while deleting the file");
  }
}

async function uploadVideo() {
  const video = document.getElementById("videoUpload").files[0];
  const formData = new FormData();
  formData.append("video", video);

  try {
    const response = await fetch("/files/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: formData,
    });

    if (response.ok) {
      alert("Upload successful");
      loadFiles(); // Reload files after upload
    } else {
      alert("Upload failed");
    }
  } catch (error) {
    console.error("Upload error:", error);
    alert("An error occurred during upload");
  }
}

async function downloadFile(fileId, filename) {
  try {
    console.log(
      `Starting download for fileId: ${fileId}, filename: ${filename}`
    );
    const response = await fetch(`/files/download/${fileId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    // Debugging: Log the status of the response
    console.log(`Response status: ${response.status}`);

    if (!response.ok) {
      throw new Error("File download failed");
    }

    // Parse the response as JSON to get the download URL
    const data = await response.json();
    if (!data.downloadUrl) {
      throw new Error("Download URL not found in response");
    }

    // Use window.location to download the file
    window.location.href = data.downloadUrl;
  } catch (error) {
    console.error("Download error:", error);
    alert("An error occurred during the file download");
  }
}

async function startTranscoding() {
  const videoId = document.getElementById("videoSelect").value;

  // Reference the progress bar element
  const progressBar = document.getElementById("progress-bar");
  progressBar.value = 0;
  progressBar.style.display = "none"; // Ensure it's hidden initially

  try {
    // Establish WebSocket connection to receive progress updates
    const ws = new WebSocket("ws://localhost:3000"); //change to REAL DNS

    ws.onopen = async () => {
      console.log("WebSocket connection established");

      // Request to initiate transcoding once WebSocket is ready
      const response = await fetch(`/videos/transcode/${videoId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (response.ok) {
        alert("Transcoding initiated");
        progressBar.style.display = "block"; // Show the progress bar when transcoding starts

        // Inform the server about starting transcoding
        ws.send(
          JSON.stringify({ action: "startTranscoding", videoId: videoId })
        );
      } else {
        alert("Transcoding failed");
        ws.close();
      }
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.progress) {
        console.log(`Progress update received: ${data.progress}%`);
        progressBar.value = data.progress; // Update progress bar value
      } else if (data.finished) {
        alert("Transcoding completed successfully!");
        progressBar.style.display = "none"; // Hide the progress bar
        loadFiles();
        const videoSelect = document.getElementById("videoSelect");
        videoSelect.value = ""; // Clear the selection
        ws.close();
      } else if (data.error) {
        alert(`Error during transcoding: ${data.error}`);
        progressBar.style.display = "none"; // Hide the progress bar
        ws.close();
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      alert("An error occurred while receiving progress updates.");
      progressBar.style.display = "none"; // Hide the progress bar
      ws.close();
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };
  } catch (error) {
    console.error("Transcoding initiation error:", error);
    alert("An error occurred while starting transcoding");
  }
}
