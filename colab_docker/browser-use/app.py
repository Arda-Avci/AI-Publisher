"""
Browser-Use Flask wrapper for AI-Publisher.
Wraps browser-use SDK to execute browser automation tasks (YouTube upload, TikTok post, etc.)
as a local Flask API consumed by the Node.js publish queue.
"""
import os
import gc
import uuid
import traceback
import asyncio
import threading
from flask import Flask, request, jsonify

app = Flask(__name__)

# Global browser-use agent (lazily initialized)
_browser_agent = None
_loop = None
_loop_thread = None
_agent_lock = threading.Lock()

# Environment: use cloud API or BYOK (bring your own key)
USE_CLOUD = os.environ.get("BROWSER_USE_API_KEY", "").startswith("bu_") if os.environ.get("BROWSER_USE_API_KEY") else False
USE_BYOK = os.environ.get("BROWSER_USE_USE_BYOK", "false").lower() == "true"

# LLM provider API keys (for BYOK mode)
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
BROWSER_USE_API_KEY = os.environ.get("BROWSER_USE_API_KEY", "")


def _get_or_create_loop():
    """Get or create the asyncio event loop for browser-use operations."""
    global _loop, _loop_thread
    if _loop is None or not _loop.is_running():
        def run_loop():
            global _loop
            _loop = asyncio.new_event_loop()
            asyncio.set_event_loop(_loop)
            _loop.run_forever()
        _loop_thread = threading.Thread(target=run_loop, daemon=True)
        _loop_thread.start()
        # Give the loop time to start
        import time; time.sleep(0.5)
    return _loop


def _run_async(coro):
    """Run a coroutine in the dedicated event loop from any thread."""
    loop = _get_or_create_loop()
    future = asyncio.run_coroutine_threadsafe(coro, loop)
    return future.result(timeout=600)


async def _init_browser_agent():
    """Initialize the browser-use agent with the appropriate LLM."""
    global _browser_agent

    if _browser_agent is not None:
        return _browser_agent

    try:
        from browser_use_sdk import AsyncBrowserUse
    except ImportError:
        raise RuntimeError(
            "browser-use-sdk not installed. "
            "Add 'browser-use-sdk' to requirements.txt or install: pip install browser-use-sdk"
        )

    client = AsyncBrowserUse()

    # Configure LLM provider based on available keys
    # The SDK will auto-detect from environment if not explicitly passed
    if USE_BYOK:
        # BYOK mode: use our own LLM keys
        if OPENAI_API_KEY:
            os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY
        if ANTHROPIC_API_KEY:
            os.environ["ANTHROPIC_API_KEY"] = ANTHROPIC_API_KEY
        if GOOGLE_API_KEY:
            os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY
        # Re-initialize with BYOK flag
        from browser_use_sdk.v3 import BrowserUse
        client = BrowserUse(use_own_key=True)

    _browser_agent = client
    print(f"[BROWSER-USE] Agent initialized (cloud={'yes' if USE_CLOUD else 'no'}, byok={USE_BYOK})")
    return _browser_agent


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "browser_use_ready": _browser_agent is not None}), 200


@app.route("/browser-task", methods=["POST"])
def browser_task():
    """
    Execute a browser automation task.

    POST body (JSON):
      task          (str)  -- Natural language task description
                              e.g. "Go to YouTube Studio, upload the video at /content/video.mp4 with title 'My Video'"
      context       (dict) -- Optional context passed to the agent (e.g. {video_path, title, description})
      max_steps     (int)  -- Max agent steps (default 30)
      timeout_secs  (int)  -- Overall timeout in seconds (default 300)
    """
    data = request.get_json() or {}
    task = data.get("task", "").strip()
    if not task:
        return jsonify({"status": "error", "message": "task is required"}), 400

    context = data.get("context", {})
    max_steps = int(data.get("max_steps", 30))
    timeout_secs = int(data.get("timeout_secs", 300))

    print(f"[BROWSER-USE] Task received: {task[:120]}")

    try:
        # Initialize agent if not already done
        agent = _run_async(_init_browser_agent())

        # Run the browser task
        # The SDK's run() method returns a result object
        result = _run_async(
            agent.run(
                task,
                max_steps=max_steps,
                context=context,
            )
        )

        # Extract useful output
        output = getattr(result, "output", str(result))
        error = getattr(result, "error", None)
        success = error is None

        print(f"[BROWSER-USE] Task done. Success={success}, output_len={len(str(output))}")

        return jsonify({
            "status": "success" if success else "error",
            "output": str(output) if output else None,
            "error": str(error) if error else None,
            "steps_used": getattr(result, "steps_used", None),
            "agent_history": str(result)[:2000],  # truncated for safety
        }), 200

    except Exception as e:
        tb = traceback.format_exc()
        print(f"[BROWSER-USE] Task error: {e}\n{tb}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "trace": tb[-1000:],  # last 1000 chars of trace
        }), 500


@app.route("/browser-screenshot", methods=["POST"])
def browser_screenshot():
    """
    Take a screenshot of a URL using browser-use.

    POST body (JSON):
      url       (str) -- URL to navigate to
      full_page (bool) -- Capture full page (default false)
    """
    data = request.get_json() or {}
    url = data.get("url", "").strip()
    if not url:
        return jsonify({"status": "error", "message": "url is required"}), 400

    full_page = data.get("full_page", False)

    print(f"[BROWSER-USE] Screenshot: {url}")

    try:
        import asyncio
        from playwright.sync_api import sync_playwright

        screenshot_path = f"/tmp/screenshot_{uuid.uuid4()}.png"

        def _capture():
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                page.goto(url, wait_until="networkidle", timeout=30000)
                page.screenshot(path=screenshot_path, full_page=full_page)
                browser.close()

        # Run in thread since playwright is sync
        import threading
        t = threading.Thread(target=_capture)
        t.start()
        t.join(timeout=60)

        if not os.path.exists(screenshot_path):
            return jsonify({"status": "error", "message": "Screenshot capture failed"}), 500

        # Return as base64
        with open(screenshot_path, "rb") as f:
            b64 = __import__("base64").b64encode(f.read()).decode()

        os.unlink(screenshot_path)

        return jsonify({
            "status": "success",
            "screenshot_base64": b64,
            "url": url,
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/clear-context", methods=["POST"])
def clear_context():
    """Clear browser context / cookies (reset session)."""
    global _browser_agent
    try:
        # Re-initialize agent = fresh context
        _browser_agent = None
        _run_async(_init_browser_agent())
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == "__main__":
    # Initialize loop for background use
    _get_or_create_loop()
    app.run(host="0.0.0.0", port=5000, debug=False)
