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
      showMainContent(); // Show the main content page after login
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
