import { readFileSync, existsSync } from "fs";



async function main() {
  const token = process.env.SYNC_TOKEN;
  if (!token) {
    console.error("Error: SYNC_TOKEN is not set.");
    process.exit(1);
  }

  const response = await fetch("https://iconicompany.com/nextapi/sync", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });

  const resText = await response.text();
  if (response.ok) {
    console.log("Sync content successful.");
  } else {
    console.error(`Error: Sync failed: ${response.status} - ${resText}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
