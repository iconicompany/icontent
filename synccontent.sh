curl --fail --show-error -X POST "https://iconicompany.com/nextapi/sync" \
            -H "Authorization: Bearer ${SYNC_TOKEN}" \
            -H "Content-Type: application/json" \
            -d "{}"
