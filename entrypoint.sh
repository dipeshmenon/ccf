#!/bin/sh

# Ensure FILE_NAME is provided
if [ -z "$FILE_NAME" ]; then
    echo "Error: FILE_NAME environment variable is not set!"
    exit 1
fi

# Download the file from S3
echo "Downloading $FILE_NAME from S3..."
aws s3 cp s3://gcpjsonfiles/$FILE_NAME /app/creds.json

# Start the main application
exec yarn start
