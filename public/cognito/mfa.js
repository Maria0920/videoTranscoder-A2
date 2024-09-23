import React, { useState } from "react";
import QRCode from "qrcode.react";
import { useHistory } from "react-router-dom"; // Import useHistory for navigation
import { verifyMfaToken } from "./login"; // Import your verify function

const MfaSetup = ({ authCode, accessToken }) => {
  const [token, setToken] = useState("");
  const [errorMessage, setErrorMessage] = useState(""); // State for error messages
  const history = useHistory(); // Initialize useHistory

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await verifyMfaToken(accessToken, token);
      console.log("MFA verification successful:", response);
      // Redirect to the main application page
      history.push("/main"); // Adjust the path as needed
    } catch (error) {
      console.error("MFA verification failed:", error);
      setErrorMessage("MFA verification failed. Please try again."); // Set error message
    }
  };

  return (
    <div>
      <h2>Scan the QR Code</h2>
      <QRCode value={authCode} />
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}{" "}
      {/* Display error message */}
      <form onSubmit={handleMfaSubmit}>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Enter your MFA code"
          required
        />
        <button type="submit">Verify MFA</button>
      </form>
    </div>
  );
};

export default MfaSetup;
