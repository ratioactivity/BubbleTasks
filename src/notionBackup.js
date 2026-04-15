const NOTION_API_VERSION = "2022-06-28";
const NOTION_API_BASE_URL = "https://api.notion.com/v1";
const NOTION_MAX_RICH_TEXT_CHARS = 1900;

function chunkText(input, chunkSize) {
  const chunks = [];
  let start = 0;

  while (start < input.length) {
    chunks.push(input.slice(start, start + chunkSize));
    start += chunkSize;
  }

  return chunks;
}

async function createNotionBackupPage({
  notionToken,
  databaseId,
  backupJson,
  deviceName,
  appVersion,
  taskCount,
}) {
  const createdAt = new Date();
  const title = createdAt.toISOString();

  const createPageResponse = await fetch(`${NOTION_API_BASE_URL}/pages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_API_VERSION,
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: title,
              },
            },
          ],
        },
        Created: {
          date: {
            start: createdAt.toISOString(),
          },
        },
        Device: {
          rich_text: [
            {
              text: {
                content: deviceName || "Unknown",
              },
            },
          ],
        },
        "App Version": {
          rich_text: [
            {
              text: {
                content: appVersion || "Unknown",
              },
            },
          ],
        },
        "Task Count": {
          number: Number.isFinite(taskCount) ? taskCount : 0,
        },
      },
    }),
  });

  if (!createPageResponse.ok) {
    const errorText = await createPageResponse.text();
    throw new Error(`Failed to create Notion page: ${errorText}`);
  }

  const page = await createPageResponse.json();
  const backupChunks = chunkText(backupJson, NOTION_MAX_RICH_TEXT_CHARS);

  const children = backupChunks.map((chunk) => ({
    object: "block",
    type: "code",
    code: {
      language: "json",
      rich_text: [
        {
          type: "text",
          text: {
            content: chunk,
          },
        },
      ],
    },
  }));

  const appendResponse = await fetch(
    `${NOTION_API_BASE_URL}/blocks/${page.id}/children`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_API_VERSION,
      },
      body: JSON.stringify({ children }),
    }
  );

  if (!appendResponse.ok) {
    const errorText = await appendResponse.text();
    throw new Error(`Failed to append JSON blocks: ${errorText}`);
  }

  return {
    pageId: page.id,
    pageUrl: page.url,
  };
}

async function getMostRecentBackup({ notionToken, databaseId }) {
  const queryResponse = await fetch(
    `${NOTION_API_BASE_URL}/databases/${databaseId}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_API_VERSION,
      },
      body: JSON.stringify({
        page_size: 1,
        sorts: [{ property: "Created", direction: "descending" }],
      }),
    }
  );

  if (!queryResponse.ok) {
    const errorText = await queryResponse.text();
    throw new Error(`Failed to query backups: ${errorText}`);
  }

  const queryData = await queryResponse.json();
  const mostRecentPage = queryData.results[0];

  if (!mostRecentPage) {
    throw new Error("No backup pages found in Notion database.");
  }

  const blocksResponse = await fetch(
    `${NOTION_API_BASE_URL}/blocks/${mostRecentPage.id}/children?page_size=100`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Notion-Version": NOTION_API_VERSION,
      },
    }
  );

  if (!blocksResponse.ok) {
    const errorText = await blocksResponse.text();
    throw new Error(`Failed to read backup blocks: ${errorText}`);
  }

  const blocksData = await blocksResponse.json();
  const codeBlocks = blocksData.results.filter((block) => block.type === "code");

  const backupJson = codeBlocks
    .map((block) =>
      block.code.rich_text.map((part) => part.plain_text || "").join("")
    )
    .join("");

  const parsedBackup = JSON.parse(backupJson);

  return {
    pageId: mostRecentPage.id,
    pageUrl: mostRecentPage.url,
    backup: parsedBackup,
  };
}

window.addEventListener("DOMContentLoaded", () => {
  const backupButton = document.querySelector("[data-backup-to-notion]");

  if (backupButton) {
    backupButton.addEventListener("click", async () => {
      try {
        const notionToken = window.BUBBLETASKS_CONFIG?.notionToken;
        const databaseId = window.BUBBLETASKS_CONFIG?.notionDatabaseId;

        if (!notionToken || !databaseId) {
          throw new Error(
            "Missing Notion config. Set notionToken and notionDatabaseId in your app config."
          );
        }

        const backupData = window.BubbleTasks?.exportBackup?.();

        if (!backupData) {
          throw new Error("No backup JSON produced by BubbleTasks exportBackup().");
        }

        const backupJson = JSON.stringify(backupData, null, 2);
        const taskCount = Array.isArray(backupData.tasks) ? backupData.tasks.length : 0;

        const result = await createNotionBackupPage({
          notionToken,
          databaseId,
          backupJson,
          deviceName: navigator.userAgent,
          appVersion: window.BubbleTasks?.version || "unknown",
          taskCount,
        });

        console.log("Backup uploaded to Notion:", result.pageUrl);
      } catch (error) {
        console.error("Backup to Notion failed:", error);
      }

      console.log("✅ script validated");
    });
  }
});

export { createNotionBackupPage, getMostRecentBackup };
