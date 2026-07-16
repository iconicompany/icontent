// Триггер контент-синка на сайт (шаг 4, вынесенный из sync.ts).
// Сайт по этому вебхуку подтягивает контент из репозитория и обновляет блог.
// Здесь НЕТ ни LLM-переоформления, ни авто-перевода, ни рассылки по каналам —
// только загрузка уже закоммиченного контента на сайт.
//
//   bun scripts/content-sync.ts     # дёрнуть синк вручную (SYNC_URL из .env)

export async function triggerContentSync(): Promise<boolean> {
  const syncUrl = process.env.SYNC_URL;
  const syncToken = process.env.SYNC_TOKEN;
  if (!syncUrl) {
    console.log("Skipping Content Sync (SYNC_URL not configured).");
    return false;
  }
  console.log(`--- Triggering Content Sync to ${syncUrl} ---`);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (syncToken) {
      headers["Authorization"] = `Bearer ${syncToken}`;
    }
    const response = await fetch(syncUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    const resText = await response.text();
    if (response.ok) {
      console.log("Content Sync triggered successfully.");
      return true;
    }
    console.warn(`Content Sync failed: ${response.status} - ${resText}`);
    return false;
  } catch (e: any) {
    console.error("Failed to trigger Content Sync:", e.message);
    return false;
  }
}

if (import.meta.main) {
  triggerContentSync().then((ok) => process.exit(ok ? 0 : 1));
}
