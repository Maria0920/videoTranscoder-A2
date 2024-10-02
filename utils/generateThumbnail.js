import ffmpeg from "fluent-ffmpeg";
import { PassThrough } from "stream";
import { uploadToS3Stream } from "./s3.js";

export const generateAndUploadThumbnail = async (
  videoStream,
  thumbnailS3Key
) => {
  const uploadStream = new PassThrough();
  const uploadPromise = uploadToS3Stream(
    uploadStream,
    thumbnailS3Key,
    "image/jpeg"
  );

  return new Promise((resolve, reject) => {
    ffmpeg(videoStream)
      .outputFormat("image2pipe") // Set to image2pipe to output directly to stream
      .on("end", () => {
        console.log(
          "Thumbnail generated and uploaded successfully:",
          thumbnailS3Key
        );
        uploadStream.end(); // Close the upload stream after processing
        resolve();
      })
      .on("error", (err) => {
        console.error("Error generating thumbnail:", err);
        uploadStream.end(); // Ensure the stream is closed on error
        reject(err);
      })
      .output(uploadStream) // Stream output directly to S3
      .screenshots({
        count: 1,
        timemarks: ["00:00:02.000"],
        update: true,
      });
  }).then(() => uploadPromise); // Wait for the upload to complete
};
