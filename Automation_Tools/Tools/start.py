#!/usr/bin/env python3
import os
import subprocess
import sys
import time
import platform
from threading import Thread

def run_backend():
    """Run the unified backend server"""
    # Store the original directory
    original_dir = os.getcwd()
    try:
        os.chdir('unified-backend')
        subprocess.run([sys.executable, 'app.py'])
    finally:
        # Return to the original directory
        os.chdir(original_dir)

def run_frontend():
    """Run the Angular frontend"""
    # Store the original directory
    original_dir = os.getcwd()
    try:
        os.chdir('unified-app')
        if platform.system() == 'Windows':
            subprocess.run(['cmd', '/c', 'ng', 'serve', '--open'])
        else:
            subprocess.run(['ng', 'serve', '--open'])
    finally:
        # Return to the original directory
        os.chdir(original_dir)

def main():
    """Main function to start both servers"""
    print("Starting Unified Data Tools...")
    
    # Check if directories exist
    if not os.path.exists('unified-backend'):
        print("Error: unified-backend directory not found")
        return
    
    if not os.path.exists('unified-app'):
        print("Error: unified-app directory not found")
        return
    
    # Start the backend server in a separate thread
    backend_thread = Thread(target=run_backend)
    backend_thread.daemon = True
    backend_thread.start()
    
    # Wait for the backend to start
    print("Starting backend server...")
    time.sleep(2)
    
    # Start the frontend server
    print("Starting frontend server...")
    run_frontend()

if __name__ == "__main__":
    main()
