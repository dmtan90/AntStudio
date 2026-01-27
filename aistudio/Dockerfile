FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Clone the repository
RUN git clone https://github.com/Mag1cFall/AIStudio2API.git .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose port (default is usually 8080 or 8000, let's assume 8000 based on typical fastapi)
EXPOSE 8000

# Set environment variables
ENV PORT=8000

# Run the application
# Assuming main.py is the entry point based on common practices
CMD ["python", "main.py"]
