// utils/moodBoardTesting.ts
interface TestVariant {
  id: string;
  name: string;
  description: string;
  features: string[];
  weight: number; // 0-1, higher = more likely to be selected
}

const MOOD_BOARD_VARIANTS: TestVariant[] = [
  {
    id: 'control',
    name: 'Standard Mood Board',
    description: 'Default mood board experience',
    features: ['basic_cues', 'simple_interface'],
    weight: 0.3
  },
  {
    id: 'enhanced',
    name: 'Enhanced Mood Board',
    description: 'Full featured mood board with all enhancements',
    features: ['expanded_cues', 'intensity_sliders', 'presets', 'analytics'],
    weight: 0.4
  },
  {
    id: 'simplified',
    name: 'Simplified Mood Board',
    description: 'Streamlined experience focusing on core features',
    features: ['basic_cues', 'presets_only'],
    weight: 0.2
  },
  {
    id: 'ai_powered',
    name: 'AI-Powered Mood Board',
    description: 'AI suggestions and smart recommendations',
    features: ['ai_suggestions', 'smart_presets', 'contextual_recommendations'],
    weight: 0.1
  }
];

export class MoodBoardTester {
  private assignedVariant: TestVariant | null = null;

  constructor() {
    this.assignVariant();
  }

  private assignVariant(): void {
    const storedVariant = localStorage.getItem('mood-board-test-variant');
    
    if (storedVariant) {
      this.assignedVariant = MOOD_BOARD_VARIANTS.find(v => v.id === storedVariant) || null;
      return;
    }

    // Weighted random selection
    const random = Math.random();
    let cumulativeWeight = 0;

    for (const variant of MOOD_BOARD_VARIANTS) {
      cumulativeWeight += variant.weight;
      if (random <= cumulativeWeight) {
        this.assignedVariant = variant;
        localStorage.setItem('mood-board-test-variant', variant.id);
        break;
      }
    }
  }

  getAssignedVariant(): TestVariant | null {
    return this.assignedVariant;
  }

  hasFeature(feature: string): boolean {
    return this.assignedVariant?.features.includes(feature) || false;
  }

  trackConversion(event: string, value?: number): void {
    if (!this.assignedVariant) return;

    const conversionData = {
      variant: this.assignedVariant.id,
      event,
      value,
      timestamp: Date.now(),
      sessionId: this.getSessionId()
    };

    // Store conversion data
    const stored = localStorage.getItem('mood-board-conversions') || '[]';
    const conversions = JSON.parse(stored);
    conversions.push(conversionData);
    
    // Keep only last 100 conversions
    const recentConversions = conversions.slice(-100);
    localStorage.setItem('mood-board-conversions', JSON.stringify(recentConversions));

    console.log('🧪 A/B Test Conversion:', conversionData);
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('mood-board-session-id');
    if (!sessionId) {
      sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      sessionStorage.setItem('mood-board-session-id', sessionId);
    }
    return sessionId;
  }

  generateTestReport(): string {
    const stored = localStorage.getItem('mood-board-conversions') || '[]';
    const conversions = JSON.parse(stored);

    const variantStats = MOOD_BOARD_VARIANTS.reduce((acc, variant) => {
      const variantConversions = conversions.filter((c: any) => c.variant === variant.id);
      acc[variant.id] = {
        name: variant.name,
        conversions: variantConversions.length,
        events: variantConversions.reduce((eventAcc: any, c: any) => {
          eventAcc[c.event] = (eventAcc[c.event] || 0) + 1;
          return eventAcc;
        }, {})
      };
      return acc;
    }, {} as any);

    return `
🧪 Mood Board A/B Test Report
============================
Your Variant: ${this.assignedVariant?.name || 'Unknown'}

Conversion Statistics:
${Object.entries(variantStats).map(([id, stats]: [string, any]) => 
  `${stats.name}: ${stats.conversions} conversions`
).join('\n')}

Event Breakdown:
${Object.entries(variantStats).map(([id, stats]: [string, any]) => 
  `${stats.name}: ${Object.entries(stats.events).map(([event, count]) => `${event}: ${count}`).join(', ')}`
).join('\n')}
    `.trim();
  }
}

// Export singleton instance
export const moodBoardTester = new MoodBoardTester();