/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from 'fs';

const n8nData = JSON.parse(readFileSync('./email.json', 'utf-8'));
const ourData = JSON.parse(readFileSync('./workflow/ai-email-categorizer.json', 'utf-8'));

console.log('\n═══ N8N WORKFLOW ANALYSIS ═══\n');

const functionalNodes = n8nData.nodes.filter((n: any) => n.type !== 'n8n-nodes-base.stickyNote');

console.log(`Total functional nodes: ${functionalNodes.length}\n`);

// Group by type
const nodesByType = functionalNodes.reduce((acc: any, node: any) => {
  acc[node.type] = acc[node.type] || [];
  acc[node.type].push(node.name);
  return acc;
}, {});

console.log('Node types breakdown:');
Object.entries(nodesByType).forEach(([type, names]: [string, any]) => {
  console.log(`  ${type}: ${names.length}x`);
  if (names.length <= 3) {
    names.forEach((name: string) => console.log(`    - ${name}`));
  }
});

console.log('\n═══ OUR WORKFLOW ANALYSIS ═══\n');

console.log(`Name: ${ourData.name}`);
console.log(`Steps: ${ourData.config.steps.length}`);
console.log(`Trigger: ${ourData.trigger.type}`);
console.log(`\nStep breakdown:`);

ourData.config.steps.forEach((step: any, i: number) => {
  console.log(`  ${i + 1}. [${step.id}] ${step.module}`);
});

console.log('\n═══ WORKFLOW COMPARISON ═══\n');

// Extract key workflow stages
console.log('N8N Workflow Flow:');
console.log('  1. Manual Trigger');
console.log('  2. Fetch Outlook emails (filtered: unflagged, no categories)');
console.log('  3. Filter emails without categories');
console.log('  4. Loop over items (1 at a time)');
console.log('  5. Convert HTML to Markdown');
console.log('  6. Sanitize email content (remove HTML, links, etc.)');
console.log('  7. AI Agent (Ollama qwen2.5:14b, temp=0.2) categorizes email');
console.log('  8. Parse JSON output (with error handling)');
console.log('  9. Switch based on category (7 branches)');
console.log(' 10. Update email with categories');
console.log(' 11. Move email to folder (if applicable)');
console.log(' 12. Check if "action" email is read → move to "Actioned" folder');
console.log(' 13. Merge back to loop for next email');

console.log('\nOur Workflow Flow:');
console.log('  1. Manual Trigger');
console.log('  2. Create sample emails (demo data)');
console.log('  3. AI categorizes 5 emails IN PARALLEL');
console.log('     - Uses GPT-4o-mini (temp=0.3)');
console.log('     - Each email gets: category + subCategory + analysis');
console.log('  4. Parse JSON responses');
console.log('  5. Combine results into table display');

console.log('\n═══ KEY DIFFERENCES ═══\n');

console.log('✓ N8N ADVANTAGES:');
console.log('  • Production-ready: Connects to real Outlook inbox');
console.log('  • Email filtering: Only processes unflagged, uncategorized emails');
console.log('  • Takes action: Updates email categories, moves to folders');
console.log('  • Smart routing: Different folders for different categories');
console.log('  • Handles read emails: Moves actioned items to archive');
console.log('  • Error handling: Catches errors and continues');
console.log('  • HTML sanitization: Cleans email content for AI');

console.log('\n✓ OUR ADVANTAGES:');
console.log('  • Parallel processing: 5x faster (all emails categorized at once)');
console.log('  • Better AI model: GPT-4o-mini vs local Ollama');
console.log('  • Structured output: Proper JSON parsing with schema');
console.log('  • Better prompts: More explicit categorization rules');
console.log('  • Table display: Shows all results at once');
console.log('  • Simpler architecture: No complex loops and merges');
console.log('  • Type-safe: Built-in validation and error handling');

console.log('\n✗ OUR GAPS:');
console.log('  • No email provider integration (Outlook/Gmail)');
console.log('  • No email fetching');
console.log('  • No category/folder updates');
console.log('  • No HTML sanitization step');
console.log('  • Demo data only (not production-ready)');

console.log('\n═══ ALIGNMENT VERDICT ═══\n');

console.log('✅ CONCEPTUALLY ALIGNED:');
console.log('  • Same categories: action, junk, receipt, SaaS, community, business, other');
console.log('  • Same AI approach: Analyze sender, subject, body, importance');
console.log('  • Same goal: Auto-categorize emails');
console.log('  • Similar temperature: 0.2 vs 0.3 (both conservative)');

console.log('\n⚠️  IMPLEMENTATION DIFFERS:');
console.log('  • n8n: Sequential loop (1 email at a time)');
console.log('  • Ours: Parallel processing (all at once)');
console.log('  • n8n: Ollama (local, self-hosted)');
console.log('  • Ours: OpenAI (cloud API)');
console.log('  • n8n: Full integration (fetch → categorize → update)');
console.log('  • Ours: Demo proof-of-concept (categorize only)');

console.log('\n═══ IS OURS BETTER? ═══\n');

console.log('🏆 FOR DEMO/TESTING: YES');
console.log('  • Faster execution (parallel)');
console.log('  • Better AI quality (GPT-4o-mini)');
console.log('  • Easier to test and iterate');
console.log('  • Clean table output');

console.log('\n🏆 FOR PRODUCTION: NO (yet)');
console.log('  • Missing email provider integration');
console.log('  • Missing email operations (fetch, update, move)');
console.log('  • Missing HTML sanitization');
console.log('  • n8n workflow is complete end-to-end solution');

console.log('\n💡 TO MAKE OURS BETTER:');
console.log('  1. Add Outlook/Gmail modules for fetching emails');
console.log('  2. Add HTML→Markdown conversion step');
console.log('  3. Add email update operations (set categories)');
console.log('  4. Add folder move operations');
console.log('  5. Add cron trigger for automatic processing');
console.log('  6. Add filtering (only uncategorized emails)');
console.log('  7. Keep the parallel processing advantage');
console.log('  8. Keep the better AI model\n');
