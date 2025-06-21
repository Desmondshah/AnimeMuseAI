import React, { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Doc } from '../../../convex/_generated/dataModel';
import './AdminDesktop.css';

interface AdminDesktopLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
  navigationItems?: Array<{
    view: string;
    icon: string;
    label: string;
    color: string;
    description: string;
  }>;
  onNavigateBack?: () => void;
}

interface AdminStats {
  totalAnime: number;
  totalUsers: number;
  totalReviews: number;
  totalCharacters: number;
  pendingReviews: number;
  recentActivity: Array<{
    id: string;
    type: 'anime_added' | 'user_registered' | 'review_posted' | 'character_enriched';
    title: string;
    timestamp: number;
    user?: string;
  }>;
}

const AdminDesktopLayout: React.FC<AdminDesktopLayoutProps> = ({
  children,
  currentPage,
  onPageChange,
  navigationItems,
  onNavigateBack
}) => {
  const [selectedAnime, setSelectedAnime] = useState<Doc<"anime"> | null>(null);
  const [selectedUser, setSelectedUser] = useState<Doc<"userProfiles"> | null>(null);
  const [selectedReview, setSelectedReview] = useState<any | null>(null);

  // Fetch admin stats
  const adminStats = useQuery(api.admin.getAdminStats);

  // Use navigationItems prop if provided, otherwise use default
  const navItems = navigationItems || [
    { view: 'dashboard', label: 'Dashboard', icon: '📊', description: 'Overview & Analytics' },
    { view: 'anime', label: 'Anime Management', icon: '🎬', description: 'Manage anime database' },
    { view: 'users', label: 'User Management', icon: '👥', description: 'User accounts & roles' },
    { view: 'reviews', label: 'Review Moderation', icon: '⭐', description: 'Moderate user reviews' },
    { view: 'characters', label: 'Character Editor', icon: '🎭', description: 'Edit character data' },
    { view: 'analytics', label: 'Analytics', icon: '📈', description: 'Detailed analytics' },
    { view: 'settings', label: 'Settings', icon: '⚙️', description: 'System configuration' },
  ];

  const renderSidebar = () => (
    <div className="admin-sidebar">
      {/* Logo/Brand */}
      <div className="admin-p-6 admin-text-center">
        {onNavigateBack && (
          <button
            onClick={onNavigateBack}
            className="admin-btn admin-btn-secondary admin-mb-4"
            style={{ minWidth: 'auto', padding: '8px 16px' }}
          >
            ← Back
          </button>
        )}
        <div className="admin-h3 admin-text-center" style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          AnimeMuse AI
        </div>
        <div className="admin-text-sm admin-opacity-75">Admin Console</div>
      </div>

      {/* Navigation */}
      <nav className="admin-nav">
        {navItems.map((item) => (
          <a
            key={item.view}
            href="#"
            className={`admin-nav-item ${currentPage === item.view ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              onPageChange(item.view);
            }}
          >
            <span className="admin-nav-icon">{item.icon}</span>
            <div className="admin-flex admin-flex-col">
              <span>{item.label}</span>
              <span className="admin-text-xs admin-opacity-75">{item.description}</span>
            </div>
          </a>
        ))}
      </nav>

      {/* Quick Stats */}
      <div className="admin-p-6 admin-m-6">
        <div className="admin-h4 admin-m-4">Quick Stats</div>
        {adminStats && (
          <div className="admin-space-y-3">
            <div className="admin-flex admin-justify-between">
              <span className="admin-text-sm">Anime</span>
              <span className="admin-text-sm admin-text-right">{adminStats.totalAnime}</span>
            </div>
            <div className="admin-flex admin-justify-between">
              <span className="admin-text-sm">Users</span>
              <span className="admin-text-sm admin-text-right">{adminStats.totalUsers}</span>
            </div>
            <div className="admin-flex admin-justify-between">
              <span className="admin-text-sm">Reviews</span>
              <span className="admin-text-sm admin-text-right">{adminStats.totalReviews}</span>
            </div>
            <div className="admin-flex admin-justify-between">
              <span className="admin-text-sm">Pending</span>
              <span className="admin-text-sm admin-text-right admin-text-danger">{adminStats.pendingReviews}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderDetailsPanel = () => {
    if (currentPage === 'anime' && selectedAnime) {
      return (
        <div className="admin-details">
          <div className="admin-h4 admin-m-4">Anime Details</div>
          <div className="admin-card">
            <img 
              src={selectedAnime.posterUrl || 'https://placehold.co/200x300/1a1a1a/FF6B35/png?text=No+Image'} 
              alt={selectedAnime.title}
              className="admin-w-full admin-m-4"
              style={{ borderRadius: '12px' }}
            />
            <div className="admin-h4">{selectedAnime.title}</div>
            <div className="admin-text-sm admin-opacity-75 admin-m-2">
              {selectedAnime.year} • {selectedAnime.rating}/10
            </div>
            <div className="admin-text-sm admin-m-4">{selectedAnime.description}</div>
            
            <div className="admin-m-4">
              <div className="admin-text-sm admin-opacity-75">Genres</div>
              <div className="admin-flex admin-flex-wrap admin-gap-2 admin-m-2">
                {selectedAnime.genres?.map((genre, index) => (
                  <span key={index} className="admin-text-xs admin-p-1" style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '4px 8px'
                  }}>
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            <div className="admin-m-4">
              <div className="admin-text-sm admin-opacity-75">Characters ({selectedAnime.characters?.length || 0})</div>
              <div className="admin-space-y-2 admin-m-2">
                {selectedAnime.characters?.slice(0, 5).map((char: any, index: number) => (
                  <div key={index} className="admin-text-xs admin-p-2" style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px'
                  }}>
                    {char.name} - {char.role}
                  </div>
                ))}
                {selectedAnime.characters && selectedAnime.characters.length > 5 && (
                  <div className="admin-text-xs admin-opacity-75">
                    +{selectedAnime.characters.length - 5} more characters
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (currentPage === 'users' && selectedUser) {
      return (
        <div className="admin-details">
          <div className="admin-h4 admin-m-4">User Details</div>
          <div className="admin-card">
            <div className="admin-h4">{selectedUser.name}</div>
            <div className="admin-text-sm admin-opacity-75 admin-m-2">{selectedUser.phoneNumber}</div>
            
            <div className="admin-m-4">
              <div className="admin-text-sm admin-opacity-75">Profile</div>
              <div className="admin-space-y-2 admin-m-2">
                <div className="admin-text-xs">
                  <span className="admin-opacity-75">Joined:</span> {new Date(selectedUser._creationTime).toLocaleDateString()}
                </div>
                <div className="admin-text-xs">
                  <span className="admin-opacity-75">Verified:</span> {selectedUser.phoneNumberVerified ? 'Yes' : 'No'}
                </div>
                <div className="admin-text-xs">
                  <span className="admin-opacity-75">Onboarding:</span> {selectedUser.onboardingCompleted ? 'Completed' : 'Pending'}
                </div>
              </div>
            </div>

            <div className="admin-m-4">
              <div className="admin-text-sm admin-opacity-75">Activity</div>
              <div className="admin-space-y-2 admin-m-2">
                <div className="admin-text-xs">
                  <span className="admin-opacity-75">Verified At:</span> {selectedUser.verifiedAt ? new Date(selectedUser.verifiedAt).toLocaleDateString() : 'Not verified'}
                </div>
                <div className="admin-text-xs">
                  <span className="admin-opacity-75">Status:</span> {selectedUser.phoneNumberVerified ? 'Active' : 'Pending Verification'}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (currentPage === 'reviews' && selectedReview) {
      return (
        <div className="admin-details">
          <div className="admin-h4 admin-m-4">Review Details</div>
          <div className="admin-card">
            <div className="admin-flex admin-items-center admin-m-4">
              <div className="admin-text-lg admin-m-2">{'⭐'.repeat(selectedReview.rating)}</div>
              <div className="admin-text-sm admin-opacity-75">{selectedReview.rating}/10</div>
            </div>
            
            <div className="admin-m-4">
              <div className="admin-text-sm admin-opacity-75">Review</div>
              <div className="admin-text-sm admin-m-2">{selectedReview.content}</div>
            </div>

            <div className="admin-m-4">
              <div className="admin-text-sm admin-opacity-75">Metadata</div>
              <div className="admin-space-y-2 admin-m-2">
                <div className="admin-text-xs">
                  <span className="admin-opacity-75">Author:</span> {selectedReview.authorName}
                </div>
                <div className="admin-text-xs">
                  <span className="admin-opacity-75">Anime:</span> {selectedReview.animeTitle}
                </div>
                <div className="admin-text-xs">
                  <span className="admin-opacity-75">Posted:</span> {new Date(selectedReview._creationTime).toLocaleDateString()}
                </div>
                <div className="admin-text-xs">
                  <span className="admin-opacity-75">Status:</span> {selectedReview.status || 'Pending'}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Default details panel
    return (
      <div className="admin-details">
        <div className="admin-h4 admin-m-4">Quick Actions</div>
        <div className="admin-space-y-4">
          <div className="admin-card admin-cursor-pointer" onClick={() => onPageChange('anime')}>
            <div className="admin-text-lg">🎬</div>
            <div className="admin-h4">Add New Anime</div>
            <div className="admin-text-sm admin-opacity-75">Create a new anime entry</div>
          </div>
          
          <div className="admin-card admin-cursor-pointer" onClick={() => onPageChange('reviews')}>
            <div className="admin-text-lg">⭐</div>
            <div className="admin-h4">Review Queue</div>
            <div className="admin-text-sm admin-opacity-75">
              {adminStats?.pendingReviews || 0} reviews pending
            </div>
          </div>
          
          <div className="admin-card admin-cursor-pointer" onClick={() => onPageChange('analytics')}>
            <div className="admin-text-lg">📈</div>
            <div className="admin-h4">Analytics</div>
            <div className="admin-text-sm admin-opacity-75">View detailed reports</div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="admin-m-8">
          <div className="admin-h4 admin-m-4">Recent Activity</div>
          <div className="admin-space-y-3">
            {adminStats?.recentActivity?.slice(0, 5).map((activity: {
              id: string;
              type: 'anime_added' | 'user_registered' | 'review_posted' | 'character_enriched';
              title: string;
              timestamp: number;
              user?: string;
            }) => (
              <div key={activity.id} className="admin-text-sm admin-p-2" style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px'
              }}>
                <div className="admin-text-xs admin-opacity-75">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </div>
                <div>{activity.title}</div>
                {activity.user && (
                  <div className="admin-text-xs admin-opacity-75">by {activity.user}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-layout">
      {renderSidebar()}
      
      <main className="admin-main">
        <div className="admin-animate-fade-in">
          {children}
        </div>
      </main>
      
      {renderDetailsPanel()}
    </div>
  );
};

export default AdminDesktopLayout; 