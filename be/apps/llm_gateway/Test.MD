curl -X POST \
  "https://aiplatform.googleapis.com/v1/projects/ailogsystem-493123/locations/global/publishers/google/models/gemini-2.5-flash:generateContent" \
  -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [{ "text": "Who are you?" }]
      }
    ]
  }'