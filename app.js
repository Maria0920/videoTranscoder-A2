import express from "express";
import session from "express-session";
import fileUpload from "express-fileupload";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config"; // Load environment variables from .env
import http from "http"; // Import HTTP module
import { WebSocketServer } from "ws";
import { initDb } from "./utils/db.js";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager"; // AWS Secrets Manager import

// Initialize Database
initDb()
  .then(() => {
    console.log("Database initialized");
  })
  .catch((err) => {
    console.error("Error initializing database:", err);
  });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize express app
const app = express();
const port = 3000;

const server = http.createServer(app); // Create an HTTP server with Express

// Create a WebSocket server on top of the HTTP server
const wss = new WebSocketServer({ server });

// Handle WebSocket connections and reconnections
const clients = new Set();

const broadcast = (message) => {
  clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
};

wss.on("connection", (ws) => {
  console.log("New WebSocket connection established");
  clients.add(ws);

  ws.on("message", (message) => {
    console.log("Received message from client:", message);
    // Example: Broadcast the message to all clients
    broadcast(message);
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
    clients.delete(ws);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Import routes
import authRoutes from "./routes/authRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";

// Initialize Secrets Manager client
const secretsManagerClient = new SecretsManagerClient({
  region: "ap-southeast-2", // Your AWS region
});

// Fetch session secret from AWS Secrets Manager
async function fetchSessionSecret() {
  const command = new GetSecretValueCommand({
    SecretId: "n11794615-jwt-secret", // Your secret ID
  });

  try {
    const secretValueResponse = await secretsManagerClient.send(command);
    if ("SecretString" in secretValueResponse) {
      return secretValueResponse.SecretString; // Return the secret string
    }
  } catch (err) {
    console.error("Error fetching secret:", err);
    throw new Error("Could not retrieve session secret");
  }
}

// Configure session
const setupSession = async () => {
  const secretKey = await fetchSessionSecret(); // Fetch the session secret from AWS Secrets Manager or fallback to dotenv

  app.use(
    session({
      secret: secretKey || process.env.SECRET_KEY, // Use AWS secret or .env fallback
      resave: false,
      saveUninitialized: true,
    })
  );
};

// Middleware setup
app.use(express.json());
app.use(fileUpload());
app.use(express.static("public"));

// Initialize session and routes
setupSession()
  .then(() => {
    // Route handlers
    app.use("/auth", authRoutes); // Authentication routes
    app.use("/files", fileRoutes); // File handling routes
    app.use("/videos", videoRoutes); // Video handling routes

    // Serve signup page
    app.get("/signup", (req, res) => {
      res.sendFile(path.join(__dirname, "public", "signup.html"));
    });

    // Serve index.html for other routes (SPA catch-all)
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });

    // Logout route
    app.get("/logout", (req, res) => {
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
          return res.status(500).send("Error logging out");
        }
        res.redirect("/");
      });
    });

    // Start server
    server.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Error setting up session:", err);
  });

// Export WebSocket server
export { wss };
