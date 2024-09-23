document
  .getElementById("confirm-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const confirmationCode = document.getElementById("confirmation-code").value;

    try {
      const response = await fetch("/auth/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          confirmationCode,
        }),
      });

      if (response.ok) {
        alert("Account confirmed successfully! Please proceed to setup TOTP.");
        window.location.href = "/mfa.js"; // Redirect to TOTP setup page
      } else {
        alert("Confirmation failed. Please check your code and try again.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred. Please try again.");
    }
  });
