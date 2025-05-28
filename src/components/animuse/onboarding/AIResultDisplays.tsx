// src/components/animuse/AIResultDisplays.tsx
import React, { memo, useState } from "react";
import StyledButton from "../shared/StyledButton";

// Enhanced Comparative Analysis Display
interface ComparisonAnalysisProps {
  analysis: {
    animeA?: string;
    animeB?: string;
    similarities?: string;
    differences?: string;
    plotComparison?: string;
    characterComparison?: string;
    themeComparison?: string;
    visualComparison?: string;
    overallComparison?: string;
    recommendations?: string[];
    verdict?: string;
  };
}

export const ComparisonAnalysisDisplay: React.FC<ComparisonAnalysisProps> = memo(({ analysis }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview');

  const comparisonSections = [
    { key: 'plotComparison', title: '📖 Plot & Story', icon: '📖' },
    { key: 'characterComparison', title: '👥 Characters', icon: '👥' },
    { key: 'themeComparison', title: '🎭 Themes', icon: '🎭' },
    { key: 'visualComparison', title: '🎨 Visual Style', icon: '🎨' },
  ];

  return (
    <div className="bg-brand-surface rounded-xl p-4 sm:p-5 shadow-lg border border-brand-accent-peach/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg sm:text-xl font-heading text-brand-primary-action">
          Comparative Analysis
        </h3>
        <div className="flex gap-1">
          <StyledButton
            variant={activeTab === 'overview' ? 'primary_small' : 'secondary_small'}
            onClick={() => setActiveTab('overview')}
            className="!text-xs !px-2 !py-1"
          >
            Overview
          </StyledButton>
          <StyledButton
            variant={activeTab === 'details' ? 'primary_small' : 'secondary_small'}
            onClick={() => setActiveTab('details')}
            className="!text-xs !px-2 !py-1"
          >
            Details
          </StyledButton>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Anime Titles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-brand-accent-peach/10 p-3 rounded-lg">
              <h4 className="font-heading text-brand-accent-gold text-sm font-semibold mb-1">Anime A</h4>
              <p className="text-brand-text-primary text-sm">{analysis.animeA || 'First Anime'}</p>
            </div>
            <div className="bg-brand-accent-gold/10 p-3 rounded-lg">
              <h4 className="font-heading text-brand-accent-gold text-sm font-semibold mb-1">Anime B</h4>
              <p className="text-brand-text-primary text-sm">{analysis.animeB || 'Second Anime'}</p>
            </div>
          </div>

          {/* Similarities & Differences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {analysis.similarities && (
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <h4 className="font-heading text-green-700 text-sm font-semibold mb-2 flex items-center">
                  <span className="mr-2">🤝</span> Similarities
                </h4>
                <p className="text-green-800 text-xs leading-relaxed">{analysis.similarities}</p>
              </div>
            )}
            {analysis.differences && (
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                <h4 className="font-heading text-orange-700 text-sm font-semibold mb-2 flex items-center">
                  <span className="mr-2">⚡</span> Differences
                </h4>
                <p className="text-orange-800 text-xs leading-relaxed">{analysis.differences}</p>
              </div>
            )}
          </div>

          {/* Verdict */}
          {analysis.verdict && (
            <div className="bg-brand-primary-action/10 p-4 rounded-lg border border-brand-primary-action/30">
              <h4 className="font-heading text-brand-primary-action text-sm font-semibold mb-2 flex items-center">
                <span className="mr-2">🎯</span> Final Verdict
              </h4>
              <p className="text-brand-text-primary text-sm leading-relaxed">{analysis.verdict}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'details' && (
        <div className="space-y-4">
          {comparisonSections.map((section) => {
            const content = analysis[section.key as keyof typeof analysis];
            if (!content || typeof content !== 'string') return null;
            
            return (
              <div key={section.key} className="bg-brand-accent-peach/10 p-3 rounded-lg">
                <h4 className="font-heading text-brand-accent-gold text-sm font-semibold mb-2 flex items-center">
                  <span className="mr-2">{section.icon}</span> {section.title}
                </h4>
                <p className="text-brand-text-primary text-xs leading-relaxed whitespace-pre-wrap">{content}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-brand-accent-peach/30">
          <h4 className="font-heading text-brand-accent-gold text-sm font-semibold mb-2">
            💡 Similar Anime You Might Like
          </h4>
          <div className="flex flex-wrap gap-2">
            {analysis.recommendations.map((rec, idx) => (
              <span key={idx} className="bg-brand-accent-gold/20 text-brand-text-primary text-xs px-2 py-1 rounded-full">
                {rec}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// Enhanced Franchise Guide Display
interface FranchiseGuideProps {
  guide: {
    franchiseName?: string;
    overview?: string;
    complexity?: string;
    recommendedOrder?: Array<{
      title: string;
      type: string;
      year: number;
      description: string;
      importance: 'Essential' | 'Recommended' | 'Optional';
      accessibilityRating: number;
    }>;
    alternativeOrders?: Array<{
      name: string;
      description: string;
      order: string[];
    }>;
    tips?: string[];
  };
}

export const FranchiseGuideDisplay: React.FC<FranchiseGuideProps> = memo(({ guide }) => {
  const [showAlternatives, setShowAlternatives] = useState(false);

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'Essential': return 'bg-red-100 text-red-800 border-red-200';
      case 'Recommended': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Optional': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAccessibilityColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-brand-surface rounded-xl p-4 sm:p-5 shadow-lg border border-brand-accent-peach/30">
      <div className="mb-4">
        <h3 className="text-lg sm:text-xl font-heading text-brand-primary-action mb-2">
          📚 {guide.franchiseName || 'Franchise'} Watch Guide
        </h3>
        {guide.complexity && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-brand-text-primary/70">Complexity:</span>
            <span className="bg-brand-accent-gold/20 text-brand-accent-gold text-xs px-2 py-1 rounded-full font-medium">
              {guide.complexity}
            </span>
          </div>
        )}
        {guide.overview && (
          <p className="text-sm text-brand-text-primary/90 leading-relaxed mb-4 p-3 bg-brand-accent-peach/10 rounded-lg">
            {guide.overview}
          </p>
        )}
      </div>

      {/* Recommended Order */}
      {guide.recommendedOrder && guide.recommendedOrder.length > 0 && (
        <div className="mb-6">
          <h4 className="font-heading text-brand-accent-gold text-base font-semibold mb-3">
            🎯 Recommended Watch Order
          </h4>
          <div className="space-y-3">
            {guide.recommendedOrder.map((item, idx) => (
              <div key={idx} className="bg-brand-accent-peach/10 p-3 rounded-lg border border-brand-accent-peach/20">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="bg-brand-primary-action text-brand-surface text-xs font-bold px-2 py-1 rounded-full">
                    #{idx + 1}
                  </span>
                  <h5 className="font-heading text-brand-text-primary font-semibold text-sm">
                    {item.title}
                  </h5>
                  <span className="text-xs text-brand-text-primary/70">
                    ({item.type}, {item.year})
                  </span>
                </div>
                <p className="text-xs text-brand-text-primary/80 mb-2 leading-relaxed">
                  {item.description}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getImportanceColor(item.importance)}`}>
                    {item.importance}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-brand-text-primary/70">Access:</span>
                    <span className={`text-xs font-medium ${getAccessibilityColor(item.accessibilityRating)}`}>
                      {item.accessibilityRating}/5
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alternative Orders */}
      {guide.alternativeOrders && guide.alternativeOrders.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-heading text-brand-accent-gold text-base font-semibold">
              🔄 Alternative Watch Orders
            </h4>
            <StyledButton
              variant="ghost"
              onClick={() => setShowAlternatives(!showAlternatives)}
              className="!text-xs !px-2 !py-1"
            >
              {showAlternatives ? 'Hide' : 'Show'} Alternatives
            </StyledButton>
          </div>
          {showAlternatives && (
            <div className="space-y-3">
              {guide.alternativeOrders.map((alt, idx) => (
                <div key={idx} className="bg-brand-accent-gold/10 p-3 rounded-lg">
                  <h5 className="font-heading text-brand-text-primary font-semibold text-sm mb-1">
                    {alt.name}
                  </h5>
                  <p className="text-xs text-brand-text-primary/80 mb-2">{alt.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {alt.order.map((title, orderIdx) => (
                      <span key={orderIdx} className="bg-brand-accent-gold/20 text-brand-text-primary text-xs px-2 py-1 rounded">
                        {orderIdx + 1}. {title}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tips */}
      {guide.tips && guide.tips.length > 0 && (
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <h4 className="font-heading text-blue-700 text-sm font-semibold mb-2 flex items-center">
            <span className="mr-2">💡</span> Pro Tips
          </h4>
          <ul className="space-y-1">
            {guide.tips.map((tip, idx) => (
              <li key={idx} className="text-blue-800 text-xs leading-relaxed flex items-start">
                <span className="mr-2 mt-1 text-blue-600">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});