# Workflow Examples

Common workflow patterns to reference when generating new workflows.

## Quick Reference

1. **Social Media Monitor** - Basic scheduled workflow (fetch → send)
2. **AI Chatbot** - Chat trigger with AI SDK responses
3. **AI Content Processing** - Using AI `.content` property correctly
4. **Table Generation** - Building structured data with `zipToObjects`
5. **Database Deduplication** - Complete workflow with dynamic tables (⭐ most comprehensive)
6. **JavaScript Transform** - Custom filtering/mapping with JavaScript

## 1. Social Media Monitor → Notification

**Pattern:** Fetch social content → Filter/process → Send notification

**What this shows:** Basic two-step workflow with scheduled trigger. Fetches data from one service, sends to another.

```json
{
  "version": "1.0",
  "name": "Reddit Top Posts to Slack",
  "description": "Fetch top posts from r/singularity and send to Slack",
  "trigger": {
    "type": "cron",
    "config": {
      "schedule": "0 9 * * *",
      "timezone": "America/New_York"
    }
  },
  "config": {
    "steps": [
      {
        "id": "fetch",
        "module": "social.reddit.getSubredditPosts",
        "inputs": {
          "subreddit": "singularity",
          "sort": "top",
          "limit": 5
        },
        "outputAs": "posts"
      },
      {
        "id": "send",
        "module": "communication.slack.postMessage",
        "inputs": {
          "options": {
            "channel": "#tech-news",
            "text": "Top posts from r/singularity:\n{{posts}}"
          }
        }
      }
    ]
  },
  "metadata": {
    "requiresCredentials": ["reddit", "slack"]
  }
}
```

---

## 2. AI-Powered Chatbot

**Pattern:** User message → AI processing → Response

**What this shows:** Chat trigger with AI SDK. System message defines bot personality, user message from trigger input.

```json
{
  "version": "1.0",
  "name": "Math Tutor Bot",
  "description": "Answer math questions using OpenAI",
  "trigger": {
    "type": "chat",
    "config": {
      "inputVariable": "userMessage"
    }
  },
  "config": {
    "steps": [
      {
        "id": "chat",
        "module": "ai.ai-sdk.chat",
        "inputs": {
          "options": {
            "messages": [
              {
                "role": "system",
                "content": "You are a helpful math tutor. Explain concepts clearly with examples."
              },
              {
                "role": "user",
                "content": "{{trigger.userMessage}}"
              }
            ],
            "model": "gpt-4o-mini",
            "provider": "openai"
          }
        }
      }
    ]
  },
  "metadata": {
    "requiresCredentials": ["openai"]
  }
}
```

---

## 2b. AI Text Generation with System Prompt

**Pattern:** User message → AI text generation with system instructions → Response

**What this shows:** Using `generateText` with `systemPrompt` for simpler single-turn interactions. Alternative to `chat` when you don't need conversation history.

```json
{
  "version": "1.0",
  "name": "Code Explainer Bot",
  "description": "Explain code snippets using OpenAI with system instructions",
  "trigger": {
    "type": "chat",
    "config": {
      "inputVariable": "userMessage"
    }
  },
  "config": {
    "steps": [
      {
        "id": "explain",
        "module": "ai.ai-sdk.generateText",
        "inputs": {
          "options": {
            "prompt": "{{trigger.userMessage}}",
            "systemPrompt": "You are an expert programmer. Explain code clearly and concisely, highlighting key concepts and potential issues.",
            "model": "gpt-4o-mini",
            "provider": "openai",
            "temperature": 0.7,
            "maxTokens": 500
          }
        },
        "outputAs": "explanation"
      }
    ],
    "returnValue": "{{explanation.content}}",
    "outputDisplay": {
      "type": "markdown"
    }
  },
  "metadata": {
    "requiresCredentials": ["openai"]
  }
}
```

**Key differences from `chat`:**
- `generateText` uses `prompt` + `systemPrompt` (simpler, single-turn)
- `chat` uses `messages` array (supports conversation history)
- Both require extracting `.content` for text output
- Both use `"inputs": { "options": { ... } }` wrapper

---

## 3. AI Content Generation with String Processing

**Pattern:** Generate AI text → Process/format → Use in downstream steps

**What this shows:** Using AI SDK `.content` property correctly. AI modules return objects, not strings—must access `.content` for text.

**CRITICAL: AI SDK returns objects with `.content` property, not plain strings!**

```json
{
  "version": "1.0",
  "name": "AI Content Analyzer",
  "description": "Generate AI analysis and count words",
  "trigger": {
    "type": "manual"
  },
  "config": {
    "steps": [
      {
        "id": "generate",
        "module": "ai.ai-sdk.generateText",
        "inputs": {
          "options": {
            "prompt": "Write a 50-word summary about AI trends in 2025",
            "model": "gpt-4o-mini",
            "provider": "openai",
            "temperature": 0.7,
            "maxTokens": 200
          }
        },
        "outputAs": "aiSummary"
      },
      {
        "id": "countWords",
        "module": "utilities.string-utils.wordCount",
        "inputs": {
          "str": "{{aiSummary.content}}"
        },
        "outputAs": "wordCount"
      },
      {
        "id": "truncate",
        "module": "utilities.string-utils.truncate",
        "inputs": {
          "str": "{{aiSummary.content}}",
          "maxLength": 100,
          "suffix": "..."
        },
        "outputAs": "shortSummary"
      }
    ],
    "returnValue": "{{shortSummary}}",
    "outputDisplay": {
      "type": "text"
    }
  },
  "metadata": {
    "requiresCredentials": ["openai"]
  }
}
```

**Key points:**
- AI SDK modules ALWAYS use `"inputs": { "options": { ... } }`
- AI outputs ALWAYS use `.content` when passing to string functions
- Never pass AI object directly: `"{{aiOutput}}"` ❌
- Always extract content: `"{{aiOutput.content}}"` ✅

---

## 4. Table Generation with zipToObjects

**Pattern:** Generate data → Build table with multiple columns

**What this shows:** Creating structured table data from arrays. `zipToObjects` combines parallel arrays into objects. Table output display with column configuration.

**CRITICAL: ALL fields in zipToObjects must be arrays of equal length!**

```json
{
  "version": "1.0",
  "name": "Product Analysis Table",
  "description": "Generate table with AI analysis for multiple products",
  "trigger": {
    "type": "manual"
  },
  "config": {
    "steps": [
      {
        "id": "generateIds",
        "module": "utilities.array-utils.range",
        "inputs": {
          "start": 1,
          "end": 6,
          "step": 1
        },
        "outputAs": "productIds"
      },
      {
        "id": "aiAnalysis",
        "module": "ai.ai-sdk.generateText",
        "inputs": {
          "options": {
            "prompt": "Write a 1-sentence market analysis for tech products",
            "model": "gpt-4o-mini",
            "provider": "openai"
          }
        },
        "outputAs": "marketAnalysis"
      },
      {
        "id": "buildTable",
        "module": "utilities.array-utils.zipToObjects",
        "inputs": {
          "fieldArrays": {
            "id": [1, 2, 3, 4, 5],
            "name": ["Product A", "Product B", "Product C", "Product D", "Product E"],
            "category": ["Electronics", "Software", "Hardware", "Services", "Cloud"],
            "score": [95, 87, 92, 88, 91],
            "analysis": [
              "{{marketAnalysis.content}}",
              "{{marketAnalysis.content}}",
              "{{marketAnalysis.content}}",
              "{{marketAnalysis.content}}",
              "{{marketAnalysis.content}}"
            ]
          }
        },
        "outputAs": "productTable"
      }
    ],
    "returnValue": "{{productTable}}",
    "outputDisplay": {
      "type": "table",
      "columns": [
        { "key": "id", "label": "ID", "type": "number" },
        { "key": "name", "label": "Product", "type": "text" },
        { "key": "category", "label": "Category", "type": "text" },
        { "key": "score", "label": "Score", "type": "number" },
        { "key": "analysis", "label": "AI Analysis", "type": "text" }
      ]
    }
  },
  "metadata": {
    "requiresCredentials": ["openai"]
  }
}
```

**Key points:**
- zipToObjects requires ALL fields as arrays of same length
- Passing a string `"{{text}}"` creates array of characters ❌
- Repeat the value for each row: `["{{text}}", "{{text}}", ...]` ✅
- AI content needs `.content`: `["{{ai.content}}", "{{ai.content}}"]` ✅
- outputDisplay defines how table is rendered

---

## 5. Dynamic Database Operations (Deduplication)

**Pattern:** Query existing records → Filter duplicates → Process → Save results

**What this shows:** Complete deduplication workflow using dynamic database tables. Query existing records, filter out duplicates with JavaScript, process new items, save to database. Tables auto-create from data structure—no migrations needed.

**CRITICAL: Tables are created dynamically from data structure!**

```json
{
  "version": "1.0",
  "name": "Reply to Tweets (Deduplication)",
  "description": "Search tweets, reply with AI, track in database to avoid duplicates",
  "trigger": {
    "type": "cron",
    "config": {
      "schedule": "0 */2 * * *",
      "timezone": "America/New_York"
    }
  },
  "config": {
    "steps": [
      {
        "id": "search-tweets",
        "module": "external-apis.rapidapi-twitter.searchTwitter",
        "inputs": {
          "params": {
            "query": "AI tools",
            "count": 20
          }
        },
        "outputAs": "searchResults"
        // Step 1: Search for tweets matching query
      },
      {
        "id": "extract-ids",
        "module": "utilities.javascript.execute",
        "inputs": {
          "options": {
            "code": "return searchResults.results.map(t => t.tweet_id);",
            "context": {
              "searchResults": "{{searchResults}}"
            }
          }
        },
        "outputAs": "tweetIds"
        // Step 2: Extract just the IDs from search results
      },
      {
        "id": "check-already-replied",
        "module": "data.drizzle-utils.queryWhereIn",
        "inputs": {
          "params": {
            "tableName": "tweet_replies",
            "column": "original_tweet_id",
            "values": "{{tweetIds}}",
            "selectColumn": "original_tweet_id"
          }
        },
        "outputAs": "repliedIds"
        // Step 3: Check which IDs are already in database (returns [] if table doesn't exist)
      },
      {
        "id": "filter-new-tweets",
        "module": "utilities.javascript.execute",
        "inputs": {
          "options": {
            "code": "return searchResults.results.filter(t => !repliedIds.includes(t.tweet_id));",
            "context": {
              "searchResults": "{{searchResults}}",
              "repliedIds": "{{repliedIds}}"
            }
          }
        },
        "outputAs": "newTweets"
        // Step 4: Filter out tweets we've already replied to
      },
      {
        "id": "select-first-tweet",
        "module": "utilities.javascript.execute",
        "inputs": {
          "options": {
            "code": "return newTweets[0] || null;",
            "context": {
              "newTweets": "{{newTweets}}"
            }
          }
        },
        "outputAs": "selectedTweet"
        // Step 5: Select first new tweet to process (workflows don't loop)
      },
      {
        "id": "generate-reply",
        "module": "ai.ai-sdk.generateText",
        "inputs": {
          "options": {
            "prompt": "Reply to: {{selectedTweet.text}}",
            "model": "gpt-4o-mini",
            "provider": "openai",
            "maxTokens": 280
          }
        },
        "outputAs": "aiReply"
        // Step 6: Generate AI reply to the tweet
      },
      {
        "id": "post-reply",
        "module": "social.twitter-oauth.replyToTweet",
        "inputs": {
          "originalTweetId": "{{selectedTweet.tweet_id}}",
          "text": "{{aiReply.content}}"
        },
        "outputAs": "tweetResponse"
        // Step 7: Post the reply to Twitter (note .content for AI output)
      },
      {
        "id": "save-to-database",
        "module": "data.drizzle-utils.insertRecord",
        "inputs": {
          "params": {
            "tableName": "tweet_replies",
            "data": {
              "original_tweet_id": "{{selectedTweet.tweet_id}}",
              "original_tweet_text": "{{selectedTweet.text}}",
              "original_tweet_author": "{{selectedTweet.user_screen_name}}",
              "our_reply_text": "{{aiReply.content}}",
              "our_reply_tweet_id": "{{tweetResponse.data.id}}",
              "status": "posted",
              "replied_at": "{{$now}}"
            }
          }
        }
        // Step 8: Save to database - table auto-creates from this structure
      }
    ]
  },
  "metadata": {
    "requiresCredentials": ["rapidapi", "twitter_oauth", "openai"]
  }
}
```

**Key points:**
- `queryWhereIn` checks existing records (returns `[]` if table doesn't exist)
- `insertRecord` creates table dynamically from data structure
- Column types inferred: TEXT (strings), INTEGER (numbers), TIMESTAMP (ISO dates)
- Use `{{$now}}` for current timestamp (auto-converted to ISO string)
- Table persists across workflow runs for deduplication
- No schema migration needed - columns added automatically

**IMPORTANT - Single Item Processing:**
This example processes ONE tweet per run. Workflows don't support loops/iteration.
To process multiple items:
- Run workflow on schedule (processes first unhandled item each time)
- Use separate workflow runs for bulk operations
- For batch processing, use JavaScript to combine operations

**Finding database modules:**
```bash
npx tsx scripts/search-modules.ts "database"
npx tsx scripts/search-modules.ts "drizzle"
```

**Common use cases:**
- Track processed items (tweets, emails, posts) to avoid duplicates
- Store workflow results for analytics
- Build custom tables per workflow without migrations
- Query historical data in later workflow runs

---

## 6. JavaScript Data Transformation

**Pattern:** Use JavaScript for complex filtering, mapping, and conditional logic

**What this shows:** Using `utilities.javascript.execute` for custom data manipulation. Pass variables via `context`, write JavaScript code as string. Essential for filtering arrays, extracting properties, and conditional logic.

**When to use:** Array operations, filtering, custom logic that utility modules don't cover

```json
{
  "id": "filter-and-transform",
  "module": "utilities.javascript.execute",
  "inputs": {
    "options": {
      "code": "return items.filter(x => x.score > 50).map(x => ({ id: x.id, name: x.name.toUpperCase() }));",
      "context": {
        "items": "{{rawData}}"
      }
    }
  },
  "outputAs": "filtered"
}
```

**Key points:**
- `code`: JavaScript expression (must return a value)
- `context`: Pass workflow variables as local variables
- Always wrap in `"options": { ... }`
- Access variables by name: `items.filter(...)` not `{{items}}`
- Can use array methods: `.filter()`, `.map()`, `.find()`, `.reduce()`
- Can access nested properties: `items[0].data.tweets`

**Common patterns:**
```javascript
// Filter array
"return items.filter(x => x.value > 100);"

// Map/transform array
"return tweets.map(t => ({ id: t.tweet_id, text: t.text }));"

// Extract property from array
"return tweets.map(t => t.id);"

// Check if array empty
"return items.length === 0 ? 'No results' : 'Found items';"

// Combine multiple arrays
"return [...array1, ...array2];"

// Get first item
"return items[0];"
```

---

## 7. Multi-Step API Fetch with Async JavaScript

**Pattern:** Fetch list of IDs → Fetch details for each → Transform → Display

**What this shows:** Using `utilities.javascript.executeAsync` to fetch multiple API endpoints with async/await. This is the modern approach for workflows that need to make sequential API calls.

**When to use:** When you need to fetch data from multiple endpoints based on initial results, or when you need async operations like fetch, setTimeout, or Promise handling.

```json
{
  "version": "1.0",
  "name": "HackerNews Top Stories (Async)",
  "description": "Fetch top HackerNews stories using async JavaScript",
  "trigger": {
    "type": "manual",
    "config": {}
  },
  "config": {
    "steps": [
      {
        "id": "step1",
        "module": "utilities.http.httpGet",
        "inputs": {
          "url": "https://hacker-news.firebaseio.com/v0/topstories.json"
        },
        "outputAs": "topStoryIds"
      },
      {
        "id": "step2",
        "module": "utilities.array-utils.first",
        "inputs": {
          "arr": "{{topStoryIds.data}}",
          "count": 10
        },
        "outputAs": "top10Ids"
      },
      {
        "id": "step3",
        "module": "utilities.javascript.executeAsync",
        "inputs": {
          "options": {
            "code": "const stories = []; for (const id of ids) { const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`); const item = await response.json(); if (item && !item.deleted) { stories.push({ title: item.title || 'No title', url: item.url || `https://news.ycombinator.com/item?id=${id}`, score: item.score || 0, comments: item.descendants || 0 }); } } return stories;",
            "context": {
              "ids": "{{top10Ids}}"
            }
          }
        },
        "outputAs": "stories"
      }
    ],
    "returnValue": "{{stories}}",
    "outputDisplay": {
      "type": "table",
      "columns": [
        {"key": "title", "label": "Title", "type": "text"},
        {"key": "url", "label": "URL", "type": "link"},
        {"key": "score", "label": "Score", "type": "number"},
        {"key": "comments", "label": "Comments", "type": "number"}
      ]
    }
  },
  "metadata": {
    "requiresCredentials": []
  }
}
```

**Key differences from regular execute():**
- Use `utilities.javascript.executeAsync` (NOT `utilities.javascript.execute`)
- Can use `await`, `fetch()`, `Promise`, and other async operations
- Supports longer timeout (default 30s vs 5s)
- Code runs in isolated worker thread
- Access context variables directly: `ids` not `{{ids}}`

**Alternative: Using dedicated module**

If a module exists (like `external-apis.hackernews.getTopStories`), prefer that over custom async code:

```json
{
  "id": "fetch",
  "module": "external-apis.hackernews.getTopStories",
  "inputs": {
    "options": {
      "limit": 10,
      "filterByDate": false
    }
  },
  "outputAs": "stories"
}
```

**When to use executeAsync vs dedicated modules:**
- ✅ Use executeAsync: Custom API, unique logic, one-off workflows
- ✅ Use dedicated module: Well-known API (HN, Reddit, Twitter), reusable logic

---

## Key Principles

- **Variable syntax:** Use `{{outputAs}}` not `{{stepId.outputAs}}`
- **Trigger at top level:** Same level as `config`
- **All parameters:** Provide all parameters, even optional ones
- **Module paths:** Always lowercase (e.g., `social.twitter.postTweet`)
- **Authentication:** Use `*WithApiKey` for read operations when available
- **Credentials:** List all required credentials in `metadata.requiresCredentials`
- **AI SDK format:** Always wrap in `"options": { ... }`
- **AI SDK output:** Always use `.content` property for text
- **zipToObjects:** All fields must be arrays of equal length
- **returnValue:** ALWAYS specify what to return to avoid exposing internal variables
- **Output display:** Match type to final step return type
- **ALWAYS validate:** Run auto-fix → schema → output display → test → import

Use these examples as templates when generating new workflows!
