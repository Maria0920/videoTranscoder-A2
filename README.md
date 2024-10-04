# Video Transcoding App

## Overview

The Video Transcoding App is a robust platform that enables users to upload, manage, and transcode videos from various formats (such as AVI, MKV, and FLV) into the widely-supported MP4 format. Built with a user-friendly interface, the app provides real-time progress updates during transcoding, ensuring a seamless user experience.

The application is containerized using Docker and is hosted on an AWS EC2 instance. It leverages AWS RDS for managing video metadata and user information, while video files and thumbnails are securely stored in Amazon S3. Access to these files is facilitated through PreSigned URLs, ensuring secure, temporary access.

The app employs AWS Security Groups to control inbound and outbound traffic, maintaining a secure environment. Designed as a stateless application, it efficiently handles user sessions and requests without retaining session state on the server, promoting scalability and reliability.

## Features

- **User Authentication**: Secure user authentication via JWT.
- **Video Upload and Management**: Users can upload videos in various formats and manage their uploads.
- **Video Transcoding**: Convert videos from formats like AVI, MKV, FLV, etc., to MP4 format.
- **REST API**: Comprehensive REST API for managing user sessions, video uploads, transcoding, and downloads & deletions.
- **STATELESS architecture** : The application operates statelessly, allowing for scalability and efficient resource management.
- **RDS**: Used for storing user information and video metadata.
- **S3-BUCKET**: Provides reliable storage for user-uploaded videos and generated thumbnails.
- **PreSignedURL**: Securely access files stored in S3 with temporary links.
- **SecurityGroup**: Manage and control inbound and outbound traffic for enhanced security.

## Prerequisites

- **Node.js** (version 14 or higher)
- **AWS Account** for hosting the app and accessing services.

## Setup Instructions

### 1. Clone the Repository

git clone https://github.com/your-username/video-transcoding-app.git
cd video-transcoding-app

### 2. Install Dependencies

npm i

Required Packages:

- express
- ffmpeg
- jsonwebtoken
- ws (for WebSockets)
- mysql
- awscli/

Install them using npm:

npm install express ffmpeg jsonwebtoken ws mysql awscli

### 3. Set Up Environment Variables

Create a .env file in the root directory and add your environment variables:

SECRET_KEY=your_secret_key
S3_BUCKET_NAME=your_S3_bucket_name
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=your_aws_cridentials
AWS_SECRET_ACCESS_KEY=your_aws_cridentials
AWS_SESSION_TOKEN=your_aws_cridentials
RDS_HOSTNAME=your_DB_hostname
RDS_USERNAME=admin
RDS_PASSWORD=your_password
RDS_DATABASE=your_DB_name

### 4. Run the Application Locally

npm start
The app will start on http://localhost:3000.

### 5. Run the Application with Docker //optional

Build the Docker Image
docker build -t video-transcoding-app .
Run the Docker Container
docker run -dp 8080:3000 video-transcoding-app

### 6. Deploy to AWS EC2

Create an EC2 instance.
Install Docker and Docker Compose on the instance.
Push the Docker image to AWS ECR.
Pull the Docker image on EC2 and run it.

## REST API Endpoints

### Authentication

POST /auth/login - User login with username and password. Returns a JWT token.

### Video Management

GET /files - Get a list of uploaded videos.
POST /files/upload - Upload a new video file.
DELETE /files/:id - Delete an uploaded video by ID.
GET /files/download/:id - Download a video file by ID.

### Video Transcoding

POST /videos/transcode/:videoId - Transcode a video by ID.
GET /videos/progress/:videoId - Get transcoding progress for a video by ID.

### Usage

Login: Use the login form to authenticate. Enter the username and password.
Upload Video: After logging in, upload videos using the upload form. Supported formats are AVI, MKV, FLV, etc.
Transcode Video: Choose a video from the list and click "Transcode" to convert it to the desired format.
Monitor Progress: Watch the progress of the transcoding in real-time via a progress bar.
Download/Manage Videos: Download the transcoded videos or manage them (e.g., delete if no longer needed).

## Database Initialization and Connection

The database is initialized and connected using the utils/db.js file. When the app starts, it checks for the existence of the required tables and creates them if they do not exist.

## Live Progress Indication

The app uses WebSockets to provide real-time progress updates to users while their videos are being transcoded. This allows users to monitor the progress and manage their time accordingly.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
