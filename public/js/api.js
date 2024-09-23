document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  const codeForm = document.getElementById("codeForm");

  // Signup Form Handler
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
          headers: {
            "Content-Type": "application/json",
          },
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

  // Confirmation Code Handler (Email Confirmation)
  if (codeForm) {
    codeForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = document.getElementById("username").value;
      const confirmationCode =
        document.getElementById("confirmationCode").value;

      try {
        const response = await fetch("/auth/confirm-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, confirmationCode }),
        });

        const data = await response.json();

        if (response.ok) {
          alert("Email confirmed successfully!");
          window.location.href = "/login.html"; // Redirect to login page
        } else {
          alert(data.message || "Confirmation failed");
        }
      } catch (error) {
        console.error("Error during confirmation:", error);
        alert("An error occurred during email confirmation. Please try again.");
      }
    });
  }
});
