import React, { useState, useEffect, useRef } from "react";
import { firebase } from "../Firebase/config";
import { FaBook, FaGraduationCap, FaListAlt, FaShoppingCart, FaChevronDown, FaChevronUp, FaFilePdf, FaVideo, FaStar, FaClock, FaTag, FaPlus, FaMinus, FaLock, FaUnlock, FaEye, FaTimes, FaPlay, FaPause, FaForward, FaBackward, FaVolumeUp, FaExpand, FaCheck, FaListOl, FaRandom, FaStepForward, FaStepBackward, FaRedo } from "react-icons/fa";

const Index = () => {
  const [courses, setCourses] = useState([]);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [expandedChapters, setExpandedChapters] = useState({});
  const [activeModal, setActiveModal] = useState(null);
  const [modalContent, setModalContent] = useState(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [playlistMode, setPlaylistMode] = useState('sequential');
  const [watchedVideos, setWatchedVideos] = useState(new Set());
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoadingNextVideo, setIsLoadingNextVideo] = useState(false);
  const [nextVideoIndex, setNextVideoIndex] = useState(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const [videoKey, setVideoKey] = useState(0);

  const fetchCourses = async () => {
    try {
      const db = firebase.firestore();
      const snapshot = await db.collection("courses").orderBy("timestamp", "desc").get();
      const coursesData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCourses(coursesData);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Video player effects - Auto-play setup
  useEffect(() => {
    if (activeModal === 'video' && videoRef.current && modalContent?.videoUrls?.[currentVideoIndex]) {
      const video = videoRef.current;
      
      // Reset states
      setIsLoadingNextVideo(false);
      setVideoEnded(false);
      setNextVideoIndex(null);
      
      // Setup auto-play for the current video
      const setupAutoPlay = async () => {
        try {
          // Load the video first
          video.load();
          
          // Wait for video to be ready to play
          const waitForVideoReady = () => {
            return new Promise((resolve) => {
              if (video.readyState >= 3) {
                resolve();
              } else {
                const onCanPlay = () => {
                  video.removeEventListener('canplay', onCanPlay);
                  resolve();
                };
                video.addEventListener('canplay', onCanPlay);
                
                // Fallback timeout
                setTimeout(resolve, 1000);
              }
            });
          };
          
          await waitForVideoReady();
          
          // Play the video
          const playPromise = video.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsPlaying(true);
                console.log(`Playing Solution ${currentVideoIndex + 1} of ${modalContent.videoUrls.length}`);
              })
              .catch(error => {
                console.log("Auto-play prevented, waiting for user interaction:", error);
                setIsPlaying(false);
              });
          }
          
          // Mark as watched when playing starts
          setWatchedVideos(prev => {
            const newSet = new Set(prev);
            newSet.add(modalContent.videoUrls[currentVideoIndex]);
            return newSet;
          });
          
        } catch (error) {
          console.error("Error in video setup:", error);
          setIsPlaying(false);
        }
      };
      
      // Handle video end event
      const handleVideoEnded = () => {
        console.log(`Solution ${currentVideoIndex + 1} ended`);
        setVideoEnded(true);
        handleVideoEnd();
      };
      
      // Handle video error
      const handleVideoError = (e) => {
        console.error("Video error:", e.target.error);
        // Skip to next video if current fails
        setTimeout(() => {
          if (currentVideoIndex < modalContent.videoUrls.length - 1) {
            setCurrentVideoIndex(prev => prev + 1);
            setVideoKey(prev => prev + 1);
          }
        }, 1000);
      };
      
      // Add event listeners
      video.addEventListener('ended', handleVideoEnded);
      video.addEventListener('error', handleVideoError);
      
      // Start setup
      setupAutoPlay();
      
      // Cleanup function
      return () => {
        video.removeEventListener('ended', handleVideoEnded);
        video.removeEventListener('error', handleVideoError);
        if (video) {
          video.pause();
          video.currentTime = 0;
        }
      };
    }
  }, [activeModal, currentVideoIndex, modalContent, videoKey]);

  // Handle video end event - autoplay next video
  const handleVideoEnd = () => {
    if (!modalContent?.videoUrls) return;
    
    console.log("handleVideoEnd called");
    
    // Calculate next video index based on playlist mode
    let nextIndex;
    
    switch (playlistMode) {
      case 'random':
        // Get random index different from current
        let randomIndex;
        do {
          randomIndex = Math.floor(Math.random() * modalContent.videoUrls.length);
        } while (randomIndex === currentVideoIndex && modalContent.videoUrls.length > 1);
        nextIndex = randomIndex;
        break;
        
      case 'loop':
        // Loop back to start if at end
        nextIndex = (currentVideoIndex + 1) % modalContent.videoUrls.length;
        break;
        
      case 'sequential':
      default:
        // Go to next video in sequence
        nextIndex = currentVideoIndex + 1;
        break;
    }
    
    // Check if we have a next video to play
    const canPlayNext = 
      playlistMode === 'loop' || 
      playlistMode === 'random' || 
      (playlistMode === 'sequential' && nextIndex < modalContent.videoUrls.length);
    
    if (canPlayNext) {
      console.log(`Auto-playing next solution: ${nextIndex + 1}`);
      
      // Show loading state
      setIsLoadingNextVideo(true);
      setNextVideoIndex(nextIndex);
      
      // Auto-play next video after short delay for smooth transition
      setTimeout(() => {
        setCurrentVideoIndex(nextIndex);
        setVideoKey(prev => prev + 1);
        setIsLoadingNextVideo(false);
        setNextVideoIndex(null);
        setVideoEnded(false);
      }, 800); // 800ms delay for smooth transition
    } else {
      // End of playlist in sequential mode
      console.log("All solutions completed!");
      setIsPlaying(false);
      
      // Show completion message
      setTimeout(() => {
        alert("🎉 All solutions have been completed! Great job!");
      }, 300);
    }
  };

  // Update current time and duration
  useEffect(() => {
    const video = videoRef.current;
    if (!video || activeModal !== 'video') return;

    const updateTime = () => {
      setCurrentTime(video.currentTime);
    };
    
    const updateDuration = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };
    
    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('durationchange', updateDuration);
    video.addEventListener('loadedmetadata', updateDuration);
    
    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('durationchange', updateDuration);
      video.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [activeModal, currentVideoIndex]);

  // Preload next video when current video is playing
  useEffect(() => {
    if (!modalContent?.videoUrls || !isPlaying || activeModal !== 'video') return;
    
    const preloadNextVideo = () => {
      let nextIndex;
      
      switch (playlistMode) {
        case 'sequential':
          nextIndex = currentVideoIndex + 1;
          if (nextIndex >= modalContent.videoUrls.length) return;
          break;
        case 'loop':
          nextIndex = (currentVideoIndex + 1) % modalContent.videoUrls.length;
          break;
        case 'random':
          // For random mode, we don't know which one is next
          return;
        default:
          return;
      }
      
      // Preload the next video
      const preloadVideo = document.createElement('video');
      preloadVideo.src = modalContent.videoUrls[nextIndex];
      preloadVideo.preload = 'auto';
      preloadVideo.style.display = 'none';
      document.body.appendChild(preloadVideo);
      
      // Clean up
      setTimeout(() => {
        if (document.body.contains(preloadVideo)) {
          document.body.removeChild(preloadVideo);
        }
      }, 10000);
    };
    
    // Preload when current video is at 80% progress
    if (duration > 0 && currentTime > duration * 0.8) {
      preloadNextVideo();
    }
  }, [currentTime, duration, modalContent, currentVideoIndex, playlistMode, isPlaying, activeModal]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(error => {
            console.log("Play failed:", error);
            setIsPlaying(false);
          });
      }
    }
  };

  const handleSeek = (e) => {
    if (videoRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      const newTime = pos * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
      if (newMutedState) {
        setVolume(0);
      } else {
        setVolume(1);
        videoRef.current.volume = 1;
      }
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const changePlaybackRate = (rate) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  const getNextVideoIndex = () => {
    if (!modalContent?.videoUrls) return 0;
    
    switch (playlistMode) {
      case 'random':
        let randomIndex;
        do {
          randomIndex = Math.floor(Math.random() * modalContent.videoUrls.length);
        } while (randomIndex === currentVideoIndex && modalContent.videoUrls.length > 1);
        return randomIndex;
        
      case 'loop':
        return (currentVideoIndex + 1) % modalContent.videoUrls.length;
        
      case 'sequential':
      default:
        return currentVideoIndex + 1;
    }
  };

  const nextVideo = () => {
    if (modalContent?.videoUrls) {
      const nextIndex = getNextVideoIndex();
      const hasNext = playlistMode === 'loop' || playlistMode === 'random' || nextIndex < modalContent.videoUrls.length;
      
      if (hasNext) {
        setCurrentVideoIndex(nextIndex);
        setVideoKey(prev => prev + 1);
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
    }
  };

  const prevVideo = () => {
    if (modalContent?.videoUrls) {
      if (currentVideoIndex > 0) {
        setCurrentVideoIndex(currentVideoIndex - 1);
        setVideoKey(prev => prev + 1);
        setIsPlaying(true);
      } else if (playlistMode === 'loop') {
        setCurrentVideoIndex(modalContent.videoUrls.length - 1);
        setVideoKey(prev => prev + 1);
        setIsPlaying(true);
      }
    }
  };

  const skipToVideo = (index) => {
    if (index >= 0 && index < modalContent?.videoUrls?.length) {
      setCurrentVideoIndex(index);
      setVideoKey(prev => prev + 1);
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const openPDFModal = (url, title) => {
    setActiveModal('pdf');
    setModalContent({
      type: 'pdf',
      url: url,
      title: title
    });
  };

  const openVideoModal = (videoUrls, title) => {
    setActiveModal('video');
    setModalContent({
      type: 'video',
      videoUrls: Array.isArray(videoUrls) ? videoUrls : [videoUrls],
      title: title
    });
    setCurrentVideoIndex(0);
    setVideoKey(prev => prev + 1);
    setIsPlaying(true);
    setIsMuted(false);
    setVolume(1);
    setPlaybackRate(1);
    setWatchedVideos(new Set());
    setIsLoadingNextVideo(false);
    setNextVideoIndex(null);
    setVideoEnded(false);
    setCurrentTime(0);
    setDuration(0);
  };

  const closeModal = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setActiveModal(null);
    setModalContent(null);
    setIsPlaying(false);
    setCurrentVideoIndex(0);
    setVideoKey(0);
    setIsMuted(false);
    setVolume(1);
    setPlaybackRate(1);
    setCurrentTime(0);
    setDuration(0);
    setIsLoadingNextVideo(false);
    setNextVideoIndex(null);
    setVideoEnded(false);
  };

  const toggleCourse = (courseId) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
      const newExpandedChapters = { ...expandedChapters };
      Object.keys(newExpandedChapters).forEach(key => {
        if (key.startsWith(`${courseId}-`)) {
          delete newExpandedChapters[key];
        }
      });
      setExpandedChapters(newExpandedChapters);
    } else {
      setExpandedCourse(courseId);
    }
  };

  const toggleChapter = (courseId, chapterIndex, e) => {
    if (e) e.stopPropagation();
    const chapterKey = `${courseId}-${chapterIndex}`;
    setExpandedChapters(prev => ({
      ...prev,
      [chapterKey]: !prev[chapterKey]
    }));
  };

  const expandAllChapters = (courseId, e) => {
    if (e) e.stopPropagation();
    const course = courses.find(c => c.id === courseId);
    if (!course?.topics) return;
    
    const newExpandedChapters = { ...expandedChapters };
    course.topics.forEach((_, index) => {
      newExpandedChapters[`${courseId}-${index}`] = true;
    });
    setExpandedChapters(newExpandedChapters);
  };

  const collapseAllChapters = (courseId, e) => {
    if (e) e.stopPropagation();
    const newExpandedChapters = { ...expandedChapters };
    Object.keys(newExpandedChapters).forEach(key => {
      if (key.startsWith(`${courseId}-`)) {
        delete newExpandedChapters[key];
      }
    });
    setExpandedChapters(newExpandedChapters);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Recently added";
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getChapterStatus = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    if (!course?.topics) return { allCollapsed: true, allExpanded: false };
    
    let expandedCount = 0;
    course.topics.forEach((_, index) => {
      if (expandedChapters[`${courseId}-${index}`]) {
        expandedCount++;
      }
    });
    
    return {
      allCollapsed: expandedCount === 0,
      allExpanded: expandedCount === course.topics.length,
      expandedCount
    };
  };

  const isFreeResource = (topic, resourceIndex) => {
    if (!topic.resources || topic.resources.length === 0) return false;
    
    const firstResourceWithFileUrl = topic.resources.findIndex(r => 
      r.fileUrls && r.fileUrls.length > 0
    );
    
    return firstResourceWithFileUrl === resourceIndex;
  };

  const isFreeNumerical = (resource, numericalIndex) => {
    if (!resource.numericals || resource.numericals.length === 0) return false;
    return numericalIndex === 0;
  };

  // Modal Component with enhanced video player
  const Modal = () => {
    if (!activeModal) return null;

    // Calculate next video index for display
    const calculateNextIndex = () => {
      if (!modalContent?.videoUrls) return null;
      
      switch (playlistMode) {
        case 'sequential':
          const nextSeq = currentVideoIndex + 1;
          return nextSeq < modalContent.videoUrls.length ? nextSeq : null;
        case 'loop':
          return (currentVideoIndex + 1) % modalContent.videoUrls.length;
        case 'random':
          return null; // Can't predict random
        default:
          return null;
      }
    };

    const displayNextIndex = nextVideoIndex !== null ? nextVideoIndex : calculateNextIndex();

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-90">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100">
            <div className="flex items-center">
              {modalContent.type === 'pdf' ? (
                <FaFilePdf className="text-red-500 text-2xl mr-3" />
              ) : (
                <FaVideo className="text-blue-500 text-2xl mr-3" />
              )}
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {modalContent.title || 'Preview Content'}
                </h3>
                {modalContent.type === 'video' && (
                  <div className="flex items-center mt-1 text-sm text-gray-600">
                    <span className="mr-3 font-medium">
                      Solution {currentVideoIndex + 1} of {modalContent.videoUrls.length}
                      {displayNextIndex !== null && playlistMode === 'sequential' && (
                        <span className="ml-2 text-blue-600 font-semibold">
                          → Next: Solution {displayNextIndex + 1}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center bg-blue-50 px-2 py-1 rounded">
                      <FaPlay className="mr-1 text-blue-500" />
                      <span className="text-blue-700">Auto-play: ON</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={closeModal}
              className="text-gray-500 hover:text-gray-700 transition-colors duration-300 p-2 rounded-full hover:bg-gray-100"
            >
              <FaTimes className="text-2xl" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="flex flex-col lg:flex-row">
            {/* Main Video Area */}
            <div className="flex-1 p-6">
              {modalContent.type === 'pdf' ? (
                <div className="h-[60vh]">
                  <iframe
                    src={`https://docs.google.com/gview?url=${encodeURIComponent(modalContent.url)}&embedded=true`}
                    className="w-full h-full border-0 rounded-lg"
                    title="PDF Preview"
                  />
                </div>
              ) : (
                <div ref={videoContainerRef} className="relative bg-black rounded-xl overflow-hidden">
                  {/* Loading indicator for next video */}
                  {isLoadingNextVideo && (
                    <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-10">
                      <div className="text-center p-8 bg-gray-900/90 rounded-2xl">
                        <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                        <p className="text-white text-xl font-semibold mb-2">
                          Loading Solution {nextVideoIndex + 1}...
                        </p>
                        <p className="text-gray-300">
                          Auto-playing next solution in sequence
                        </p>
                        <div className="mt-4 text-sm text-blue-300">
                          {modalContent.videoUrls.length - (nextVideoIndex || currentVideoIndex + 1)} solutions remaining
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Video ending soon indicator */}
                  {!isLoadingNextVideo && duration > 0 && currentTime > duration * 0.85 && (
                    <div className="absolute top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-full text-sm animate-pulse z-5">
                      <div className="flex items-center">
                        <FaStepForward className="mr-2" />
                        <span>
                          Next in {Math.ceil(duration - currentTime)}s
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <video
                    ref={videoRef}
                    key={`${modalContent.videoUrls[currentVideoIndex]}-${videoKey}`}
                    className="w-full h-auto max-h-[50vh]"
                    controls={false}
                    autoPlay
                    playsInline
                    muted={isMuted}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => {
                      console.log("Video ended event fired");
                      setVideoEnded(true);
                      handleVideoEnd();
                    }}
                    onError={(e) => {
                      console.error("Video Load Error:", e.currentTarget.error);
                      // Skip to next if error
                      setTimeout(() => {
                        if (currentVideoIndex < modalContent.videoUrls.length - 1) {
                          setCurrentVideoIndex(prev => prev + 1);
                          setVideoKey(prev => prev + 1);
                        }
                      }, 1000);
                    }}
                    preload="auto"
                  >
                    <source 
                      src={modalContent.videoUrls[currentVideoIndex]} 
                      type="video/mp4"
                    />
                    Your browser does not support the video tag.
                  </video>
                  
                  {/* Custom Video Controls Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                    {/* Progress Bar */}
                    <div 
                      className="w-full h-2 bg-gray-600 rounded-full mb-4 cursor-pointer group"
                      onClick={handleSeek}
                    >
                      <div 
                        className="h-full bg-orange-500 rounded-full relative"
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                      >
                        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-orange-500 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                      {/* Next video indicator on progress bar */}
                      {duration > 0 && displayNextIndex !== null && playlistMode === 'sequential' && (
                        <div 
                          className="absolute top-1/2 transform -translate-y-1/2 w-2 h-4 bg-blue-400 rounded-sm"
                          style={{ left: `${((displayNextIndex) / modalContent.videoUrls.length) * 100}%` }}
                          title="Next solution"
                        ></div>
                      )}
                    </div>
                    
                    {/* Control Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={togglePlay}
                          className="text-white hover:text-orange-400 transition-colors duration-300 p-2 rounded-full hover:bg-white/10"
                        >
                          {isPlaying ? (
                            <FaPause className="text-xl" />
                          ) : (
                            <FaPlay className="text-xl" />
                          )}
                        </button>
                        
                        <button
                          onClick={prevVideo}
                          disabled={currentVideoIndex === 0 && playlistMode !== 'loop'}
                          className={`text-white transition-colors duration-300 p-2 rounded-full hover:bg-white/10 ${
                            (currentVideoIndex === 0 && playlistMode !== 'loop') 
                              ? 'opacity-50 cursor-not-allowed' 
                              : 'hover:text-orange-400'
                          }`}
                        >
                          <FaStepBackward className="text-xl" />
                        </button>
                        
                        <button
                          onClick={nextVideo}
                          disabled={currentVideoIndex === modalContent.videoUrls.length - 1 && playlistMode !== 'loop' && playlistMode !== 'random'}
                          className={`text-white transition-colors duration-300 p-2 rounded-full hover:bg-white/10 ${
                            (currentVideoIndex === modalContent.videoUrls.length - 1 && playlistMode !== 'loop' && playlistMode !== 'random')
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:text-orange-400'
                          }`}
                        >
                          <FaStepForward className="text-xl" />
                        </button>
                        
                        {/* Volume Control */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={toggleMute}
                            className="text-white hover:text-orange-400 transition-colors duration-300 p-2 rounded-full hover:bg-white/10"
                          >
                            {isMuted || volume === 0 ? (
                              <FaVolumeUp className="text-xl" />
                            ) : volume < 0.5 ? (
                              <FaVolumeUp className="text-xl" />
                            ) : (
                              <FaVolumeUp className="text-xl" />
                            )}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={volume}
                            onChange={handleVolumeChange}
                            className="w-20 accent-orange-500"
                          />
                        </div>
                        
                        {/* Time Display */}
                        <div className="text-white text-sm font-mono bg-black/30 px-3 py-1 rounded">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {/* Auto-play Status */}
                        <div className="flex items-center text-white text-sm bg-green-600/40 px-3 py-1 rounded-lg border border-green-500/30">
                          <FaPlay className="mr-2 text-green-300 animate-pulse" />
                          <span>Auto-play</span>
                          <span className="ml-2 text-green-200">
                            {playlistMode === 'sequential' ? 'Sequential' : 
                             playlistMode === 'random' ? 'Random' : 'Loop'}
                          </span>
                        </div>
                        
                        {/* Playback Speed */}
                        <div className="relative group">
                          <button className="text-white hover:text-orange-400 transition-colors duration-300 px-3 py-1 bg-white/10 rounded-lg">
                            {playbackRate}x
                          </button>
                          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-20">
                            <div className="bg-gray-800 rounded-lg p-2 space-y-1 min-w-[100px] shadow-xl">
                              {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                                <button
                                  key={speed}
                                  onClick={() => changePlaybackRate(speed)}
                                  className={`block w-full text-left px-3 py-1 rounded text-white hover:bg-gray-700 transition-colors ${
                                    playbackRate === speed ? 'bg-orange-500' : ''
                                  }`}
                                >
                                  {speed}x
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        {/* Playlist Mode */}
                        <div className="relative group">
                          <button className="text-white hover:text-orange-400 transition-colors duration-300 p-2 rounded-full hover:bg-white/10">
                            {playlistMode === 'sequential' && <FaListOl className="text-xl" />}
                            {playlistMode === 'random' && <FaRandom className="text-xl" />}
                            {playlistMode === 'loop' && <FaRedo className="text-xl" />}
                          </button>
                          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-20">
                            <div className="bg-gray-800 rounded-lg p-2 space-y-1 min-w-[140px] shadow-xl">
                              <button
                                onClick={() => setPlaylistMode('sequential')}
                                className={`flex items-center w-full px-3 py-1 rounded text-white hover:bg-gray-700 transition-colors ${
                                  playlistMode === 'sequential' ? 'bg-orange-500' : ''
                                }`}
                              >
                                <FaListOl className="mr-2" />
                                <div className="text-left">
                                  <div>Sequential</div>
                                  <div className="text-xs text-gray-400">Auto-play 1→2→3</div>
                                </div>
                              </button>
                              <button
                                onClick={() => setPlaylistMode('random')}
                                className={`flex items-center w-full px-3 py-1 rounded text-white hover:bg-gray-700 transition-colors ${
                                  playlistMode === 'random' ? 'bg-orange-500' : ''
                                }`}
                              >
                                <FaRandom className="mr-2" />
                                <div className="text-left">
                                  <div>Random</div>
                                  <div className="text-xs text-gray-400">Auto-play random</div>
                                </div>
                              </button>
                              <button
                                onClick={() => setPlaylistMode('loop')}
                                className={`flex items-center w-full px-3 py-1 rounded text-white hover:bg-gray-700 transition-colors ${
                                  playlistMode === 'loop' ? 'bg-orange-500' : ''
                                }`}
                              >
                                <FaRedo className="mr-2" />
                                <div className="text-left">
                                  <div>Loop All</div>
                                  <div className="text-xs text-gray-400">1→2→3→1→2...</div>
                                </div>
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Fullscreen */}
                        <button
                          onClick={toggleFullscreen}
                          className="text-white hover:text-orange-400 transition-colors duration-300 p-2 rounded-full hover:bg-white/10"
                        >
                          <FaExpand className="text-xl" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Play/Pause Overlay */}
                  {!isPlaying && !isLoadingNextVideo && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center cursor-pointer"
                      onClick={togglePlay}
                    >
                      <div className="w-24 h-24 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-all duration-300 hover:scale-110">
                        <FaPlay className="text-white text-4xl ml-2" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Video Playlist Sidebar */}
            {modalContent.type === 'video' && showPlaylist && (
              <div className="lg:w-80 border-l border-gray-200 overflow-hidden flex flex-col">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">Solution Playlist</h4>
                      <div className="flex items-center mt-1">
                        <span className="text-sm text-gray-600">
                          {watchedVideos.size} of {modalContent.videoUrls.length} completed
                        </span>
                        <span className="mx-2">•</span>
                        <span className="text-sm text-blue-600 font-medium">
                          {playlistMode === 'sequential' ? 'Sequential Auto-play' : 
                           playlistMode === 'random' ? 'Random Auto-play' : 'Loop Auto-play'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowPlaylist(false)}
                      className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      <FaTimes />
                    </button>
                  </div>
                  
                  {/* Auto-play Info Banner */}
                  <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <div className="flex items-start">
                      <div className="bg-blue-500 p-2 rounded-lg mr-3">
                        <FaPlay className="text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-blue-800 mb-1">Auto-play Sequence Active</div>
                        <div className="text-sm text-blue-700">
                          {playlistMode === 'sequential' 
                            ? 'Solutions will play automatically from 1 to ' + modalContent.videoUrls.length
                            : playlistMode === 'random'
                            ? 'Solutions will play in random order automatically'
                            : 'Solutions will loop continuously'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Controls */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => skipToVideo(0)}
                        className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors flex items-center"
                      >
                        <FaStepBackward className="mr-1" />
                        First
                      </button>
                      <button
                        onClick={() => skipToVideo(modalContent.videoUrls.length - 1)}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
                      >
                        Last
                        <FaStepForward className="ml-1" />
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setWatchedVideos(new Set());
                        skipToVideo(0);
                      }}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center"
                    >
                      <FaRedo className="mr-1" />
                      Reset All
                    </button>
                  </div>
                </div>
                
                {/* Playlist Items */}
                <div className="flex-1 overflow-y-auto">
                  {modalContent.videoUrls.map((url, index) => {
                    const isWatched = watchedVideos.has(url);
                    const isCurrent = currentVideoIndex === index;
                    const isNextInSequence = 
                      playlistMode === 'sequential' && 
                      index === currentVideoIndex + 1;
                    const isNext = nextVideoIndex === index || 
                      (isNextInSequence && !isLoadingNextVideo);
                    
                    return (
                      <div
                        key={index}
                        className={`flex items-center p-4 border-b border-gray-100 cursor-pointer transition-all duration-200 ${
                          isCurrent
                            ? 'bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-l-orange-500'
                            : isNext
                            ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-l-blue-400'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => skipToVideo(index)}
                      >
                        <div className="mr-3 relative">
                          {isWatched ? (
                            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                              <FaCheck className="text-white" />
                            </div>
                          ) : isCurrent ? (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center shadow-lg animate-pulse">
                              {isPlaying ? (
                                <div className="flex space-x-1">
                                  <div className="w-1 h-3 bg-white animate-pulse rounded"></div>
                                  <div className="w-1 h-3 bg-white animate-pulse rounded" style={{animationDelay: '0.2s'}}></div>
                                  <div className="w-1 h-3 bg-white animate-pulse rounded" style={{animationDelay: '0.4s'}}></div>
                                </div>
                              ) : (
                                <FaPlay className="text-white text-sm" />
                              )}
                            </div>
                          ) : isNext ? (
                            <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center shadow-lg">
                              <FaStepForward className="text-white" />
                              {isLoadingNextVideo && (
                                <div className="absolute inset-0 rounded-full border-2 border-blue-300 border-t-transparent animate-spin"></div>
                              )}
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-700 font-semibold">{index + 1}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`font-semibold truncate ${
                              isCurrent ? 'text-orange-700' : 
                              isNext ? 'text-blue-700' : 'text-gray-800'
                            }`}>
                              Solution {index + 1}
                            </span>
                            <div className="flex items-center space-x-2">
                              {isCurrent && (
                                <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full font-bold">
                                  NOW PLAYING
                                </span>
                              )}
                              {isNext && !isCurrent && (
                                <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                                  NEXT
                                </span>
                              )}
                              {isWatched && !isCurrent && (
                                <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                                  COMPLETED
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center mt-1">
                            {isWatched ? (
                              <span className="text-xs text-green-600 flex items-center">
                                <FaCheck className="mr-1" />
                                Watched
                              </span>
                            ) : isNext ? (
                              <span className="text-xs text-blue-600 flex items-center">
                                <FaStepForward className="mr-1" />
                                Auto-plays next
                              </span>
                            ) : index < currentVideoIndex ? (
                              <span className="text-xs text-gray-500">Skipped</span>
                            ) : (
                              <span className="text-xs text-gray-500">Not started</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Playlist Summary Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-3 text-sm mb-4">
                    <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                      <div className="font-bold text-orange-600 text-xl">{currentVideoIndex + 1}</div>
                      <div className="text-gray-600 text-xs uppercase tracking-wide">Current</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                      <div className="font-bold text-blue-600 text-xl">
                        {displayNextIndex !== null ? displayNextIndex + 1 : '—'}
                      </div>
                      <div className="text-gray-600 text-xs uppercase tracking-wide">Next</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                      <div className="font-bold text-green-600 text-xl">{watchedVideos.size}</div>
                      <div className="text-gray-600 text-xs uppercase tracking-wide">Completed</div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Overall Progress</span>
                      <span>{Math.round((watchedVideos.size / modalContent.videoUrls.length) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500"
                        style={{ width: `${(watchedVideos.size / modalContent.videoUrls.length) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 text-center">
                      {modalContent.videoUrls.length - watchedVideos.size} solutions remaining
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Show Playlist Button (when hidden) */}
            {modalContent.type === 'video' && !showPlaylist && (
              <button
                onClick={() => setShowPlaylist(true)}
                className="absolute right-4 top-24 bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-l-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-lg flex flex-col items-center"
              >
                <FaListOl className="text-xl mb-1" />
                <span className="text-xs">Show</span>
                <span className="text-xs">Playlist</span>
              </button>
            )}
          </div>

          {/* Modal Footer */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-3 md:mb-0">
                <div className="text-sm text-gray-600">
                  {modalContent.type === 'pdf' 
                    ? 'This is a free preview. Enroll to access all PDF resources.' 
                    : (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">Auto-play Sequence:</span>
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          Solution {currentVideoIndex + 1} → {displayNextIndex !== null ? `Solution ${displayNextIndex + 1}` : 'Complete'}
                        </span>
                        <span className="mx-1">•</span>
                        <span>Mode: <span className="font-medium">{playlistMode.charAt(0).toUpperCase() + playlistMode.slice(1)}</span></span>
                      </div>
                    )}
                </div>
                {modalContent.type === 'video' && (
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <FaVideo className="mr-1" />
                    <span>
                      {playlistMode === 'sequential' 
                        ? 'Solutions auto-play from start to end automatically' 
                        : playlistMode === 'random' 
                        ? 'Solutions auto-play in random order' 
                        : 'Solutions loop continuously from end to start'}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3">
                {modalContent.type === 'video' && (
                  <>
                    <button
                      onClick={() => {
                        setCurrentVideoIndex(0);
                        setVideoKey(prev => prev + 1);
                        setIsPlaying(true);
                        setWatchedVideos(new Set());
                      }}
                      className="px-4 py-2 text-sm bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 rounded-lg hover:from-gray-300 hover:to-gray-400 transition-all duration-300 flex items-center shadow-sm"
                    >
                      <FaRedo className="mr-2" />
                      Restart All
                    </button>
                    <button
                      onClick={nextVideo}
                      disabled={currentVideoIndex === modalContent.videoUrls.length - 1 && playlistMode !== 'loop' && playlistMode !== 'random'}
                      className={`px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg transition-all duration-300 flex items-center shadow-sm ${
                        (currentVideoIndex === modalContent.videoUrls.length - 1 && playlistMode !== 'loop' && playlistMode !== 'random')
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:from-blue-600 hover:to-blue-700'
                      }`}
                    >
                      <FaStepForward className="mr-2" />
                      Skip to Next
                    </button>
                  </>
                )}
                
                {modalContent.type === 'pdf' && (
                  <a
                    href={modalContent.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all duration-300 flex items-center shadow-sm"
                  >
                    <FaFilePdf className="mr-2" />
                    Open Full PDF
                  </a>
                )}
                
                <button
                  onClick={closeModal}
                  className="px-6 py-2 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white rounded-lg font-medium transition-all duration-300 shadow-sm"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Video/PDF Modal */}
      <Modal />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-orange-50 to-orange-100 py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to <span className="text-orange-600">ATUT</span> Learning Platform
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-3xl mx-auto">
            Master engineering concepts with interactive video solutions and comprehensive courses
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center bg-white px-6 py-3 rounded-full shadow-lg">
              <FaVideo className="text-orange-500 text-2xl mr-3" />
              <span className="text-gray-800 font-semibold">Auto-play Video Solutions</span>
            </div>
            <div className="flex items-center bg-white px-6 py-3 rounded-full shadow-lg">
              <FaGraduationCap className="text-orange-500 text-2xl mr-3" />
              <span className="text-gray-800 font-semibold">Expert Instructors</span>
            </div>
            <div className="flex items-center bg-white px-6 py-3 rounded-full shadow-lg">
              <FaPlay className="text-orange-500 text-2xl mr-3" />
              <span className="text-gray-800 font-semibold">Interactive Previews</span>
            </div>
          </div>
        </div>
      </section>

      {/* Video Features Banner */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center mb-2 md:mb-0">
              <FaPlay className="text-xl mr-3 animate-pulse" />
              <div>
                <span className="font-bold text-lg">Enhanced Video Player!</span>
                <span className="text-sm ml-3 opacity-90">Auto-play • Playlist • Progress Tracking</span>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <span className="flex items-center">
                <FaCheck className="mr-1" /> Sequential Play
              </span>
              <span className="flex items-center">
                <FaRandom className="mr-1" /> Random Mode
              </span>
              <span className="flex items-center">
                <FaRedo className="mr-1" /> Loop All
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Courses Section */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-3 bg-orange-100 rounded-full mb-4">
              <FaBook className="text-orange-600 text-2xl" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Featured Courses</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Experience our enhanced video player with auto-play, playlists, and progress tracking
            </p>
          </div>

          <div className="space-y-8">
            {courses.map((course) => {
              const chapterStatus = getChapterStatus(course.id);
              const isCourseExpanded = expandedCourse === course.id;
              
              return (
                <div key={course.id} className="group">
                  <div 
                    className="bg-white rounded-2xl shadow-xl overflow-hidden border border-orange-100 hover:shadow-2xl transition-all duration-300"
                  >
                    <div 
                      className="p-8 cursor-pointer hover:bg-orange-50/50 transition-colors duration-300"
                      onClick={() => toggleCourse(course.id)}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-4">
                            <div className="bg-orange-100 p-3 rounded-lg mr-4 group-hover:bg-orange-200 transition-colors duration-300">
                              <FaGraduationCap className="text-orange-600 text-2xl" />
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold text-gray-900 group-hover:text-orange-700 transition-colors duration-300">
                                {course.subject}
                              </h3>
                              <div className="flex flex-wrap items-center mt-2 gap-4">
                                <span className="flex items-center text-gray-600">
                                  <FaClock className="mr-2 text-orange-500" />
                                  {formatTimestamp(course.timestamp)}
                                </span>
                                <span className="flex items-center text-gray-600">
                                  <FaTag className="mr-2 text-orange-500" />
                                  Chapter {course.chapter}
                                </span>
                                <span className="flex items-center text-blue-600 font-medium">
                                  <FaVideo className="mr-2" />
                                  Enhanced Video Player
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 mt-4 md:mt-0">
                          <div className="text-right">
                            <div className="flex items-center">
                              <span className="text-3xl font-bold text-orange-600">₹{course.offerprice}</span>
                              <span className="text-lg text-gray-400 line-through ml-2">₹{course.price}</span>
                            </div>
                            <span className="text-sm text-green-600 font-semibold">
                              Save ₹{course.price - course.offerprice}
                            </span>
                          </div>
                          <a href="/register" className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-300 flex items-center">
                            <FaShoppingCart className="mr-2" />
                            Enroll Now
                          </a>
                          <div className="text-orange-600 transform transition-transform duration-300 group-hover:scale-110">
                            {isCourseExpanded ? 
                              <FaChevronUp className="text-2xl" /> : 
                              <FaChevronDown className="text-2xl" />
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Syllabus Section */}
                    {isCourseExpanded && (
                      <div className="border-t border-orange-200">
                        <div className="bg-orange-50 px-8 py-6">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center">
                              <FaListAlt className="text-orange-600 text-xl mr-3" />
                              <h4 className="text-xl font-bold text-gray-900">Course Syllabus</h4>
                              <span className="ml-4 px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-sm font-medium">
                                {course.topics?.length || 0} Topics
                              </span>
                              <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                                <FaVideo className="inline mr-1" /> Enhanced Player
                              </span>
                            </div>
                            {course.topics && course.topics.length > 0 && (
                              <div className="flex items-center space-x-3">
                                {!chapterStatus.allExpanded && (
                                  <button 
                                    onClick={(e) => expandAllChapters(course.id, e)}
                                    className="flex items-center text-sm text-orange-600 hover:text-orange-700 font-medium px-3 py-2 bg-white rounded-lg border border-orange-200 hover:bg-orange-50 transition-colors duration-300"
                                  >
                                    <FaPlus className="mr-2" />
                                    Expand All
                                  </button>
                                )}
                                {!chapterStatus.allCollapsed && (
                                  <button 
                                    onClick={(e) => collapseAllChapters(course.id, e)}
                                    className="flex items-center text-sm text-gray-600 hover:text-gray-700 font-medium px-3 py-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-300"
                                  >
                                    <FaMinus className="mr-2" />
                                    Collapse All
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-4">
                            {course.topics && course.topics.map((topic, topicIndex) => {
                              const chapterKey = `${course.id}-${topicIndex}`;
                              const isChapterExpanded = expandedChapters[chapterKey];
                              
                              return (
                                <div key={topicIndex} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:border-orange-200 transition-all duration-300">
                                  <div 
                                    className="p-6 cursor-pointer hover:bg-orange-50/30 transition-colors duration-300"
                                    onClick={(e) => toggleChapter(course.id, topicIndex, e)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 transition-colors duration-300 ${
                                          isChapterExpanded ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-600'
                                        }`}>
                                          <span className="font-bold">{topicIndex + 1}</span>
                                        </div>
                                        <div>
                                          <h5 className="text-lg font-semibold text-gray-900 mb-1">{topic.name}</h5>
                                          <div className="flex items-center text-sm text-gray-500">
                                            <span className="flex items-center mr-4">
                                              <FaFilePdf className="mr-1 text-red-400" />
                                              {topic.resources?.filter(r => r.resourceType === 'pdf').length || 0} PDFs
                                            </span>
                                            <span className="flex items-center">
                                              <FaVideo className="mr-1 text-blue-400" />
                                              {topic.resources?.filter(r => r.resourceType === 'video').length || 0} Videos
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center">
                                        {topic.resources && topic.resources.some(r => r.fileUrls && r.fileUrls.length > 0) && (
                                          <span className="mr-4 px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs font-medium">
                                            Enhanced Preview
                                          </span>
                                        )}
                                        <div className={`transform transition-transform duration-300 ${
                                          isChapterExpanded ? 'rotate-180' : ''
                                        }`}>
                                          <FaChevronDown className="text-orange-500" />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Expanded Chapter Content */}
                                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                    isChapterExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                                  }`}>
                                    <div className="p-6 pt-0">
                                      <div className="mt-4 pl-14">
                                        {topic.resources && topic.resources.length > 0 ? (
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {topic.resources.map((resource, resIndex) => {
                                              const isFree = isFreeResource(topic, resIndex);
                                              const hasFileUrls = resource.fileUrls && resource.fileUrls.length > 0;
                                              
                                              return (
                                                <div key={resIndex} className={`rounded-lg p-4 transition-all duration-300 border ${
                                                  isFree 
                                                    ? 'bg-blue-50 border-blue-200 hover:border-blue-300 hover:shadow-sm' 
                                                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                                }`}>
                                                  <div className="flex items-start mb-2">
                                                    {resource.resourceType === 'pdf' ? (
                                                      <div className={`p-2 rounded-lg mr-3 ${
                                                        isFree ? 'bg-red-100' : 'bg-red-50'
                                                      }`}>
                                                        <FaFilePdf className={`text-xl ${
                                                          isFree ? 'text-red-500' : 'text-red-400'
                                                        }`} />
                                                      </div>
                                                    ) : (
                                                      <div className={`p-2 rounded-lg mr-3 ${
                                                        isFree ? 'bg-blue-100' : 'bg-blue-50'
                                                      }`}>
                                                        <FaVideo className={`text-xl ${
                                                          isFree ? 'text-blue-500' : 'text-blue-400'
                                                        }`} />
                                                      </div>
                                                    )}
                                                    <div className="flex-1">
                                                      <div className="flex items-center justify-between">
                                                        <h6 className="font-semibold text-gray-900 mb-1">
                                                          {resource.title || `Resource ${resIndex + 1}`}
                                                        </h6>
                                                        {isFree && hasFileUrls && (
                                                          <span className="flex items-center text-blue-600 text-xs font-medium">
                                                            <FaPlay className="mr-1" /> ENHANCED PREVIEW
                                                          </span>
                                                        )}
                                                        {!isFree && (
                                                          <span className="flex items-center text-gray-500 text-xs font-medium">
                                                            <FaLock className="mr-1" /> LOCKED
                                                          </span>
                                                        )}
                                                      </div>
                                                      <div className="flex items-center text-sm text-gray-600">
                                                        <span className="mr-4">
                                                          {resource.resourceType === 'pdf' ? 'PDF Document' : 'Video Tutorial'}
                                                        </span>
                                                        {resource.fileUrls && resource.fileUrls.length > 0 && (
                                                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                            isFree 
                                                              ? 'bg-blue-100 text-blue-600' 
                                                              : 'bg-gray-100 text-gray-600'
                                                          }`}>
                                                            {resource.fileUrls.length} file{resource.fileUrls.length !== 1 ? 's' : ''}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                  
                                                  {/* Free Preview Button - PDF */}
                                                  {isFree && hasFileUrls && resource.resourceType === 'pdf' && (
                                                    <button
                                                      onClick={() => openPDFModal(resource.fileUrls[0], resource.title || `PDF Preview - ${topic.name}`)}
                                                      className="mt-3 w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-300 flex items-center justify-center"
                                                    >
                                                      <FaEye className="mr-2" />
                                                      View PDF Preview
                                                    </button>
                                                  )}
                                                  
                                                  {/* Free Preview Button - Video */}
                                                  {isFree && hasFileUrls && resource.resourceType === 'video' && (
                                                    <button
                                                      onClick={() => openVideoModal(resource.fileUrls, resource.title || `Video Preview - ${topic.name}`)}
                                                      className="mt-3 w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-300 flex items-center justify-center"
                                                    >
                                                      <FaPlay className="mr-2" />
                                                      Watch Enhanced Preview
                                                      <span className="ml-2 text-xs bg-white/30 px-2 py-1 rounded">Auto-play</span>
                                                    </button>
                                                  )}
                                                  
                                                  {/* Numerical Problems */}
                                                  {resource.numericals && resource.numericals.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                                      <h6 className="font-medium text-gray-900 mb-2">Numerical Problems:</h6>
                                                      <div className="space-y-2">
                                                        {resource.numericals.map((numerical, numIndex) => {
                                                          const isFreeNum = isFreeNumerical(resource, numIndex);
                                                          const hasNumericalFiles = numerical.numericalFileUrls && numerical.numericalFileUrls.length > 0;
                                                          
                                                          return (
                                                            <div key={numIndex} className={`flex items-center p-2 rounded border ${
                                                              isFreeNum 
                                                                ? 'bg-blue-50 border-blue-200' 
                                                                : 'bg-white border-gray-100'
                                                            } hover:bg-gray-50 transition-colors duration-300`}>
                                                              <FaVideo className={`text-sm mr-2 ${
                                                                isFreeNum ? 'text-blue-500' : 'text-blue-400'
                                                              }`} />
                                                              <span className="text-sm text-gray-700 flex-1">{numerical.numericalTitle}</span>
                                                              <div className="flex items-center space-x-2">
                                                                {numerical.numericalFileUrls && (
                                                                  <span className={`text-xs px-2 py-1 rounded ${
                                                                    isFreeNum 
                                                                      ? 'bg-blue-100 text-blue-600' 
                                                                      : 'bg-blue-100 text-blue-600'
                                                                  }`}>
                                                                    {numerical.numericalFileUrls.length} solution{numerical.numericalFileUrls.length !== 1 ? 's' : ''}
                                                                  </span>
                                                                )}
                                                                {isFreeNum && hasNumericalFiles && (
                                                                  <button
                                                                    onClick={() => openVideoModal(numerical.numericalFileUrls, numerical.numericalTitle || `Solution Preview`)}
                                                                    className="text-xs bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-2 py-1 rounded flex items-center"
                                                                  >
                                                                    <FaPlay className="mr-1" /> Auto-play
                                                                  </button>
                                                                )}
                                                                {!isFreeNum && (
                                                                  <span className="text-xs text-gray-500 flex items-center">
                                                                    <FaLock className="mr-1" /> Locked
                                                                  </span>
                                                                )}
                                                              </div>
                                                            </div>
                                                          );
                                                        })}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                                            No resources available for this topic yet.
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          {(!course.topics || course.topics.length === 0) && (
                            <div className="text-center py-8 text-gray-500 bg-white rounded-xl">
                              Syllabus details are being updated. Check back soon!
                            </div>
                          )}
                        </div>

                        {/* Buy Course Section */}
                        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-8 text-white">
                          <div className="flex flex-col md:flex-row items-center justify-between">
                            <div className="mb-6 md:mb-0 md:mr-8">
                              <h4 className="text-2xl font-bold mb-2">Ready to Master {course.subject}?</h4>
                              <p className="text-orange-100 mb-4">
                                Unlock all enhanced video solutions with auto-play and progress tracking
                              </p>
                              <div className="flex flex-wrap items-center gap-6">
                                <div className="text-center">
                                  <div className="text-3xl font-bold">{course.topics?.length || 0}</div>
                                  <div className="text-sm text-orange-200">Topics</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-3xl font-bold">
                                    <FaVideo className="inline mr-1" />
                                    {course.topics?.reduce((acc, topic) => {
                                      return acc + (topic.resources?.filter(r => r.resourceType === 'video').length || 0);
                                    }, 0) || 0}
                                  </div>
                                  <div className="text-sm text-orange-200">Video Solutions</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-3xl font-bold">
                                    {course.topics?.reduce((acc, topic) => 
                                      acc + (topic.resources?.length || 0), 0) || 0}
                                  </div>
                                  <div className="text-sm text-orange-200">Total Resources</div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-center">
                              <div className="mb-4">
                                <div className="text-5xl font-bold mb-1">₹{course.offerprice}</div>
                                <div className="text-orange-200 line-through">₹{course.price}</div>
                                <div className="text-sm text-orange-200 mt-1">One-time payment. Lifetime access.</div>
                              </div>
                              <button className="bg-white text-orange-600 hover:bg-gray-100 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center">
                                <FaShoppingCart className="mr-3 text-xl" />
                                Unlock Enhanced Access
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {courses.length === 0 && (
              <div className="text-center py-12">
                <div className="bg-white rounded-2xl p-12 max-w-2xl mx-auto shadow-lg">
                  <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FaBook className="text-orange-500 text-3xl" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">No Courses Available Yet</h3>
                  <p className="text-gray-600 mb-6">
                    We're preparing enhanced courses with auto-play video solutions. Check back soon!
                  </p>
                  <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-300">
                    Get Notified When New Courses Launch
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Video Features Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Enhanced Video Player Features</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Experience seamless learning with our advanced video solution player
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg text-center hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaPlay className="text-blue-500 text-2xl" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Auto-Play Sequence</h4>
              <p className="text-gray-600">
                Solutions automatically play one after another, creating a seamless learning flow
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg text-center hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaListOl className="text-purple-500 text-2xl" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Smart Playlist</h4>
              <p className="text-gray-600">
                Track progress, mark watched videos, and jump to any solution instantly
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg text-center hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaRandom className="text-orange-500 text-2xl" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Multiple Modes</h4>
              <p className="text-gray-600">
                Choose from Sequential, Random, or Loop modes based on your learning style
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg text-center hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaCheck className="text-green-500 text-2xl" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Progress Tracking</h4>
              <p className="text-gray-600">
                Visual progress bar shows how many solutions you've completed in each playlist
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h5 className="text-2xl font-bold mb-4">
              <span className="text-orange-400">ATUT</span> Learning Platform
            </h5>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Empowering engineering students with enhanced video solutions and comprehensive courses.
              Experience seamless auto-play and progress tracking.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <a href="#" className="text-gray-400 hover:text-orange-400 transition-colors duration-300">
                Terms of Service
              </a>
              <a href="#" className="text-gray-400 hover:text-orange-400 transition-colors duration-300">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-400 hover:text-orange-400 transition-colors duration-300">
                Contact Us
              </a>
              <a href="#" className="text-gray-400 hover:text-orange-400 transition-colors duration-300">
                Video Features
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;