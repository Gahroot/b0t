# b0t Workflow UI - Quick Reference

## Component Map

### Main Workflow Management
```
/dashboard/workflows
├── WorkflowsList (grid of cards)
└── WorkflowCard (each workflow)
    ├── Status Toggle
    ├── Edit Dialog (name/description)
    ├── WorkflowExecutionDialog (run workflow)
    ├── CredentialsConfigDialog (manage creds)
    ├── WorkflowSettingsDialog (configure steps)
    ├── WorkflowOutputsDialog (view history)
    ├── Export Button
    └── Delete Button
```

### Dialogs & Modals
| Component | File | Purpose |
|-----------|------|---------|
| WorkflowExecutionDialog | workflow-execution-dialog.tsx | Run workflow with real-time progress |
| WorkflowSettingsDialog | workflow-settings-dialog.tsx | Configure step parameters |
| CredentialsConfigDialog | credentials-config-dialog.tsx | Manage workflow credentials |
| TriggerConfigDialog | trigger-config-dialog.tsx | Configure trigger (cron, webhook, etc) |
| WorkflowOutputsDialog | workflow-outputs-dialog.tsx | View execution history |
| RunOutputModal | run-output-modal.tsx | Display execution results |
| ChatInterface | chat-interface.tsx | Chat-based workflow interaction |

### Trigger Configurations
```
trigger-configs/
├── manual-trigger-config.tsx
├── cron-trigger-config.tsx (calendar UI)
├── webhook-trigger-config.tsx
├── chat-trigger-config.tsx
├── chat-input-trigger-config.tsx
├── telegram-trigger-config.tsx
├── discord-trigger-config.tsx
├── gmail-trigger-config.tsx
└── outlook-trigger-config.tsx
```

### Output Rendering
```
output-renderer/
├── index.tsx (smart auto-detection)
├── data-table.tsx (array of objects)
├── image-display.tsx (single/multiple images)
└── (also: MarkdownDisplay, TextDisplay, ListDisplay, JSONDisplay)
```

## State Management

### WorkflowCard State
```typescript
const [deleting, setDeleting] = useState(false);
const [toggling, setToggling] = useState(false);
const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);
const [executionDialogOpen, setExecutionDialogOpen] = useState(false);
const [credentialsConfigOpen, setCredentialsConfigOpen] = useState(false);
const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
const [outputsDialogOpen, setOutputsDialogOpen] = useState(false);
const [editDialogOpen, setEditDialogOpen] = useState(false);
const [editName, setEditName] = useState(workflow.name);
const [editDescription, setEditDescription] = useState(workflow.description || '');
const [saving, setSaving] = useState(false);
```

### WorkflowSettingsDialog State
```typescript
const [configurableSteps, setConfigurableSteps] = useState<ConfigurableStep[]>([]);
const [stepSettings, setStepSettings] = useState<Record<string, Record<string, unknown>>>({});
const [triggerSettings, setTriggerSettings] = useState<Record<string, unknown>>({});
const [saving, setSaving] = useState(false);
const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({});
const [initialized, setInitialized] = useState(false);
```

## API Endpoints

### Workflow Management
```
GET    /api/workflows                      # List workflows
GET    /api/workflows?organizationId=xxx   # Filter by org
PATCH  /api/workflows/[id]                 # Update workflow
DELETE /api/workflows/[id]                 # Delete workflow
POST   /api/workflows/import               # Import from JSON
GET    /api/workflows/[id]/export          # Export to JSON
```

### Workflow Execution
```
POST   /api/workflows/[id]/run             # Execute workflow
GET    /api/workflows/[id]/stream          # SSE stream for progress
GET    /api/workflows/[id]/runs            # Execution history
GET    /api/workflows/[id]/chat            # Chat interaction
POST   /api/workflows/[id]/webhook         # Webhook trigger
```

### Credentials
```
GET    /api/workflows/[id]/credentials    # Get required credentials
PATCH  /api/workflows/[id]/credentials    # Update credentials
```

## Workflow Configuration Format

### Workflow Object
```typescript
{
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'draft' | 'paused';
  trigger: {
    type: 'manual' | 'cron' | 'webhook' | 'telegram' | 'discord' | 'chat' | 'chat-input' | 'gmail' | 'outlook';
    config: Record<string, unknown>;
  };
  config: {
    steps: Array<{
      id: string;
      module: string;
      inputs: Record<string, unknown>;
    }>;
    outputDisplay?: OutputDisplayConfig;
    returnValue?: string;
  };
  createdAt: Date | null;
  lastRun: Date | null;
  lastRunStatus: string | null;
  lastRunOutput: unknown | null;
  runCount: number;
}
```

### Module Examples
```typescript
// AI Module
{
  id: 'step-1',
  module: 'ai.openai',
  inputs: {
    prompt: 'Analyze this: {{triggerData.content}}',
    systemPrompt: 'You are helpful',
    model: 'gpt-4o-mini',
    temperature: 0.7
  }
}

// Social Module
{
  id: 'step-2',
  module: 'social.twitter',
  inputs: {
    maxResults: 10,
    query: '{{step1.output.topics}}'
  }
}

// Communication Module
{
  id: 'step-3',
  module: 'communication.email',
  inputs: {
    to: 'user@example.com',
    subject: 'Analysis Results',
    text: '{{step2.output}}'
  }
}
```

## Data Flow Patterns

### Update Workflow Settings
```
User clicks "Settings"
  → WorkflowSettingsDialog opens
    → extractConfigurableSteps(config)
      → Parse steps and find modifiable fields
    → Render collapsible sections per step
      → User modifies fields in state
        → User clicks Save
          → applyStepSettings(config, stepSettings)
            → PATCH /api/workflows/[id]
              → Database update
              → Toast success/error
              → onUpdated callback
```

### Execute Workflow
```
User clicks "Run" button
  → WorkflowExecutionDialog opens
    → useWorkflowProgress hook starts SSE
      → Connect to /api/workflows/[id]/stream
        → Backend starts executing workflow
          → SSE sends step progress
            → Client updates progressState
              → Component re-renders with step status
        → Execution completes
          → Final output sent via SSE
            → Client calls OutputRenderer
              → detectOutputDisplay() auto-detects format
                → Render table/image/markdown/json/text
                  → User can copy/download
```

### Display Output
```
Output from execution
  → RunOutputModal receives output
    → OutputRenderer processes
      → Priority: displayHint > module detection > structure detection
        → Auto-parse JSON strings
        → Extract data from nested objects
          → Render in optimal format
            → Add copy/download buttons
              → User interacts with output
```

## Key UI Patterns

### Form Validation
```typescript
// Pre-save validation (basic)
if (!editName.trim()) {
  toast.error('Workflow name is required');
  return;
}

// Button state management
<Button disabled={saving || !editName.trim()}>
  Save
</Button>
```

### Error Handling
```typescript
// Pattern: No pre-save validation, catch errors from API
try {
  const response = await fetch(url, { method: 'PATCH', body: JSON.stringify(data) });
  
  if (!response.ok) {
    // No specific error parsing - generic message
    toast.error('Failed to update workflow');
  } else {
    toast.success('Workflow updated');
  }
} catch (error) {
  toast.error('Error updating workflow');
}
```

### Loading States
```typescript
const [saving, setSaving] = useState(false);

// Disable inputs/buttons while saving
<Button disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
<Input disabled={saving} />

// Finally block always runs
try {
  setSaving(true);
  // API call
} finally {
  setSaving(false);
}
```

### Optimistic Updates
```typescript
// Update UI immediately, fallback if fails
const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);

const newStatus = checked ? 'active' : 'draft';
setOptimisticStatus(newStatus); // Update UI immediately

const response = await fetch(...);
if (!response.ok) {
  setOptimisticStatus(null); // Revert on error
}

// Display optimistic value
<Switch checked={(optimisticStatus || workflow.status) === 'active'} />
```

## Common Issues & Solutions

### Field Detection Brittleness
**Issue**: Hard-coded field detection for AI/Social/Communication modules
**Location**: workflow-settings-dialog.tsx lines 566-712
**Solution**: Move to metadata-driven system (module registry with configurable fields)

### Generic Error Messages
**Issue**: All errors show same toast: "Failed to update workflow"
**Solution**: Parse error response and show specific field errors

### No Variable Validation
**Issue**: Users can type invalid variables like `{{nonexistent.field}}`
**Solution**: Add autocomplete dropdown with available variables

### Text-Based Variable Mapping
**Issue**: Must manually type `{{step1.output.field}}` 
**Solution**: Add click-based variable picker (like n8n's variable mapper)

## Performance Considerations

### Real-time Streaming
- Uses Server-Sent Events (SSE) for live progress updates
- useWorkflowProgress hook manages connection
- Good for user feedback, not resource-intensive

### Data Rendering
- Auto-detection happens on client
- Large JSON outputs could be slow to render
- ReactJson viewer handles large datasets well
- Table component handles arrays up to 1000+ rows

### Modal Performance
- Each dialog independently manages state
- No global state (Redux/Context) for workflows
- Multiple dialogs can be open simultaneously without issues

## Testing Checklist

- [ ] Create/import workflow
- [ ] Toggle workflow status (active/draft)
- [ ] Edit workflow name and description
- [ ] Configure trigger settings
- [ ] Configure workflow settings (step parameters)
- [ ] Execute workflow with different triggers
- [ ] Monitor real-time progress
- [ ] View and export results
- [ ] View execution history
- [ ] Delete workflow
- [ ] Export and re-import workflow
- [ ] Check responsive design on mobile
