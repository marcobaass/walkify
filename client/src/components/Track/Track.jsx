import { useMemo, useState } from 'react';
import styles from './Track.module.scss';
import PropTypes from 'prop-types';

export default function Track({ track, handleAddToPlaylist, handlePlay, isPlaying, currentTrack, isPremium }) {
  const [isHovered, setIsHovered] = useState(false);

  const isCurrentTrackPlaying = currentTrack && currentTrack.uri === track.uri && isPlaying;
  const tapeStyle = useMemo(() => {
    const bgImages = [
      't-bright-cyan',
      't-bright-orange',
      't-electric-blue',
      't-hot-magenta',
      't-neon-pink',
      't-neon-purple',
      't-neon-red'
    ];

    const rndIndex = Math.floor(Math.random() * bgImages.length);
    const rndBgImg = bgImages[rndIndex];

    return {
      backgroundImage: `url('/imgs/${rndBgImg}.png')`,
    };
  }, [])

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div className={`${styles.tape} m-1 rounded-lg max-w-[23rem] min-w-[17rem] l-md:min-w-[13rem] flex-1`} style={tapeStyle}>

      <img
        className={`${styles.gridImg} object-cover rounded-xl p-2`}
        src={track.image || "default-image-url.jpg"} // Use a meaningful default image URL
        alt={track.name || 'Track Image'}
      />


      <h2 className={`${styles.gridArtist} font-bold text-black truncate w-full max-w-[95%] text-center`}>{track.artist || 'Artist Name'}</h2>
      <h2 className={`${styles.gridSong} text-black truncate w-full max-w-[95%] text-center`}>{track.name || 'Song Title'}</h2>
      <h2 className={`${styles.gridAlbum} text-white truncate w-full max-w-[95%] text-center`}>{track.album || 'Album Title'}</h2>

      <a
      href={track.external_url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${styles.gridSpot} relative inline-block`} // Ensure relative positioning for layering images
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <img
        src="/imgs/Spotify_Primary_Logo_RGB_Green.png"
        alt="Spotify Logo"
        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${isHovered ? 'opacity-0' : 'opacity-100'}`}
      />
      <img
        src="/imgs/Spotify_Primary_Logo_RGB_Black.png"
        alt="Spotify Hover Logo"
        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
      />
    </a>

      {/* Playbutton */}
      <div className={`${styles.gridPlay} relative  group`}>
        {(track.preview_url && !isPremium) || isPremium ? (
          <button
            className="px-2 py-1 bg-lime-green text-black font-semibold rounded-lg shadow-lg hover:bg-vivid-yellow transition-colors duration-300 text-xs"
            onClick={() => handlePlay(track)}
          >
            {isCurrentTrackPlaying ? 'Stop' : 'Play'}
          </button>
        ) : (
          <button
            className="px-2 py-1 bg-gray-400 text-white font-semibold rounded-lg shadow-lg text-xs"
          >
            Play
          </button>
        )}

        {/* Tooltip */}
        {!isPremium && !track.preview_url && (
          <div className="absolute bottom-full mb-2 hidden group-hover:block">
            <span>
              <p className="bg-gray-800 text-white text-sm rounded-lg py-1 px-4 shadow-lg whitespace-nowrap">No preview available for free users</p>
            </span>
          </div>
        )}
      </div>



        {/* Add Button */}
        <button
          onClick={() => handleAddToPlaylist(track)}
          className={`${styles.gridAdd} px-2 py-1 bg-lime-green text-black font-semibold rounded-lg hover:bg-vivid-yellow transition-colors duration-300 text-xs`}
        >
          Add
        </button>
    </div>

  );
}

Track.propTypes = {
  track: PropTypes.shape({
    image: PropTypes.string,
    artist: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    album: PropTypes.string.isRequired,
    uri: PropTypes.string.isRequired,
    preview_url: PropTypes.string, // Add preview_url to propTypes
  }).isRequired,
  handleAddToPlaylist: PropTypes.func.isRequired,
  handlePlay: PropTypes.func.isRequired,
  currentTrack: PropTypes.object, // Allow currentTrack to be null
  isPremium: PropTypes.bool.isRequired
};
