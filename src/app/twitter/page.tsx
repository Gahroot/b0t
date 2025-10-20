import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CompactAutomationRow } from '@/components/automation/CompactAutomationRow';

export default function TwitterPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="font-black text-2xl tracking-tight">Twitter</h1>
          <p className="text-xs text-secondary">Automate tweet generation and posting</p>
        </div>

        {/* Compact Automations List */}
        <div className="space-y-2">
          <CompactAutomationRow
            title="Post Tweets"
            jobName="ai-tweet-generation"
            defaultInterval="0 10 * * *"
            defaultPrompt="You are a thought leader in tech. Create insightful tweets about AI, software development, and innovation. Be authentic and engaging."
          />

          <CompactAutomationRow
            title="Reply to Tweets"
            jobName="reply-to-tweets"
            defaultInterval="*/15 * * * *"
            defaultPrompt="You are a helpful and engaging account. Reply to tweets in your feed or specific tweets in a thoughtful, relevant way. Add value to the conversation."
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
