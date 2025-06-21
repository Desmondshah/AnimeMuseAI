import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Doc } from '../../../convex/_generated/dataModel';
import './AdminDesktop.css';

const AdminDesktopDashboard: React.FC = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  
  // Fetch dashboard data
  const adminStats = useQuery(api.admin.getAdminStats);
  const recentAnime = useQuery(api.admin.getRecentAnime);
  const recentUsers = useQuery(api.admin.getRecentUsers);
  const recentReviews = useQuery(api.admin.getRecentReviews);

  const renderStatsGrid = () => (
    <div className="admin-stats-grid">
      <div className="admin-stat-card">
        <div className="admin-stat-value">{adminStats?.totalAnime || 0}</div>
        <div className="admin-stat-label">Total Anime</div>
        <div className="admin-stat-change positive">+12%</div>
      </div>
      
      <div className="admin-stat-card">
        <div className="admin-stat-value">{adminStats?.totalUsers || 0}</div>
        <div className="admin-stat-label">Active Users</div>
        <div className="admin-stat-change positive">+8%</div>
      </div>
      
      <div className="admin-stat-card">
        <div className="admin-stat-value">{adminStats?.totalReviews || 0}</div>
        <div className="admin-stat-label">Total Reviews</div>
        <div className="admin-stat-change positive">+15%</div>
      </div>
      
      <div className="admin-stat-card">
        <div className="admin-stat-value">{adminStats?.pendingReviews || 0}</div>
        <div className="admin-stat-label">Pending Reviews</div>
        <div className="admin-stat-change negative">+3</div>
      </div>
    </div>
  );

  const renderQuickActions = () => (
    <div className="admin-grid admin-grid-cols-3 admin-m-8">
      <div className="admin-card admin-cursor-pointer">
        <div className="admin-text-lg admin-m-4">🎬</div>
        <div className="admin-h4">Add Anime</div>
        <div className="admin-text-sm admin-opacity-75 admin-m-4">
          Create a new anime entry with full metadata
        </div>
        <div className="admin-text-xs admin-opacity-75 admin-m-4">
          Includes AI-powered character enrichment
        </div>
      </div>
      
      <div className="admin-card admin-cursor-pointer">
        <div className="admin-text-lg admin-m-4">👥</div>
        <div className="admin-h4">User Management</div>
        <div className="admin-text-sm admin-opacity-75 admin-m-4">
          Manage user accounts and permissions
        </div>
        <div className="admin-text-xs admin-opacity-75 admin-m-4">
          View activity and engagement metrics
        </div>
      </div>
      
      <div className="admin-card admin-cursor-pointer">
        <div className="admin-text-lg admin-m-4">⭐</div>
        <div className="admin-h4">Review Moderation</div>
        <div className="admin-text-sm admin-opacity-75 admin-m-4">
          Moderate user reviews and comments
        </div>
        <div className="admin-text-xs admin-opacity-75 admin-m-4">
          {adminStats?.pendingReviews || 0} reviews pending approval
        </div>
      </div>
    </div>
  );

  const renderRecentActivity = () => (
    <div className="admin-card admin-m-8">
      <div className="admin-flex admin-justify-between admin-items-center admin-m-4">
        <div className="admin-h3">Recent Activity</div>
        <div className="admin-flex admin-gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              className={`admin-btn admin-btn-secondary ${selectedTimeRange === range ? 'admin-opacity-100' : 'admin-opacity-50'}`}
              onClick={() => setSelectedTimeRange(range)}
              style={{ minWidth: '60px', padding: '8px 16px' }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      
      <div className="admin-space-y-4 admin-m-4">
        {adminStats?.recentActivity?.slice(0, 10).map((activity: {
          id: string;
          type: 'anime_added' | 'user_registered' | 'review_posted' | 'character_enriched';
          title: string;
          timestamp: number;
          user?: string;
        }) => (
          <div key={activity.id} className="admin-flex admin-items-center admin-p-4" style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <div className="admin-text-lg admin-m-4">
              {activity.type === 'anime_added' && '🎬'}
              {activity.type === 'user_registered' && '👤'}
              {activity.type === 'review_posted' && '⭐'}
              {activity.type === 'character_enriched' && '🎭'}
            </div>
            <div className="admin-flex-1">
              <div className="admin-text-sm">{activity.title}</div>
              {activity.user && (
                <div className="admin-text-xs admin-opacity-75">by {activity.user}</div>
              )}
            </div>
            <div className="admin-text-xs admin-opacity-75">
              {new Date(activity.timestamp).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDataTables = () => (
    <div className="admin-grid admin-grid-cols-2 admin-m-8 admin-gap-8">
      {/* Recent Anime */}
      <div className="admin-card">
        <div className="admin-h4 admin-m-4">Recent Anime</div>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Year</th>
                <th>Rating</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentAnime?.slice(0, 5).map((anime: Doc<"anime">) => (
                <tr key={anime._id} className="admin-cursor-pointer">
                  <td className="admin-text-sm">{anime.title}</td>
                  <td className="admin-text-sm">{anime.year}</td>
                  <td className="admin-text-sm">{anime.rating}/10</td>
                  <td className="admin-text-sm">
                    <span className="admin-text-xs admin-p-1" style={{
                      background: 'rgba(76, 175, 80, 0.2)',
                      borderRadius: '6px',
                      color: '#4caf50'
                    }}>
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Users */}
      <div className="admin-card">
        <div className="admin-h4 admin-m-4">Recent Users</div>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Verified</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers?.slice(0, 5).map((user: Doc<"userProfiles">) => (
                <tr key={user._id} className="admin-cursor-pointer">
                  <td className="admin-text-sm">{user.name}</td>
                  <td className="admin-text-sm">
                    <span className="admin-text-xs admin-p-1" style={{
                      background: user.phoneNumberVerified ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 193, 7, 0.2)',
                      borderRadius: '6px',
                      color: user.phoneNumberVerified ? '#4caf50' : '#ffc107'
                    }}>
                      {user.phoneNumberVerified ? 'Active' : 'Pending'}
                    </span>
                  </td>
                  <td className="admin-text-sm">
                    {new Date(user._creationTime).toLocaleDateString()}
                  </td>
                  <td className="admin-text-sm">
                    {user.phoneNumberVerified ? '✅' : '⏳'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAnalyticsCharts = () => (
    <div className="admin-grid admin-grid-cols-2 admin-m-8 admin-gap-8">
      {/* Growth Chart */}
      <div className="admin-card">
        <div className="admin-h4 admin-m-4">User Growth</div>
        <div className="admin-flex admin-items-center admin-justify-center" style={{ height: '200px' }}>
          <div className="admin-text-center">
            <div className="admin-text-lg admin-m-4">📈</div>
            <div className="admin-text-sm admin-opacity-75">Chart visualization would go here</div>
            <div className="admin-text-xs admin-opacity-50 admin-m-2">
              Integration with charting library (Chart.js, Recharts, etc.)
            </div>
          </div>
        </div>
      </div>

      {/* Engagement Chart */}
      <div className="admin-card">
        <div className="admin-h4 admin-m-4">Review Engagement</div>
        <div className="admin-flex admin-items-center admin-justify-center" style={{ height: '200px' }}>
          <div className="admin-text-center">
            <div className="admin-text-lg admin-m-4">📊</div>
            <div className="admin-text-sm admin-opacity-75">Review activity over time</div>
            <div className="admin-text-xs admin-opacity-50 admin-m-2">
              Daily, weekly, and monthly trends
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-animate-fade-in">
      {/* Header */}
      <div className="admin-m-8">
        <div className="admin-h1">Admin Dashboard</div>
        <div className="admin-text-lg admin-opacity-75">
          Welcome to the AnimeMuse AI Admin Console
        </div>
      </div>

      {/* Stats Grid */}
      {renderStatsGrid()}

      {/* Quick Actions */}
      {renderQuickActions()}

      {/* Data Tables */}
      {renderDataTables()}

      {/* Analytics Charts */}
      {renderAnalyticsCharts()}

      {/* Recent Activity */}
      {renderRecentActivity()}

      {/* System Status */}
      <div className="admin-card admin-m-8">
        <div className="admin-h4 admin-m-4">System Status</div>
        <div className="admin-grid admin-grid-cols-4 admin-gap-6 admin-m-4">
          <div className="admin-text-center">
            <div className="admin-text-lg admin-m-2">🟢</div>
            <div className="admin-text-sm">Database</div>
            <div className="admin-text-xs admin-opacity-75">Online</div>
          </div>
          <div className="admin-text-center">
            <div className="admin-text-lg admin-m-2">🟢</div>
            <div className="admin-text-sm">AI Services</div>
            <div className="admin-text-xs admin-opacity-75">Active</div>
          </div>
          <div className="admin-text-center">
            <div className="admin-text-lg admin-m-2">🟢</div>
            <div className="admin-text-sm">External APIs</div>
            <div className="admin-text-xs admin-opacity-75">Connected</div>
          </div>
          <div className="admin-text-center">
            <div className="admin-text-lg admin-m-2">🟢</div>
            <div className="admin-text-sm">File Storage</div>
            <div className="admin-text-xs admin-opacity-75">Available</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDesktopDashboard; 