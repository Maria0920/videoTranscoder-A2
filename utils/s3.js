import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import dotenv from "dotenv";

dotenv.config();

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

export const uploadToS3 = async (file, key) => {
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file.data,
      ContentType: file.mimetype,
    },
  });

  try {
    await upload.done();
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw error;
  }
};

/**
 * Generate a pre-signed URL for downloading a file from S3
 * @param {string} key - The S3 key (path) of the file to generate a URL for.
 * @returns {string} - Pre-signed URL for downloading the file.
 */
export const getDownloadUrlFromS3 = async (key) => {
  if (!key) {
    throw new Error("S3 key is missing or invalid.");
  }
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${key
      .split("/")
      .pop()}"`, // Force download
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
    return url;
  } catch (err) {
    console.error("Error generating download pre-signed URL:", err);
    throw err;
  }
};

/**
 * Delete a file from S3
 * @param {string} key - The S3 key (path) of the file to delete.
 */
export const deleteFromS3 = async (key) => {
  if (!key) throw new Error("Error: Key is required for deleting a file.");

  const deleteParams = {
    Bucket: BUCKET_NAME,
    Key: key,
  };

  try {
    const data = await s3Client.send(new DeleteObjectCommand(deleteParams));
    console.log("File deleted successfully from S3:", data);
    return data;
  } catch (err) {
    console.error("Error deleting file from S3:", err);
    throw err;
  }
};

/**
 * Upload a stream to S3
 * @param {stream.Readable} readableStream - The readable stream to upload.
 * @param {string} key - The S3 key (path) to store the file under.
 * @param {string} contentType - The MIME type of the file.
 */
export const uploadToS3Stream = async (readableStream, key, contentType) => {
  if (!readableStream || !key || !contentType) {
    throw new Error(
      "Invalid parameters: readableStream, key, and contentType are required."
    );
  }

  const uploadParams = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: readableStream,
    ContentType: contentType,
  };

  const managedUpload = new Upload({
    client: s3Client,
    params: uploadParams,
  });

  try {
    const data = await managedUpload.done(); // return a promise
    console.log("Uploaded to S3 successfully:", data);
    return data;
  } catch (err) {
    console.error("Error uploading to S3:", err);
    throw err;
  }
};
export const getVideoStream = async (s3Key) => {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
    });

    // Get the object (video file) from S3
    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error("Failed to retrieve video from S3.");
    }

    // Return the stream (response.Body is a readable stream)
    return response.Body;
  } catch (error) {
    console.error("Error fetching video from S3:", error);
    throw error;
  }
};
