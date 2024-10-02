import ffmpeg from "fluent-ffmpeg";
import {
  uploadToS3,
  getDownloadUrlFromS3,
  deleteFromS3,
  uploadToS3Stream,
  getVideoStream,
} from "./s3.js";
import { dbPromise } from "./db.js";
import path from "path";
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { PassThrough } from "stream";
import dotenv from "dotenv";
import { generateAndUploadThumbnail } from "./generateThumbnail.js";
dotenv.config();

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

export const uploadFile = async (req, res) => {
  try {
    const video = req.files.video;

    const validExtensions = [".mp4", ".avi", ".flv", ".mov", ".mkv"];
    const fileExtension = path.extname(video.name).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      return res
        .status(400)
        .send("Invalid file type. Only video files are allowed.");
    }

    const fileName = `${path.parse(video.name).name}${fileExtension}`;
    const s3Key = `uploads/${fileName}`; // Define S3 key

    await uploadToS3(video, s3Key);

    const thumbnailS3Key = `thumbnails/${fileName.replace(
      fileExtension,
      ".jpg"
    )}`;

    // Create a function to get the video stream from S3
    const getVideoStream = async () => {
      const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key });
      const response = await s3Client.send(command);
      if (!response.Body) throw new Error("Failed to retrieve video from S3.");
      return response.Body;
    };

    // Use the video stream to generate and upload the thumbnail
    const videoStream = await getVideoStream(); // Await to get the readable stream
    await generateAndUploadThumbnail(videoStream, thumbnailS3Key); // Pass the stream to the function

    const db = await dbPromise;
    await db.execute(
      "INSERT INTO videos (filename, user, original_s3_key, thumbnail_s3_key) VALUES (?, ?, ?, ?)",
      [fileName, req.user.username, s3Key, thumbnailS3Key]
    );

    res.send("File and thumbnail uploaded successfully.");
  } catch (error) {
    console.error("Upload file error:", error);
    res.status(500).send("An error occurred while uploading the file");
  }
};

export const transcodeVideo = async (req, res) => {
  const videoId = req.params.videoId;
  const db = await dbPromise;

  try {
    // Fetch video info from the database
    const [rows] = await db.execute(
      "SELECT user, filename, original_s3_key, thumbnail_s3_key FROM videos WHERE id = ?",
      [videoId]
    );
    const video = rows[0];

    // Check if the video exists in the database and in S3
    if (!video) {
      return res.status(404).json({ message: "Video not found on RDS" });
    }
    const exists = await checkFileExistsInS3(video.original_s3_key);
    if (!exists) {
      return res.status(404).json({ message: "Video not found on S3" });
    }

    // Get the video stream from S3
    const videoStream = await getVideoStream(video.original_s3_key);

    // Define the new name and S3 key for the transcoded video
    const baseName = path.parse(video.filename).name;
    const transcodedFileName = `transcoded_${baseName}.mp4`;
    const s3Key = `uploads/${transcodedFileName}`;
    const thumbnailS3Key = video.thumbnail_s3_key;

    // Create S3 streams for the transco
    const uploadTranscodedStream = new PassThrough();
    const uploadTranscodedPromise = uploadToS3Stream(
      uploadTranscodedStream,
      s3Key,
      "video/mp4"
    );

    // Find the WebSocket connection associated with the request
    const clientSocket = [...wss.clients].find(
      (client) =>
        client.readyState === client.OPEN &&
        client._socket?.remoteAddress === req.connection.remoteAddress
    );
    // Debug: Log if client socket was found
    console.log("Client socket found for updates:", !!clientSocket);

    // Send a response to acknowledge the request
    res.status(200).json({ message: "Transcoding started" });

    // Transcode the video using FFmpeg
    ffmpeg(videoStream)
      .outputOptions("-movflags", "frag_keyframe+empty_moov")
      .outputFormat("mp4")
      .on("start", () => {
        console.log(`FFmpeg process started`);
      })
      .on("stderr", (stderrLine) => {
        console.log(`FFmpeg STDERR: ${stderrLine}`);
      })
      .on("progress", (progress) => {
        if (progress.percent) {
          const progressPercentage = Math.round(progress.percent);
          console.log(`Processing: ${progress.percent}% done`);

          // Send progress updates via WebSocket if connected
          if (clientSocket && clientSocket.readyState === clientSocket.OPEN) {
            clientSocket.send(JSON.stringify({ progress: progressPercentage }));
          }
        } else {
          console.log("Percent field not found in FFmpeg progress.");
        }
      })
      .on("end", async () => {
        uploadTranscodedStream.end();

        // Ensure WebSocket client is open before closing
        if (clientSocket && clientSocket.readyState === clientSocket.OPEN) {
          clientSocket.send(JSON.stringify({ finished: true }));
          clientSocket.close();
          console.log("WebSocket: Connection closed after transcoding");
        } else {
          console.log("WebSocket not in OPEN state, cannot close");
        }

        try {
          await uploadTranscodedPromise;
          // Update the DB with the new transcoded filename
          await db.execute(
            "INSERT INTO videos (filename, user, original_s3_key, thumbnail_s3_key, created_at) VALUES (?, ?, ?, ?, ?)",
            [transcodedFileName, video.user, s3Key, thumbnailS3Key, new Date()]
          );
          // Log success
          console.log("Transcoding successful and DB updated");
        } catch (error) {
          console.error("Error after transcoding:", error);
          if (!res.headersSent) {
            return res.status(500).json({
              message: "Error during transcoding",
              error: error.message,
            });
          }
        }
      })
      .on("error", (err) => {
        console.error("Error during transcoding:", err);
        uploadTranscodedStream.end();
        if (!res.headersSent) {
          return res
            .status(500)
            .json({ message: "Error during transcoding", error: err.message });
        }
      })
      .output(uploadTranscodedStream)
      .run();
  } catch (error) {
    console.error("Transcoding error:", error);
    if (!res.headersSent) {
      return res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }
};

export const downloadFile = async (req, res) => {
  const fileId = req.params.id;

  try {
    const db = await dbPromise;

    // Fetch the filename from the database
    const [rows] = await db.execute(
      "SELECT filename FROM videos WHERE id = ?",
      [fileId]
    );
    const file = rows[0];

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // Use the filename to create the S3 key
    const s3Key = `uploads/${file.filename}`;

    // Generate a pre-signed download URL for the file
    const downloadUrl = await getDownloadUrlFromS3(s3Key);

    // Return the download URL as a JSON response
    res.json({ downloadUrl });
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

    // Ensure req.user.username is available
    if (!req.user || !req.user.username) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Username missing" });
    }

    console.log("Fetching files for user:", req.user.username);

    // Fetch files for the logged-in user
    const [files] = await db.execute("SELECT * FROM videos WHERE user = ?", [
      req.user.username,
    ]);

    if (files.length === 0) {
      return res.status(404).json({ message: "No files found for this user" });
    }

    // Generate pre-signed URLs for the files
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        const thumbnailS3Key = file.thumbnail_s3_key;

        if (!thumbnailS3Key) {
          console.error("Missing thumbnail key for file:", file.filename);
          return { ...file, thumbnailUrl: null, downloadUrl: null };
        }

        try {
          // Generate URLs for download and thumbnail, handle missing transcoded key
          const downloadUrl = file.original_s3_key
            ? await getDownloadUrlFromS3(file.original_s3_key)
            : null;
          const thumbnailUrl = await getDownloadUrlFromS3(thumbnailS3Key);

          return {
            ...file,
            downloadUrl,
            thumbnailUrl,
          };
        } catch (err) {
          console.error(
            `Error generating URLs for file: ${file.filename}`,
            err
          );
          return { ...file, downloadUrl: null, thumbnailUrl: null };
        }
      })
    );
    // Log the response with URLs for debugging
    console.log("Files with URLs:", filesWithUrls);
    // Send the response to the client
    res.json(filesWithUrls);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Helper function to check if a file exists in S3
const checkFileExistsInS3 = async (key) => {
  try {
    await s3Client.send(
      new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key })
    );
    return true;
  } catch (error) {
    if (error.name === "NotFound") {
      return false;
    }
    throw error;
  }
};

export const deleteFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const db = await dbPromise;

    // Fetch the file details from the database
    const [rows] = await db.execute(
      "SELECT * FROM videos WHERE id = ? AND user = ?",
      [fileId, req.user.username]
    );
    const file = rows[0];

    if (!file) {
      return res.status(404).send("File not found");
    }

    //both S3 keys are retrieved correctly
    const s3Key = file.original_s3_key;
    const thumbnailS3Key = file.thumbnail_s3_key;

    if (!s3Key || !thumbnailS3Key) {
      return res.status(400).send("File keys are missing");
    }

    // Delete the files from S3
    await deleteFromS3(s3Key);
    await deleteFromS3(thumbnailS3Key);

    // Remove the file entry from the database
    await db.execute("DELETE FROM videos WHERE id = ? AND user = ?", [
      fileId,
      req.user.username,
    ]);

    res.send("File deleted successfully");
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).send("Internal Server Error");
  }
};
