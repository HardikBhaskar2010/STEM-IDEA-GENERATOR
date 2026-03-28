import asyncio
import logging
from typing import List

class MemoryLogStreamer(logging.Handler):
    """
    Custom logging handler that intercepts backend logs and broadcasts them 
    to all active asyncio queues for Server-Sent Events (SSE).
    """
    def __init__(self, maxsize: int = 100):
        super().__init__()
        self.queues: List[asyncio.Queue] = []
        self.maxsize = maxsize
        
        # Consistent format with the system logger
        formatter = logging.Formatter("%(asctime)s %(levelname)s  %(name)s — %(message)s")
        self.setFormatter(formatter)

    def emit(self, record: logging.LogRecord):
        try:
            msg = self.format(record)
            for q in self.queues:
                try:
                    q.put_nowait(msg)
                except asyncio.QueueFull:
                    # Drop older logs if the client is too slow
                    pass
        except Exception:
            self.handleError(record)

    async def stream_logs(self):
        """
        Async generator yielding SSE formatted log lines.
        Every new client creates its own queue holding up to `maxsize` messages.
        """
        q = asyncio.Queue(maxsize=self.maxsize)
        self.queues.append(q)
        try:
            while True:
                msg = await q.get()
                # Yield in SSE standard format
                yield f"data: {msg}\n\n"
        except asyncio.CancelledError:
            # Client disconnected naturally
            pass
        finally:
            if q in self.queues:
                self.queues.remove(q)

# Global singleton instance to attach to the root logger
global_log_streamer = MemoryLogStreamer()
