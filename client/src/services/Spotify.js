// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_URL = '/.netlify/functions';

let playerInstance = null;
let deviceId = null;
let initializePromise = null;

const Spotify = {
  /**
   * Initializes the Spotify Web Playback SDK Player.
   * @param {string} accessTokenParam - The OAuth access token.
   * @param {function} setIsPlaying - Callback to update playing state.
   * @returns {Promise<{player: Object, device_id: string}>}
   */
  async initializePlayer(accessTokenParam, setIsPlaying) {
    // If player is already initialized and deviceId is available, return immediately

    if (!accessTokenParam) {
      console.error('Access token is required to initialize the player.');
      return;
    }

    if (playerInstance && deviceId) {
      console.log('Player instance already exists with device ID:', deviceId);
      return { player: playerInstance, device_id: deviceId };
    }

    // If initialization is already in progress, return the existing promise
    if (initializePromise) {
      return initializePromise;
    }

    // Create a new initialization promise
    initializePromise = new Promise((resolve, reject) => {
      window.onSpotifyWebPlaybackSDKReady = () => {
        console.log('Spotify Web Playback SDK is ready');

        playerInstance = new window.Spotify.Player({
          name: 'Walkify',
          getOAuthToken: cb => { cb(accessTokenParam); }
        });

        // Error handling
        playerInstance.addListener('initialization_error', ({ message }) => {
          console.error('Initialization error:', message);
        });
        playerInstance.addListener('authentication_error', ({ message }) => {
          console.error('Authentication error:', message);
        });
        playerInstance.addListener('account_error', ({ message }) => {
          console.error('Account error:', message);
        });
        playerInstance.addListener('playback_error', ({ message }) => {
          console.error('Playback error:', message);
        });

        // Playback status updates
        playerInstance.addListener('player_state_changed', state => {
          if (!state) {
            console.warn('Player state changed: state is null');
            return;
          }
          const { paused } = state;
          console.log('Player state changed:', state);
          setIsPlaying(!paused);
        });

        // Ready
        playerInstance.addListener('ready', ({ device_id }) => {
          console.log('Player is ready with Device ID:', device_id);
          deviceId = device_id;
          resolve({ player: playerInstance, device_id });
        });

        // Not Ready
        playerInstance.addListener('not_ready', ({ device_id }) => {
          console.warn('Player is not ready with Device ID:', device_id);
          reject(new Error('Spotify Player not ready'));
        });

        console.log('Connecting to Spotify Player...');
        playerInstance.connect().then(success => {
          if (success) {
            console.log('The Web Playback SDK successfully connected to Spotify!');
          } else {
            console.error('The Web Playback SDK could not connect to Spotify.');
            reject(new Error('Player failed to connect.'));
          }
        });
      };

      const loadSpotifySDK = () => {
        if (!document.getElementById('spotify-sdk')) {
          console.log('Loading Spotify Web Playback SDK script...');
          const script = document.createElement('script');
          script.id = 'spotify-sdk';
          script.src = 'https://sdk.scdn.co/spotify-player.js';
          script.async = true;
          document.body.appendChild(script);
        } else if (window.Spotify) {
          console.log('Spotify SDK script already loaded');
          window.onSpotifyWebPlaybackSDKReady();
        }
      };

      loadSpotifySDK();
    });

    return initializePromise;
  },

  /**
   * Plays a track using the Spotify Web Playback SDK.
   * @param {string} uri - The Spotify URI of the track to play.
   * @param {string} accessTokenParam - The OAuth access token.
   * @param {function} setIsPlaying - Callback to update playing state.
   */
  async playTrack(uri, accessTokenParam, setIsPlaying) {
    try {
      const { player, device_id } = await this.initializePlayer(accessTokenParam, setIsPlaying);

      if (device_id) {
        console.log(`Playing track on device ID: ${device_id}`);
        const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${device_id}`, {
          method: 'PUT',
          body: JSON.stringify({ uris: [uri] }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessTokenParam}`,
          },
        });

        if (response.ok) {
          console.log('Playback started');
        } else {
          const errorData = await response.json();
          console.error('Error starting playback:', errorData);
        }
      } else {
        console.error('No device ID found');
      }
    } catch (error) {
      console.error('Error playing track:', error);
    }
  },

  /**
   * Pauses the currently playing track.
   * @param {function} setIsPlaying - Callback to update playing state.
   */
  async pause(setIsPlaying) {
    try {
      if (playerInstance) {
        console.log('Pausing playback...');
        await playerInstance.pause();
        setIsPlaying(false);
        console.log('Playback paused');
      } else {
        console.error('Spotify Player is not initialized');
      }
    } catch (error) {
      console.error('Error pausing track:', error);
    }
  },

  async search(term, offset = 0, limit = 20, accessToken) {
    try {
      const response = await fetch(`${API_URL}/search?term=${encodeURIComponent(term)}&offset=${offset}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,  // Include the access token
        },
      });

      console.log('Search response:', response); // Log the response

      if (!response.ok) {
        console.error('Error response from search:', await response.text()); // Log error body
        return { tracks: [], total: 0 };
      }

      const data = await response.json();
      console.log('Search response JSON:', data); // Log the response


      if (!data.tracks) {
        return { tracks: [], total: 0 };
      }

      const tracks = data.tracks.items.map((track) => ({
        id: track.id,
        name: track.name,
        artist: track.artists[0].name,
        album: track.album.name,
        uri: track.uri,
        image: track.album.images[0]?.url,
        preview_url: track.preview_url,
        external_url: track.external_urls.spotify,
      }));

      return {
        tracks,
        total: data.tracks.total,
        nextOffset: offset + limit,
      };
    } catch (error) {
      console.error('Error searching tracks:', error);
      return { tracks: [], total: 0 };
    }
  },

  async getSuggestions(query, accessToken) {
    if (!query) {
      return [];
    }

    try {
      console.log('Requesting suggestions with token:', accessToken);

      const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track,artist&limit=5`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        console.error('Error response:', errorResponse);

        // Explicitly throw the error so it propagates to the caller
        throw new Error(`${errorResponse.error.status} ${errorResponse.error.message}`);
      }


      const data = await response.json();
      console.log('Received data:', data);

      const trackSuggestions = data.tracks.items.map(track => track.name) || [];
      const artistSuggestions = data.artists.items.map(artist => artist.name) || [];

      return [...trackSuggestions, ...artistSuggestions];
    } catch (error) {
      console.error('Error fetching suggestions', error);
      throw error;
    }
  },

  async getUserSubscriptionLevel(accessToken) {
    try {
      const token = accessToken;  // Ensure accessToken is retrieved from state or context
      if (!token) {
        throw new Error('No access token available');
      }

      console.log('Using access token:', token);

      const response = await fetch(`https://api.spotify.com/v1/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = new Error('Error fetching user subscription level');
        error.status = response.status;
        throw error;
      }

      const data = await response.json();
      return data.product; // 'premium' or 'free'
    } catch (error) {
      console.error('Error fetching subscription level:', error);
      throw error;
    }
  },

  async savePlaylist(playlistName, uriArray, accessToken) {
    console.log('Accesstoken to save Playlist', accessToken);

    if (!playlistName || !uriArray.length) {
      console.warn('Playlist name or track URIs missing');
      return;
    }

    try {
      // Step 1: Create the playlist
      const createPlaylistResponse = await fetch('https://api.spotify.com/v1/me/playlists', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: playlistName,  // Playlist name
          description: 'Generated by Walkify',  // Optional description
          public: false  // Set to true if the playlist should be public
        }),
      });

      if (!createPlaylistResponse.ok) {
        const errorData = await createPlaylistResponse.json();
        throw new Error(errorData.error.message || 'Failed to create playlist');
      }

      const playlistData = await createPlaylistResponse.json();
      const playlistId = playlistData.id;

      // Step 2: Add tracks to the created playlist
      const addTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: uriArray,  // List of track URIs
        }),
      });

      if (!addTracksResponse.ok) {
        const errorData = await addTracksResponse.json();
        throw new Error(errorData.error.message || 'Failed to add tracks to playlist');
      }

      alert('Playlist saved successfully!');
      return playlistData;  // Optionally return the playlist data
    } catch (error) {
      console.error('Error saving playlist:', error);
      alert(`Failed to save playlist: ${error.message}`);
    }
  },

  async getRecommendations(playlistTracks, offset = 0, limit = 20, accessToken) {
    if (!playlistTracks || playlistTracks.length === 0) {
      return { tracks: [], total: 0 };
    }

    const randomTracks = [];
    const trackCount = Math.min(playlistTracks.length, 5);

    while (randomTracks.length < trackCount) {
      const rndIndex = Math.floor(Math.random() * playlistTracks.length);
      const selectedTrack = playlistTracks[rndIndex];

      if (!randomTracks.includes(selectedTrack)) {
        randomTracks.push(selectedTrack);
      }
    }

    const seedTracks = randomTracks.map(track => track.id).join(',');

    try {
      const response = await fetch(`https://api.spotify.com/v1/recommendations?offset=${offset}&limit=${limit}&seed_tracks=${seedTracks}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error fetching recommendations');
      }

      const data = await response.json();

      const newTracks = data.tracks.map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artists[0].name,
        album: track.album.name,
        uri: track.uri,
        image: track.album.images[0]?.url,
        preview_url: track.preview_url,
      }));

      return {
        tracks: newTracks,
        total: offset + newTracks.length < limit ? offset + newTracks.length : offset + newTracks.length + limit,
        nextOffset: offset + newTracks.length
      };
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return { tracks: [], total: 0 };
    }
  }
};

export default Spotify;
