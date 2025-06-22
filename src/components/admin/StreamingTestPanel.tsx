// src/components/admin/StreamingTestPanel.tsx - Admin panel for testing streaming functionality
import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import StreamingOverlay from '../animuse/StreamingOverlay';

const StreamingTestPanel: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [isStreamingOpen, setIsStreamingOpen] = useState(false);
  const [testEpisodeIndex, setTestEpisodeIndex] = useState(0);

  // Convex mutations and queries
  const seedOnePieceData = useMutation(api.testData.seedOnePieceData);
  const addAlternativeStreamingSources = useMutation(api.testData.addAlternativeStreamingSources);
  const onePieceAnime = useQuery(api.testData.getOnePieceAnime);

  const handleSeedData = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const result = await seedOnePieceData();
      setMessage(result.message);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAlternativeSources = async () => {
    if (!onePieceAnime?._id) {
      setMessage('Please seed One Piece data first');
      return;
    }

    setIsLoading(true);
    try {
      const result = await addAlternativeStreamingSources({ animeId: onePieceAnime._id });
      setMessage(result.message);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestStreaming = () => {
    setIsStreamingOpen(true);
  };

  const handleEpisodeChange = (newIndex: number) => {
    setTestEpisodeIndex(newIndex);
  };

  const testEpisodes = onePieceAnime?.streamingEpisodes || [];
  const currentTestEpisode = testEpisodes[testEpisodeIndex] || null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Streaming Test Panel</h2>
        <p className="text-gray-600">Test the in-app anime streaming functionality with One Piece data</p>
      </div>

      {/* Seed Data Section */}
      <div className="bg-blue-50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-semibold text-blue-800">1. Seed Test Data</h3>
        <p className="text-blue-700 text-sm">
          First, create One Piece anime data with streaming episodes for testing
        </p>
        
        <button
          onClick={handleSeedData}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {isLoading ? 'Seeding...' : 'Seed One Piece Data'}
        </button>

        {onePieceAnime && (
          <div className="bg-white rounded-lg p-3 border border-blue-200">
            <h4 className="font-medium text-gray-800 mb-2">✅ One Piece Data Available</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Title:</strong> {onePieceAnime.title}</p>
              <p><strong>Year:</strong> {onePieceAnime.year}</p>
              <p><strong>Episodes:</strong> {onePieceAnime.streamingEpisodes?.length || 0} available for streaming</p>
              <p><strong>Total Episodes:</strong> {onePieceAnime.totalEpisodes || 'Unknown'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Alternative Sources Section */}
      <div className="bg-green-50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-semibold text-green-800">2. Add Alternative Streaming Sources</h3>
        <p className="text-green-700 text-sm">
          Add YouTube embeds as alternative streaming sources for demo purposes
        </p>
        
        <button
          onClick={handleAddAlternativeSources}
          disabled={isLoading || !onePieceAnime}
          className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {isLoading ? 'Adding...' : 'Add Alternative Sources'}
        </button>
      </div>

      {/* Test Streaming Section */}
      <div className="bg-purple-50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-semibold text-purple-800">3. Test In-App Streaming</h3>
        <p className="text-purple-700 text-sm">
          Open the streaming overlay to test the in-app viewing experience
        </p>
        
        {testEpisodes.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Test Episode:</label>
              <select
                value={testEpisodeIndex}
                onChange={(e) => setTestEpisodeIndex(Number(e.target.value))}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                                 {testEpisodes.map((episode: any, index: number) => (
                   <option key={index} value={index}>
                     Episode {index + 1}: {episode.title}
                   </option>
                 ))}
              </select>
            </div>

            <button
              onClick={handleTestStreaming}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              🎬 Test Streaming Overlay
            </button>
          </div>
        )}

        {testEpisodes.length === 0 && (
          <p className="text-purple-600 text-sm italic">Seed data first to enable streaming tests</p>
        )}
      </div>

      {/* Message Display */}
      {message && (
        <div className={`rounded-lg p-4 ${
          message.includes('Error') || message.includes('Failed')
            ? 'bg-red-50 text-red-800 border border-red-200'
            : 'bg-green-50 text-green-800 border border-green-200'
        }`}>
          <p className="text-sm font-medium">{message}</p>
        </div>
      )}

      {/* Feature Information */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h3 className="text-lg font-semibold text-gray-800">✨ Streaming Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div className="space-y-2">
            <h4 className="font-medium text-gray-800">🎮 Controls</h4>
            <ul className="space-y-1 text-xs">
              <li>• <kbd className="bg-gray-200 px-1 rounded">F</kbd> - Toggle fullscreen</li>
              <li>• <kbd className="bg-gray-200 px-1 rounded">ESC</kbd> - Close overlay</li>
              <li>• <kbd className="bg-gray-200 px-1 rounded">←→</kbd> - Navigate episodes</li>
              <li>• <kbd className="bg-gray-200 px-1 rounded">R</kbd> - Refresh stream</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-gray-800">📱 Features</h4>
            <ul className="space-y-1 text-xs">
              <li>• Embed & Popup streaming modes</li>
              <li>• Episode navigation</li>
              <li>• Auto-hiding controls</li>
              <li>• Fallback for blocked embeds</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Streaming Overlay */}
      <StreamingOverlay
        isOpen={isStreamingOpen}
        onClose={() => setIsStreamingOpen(false)}
        episode={currentTestEpisode}
        animeTitle={onePieceAnime?.title || 'One Piece'}
        episodes={testEpisodes}
        currentEpisodeIndex={testEpisodeIndex}
        onEpisodeChange={handleEpisodeChange}
      />
    </div>
  );
};

export default StreamingTestPanel; 