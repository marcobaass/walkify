import { useState, useEffect } from 'react';
import usePlaylist from '../../hooks/usePlaylist';
import styles from './App.module.scss';
import SearchBar from '../SearchBar/SearchBar';
import SearchResults from '../SearchResults/SearchResults';
import Tracklist from '../Tracklist/Tracklist';
import Playlist from '../Playlist/Playlist';
import Spotify from '../../services/Spotify';

function App() {
  useEffect(() => {
    Spotify.getAccessToken();
  }, []);

  const [text, setText] = useState("");
  const [tracks, setTracks] = useState([]);
  const [query, setQuery] = useState("");
  const [searchOffset, setSearchOffset] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recommendedTracks, setRecommendedTracks] = useState([]);
  const [recommendationOffset, setRecommendationOffset] = useState(0);
  const [totalRecommendations, setTotalRecommendations] = useState(0);

  useEffect(() => {
    console.log('Recommendation Offset:', recommendationOffset);
    console.log('Total Recommendations:', totalRecommendations);
    console.log('Search Offset:', searchOffset);
    console.log('Total Results:', totalResults);
  }, [recommendationOffset, totalRecommendations, searchOffset, totalResults]);

  const {
    playlistTracks,
    playlistName,
    isEditing,
    setPlaylistName,
    setIsEditing,
    handleAddToPlaylist,
    handleRemoveFromPlaylist,
    handleSaveToSpotify,
  } = usePlaylist();

  const handleSearch = (searchTerm, newSearch = false) => {
    if (!searchTerm.trim()) {
      console.warn("Search term is empty. Skipping API request.");
      return;
    }

    const offset = newSearch ? 0 : searchOffset;
    Spotify.search(searchTerm, offset).then(({ tracks, total, nextOffset }) => {
      setTracks((prevTracks) => newSearch ? tracks : [...prevTracks, ...tracks]);
      setSearchOffset(nextOffset);
      setTotalResults(total);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuggestions([]);
    setRecommendedTracks([]);
    setQuery(text);
    handleSearch(text, true);
  };

  const handleLoadMore = async () => {
    if (recommendedTracks.length > 0) {
      // Load more recommendations and append to the existing list
      const { tracks, total, nextOffset } = await Spotify.getRecommendations(playlistTracks, recommendationOffset);

      // Append new tracks to the existing list of recommended tracks
      setRecommendedTracks((prevTracks) => [...prevTracks, ...tracks]);
      setRecommendationOffset(nextOffset);
      setTotalRecommendations(total);
    } else {
      // Load more search results
      handleSearch(query);
    }
  };

  const handleSuggestions = async (inputValue) => {
    if (!inputValue) {
      setSuggestions([]);
      return;
    }
    const fetchedSuggestions = await Spotify.getSuggestions(inputValue);
    setSuggestions(fetchedSuggestions);
  };

  useEffect(() => {
    const checkSubscription = async () => {
      const subscription = await Spotify.getUserSubscriptionLevel();
      setIsPremium(subscription === 'premium');
    };

    checkSubscription();
  }, []);

  const handlePlay = async (track) => {
    // If the same track is playing, pause it
    if (currentAudio && isPlaying && currentAudio.src === track.preview_url) {
      currentAudio.pause();
      setIsPlaying(false);
      setCurrentAudio(null);
      return;
    }

    // Stop current audio if it exists
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsPlaying(false);
    }

    if (isPremium) {
      // Play full track if the user is a Premium subscriber
      await Spotify.playTrack(track.uri);
      setCurrentAudio(null); // Reset currentAudio since the full track is managed by Spotify
      setIsPlaying(true); // Assume track is playing
    } else if (track.preview_url) {
      // Play 30-second preview if the user is a Free user
      const audio = new Audio(track.preview_url);
      setCurrentAudio(audio);
      setIsPlaying(true);
      audio.play();
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
      };
    } else {
      alert('No preview available for this track.');
    }
  };

  const getRecommendations = async (playlistTracks) => {
    setRecommendationOffset(0); // Reset offset when fetching recommendations
    const { tracks, total, nextOffset } = await Spotify.getRecommendations(playlistTracks);

    if (tracks && tracks.length > 0) {
      if (currentAudio) {
        currentAudio.pause();
      }
      setTracks([]); // Clear the previous search results
      setRecommendedTracks(tracks);
      setRecommendationOffset(nextOffset);
      setTotalRecommendations(total);
      setCurrentAudio(null);
      setIsPlaying(false);
    } else {
      console.log("No recommendations found or something went wrong.");
    }
  };

  const handleLogout = () => {
    console.log("Log out button clicked");
    Spotify.logout();

    // Clear any other application state or UI updates
    setTracks([]);
    setQuery("");
    setSearchOffset(0);
    setTotalResults(0);
    setIsPremium(false);
    setCurrentAudio(null);
    setSuggestions([]);
    setIsPlaying(false);
    setRecommendedTracks([]);
  };

  return (
    <div className="screen flex flex-col h-screen overflow-hidden">
      <header className="p-4 bg-hot-magenta text-white text-center">
        <h1 className="text-8xl">WALKIFY</h1>
        <button onClick={handleLogout} className="rounded-full bg-neon-green px-4 py-1 mt-6 hover:bg-lime-green transition-colors duration-300 text-base font-bold">
          Log Out
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-1/3 p-4 border-r border-gray-300 flex flex-col bg-electric-blue">
          <div className="flex justify-center mb-4">
            <SearchBar
              text={text}
              setText={setText}
              onSubmit={handleSubmit}
              handleSuggestions={handleSuggestions}
              suggestions={suggestions}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            <Playlist
              playlistTracks={playlistTracks}
              handleRemoveFromPlaylist={handleRemoveFromPlaylist}
              playlistName={playlistName}
              setPlaylistName={setPlaylistName}
              handleSaveToSpotify={handleSaveToSpotify}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              getRecommendations={getRecommendations}
            />
          </div>
        </aside>
        <main className="w-2/3 p-4 flex flex-col bg-vivid-yellow">
          {query && <SearchResults query={query} />}
          <div className="flex-1 overflow-y-auto ">
            {(recommendedTracks.length > 0 || tracks.length > 0) && (
              <>
                <Tracklist
                  tracks={recommendedTracks.length > 0 ? recommendedTracks : tracks}
                  handleAddToPlaylist={handleAddToPlaylist}
                  Spotify={Spotify}
                  handlePlay={handlePlay}
                  isPlaying={isPlaying}
                  currentTrack={
                    currentAudio
                      ? (recommendedTracks.length > 0
                          ? recommendedTracks.find(track => track.preview_url === currentAudio.src)
                          : tracks.find(track => track.preview_url === currentAudio.src))
                      : null
                  }
                  isPremium={isPremium}
                />
                {((recommendedTracks.length > 0 && recommendationOffset < totalRecommendations) ||
                  (tracks.length > 0 && searchOffset < totalResults)) && (
                  <button onClick={handleLoadMore} className="text-white bg-neon-pink rounded-2xl px-3 py-0.5 h-min mt-2 hover:bg-neon-purple transition-colors duration-300 text-sm font-bold">
                    Load More
                  </button>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
