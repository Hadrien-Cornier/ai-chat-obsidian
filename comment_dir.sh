#!/bin/bash

# Define the directory to target, or fail if none is provided
target_directory="$1"
if [ -z "$target_directory" ]; then
    echo "Error: No target directory provided."
    echo "Usage: $0 <target-directory>"
    exit 1
fi

# Function to comment out all lines in a JavaScript file
comment_out() {
    sed -i ".bak" 's/^/\/\/ /' "$1"
}

# Export the function so it's available to subshells
export -f comment_out

# Find all JavaScript files and apply the comment_out function
find "$target_directory" -type f -name '*.js' -exec bash -c 'comment_out "$0"' {} \;

echo "Commenting out completed."
