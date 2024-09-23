import path from "path";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import { dbPromise } from "./db.js";
import { fileURLToPath } from "url";
import { wss } from "../app.js";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateThumbnail = (videoPath, outputDir) => {
  return new Promise((resolve, reject) => {
    const fileNameWithoutExtension = path.basename(
      videoPath,
      path.extname(videoPath)
    );
    const thumbnailPath = path.join(
      outputDir,
      `${fileNameWithoutExtension}.png`
    );

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    ffmpeg(videoPath)
      .screenshots({
        count: 1,
        folder: outputDir,
        filename: path.basename(thumbnailPath),
      })
      .on("end", () => {
        console.log("Thumbnail generated successfully");
        resolve(thumbnailPath);
      })
      .on("error", (err) => {
        console.error("Error generating thumbnail:", err);
        reject(err);
      });
  });
};

// Function to handle file uploads
export const uploadFile = async (req, res) => {
  try {
    const video = req.files.video;

    // Validate file type
    const validExtensions = [".mp4", ".avi", ".flv", ".mov", ".mkv"];
    const fileExtension = path.extname(video.name).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      return res
        .status(400)
        .send("Invalid file type. Only video files are allowed.");
    }

    // Paths for saving the file and thumbnail
    const fileName = `${path.parse(video.name).name}${fileExtension}`;
    const uploadPath = path.join(__dirname, "../uploads", fileName);
    const thumbnailDir = path.join(__dirname, "../public/thumbnails");
    const thumbnailPath = path.join(
      thumbnailDir,
      `${path.parse(fileName).name}.png`
    );

    // Ensure the upload directory exists
    if (!fs.existsSync(path.dirname(uploadPath))) {
      fs.mkdirSync(path.dirname(uploadPath), { recursive: true });
    }

    // Save the video file
    await video.mv(uploadPath);

    // Generate the thumbnail
    await generateThumbnail(uploadPath, thumbnailDir);

    // Save file info in the database
    const db = await dbPromise;
    await db.run(
      "INSERT INTO videos (filename, user, thumbnail) VALUES (?, ?, ?)",
      [video.name, req.user.username, thumbnailPath]
    );
    res.send("File uploaded successfully");
  } catch (error) {
    console.error("Upload file error:", error);
    res.status(500).send("An error occurred while uploading the file");
  }
};

export const deleteFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const db = await dbPromise;

    // Fetch the file details from the database
    const file = await db.get(
      "SELECT * FROM videos WHERE id = ? AND user = ?",
      [fileId, req.user.username]
    );

    if (!file) {
      return res.status(404).send("File not found");
    }

    const filePath = path.join(__dirname, "../uploads", file.filename);
    const thumbnailPath = path.join(
      __dirname,
      "../public/thumbnails",
      `${path.parse(file.filename).name}.png`
    );

    // Delete the file from the filesystem
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete the thumbnail from the filesystem
    if (fs.existsSync(thumbnailPath)) {
      fs.unlinkSync(thumbnailPath);
    }

    // Remove the file entry from the database
    await db.run("DELETE FROM videos WHERE id = ? AND user = ?", [
      fileId,
      req.user.username,
    ]);

    res.send("File deleted successfully");
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).send("Internal Server Error");
  }
};

export const transcodeVideo = async (req, res) => {
  const videoId = req.params.videoId;
  const db = await dbPromise;
  const video = await db.get(
    "SELECT filename, thumbnail FROM videos WHERE id = ?",
    [videoId]
  );

  if (!video) {
    return res.status(404).json({ message: "Video not found" });
  }

  const inputPath = path.join(__dirname, "../uploads", video.filename);
  const baseName = path.basename(video.filename, path.extname(video.filename));
  const outputFileName = `transcoded_${baseName}.mp4`;
  const outputPath = path.join(__dirname, "../uploads", outputFileName);

  try {
    if (!fs.existsSync(inputPath)) {
      console.error(`Input file does not exist: ${inputPath}`);
      return res.status(404).json({ message: "Input file not found" });
    }
    // Debug: Check WebSocket clients
    console.log("Connected WebSocket clients:", [...wss.clients].length);

    // Find the WebSocket connection associated with the request
    const clientSocket = [...wss.clients].find(
      (client) =>
        client.readyState === client.OPEN &&
        client._socket.remoteAddress === req.connection.remoteAddress
    );
    // Debug: Log if client socket was found
    console.log("Client socket found for updates:", !!clientSocket);

    // Send a response to acknowledge the request
    res.status(200).json({ message: "Transcoding started", outputPath });

    ffmpeg(inputPath)
      .output(outputPath)
      .on("start", (commandLine) => {
        console.log(`FFmpeg process started with command: ${commandLine}`);
      })
      .on("progress", (progress) => {
        const progressPercentage = Math.round(progress.percent);
        console.log(`Processing: ${progress.percent}% done`);

        // Send progress updates via WebSocket if connected
        if (clientSocket && clientSocket.readyState === clientSocket.OPEN) {
          clientSocket.send(JSON.stringify({ progress: progressPercentage }));
        }
      })
      .on("end", async () => {
        console.log("Transcoding completed successfully");
        const thumbnailPath = await generateThumbnail(
          outputPath,
          path.join(__dirname, "../public/thumbnails")
        );

        // Insert the transcoded file into the database
        await db.run(
          "INSERT INTO videos (filename, user, thumbnail) VALUES (?, ?, ?)",
          [outputFileName, req.user.username, thumbnailPath]
        );

        // Notify the client about the completion via WebSocket
        if (clientSocket && clientSocket.readyState === clientSocket.OPEN) {
          clientSocket.send(JSON.stringify({ finished: true }));
          clientSocket.close();
        }
      })
      .on("error", (err) => {
        console.error("Error during transcoding:", err);

        // Send error message via WebSocket if connected
        if (clientSocket && clientSocket.readyState === clientSocket.OPEN) {
          clientSocket.send(JSON.stringify({ error: err.message }));
          clientSocket.close();
        }
      })
      .run();
  } catch (error) {
    console.error("Transcoding error:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

export const downloadFile = async (req, res) => {
  const fileId = req.params.id;

  try {
    const db = await dbPromise;
    const file = await db.get("SELECT filename FROM videos WHERE id = ?", [
      fileId,
    ]);
    console.log(`File ID: ${fileId}`);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const filePath = path.join(__dirname, "../uploads", file.filename);
    console.log(`File path: ${filePath}`);

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found on server" });
    }

    res.download(filePath, file.filename);
  } catch (error) {
    console.error("Error during file download:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

export const listFiles = async (req, res) => {
  try {
    const db = await dbPromise;
    const files = await db.all("SELECT * FROM videos WHERE user = ?", [
      req.user.username,
    ]);
    res.json(files);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).send("Internal Server Error");
  }
};
