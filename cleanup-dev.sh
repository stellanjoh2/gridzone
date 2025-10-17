#!/bin/bash

# Cleanup script for development browser temporary files

echo "🧹 Cleaning up development browser temporary files..."

# Remove all temporary browser directories
rm -rf /tmp/dev_browser_*
rm -rf /tmp/chrome_dev_test
rm -rf /tmp/brave_dev_test

echo "✅ Cleanup complete!"
echo "All temporary browser profiles removed."

