import { db } from '../../db/client';
import { discordChannels, discordMessages, discordReports, daoEntities } from '../../db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

interface ReportData {
  channelName: string;
  daoName: string;
  totalMessages: number;
  uniqueAuthors: number;
  topAuthors: { username: string; messageCount: number }[];
  messagesWithAttachments: number;
  averageMessagesPerDay: number;
  keyTopics: string[];
  messages: any[];
}

interface AIAnalysis {
  summary: string;
  actionItems: {
    pending: ActionItem[];
    completed: ActionItem[];
    blocked: ActionItem[];
  };
  developmentStatus: {
    inProgress: string[];
    completed: string[];
    planned: string[];
  };
  keyDecisions: string[];
  risks: string[];
  recommendations: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  engagementLevel: 'high' | 'medium' | 'low';
}

interface ActionItem {
  description: string;
  assignee?: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

export class DiscordReportService {
  private openaiApiKey: string;

  constructor(openaiApiKey: string) {
    this.openaiApiKey = openaiApiKey;
  }

  /**
   * Generate a weekly report for a channel
   */
  async generateWeeklyReport(channelId: string): Promise<string> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    return this.generateReport(channelId, startDate, endDate, 'weekly');
  }

  /**
   * Generate a monthly report for a channel
   */
  async generateMonthlyReport(channelId: string): Promise<string> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    return this.generateReport(channelId, startDate, endDate, 'monthly');
  }

  /**
   * Generate a report for a specific time period
   */
  private async generateReport(
    channelId: string,
    startDate: Date,
    endDate: Date,
    reportType: 'weekly' | 'monthly'
  ): Promise<string> {
    console.log(`📊 Generating ${reportType} report for channel ${channelId}...`);

    // Get channel and DAO info
    const [channel] = await db
      .select({
        id: discordChannels.id,
        channelId: discordChannels.channelId,
        name: discordChannels.name,
        daoId: discordChannels.daoId,
        daoName: daoEntities.name,
        daoSlug: daoEntities.slug,
      })
      .from(discordChannels)
      .leftJoin(daoEntities, eq(discordChannels.daoId, daoEntities.id))
      .where(eq(discordChannels.channelId, channelId))
      .limit(1);

    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    // Get messages for the period
    const messages = await db
      .select()
      .from(discordMessages)
      .where(
        and(
          eq(discordMessages.channelId, channel.id),
          gte(discordMessages.postedAt, startDate),
          lte(discordMessages.postedAt, endDate)
        )
      )
      .orderBy(desc(discordMessages.postedAt));

    // Calculate statistics
    const reportData = this.calculateStatistics(messages, channel.name, channel.daoName || 'Unknown DAO', startDate, endDate);

    // Generate comprehensive AI analysis
    const aiAnalysis = await this.generateAIAnalysis(reportData, reportType);

    // Create full report content
    const reportContent = this.formatReport(reportData, aiAnalysis, reportType);

    // Save report to database
    await db.insert(discordReports).values({
      channelId: channel.id,
      reportType,
      periodStart: startDate,
      periodEnd: endDate,
      content: reportContent,
      summary: aiAnalysis.summary,
      status: 'published',
      metadata: {
        stats: {
          totalMessages: reportData.totalMessages,
          uniqueAuthors: reportData.uniqueAuthors,
          averageMessagesPerDay: reportData.averageMessagesPerDay,
        },
        analysis: {
          actionItemsPending: aiAnalysis.actionItems.pending.length,
          actionItemsCompleted: aiAnalysis.actionItems.completed.length,
          actionItemsBlocked: aiAnalysis.actionItems.blocked.length,
          sentiment: aiAnalysis.sentiment,
          engagementLevel: aiAnalysis.engagementLevel,
          keyDecisions: aiAnalysis.keyDecisions.length,
          risks: aiAnalysis.risks.length,
        },
      },
    });

    console.log(`✅ ${reportType} report generated successfully!`);

    return reportContent;
  }

  /**
   * Calculate statistics from messages
   */
  private calculateStatistics(
    messages: any[],
    channelName: string,
    daoName: string,
    startDate: Date,
    endDate: Date
  ): ReportData {
    const authorCounts = new Map<string, { username: string; count: number }>();

    for (const message of messages) {
      const existing = authorCounts.get(message.authorId);
      if (existing) {
        existing.count++;
      } else {
        authorCounts.set(message.authorId, {
          username: message.authorUsername,
          count: 1,
        });
      }
    }

    const topAuthors = Array.from(authorCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(a => ({ username: a.username, messageCount: a.count }));

    const messagesWithAttachments = messages.filter(m =>
      Array.isArray(m.attachments) && m.attachments.length > 0
    ).length;

    const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      channelName,
      daoName,
      totalMessages: messages.length,
      uniqueAuthors: authorCounts.size,
      topAuthors,
      messagesWithAttachments,
      averageMessagesPerDay: messages.length / daysDiff,
      keyTopics: this.extractKeyTopics(messages),
      messages: messages.slice(0, 100), // Limit for AI processing
    };
  }

  /**
   * Extract key topics from messages (simple keyword extraction)
   */
  private extractKeyTopics(messages: any[]): string[] {
    const words = new Map<string, number>();
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how']);

    for (const message of messages) {
      if (!message.content) continue;
      
      const messageWords = message.content.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w: string) => w.length > 3 && !stopWords.has(w));

      for (const word of messageWords) {
        words.set(word, (words.get(word) || 0) + 1);
      }
    }

    return Array.from(words.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Generate comprehensive AI analysis using OpenAI
   */
  private async generateAIAnalysis(reportData: ReportData, reportType: string): Promise<AIAnalysis> {
    const systemPrompt = `You are BioSyncAgent, an AI project manager and analyst for the Bio Ecosystem. Your role is to analyze Discord conversations and provide actionable intelligence for internal teams.

Your analysis should focus on:
1. **Action Items**: Extract specific tasks, TODOs, and action items from discussions
2. **Development Status**: Track what's in progress, completed, and planned
3. **Key Decisions**: Identify important decisions made by the team
4. **Risks & Blockers**: Flag potential issues, blockers, or concerns
5. **Recommendations**: Provide strategic recommendations for the team

Be specific, actionable, and data-driven. Focus on helping the internal team understand project status and next steps.`;

    const userPrompt = `Analyze this ${reportType} Discord activity for ${reportData.daoName} - ${reportData.channelName}:

## STATISTICS
- Total Messages: ${reportData.totalMessages}
- Unique Contributors: ${reportData.uniqueAuthors}
- Average Messages/Day: ${reportData.averageMessagesPerDay.toFixed(1)}
- Messages with Attachments: ${reportData.messagesWithAttachments}

## TOP CONTRIBUTORS
${reportData.topAuthors.map((a, i) => `${i + 1}. ${a.username} (${a.messageCount} messages)`).join('\n')}

## KEY TOPICS
${reportData.keyTopics.join(', ')}

## MESSAGE SAMPLE (Last ${Math.min(50, reportData.messages.length)} messages)
${reportData.messages.slice(0, 50).map(m => {
  const timestamp = new Date(m.postedAt).toISOString().split('T')[0];
  const content = m.content?.substring(0, 200) || '[no content]';
  return `[${timestamp}] ${m.authorUsername}: ${content}`;
}).join('\n')}

## YOUR TASK
Analyze the above conversations and provide a JSON response with the following structure:

{
  "summary": "Brief 2-3 sentence executive summary of the period",
  "actionItems": {
    "pending": [
      {
        "description": "Specific action item that needs to be done",
        "assignee": "username or null if unassigned",
        "priority": "high|medium|low",
        "category": "development|research|community|funding|design|other"
      }
    ],
    "completed": [
      {
        "description": "Action item that was completed this period",
        "assignee": "username or null",
        "priority": "high|medium|low",
        "category": "development|research|community|funding|design|other"
      }
    ],
    "blocked": [
      {
        "description": "Action item that is blocked or delayed",
        "assignee": "username or null",
        "priority": "high|medium|low",
        "category": "development|research|community|funding|design|other"
      }
    ]
  },
  "developmentStatus": {
    "inProgress": ["Item 1 currently being worked on", "Item 2 in development"],
    "completed": ["Item 1 finished this period", "Item 2 shipped"],
    "planned": ["Item 1 planned for next period", "Item 2 under discussion"]
  },
  "keyDecisions": [
    "Important decision 1 made by the team",
    "Important decision 2 agreed upon"
  ],
  "risks": [
    "Risk 1: Description of potential issue",
    "Risk 2: Blocker or concern"
  ],
  "recommendations": [
    "Recommendation 1 for the team",
    "Recommendation 2 for next steps"
  ],
  "sentiment": "positive|neutral|negative",
  "engagementLevel": "high|medium|low"
}

IMPORTANT: 
- Extract REAL action items from the conversations, not generic ones
- Be specific about what was completed vs what's pending
- Identify actual blockers mentioned in discussions
- Base sentiment on tone and progress indicators
- If no action items found, return empty arrays
- Return ONLY valid JSON, no markdown or explanations`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          temperature: 0.3, // Lower temperature for more consistent JSON
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const analysisText = data.choices[0].message.content.trim();
      
      try {
        const analysis = JSON.parse(analysisText);
        return analysis as AIAnalysis;
      } catch (parseError) {
        console.error('❌ Error parsing AI analysis JSON:', parseError);
        console.error('Raw response:', analysisText);
        return this.getDefaultAnalysis();
      }
    } catch (error) {
      console.error('❌ Error generating AI analysis:', error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Get default analysis when AI fails
   */
  private getDefaultAnalysis(): AIAnalysis {
    return {
      summary: 'AI analysis unavailable. Please review the statistics and messages manually.',
      actionItems: {
        pending: [],
        completed: [],
        blocked: [],
      },
      developmentStatus: {
        inProgress: [],
        completed: [],
        planned: [],
      },
      keyDecisions: [],
      risks: [],
      recommendations: ['Review the channel activity manually for detailed insights.'],
      sentiment: 'neutral',
      engagementLevel: 'medium',
    };
  }

  /**
   * Format the final report
   */
  private formatReport(reportData: ReportData, aiAnalysis: AIAnalysis, reportType: string): string {
    const reportTitle = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`;
    const sentimentEmoji = aiAnalysis.sentiment === 'positive' ? '🟢' : aiAnalysis.sentiment === 'negative' ? '🔴' : '🟡';
    const engagementEmoji = aiAnalysis.engagementLevel === 'high' ? '🔥' : aiAnalysis.engagementLevel === 'low' ? '❄️' : '⚡';
    
    return `## 📋 Executive Summary

${aiAnalysis.summary}

---

## 📊 Key Metrics

| Metric | Value |
|--------|-------|
| Total Messages | ${reportData.totalMessages} |
| Unique Contributors | ${reportData.uniqueAuthors} |
| Avg Messages/Day | ${reportData.averageMessagesPerDay.toFixed(1)} |
| Messages w/ Attachments | ${reportData.messagesWithAttachments} |

---

## ✅ Action Items

### 🔴 Pending (${aiAnalysis.actionItems.pending.length})
${aiAnalysis.actionItems.pending.length > 0 
  ? aiAnalysis.actionItems.pending.map((item, i) => {
      const priorityEmoji = item.priority === 'high' ? '🔴' : item.priority === 'medium' ? '🟡' : '🟢';
      const assignee = item.assignee ? ` [@${item.assignee}]` : '';
      return `${i + 1}. ${priorityEmoji} **[${item.category.toUpperCase()}]** ${item.description}${assignee}`;
    }).join('\n')
  : '_No pending action items identified_'
}

### ✅ Completed (${aiAnalysis.actionItems.completed.length})
${aiAnalysis.actionItems.completed.length > 0
  ? aiAnalysis.actionItems.completed.map((item, i) => {
      const assignee = item.assignee ? ` [@${item.assignee}]` : '';
      return `${i + 1}. ✅ **[${item.category.toUpperCase()}]** ${item.description}${assignee}`;
    }).join('\n')
  : '_No completed action items identified_'
}

### ⛔ Blocked (${aiAnalysis.actionItems.blocked.length})
${aiAnalysis.actionItems.blocked.length > 0
  ? aiAnalysis.actionItems.blocked.map((item, i) => {
      const priorityEmoji = item.priority === 'high' ? '🔴' : item.priority === 'medium' ? '🟡' : '🟢';
      const assignee = item.assignee ? ` [@${item.assignee}]` : '';
      return `${i + 1}. ${priorityEmoji} **[${item.category.toUpperCase()}]** ${item.description}${assignee}`;
    }).join('\n')
  : '_No blocked items identified_'
}

---

## 🚀 Development Status

### 🔄 In Progress
${aiAnalysis.developmentStatus.inProgress.length > 0
  ? aiAnalysis.developmentStatus.inProgress.map((item, i) => `${i + 1}. ${item}`).join('\n')
  : '_No items currently in progress_'
}

### ✅ Completed This Period
${aiAnalysis.developmentStatus.completed.length > 0
  ? aiAnalysis.developmentStatus.completed.map((item, i) => `${i + 1}. ${item}`).join('\n')
  : '_No items completed this period_'
}

### 📅 Planned/Upcoming
${aiAnalysis.developmentStatus.planned.length > 0
  ? aiAnalysis.developmentStatus.planned.map((item, i) => `${i + 1}. ${item}`).join('\n')
  : '_No items planned yet_'
}

---

## 🎯 Key Decisions

${aiAnalysis.keyDecisions.length > 0
  ? aiAnalysis.keyDecisions.map((decision, i) => `${i + 1}. ${decision}`).join('\n')
  : '_No major decisions identified this period_'
}

---

## ⚠️ Risks & Blockers

${aiAnalysis.risks.length > 0
  ? aiAnalysis.risks.map((risk, i) => `${i + 1}. ⚠️ ${risk}`).join('\n')
  : '_No significant risks identified_'
}

---

## 💡 Recommendations

${aiAnalysis.recommendations.length > 0
  ? aiAnalysis.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')
  : '_No specific recommendations at this time_'
}

---

## 👥 Top Contributors

${reportData.topAuthors.map((a, i) => `${i + 1}. **${a.username}** - ${a.messageCount} messages`).join('\n')}

---

## 🔑 Key Topics Discussed

${reportData.keyTopics.map(t => `- ${t}`).join('\n')}

---

## 📈 Summary Statistics

- **Total Action Items:** ${aiAnalysis.actionItems.pending.length + aiAnalysis.actionItems.completed.length + aiAnalysis.actionItems.blocked.length}
  - Pending: ${aiAnalysis.actionItems.pending.length}
  - Completed: ${aiAnalysis.actionItems.completed.length}
  - Blocked: ${aiAnalysis.actionItems.blocked.length}
- **Development Items:** ${aiAnalysis.developmentStatus.inProgress.length + aiAnalysis.developmentStatus.completed.length + aiAnalysis.developmentStatus.planned.length}
  - In Progress: ${aiAnalysis.developmentStatus.inProgress.length}
  - Completed: ${aiAnalysis.developmentStatus.completed.length}
  - Planned: ${aiAnalysis.developmentStatus.planned.length}
- **Key Decisions Made:** ${aiAnalysis.keyDecisions.length}
- **Risks Identified:** ${aiAnalysis.risks.length}

---

*🤖 This report was automatically generated by BioSyncAgent - AI Project Intelligence for Bio Ecosystem*
`;
  }

  /**
   * Get all reports for a channel
   */
  async getReports(channelId: string, limit: number = 10) {
    const [channel] = await db
      .select()
      .from(discordChannels)
      .where(eq(discordChannels.channelId, channelId))
      .limit(1);

    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    return db
      .select()
      .from(discordReports)
      .where(eq(discordReports.channelId, channel.id))
      .orderBy(desc(discordReports.createdAt))
      .limit(limit);
  }
}

