# Use Python 3.10 slim image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Set environment variables
ENV PORT=8000
ENV LOG_LEVEL=INFO
ENV ENABLE_OPENROUTER=true

# Run the application
CMD ["python", "server.py"]