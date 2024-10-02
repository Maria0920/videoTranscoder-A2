document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (token && (await isValidToken(token))) {
    showMainContent(); // Show main content if token exists and is valid
  } else {
    showLoginPage(); // Show login page if no token or invalid token
  }

  // Add event listener to the logout button
  const logoutButton = document.querySelector(".logout-button");
  if (logoutButton) {
    logoutButton.addEventListener("click", logout);
  }

  // Add event listener to the signup form
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("username").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;

      try {
        const response = await fetch("/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password, confirmPassword }),
        });

        const data = await response.json();
        if (response.ok) {
          alert(
            data.message || "Signup successful! Please confirm your email."
          );
          window.location.href = "/index.html"; // Redirect to email confirmation page
        } else {
          alert(data.message || "Signup failed");
        }
      } catch (error) {
        console.error("Error during signup:", error);
        alert("An error occurred during signup. Please try again.");
      }
    });
  }

  // Add event listener for login form submission
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await login(); // Call the login function
    });
  }
});

// Token validation function
async function isValidToken(token) {
  try {
    const response = await fetch("/auth/validate-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return response.ok;
  } catch (error) {
    console.error("Token validation error:", error);
    return false;
  }
}

// Login function with MFA handling
async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    console.log("Attempting to log in with:", username, password);
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    console.log("Login response:", data); // Log the response data

    if (!response.ok) {
      if (data.message === "MFA required") {
        showMfaPage(data.qrCode); // Show MFA input page
      } else {
        throw new Error("Login failed");
      }
    } else {
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", username);
      document.querySelector(
        "#profileSection h2"
      ).innerText = `Welcome, ${username}!`;

      // Check for admin credentials
      if (password === "Admin123!") {
        window.location.href = "/admin.html"; // Redirect to admin page
      } else {
        showMainContent(); // Show the main content page after login
      }
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("An error occurred during login");
  }
}

// Function to show the MFA input page
function showMfaPage(qrCode) {
  document.getElementById("loginPage").style.display = "none"; // Hide login page
  document.getElementById("mfaPage").style.display = "block"; // Show MFA input page
  document.getElementById("qrCode").src = qrCode; // Set QR code for the user to scan
}

// Function to handle MFA token submission
async function verifyMfaToken() {
  const token = document.getElementById("mfaToken").value;

  try {
    const response = await fetch("/auth/verify-mfa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("token", data.token); // Store the new token
      showMainContent(); // Show main content after successful MFA
    } else {
      alert(data.message || "MFA verification failed");
    }
  } catch (error) {
    console.error("MFA verification error:", error);
    alert("An error occurred during MFA verification");
  }
}

// Logout function
async function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  showLoginPage(); // Show login page after logout
}

// Function to show the login page
function showLoginPage() {
  document.getElementById("loginPage").style.display = "block"; // Show login page
  document.getElementById("mainContent").style.display = "none"; // Hide main content
}

// Function to show the main content
function showMainContent() {
  document.getElementById("loginPage").style.display = "none"; // Hide login page
  document.getElementById("mainContent").style.display = "block"; // Show main content
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
    const videoSelect = document.getElementById("videoSelect"); // Ensure videoSelect is defined
    if (videoSelect) {
      videoSelect.appendChild(option);
    }
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

async function downloadFile(fileId, filename) {
  try {
    const response = await fetch(`/files/${fileId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      alert("Failed to download file");
    }
  } catch (error) {
    console.error("Download file error:", error);
    alert("An error occurred while downloading the file");
  }
}
