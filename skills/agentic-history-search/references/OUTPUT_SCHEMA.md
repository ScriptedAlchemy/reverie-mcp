# Output Schema

## query_past response

```json
{
  "answer": "string",
  "citations": [
    {
      "provider": "claude|codex|cursor",
      "sourceId": "optional string",
      "snippet": "string",
      "timestamp": "optional ISO timestamp",
      "sessionTitle": "optional string"
    }
  ],
  "confidence": 0.0,
  "insufficientEvidence": false,
  "scopeDiagnostics": {
    "cwd": "string",
    "gitRoot": "optional string",
    "scopePath": "string",
    "projectName": "string",
    "aliases": ["string"],
    "confidence": 0.0
  },
  "providersUsed": [
    {
      "provider": "claude|codex|cursor",
      "available": true,
      "used": true,
      "status": "ok|error|timeout|unavailable",
      "latencyMs": 0,
      "capabilityNotes": ["string"],
      "error": "optional string"
    }
  ]
}
```

## recent_sessions response

```json
{
  "sessions": [
    {
      "provider": "claude|codex|cursor",
      "sessionId": "optional string",
      "timestamp": "optional ISO timestamp",
      "title": "string",
      "summary": "optional string",
      "projectHint": "optional string"
    }
  ],
  "scopeDiagnostics": {
    "cwd": "string",
    "gitRoot": "optional string",
    "scopePath": "string",
    "projectName": "string",
    "aliases": ["string"],
    "confidence": 0.0
  },
  "providersUsed": [
    {
      "provider": "claude|codex|cursor",
      "available": true,
      "used": true,
      "status": "ok|error|timeout|unavailable",
      "latencyMs": 0,
      "capabilityNotes": ["string"],
      "error": "optional string"
    }
  ]
}
```
