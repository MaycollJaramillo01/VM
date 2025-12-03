"""Educational Flask app simulating unsafe deserialization and command execution.
This is **not** associated with Cisco ISE and is for lab use only.
"""

import os
import pickle
from flask import Flask, jsonify, request

app = Flask(__name__)


@app.route("/deployment-rpc/enableStrongSwanTunnel", methods=["POST"])
def enable_strongswan_tunnel():
    # Simulate unsafe deserialization similar to patterns seen in real-world exploits
    payload = request.get_json(silent=True) or {}
    serialized = payload.get("data", "")

    try:
        # Insecurely deserialize user-controlled input (educational purpose only)
        command = pickle.loads(bytes(serialized, "utf-8"))  # noqa: S301
    except Exception:
        # Fallback to eval to demonstrate another unsafe pattern
        command = eval(serialized)  # noqa: S307

    # Simulate remote command execution
    os.system(str(command))  # noqa: S605

    return jsonify({"status": "executed"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
