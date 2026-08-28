import { useState, useEffect, useRef } from 'react';
import usePlaylist from '../../hooks/usePlaylist';
import styles from './App.module.scss';
import SearchBar from '../SearchBar/SearchBar';
import SearchResults from '../SearchResults/SearchResults';
import Tracklist from '../Tracklist/Tracklist';
import Playlist from '../Playlist/Playlist';
import Spotify from '../../services/Spotify';
import { useLoading } from '../../context/LoadingContext';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';

import { useNavigate } from 'react-router-dom';


function App({accessToken, loginRef}) {

  const navigate = useNavigate();

  useEffect(() => {
    console.log('App component rendered with access token:', accessToken);
  }, [accessToken]);

  const { isLoading, setLoading } = useLoading();
  const [text, setText] = useState("");
  const [tracks, setTracks] = useState([]);
  const [query, setQuery] = useState("");
  const [searchOffset, setSearchOffset] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recommendedTracks, setRecommendedTracks] = useState([]);
  const [recommendationOffset, setRecommendationOffset] = useState(0);
  const [totalRecommendations, setTotalRecommendations] = useState(0);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

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

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        setLoading(true); // Set loading to true
        if (accessToken) {
          const subscription = await Spotify.getUserSubscriptionLevel(accessToken); // Pass the access token
          console.log("Subscription level:", subscription);
          setIsPremium(subscription === 'premium');
        } else {
          console.warn("Access token not available, skipping subscription check.");
        }
      } catch (error) {
        console.error("Error checking subscription level:", error);
        setIsPremium(false);

        if (error.status === 401) {
          loginRef.current = false;
          localStorage.clear();
          sessionStorage.clear();
          navigate('/login');
        }
      } finally {
        setLoading(false); // Set loading to false
      }
    };

    if (accessToken) {
      checkSubscription();
    }
  }, [accessToken]); // Re-run when accessToken changes

  useEffect(() => {
    // Ensure the player is initialized when the component mounts
    if (accessToken && isPremium) {
        Spotify.initializePlayer(accessToken, setIsPlaying);
    }
  }, [accessToken, isPremium]);

  const handlePlay = async (track) => {
    if (!accessToken) {
      console.error('No access token available');
      return;
    }

    if (isPremium) {
      try {
        const { player } = await Spotify.initializePlayer(accessToken, setIsPlaying);
        if (currentTrack && currentTrack.uri === track.uri && isPlaying) {
          await Spotify.pause(setIsPlaying);
        } else if (player) {
          await Spotify.playTrack(track.uri, accessToken, setIsPlaying);
          setCurrentTrack(track);
        } else {
          console.error('Player is not initialized');
        }
      } catch (error) {
        console.error('Error in playback:', error);
      }
    } else if (track.preview_url) {
      // Handle preview audio playback for free users
      if (currentTrack && currentTrack.uri === track.uri && isPlaying) {
        // If the same track is already playing, stop the preview
        currentAudio.pause();
        currentAudio.currentTime = 0;  // Reset the playback to the beginning
        setIsPlaying(false);
        setCurrentAudio(null);
        setCurrentTrack(null);
      } else {
        // If a different track is playing, stop it first
        if (currentAudio) {
          currentAudio.pause();
          setIsPlaying(false);
        }

        const audio = new Audio(track.preview_url);
        setCurrentAudio(audio);
        setCurrentTrack(track);

        audio.play();
        setIsPlaying(true);

        // Handle when the preview ends
        audio.onended = () => {
          setIsPlaying(false);
          setCurrentAudio(null);
          setCurrentTrack(null);
        };
      }
    } else {
      alert('No preview available for this track.');
    }
  };

  const handleSearch = async (searchTerm, newSearch = false) => {
    if (!searchTerm.trim()) {
      console.warn("Search term is empty. Skipping API request.");
      return;
    }

    const offset = newSearch ? 0 : searchOffset;

    try {
      setLoading(true); // Set loading to true
      const { tracks, total, nextOffset } = await Spotify.search(searchTerm, offset, 20, accessToken); // Pass the token
      setTracks((prevTracks) => newSearch ? tracks : [...prevTracks, ...tracks]);
      setSearchOffset(nextOffset);
      setTotalResults(total);
    } catch (error) {
      console.error("Error during search:", error);
    } finally {
      setLoading(false); // Set loading to false
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuggestions([]);
    setRecommendedTracks([]);
    console.log('Searchtext', text);
    setQuery(text);
    handleSearch(text, true);
  };

  const handleLoadMore = async () => {
    try {
      setLoading(true); // Set loading to true
      if (recommendedTracks.length > 0) {
        // Load more recommendations and append to the existing list
        const { tracks, total, nextOffset } = await Spotify.getRecommendations(playlistTracks, recommendationOffset, 20, accessToken);

        const allTracks = [...recommendedTracks, ...tracks];
      const filteredTracks = Array.from(new Set(allTracks.map(track => track.uri)))
                                  .map(uri => allTracks.find(track => track.uri === uri));

        setRecommendedTracks(filteredTracks);
        // setRecommendedTracks((prevTracks) => [...prevTracks, ...tracks]);
        setRecommendationOffset(nextOffset);
        setTotalRecommendations(total);
      } else {
        // Load more search results
        await handleSearch(query);
      }
    } catch (error) {
      console.error("Error loading more:", error);
    } finally {
      setLoading(false); // Set loading to false
    }
  };

  const handleSuggestions = async (inputValue) => {
    if (!inputValue) {
      setSuggestions([]);
      return;
    }

    try {
      setLoading(true); // Set loading to true
      const fetchedSuggestions = await Spotify.getSuggestions(inputValue, accessToken);
      setSuggestions(fetchedSuggestions);
    } catch (error) {
      console.error('Error during handleSuggestions:', error);

      // Check for 401 status or "access token expired" message
      if (error.message.includes('401') || error.message.toLowerCase().includes('access token expired')) {
        console.log('Access token expired, redirecting to login...');

        // Clear storage
        window.localStorage.removeItem('accessToken');
        window.localStorage.removeItem('spotify_access_token');
        localStorage.clear();

        window.localStorage.removeItem('refreshToken');
        window.localStorage.removeItem('expiresIn');
        window.sessionStorage.removeItem('accessToken');
        window.sessionStorage.removeItem('refreshToken');

        // Navigate to login
        navigate('/login');
      } else {
        console.error('Unhandled error:', error);
      }
    } finally {
      setLoading(false); // Stop loading
    }
  };

  const getRecommendations = async (playlistTracks) => {
    try {
      setLoading(true); // Set loading to true
      setRecommendationOffset(0); // Reset offset when fetching recommendations
      const { tracks, total, nextOffset } = await Spotify.getRecommendations(playlistTracks, 0, 20, accessToken);

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
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setLoading(false); // Set loading to false
    }
  };

  const handleLogout = () => {
    console.log("Log out button clicked");

    // Open a popup window for Spotify logout
    const width = 500;
    const height = 600;
    const left = (window.innerWidth / 2) - (width / 2);
    const top = (window.innerHeight / 2) - (height / 2);

    const popup = window.open(
      'https://accounts.spotify.com/logout',
      'Spotify Logout',
      `width=${width},height=${height},top=${top},left=${left}`
    );

    if (popup) {
      setTimeout(() => {
        if (!popup.closed) {
          popup.close();
        }

        // Clear access tokens and any other session data
        // xyz
        window.localStorage.removeItem('accessToken');
        window.localStorage.removeItem('spotify_access_token');
        localStorage.clear();
        window.location.reload(true);
        console.log('Access token after wipe 1', accessToken);
        window.localStorage.removeItem('refreshToken');
        window.localStorage.removeItem('expiresIn');

        window.sessionStorage.removeItem('accessToken');
        console.log('Access token after wipe 2', accessToken);
        window.sessionStorage.removeItem('refreshToken');

        // Clear application state
        setTracks([]);
        setQuery("");
        setSearchOffset(0);
        setTotalResults(0);
        setIsPremium(false);
        setCurrentAudio(null);
        setSuggestions([]);
        setIsPlaying(false);
        setRecommendedTracks([]);
        setLoading(false);
        loginRef.current = false;
        // Redirect to your app's login or homepage
        // window.location.href = '/login';
        navigate('/login');
      }, 2000);
    } else {
      // Handle the case where the popup could not be opened
      console.error('Popup could not be opened');
    }
  };

  const handleOnBlur = (e, dropdownRef) => {
    if (dropdownRef.current && dropdownRef.current.contains(e.relatedTarget)) {
      return;
    }
    setSuggestions([]);
  }
  console.log('isPremium: ', isPremium);

  return (
    <div className="screen flex flex-col h-screen md:overflow-hidden l-sm:overflow-auto bg-electric-blue">
      <header className="p-4 bg-hot-magenta text-white text-center">
        <h1 className="text-5xl md:text-7xl lg:text-8xl">MIXTAPE</h1>
        <h1 className="text-5xl md:text-7xl lg:text-8xl">TUNES</h1>
        <button onClick={handleLogout} className="rounded-full bg-neon-green px-4 py-1 mt-6 hover:bg-lime-green transition-colors duration-300 text-base font-bold">
          Log Out
        </button>
      </header>

      <div className="flex md:flex-1 flex-col-reverse md:flex-row md:overflow-hidden l-md:overflow-auto">

        <aside className="lg:w-1/3 md:w-2/5 w-full p-4 border-r border-gray-300 flex flex-col l-sm:overflow-auto bg-electric-blue">
          <div className="flex-1">
            <Playlist
              playlistTracks={playlistTracks}
              handleRemoveFromPlaylist={handleRemoveFromPlaylist}
              playlistName={playlistName}
              setPlaylistName={setPlaylistName}
              handleSaveToSpotify={handleSaveToSpotify}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              getRecommendations={getRecommendations}
              accessToken={accessToken}
            />
          </div>
        </aside>

        <main className="lg:w-2/3 md:w-3/5 w-full p-4 flex flex-col bg-vivid-yellow">
          <div className="flex justify-center mb-4">
            <SearchBar
              text={text}
              setText={setText}
              onSubmit={handleSubmit}
              onBlur={handleOnBlur}
              handleSuggestions={handleSuggestions}
              suggestions={suggestions}
              inputRef={inputRef}
              dropdownRef={dropdownRef}
            />
          </div>
          {query && <SearchResults query={query} />}
          <div className="flex-1 overflow-y-auto">
            {isLoading && <LoadingSpinner />}
            {(recommendedTracks.length > 0 || tracks.length > 0) && (
              <>
                <Tracklist
                  tracks={recommendedTracks.length > 0 ? recommendedTracks : tracks}
                  handleAddToPlaylist={handleAddToPlaylist}
                  Spotify={Spotify}
                  handlePlay={handlePlay}
                  isPlaying={isPlaying}
                  currentTrack={currentTrack}
                  isPremium={isPremium}
                />
                <div className="hidden md:flex justify-center">
                  {((recommendedTracks.length > 0 && recommendationOffset < totalRecommendations) ||
                    (tracks.length > 0 && searchOffset < totalResults)) && (
                    <button onClick={handleLoadMore} className="text-white bg-neon-pink rounded-2xl px-3 py-0.5 h-min mt-2 hover:bg-neon-purple transition-colors duration-300 text-sm font-bold">
                      Load More
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
