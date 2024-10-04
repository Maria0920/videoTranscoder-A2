# Assignment 1 - Web Server - Response to Criteria

## Instructions

- Keep this file named A2_response_to_criteria.md, do not change the name
- Upload this file along with your code in the root directory of your project
- Upload this file in the current Markdown format (.md extension)
- Do not delete or rearrange sections. If you did not attempt a criterion, leave it blank
- Text inside [ ] like [eg. S3 ] are examples and should be removed

## Overview

- **Name:** Nomin-Erdene Davaakhuu
- **Student number:** n11720671
- **Partner name (if applicable):** Saki Endo
- **Student number:** n11794615
- **Application name:** Video Transcoder
- **Two line description:** The Video Transcoding App is a platform that enables users to upload, manage, and transcode videos from various formats (such as AVI, MKV, and FLV) into the widely-supported MP4(...) format.
- **EC2 instance name or ID:**

## Core criteria

### Core - First data persistence service

- **AWS service name:** S3
- **What data is being stored?:** Video files (in various formats, such as MP4, AVI, MKV, etc.)
  Thumbnails (generated previews of the uploaded videos)
- **Why is this service suited to this data?:** S3 is optimized for storing and retrieving large amounts of data, making it ideal for video files, which can be significantly large. Its scalability allows for easy handling of increasing storage needs without performance degradation. Additionally, S3 provides features such as versioning, lifecycle policies, and cross-region replication, which are beneficial for managing video files over time. The ability to generate PreSigned URLs allows secure, temporary access to these files without exposing them publicly.
- **Why is are the other services used not suitable for this data?:**
  RDS is designed for structured data storage and is ideal for applications that require transactional support.
  Each item in DynamoDB has a maximum size of 400 KB. This restriction makes it impractical for storing large video files, which can easily exceed this limit.
  AWS EFS is not ideal for video storage due to its higher latency and costs, while AWS Glacier is unsuitable for video files because it is designed for slow archival storage with retrieval times that hinder immediate access. Both services lack the efficiency, cost-effectiveness, and performance characteristics required for effective video storage and management, making Amazon S3 the preferred solution.
- **Bucket/instance/table name:** n11720671-test
- **Video timestamp:**
- **Relevant files:**
  - s3.js
  - fileUtils.js

### Core - Second data persistence service

- **AWS service name:** RDS
- **What data is being stored?:**
  - User information (credentials, profiles)
  - Video metadata (file names, upload timestamps, formats)
- **Why is this service suited to this data?:**
  - Structured Data Management: RDS excels in managing structured data with relationships, essential for user and video metadata.
  - Transactional Support: Offers ACID compliance, ensuring reliable processing of database transactions.
  - Scalability: Easily scales to accommodate growing amounts of data while maintaining performance.
  - Security and Backups: Provides built-in security features and automated backups for data protection.
- **Why is are the other services used not suitable for this data?:** Although DynamoDB is a NoSQL database that offers scalability, it may not be the best fit for applications requiring complex queries and joins across multiple data types. RDS is more suited for applications needing structured, relational data management.
- **Bucket/instance/table name:** n11720671-a2 endpoint: n11720671-a2.ce2haupt2cta.ap-southeast-2.rds.amazonaws.com
- **Video timestamp:**
- **Relevant files:**
  - db.js

### Third data service

- **AWS service name:** [eg. RDS]
- **What data is being stored?:** [eg video metadata]
- **Why is this service suited to this data?:** [eg. ]
- **Why is are the other services used not suitable for this data?:** [eg. Advanced video search requires complex querries which are not available on S3 and inefficient on DynamoDB]
- **Bucket/instance/table name:**
- **Video timestamp:**
- **Relevant files:**
  -

### S3 Pre-signed URLs

- **S3 Bucket names:** n11720671-test
- **Video timestamp:**
- **Relevant files:**
  - s3.js
  - fileUtils.js

### In-memory cache

- **ElastiCache instance name:**
- **What data is being cached?:** [eg. Thumbnails from YouTube videos obatined from external API]
- **Why is this data likely to be accessed frequently?:** [ eg. Thumbnails from popular YouTube videos are likely to be shown to multiple users ]
- **Video timestamp:**
- **Relevant files:**
  -

### Core - Statelessness

- **What data is stored within your application that is not stored in cloud data services?:** Intermediate video files generated during the transcoding process that have not yet been finalized, as well as temporary metadata related to the transcoding tasks.
- **Why is this data not considered persistent state?:** Intermediate video files and temporary metadata are transient and can be recreated from the original video uploads if lost. They do not represent a permanent state of the application and are only necessary for the processing duration.
- **How does your application ensure data consistency if the app suddenly stops?:** The application relies on AWS S3 for storing the original video files, ensuring that the source data is always accessible. If the application crashes, users can re-upload the original files, allowing the transcoding process to restart from the beginning without loss of data. Additionally, the application can implement idempotent operations for any critical processes, ensuring that repeated requests will not adversely affect the system's state.
- **Relevant files:**
  - s3.js
  - fileUtils.js
  - app.js

### Graceful handling of persistent connections

- **Type of persistent connection and use:** [eg. server-side-events for progress reporting]
- **Method for handling lost connections:** [eg. client responds to lost connection by reconnecting and indicating loss of connection to user until connection is re-established ]
- **Relevant files:**
  -

### Core - Authentication with Cognito

- **User pool name:**
- **How are authentication tokens handled by the client?:** [eg. Response to login request sets a cookie containing the token.]
- **Video timestamp:**
- **Relevant files:**
  -

### Cognito multi-factor authentication

- **What factors are used for authentication:** [eg. password, SMS code]
- **Video timestamp:**
- **Relevant files:**
  -

### Cognito federated identities

- **Identity providers used:**
- **Video timestamp:**
- **Relevant files:**
  -

### Cognito groups

- **How are groups used to set permissions?:** [eg. 'admin' users can delete and ban other users]
- **Video timestamp:**
- **Relevant files:**
  -

### Core - DNS with Route53

- **Subdomain**: [eg. myawesomeapp.cab432.com]
- **Video timestamp:**

### Custom security groups

- **Security group names:** n11720671-www-dev
- **Services/instances using security groups:**
  Inbound Rules:

SSH (TCP, Port 22): Allows secure shell access for server management.
HTTP (TCP, Port 80): Permits web traffic to access the application hosted on the server.
Custom TCP (TCP, Port 3000): Facilitates communication for specific services running on this port.
MYSQL/Aurora (TCP, Port 3306): Enables database access for MySQL or Aurora services.

Outbound Rules:

General outbound traffic: The outbound rule allows the instance to communicate freely with the internet and other services as needed.

- **Video timestamp:**
- **Relevant files:**
  - online on s3

### Parameter store

- **Parameter names:** [eg. n1234567/base_url]
- **Video timestamp:**
- **Relevant files:**
  -

### Secrets manager

- **Secrets names:** [eg. n1234567-youtube-api-key]
- **Video timestamp:**
- **Relevant files:**
  -

### Infrastructure as code

- **Technology used:**
- **Services deployed:**
- **Video timestamp:**
- **Relevant files:**
  -

### Other (with prior approval only)

- **Description:**
- **Video timestamp:**
- **Relevant files:**
  -

### Other (with prior permission only)

- **Description:**
- **Video timestamp:**
- **Relevant files:**
  -
