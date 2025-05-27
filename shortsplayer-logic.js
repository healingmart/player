// GitHub의 "healingmart/player" 레포지토리 내 "shortsplayer-logic.js" 파일의 내용
// 이 파일은 "video-data.js" 파일이 먼저 로드된 후에 로드되어야 합니다.

const HealingK = {
  state: {
    currentCategoryIndex: 0, currentVideoIndex: 0, isMuted: true,
    isShuffled: false, isRepeated: false, isPanelVisible: false,
    panelMode: 'thumbnail', player: null, isPlayerReady: false,
    bookmarkedVideos: [], searchQuery: '', searchResults: [], searchSort: 'latest',
    isInitialized: false, soundEnabled: false,
    uiVisible: true, uiTimeout: null, panelCloseTimeout: null, openedByHover: false,
    isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    isGridLayingOut: false,
    isTransitioning: false,
    isHelpModalVisible: false,
    isShareModalVisible: false,
    messageTimeout: null,
    centerPlayPauseVisible: false,
    centerPlayPauseTimeout: null,
    centerMuteStatusVisible: false,
    centerMuteStatusTimeout: null,
    originalVolume: 100, // 페이드 아웃 시작 전 볼륨 저장용 (기존 용도 유지)
    uiAutoTimeoutDuration: 3000,
    recentSearches: [],
    isDraggingProgressBar: false, // 진행바 드래그 상태 추가
    // --- 페이드 아웃 관련 상태 추가 ---
    fadeoutIntervalId: null,
    isFadingOut: false,
    volumeBeforeFade: 100 // 페이드 아웃 직전 볼륨 저장
    // --- 페이드 아웃 관련 상태 추가 끝 ---
  },
  elements: {},
  init() {
    this.utils.setScreenSize();
    this.cacheElements();
    this.state.bookmarkedVideos = this.utils.loadFromStorage('hk-bookmarks', []);
    this.state.recentSearches = this.utils.loadFromStorage('hk-recent-searches', []);
    this.setupEventListeners();
    this.setupAdvancedDragScroll();
    this.setupAutoHideUI();
    this.progressBar.init();
    this.startPlayer();
    if (this.elements.hkHelpMoreLink) {
        this.elements.hkHelpMoreLink.href = HELP_MORE_URL; // HELP_MORE_URL은 video-data.js에서 정의
    }
  },
  cacheElements() {
    const ids = [
        'healingk-player-root', 'hk-category-tabs', 'hk-youtube-embed', 'hk-touch-overlay',
        'hk-indicator', 'hk-side-panel', 'hk-content-grid', 'hk-grid-container',
        'hk-loading', 'hk-search-input', 'hk-search-elements', 'hk-search-clear',
        'hk-panel-title', 'hk-panel-close', 'hk-sound-toggle', 'hk-help-modal',
        'hk-help-close', 'hk-share-modal', 'hk-share-close', 'hk-share-url',
        'hk-share-copy', 'hk-share-native', 'hk-message-box', 'hk-center-play-pause',
        'hk-center-mute-status', 'hk-help-more-link', 'hk-recent-searches',
        'hk-my-album-controls', 'hk-clear-all-bookmarks',
        'hk-nav-play-pause',
        'hk-mouse-trigger-right',
        'hk-progress-bar-container',
        'hk-progress-bar-fill',
        'hk-progress-bar-tooltip',
        'hk-video-placeholder'
    ];
    ids.forEach(id => {
        const camelCaseId = id.replace(/-(\w)/g, (match, letter) => letter.toUpperCase());
        const element = document.getElementById(id);
        if (element) {
            this.elements[camelCaseId] = element;
        }
    });
    this.elements.body = document.body;
  },
  startPlayer() {
    if (this.state.isInitialized) return;
    this.utils.setScreenSize();
    this.ui.renderCategoryTabs();
    this.ui.updateBottomNav();
    this.search.performSearch('');
    this.controller.loadCurrentVideo('none');
    this.state.isInitialized = true;
  },
  setupEventListeners() {
    // --- 기존 EventListeners 코드 (변경 없음) ---
    if (!this.state.isTouchDevice) {
        document.addEventListener('keydown', (e) => {
          if (this.state.isPanelVisible && this.elements.hkSearchInput && document.activeElement === this.elements.hkSearchInput) return;
          if (this.state.isHelpModalVisible && e.key === 'Escape') { this.ui.toggleHelpModal(); e.preventDefault(); return; }
          if (this.state.isShareModalVisible && e.key === 'Escape') { this.ui.toggleShareModal(); e.preventDefault(); return; }
           if (this.state.isPanelVisible && e.key === 'Escape') { this.ui.togglePanel(); e.preventDefault(); return; }

          const keyActionMap = {
            'Space': () => this.controller.togglePlayPause(),
            'ArrowUp': () => this.controller.playPrevVideoWithAnimation(),
            'ArrowDown': () => this.controller.playNextVideoWithAnimation(),
            'ArrowLeft': () => this.controller.prevCategory(),
            'ArrowRight': () => this.controller.nextCategory(),
            'm': () => this.controller.toggleMute(),
            'b': () => this.controller.toggleBookmark(),
            's': () => { this.state.openedByHover = false; this.ui.togglePanel('search'); },
          };
          const action = keyActionMap[e.key.toLowerCase() === ' ' ? 'Space' : e.key] || keyActionMap[e.code];

          if (action) {
            if (HealingK.state.isTransitioning && e.key !== 'Escape') {
                 return;
            }
            e.preventDefault();
            action();
          }
        });
    }

    document.querySelectorAll('.hk-bottom-nav .hk-nav-btn').forEach(btn => {
        this.utils.addTapListener(btn, (e) => {
            if (this.elements.hkSearchInput) this.elements.hkSearchInput.blur();
            const id = btn.id;
        if (HealingK.state.isTransitioning && !['hk-nav-back-to-blog', 'hk-nav-help', 'hk-nav-share', 'hk-nav-home'].includes(id)) {
            return;
        }
            if (id === 'hk-nav-back-to-blog') this.controller.goToBlogPost();
            else if (id === 'hk-nav-home') this.controller.goHome();
            else if (id === 'hk-nav-search') { this.state.openedByHover = false; this.ui.togglePanel('search'); }
            else if (id === 'hk-nav-volume') this.controller.toggleMute();
            else if (id === 'hk-nav-play-pause') this.controller.togglePlayPause();
            else if (id === 'hk-nav-bookmark') this.controller.toggleBookmark();
            else if (id === 'hk-nav-help') this.ui.toggleHelpModal();
            else if (id === 'hk-nav-share') this.ui.toggleShareModal();
        });
    });

    if (this.elements.hkSoundToggle) this.utils.addTapListener(this.elements.hkSoundToggle, () => this.controller.enableSound());
    if (this.elements.hkPanelClose) this.utils.addTapListener(this.elements.hkPanelClose, () => { this.state.openedByHover = false; this.ui.togglePanel(); });
    if (this.elements.hkHelpClose) this.utils.addTapListener(this.elements.hkHelpClose, () => this.ui.toggleHelpModal());
    if (this.elements.hkShareClose) this.utils.addTapListener(this.elements.hkShareClose, () => this.ui.toggleShareModal());
    if (this.elements.hkShareCopy) this.utils.addTapListener(this.elements.hkShareCopy, () => HealingK.share.copyToClipboard());
    if (this.elements.hkShareNative) this.utils.addTapListener(this.elements.hkShareNative, () => HealingK.share.nativeShare());

    const debouncedSearch = this.utils.debounce((query) => {
        this.search.performSearch(query);
        if (query.trim()) {
             this.search.addRecentSearch(query.trim());
        }
    }, 300);

    if (this.elements.hkSearchInput) {
        this.elements.hkSearchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
            if (this.elements.hkSearchClear) this.elements.hkSearchClear.style.display = e.target.value.length > 0 ? 'block' : 'none';
             this.ui.toggleRecentSearches(false);
        });
        this.elements.hkSearchInput.addEventListener('focus', () => {
             this.ui.renderRecentSearches();
             this.ui.toggleRecentSearches(true);
        });
         this.elements.hkSearchInput.addEventListener('blur', () => {
             setTimeout(() => {
                 this.ui.toggleRecentSearches(false);
             }, 200);
         });
    }
    if (this.elements.hkSearchClear) {
        this.utils.addTapListener(this.elements.hkSearchClear, () => {
            if (this.elements.hkSearchInput) {
                this.elements.hkSearchInput.value = '';
                this.elements.hkSearchInput.dispatchEvent(new Event('input'));
                this.elements.hkSearchInput.focus();
            }
        });
    }
    document.querySelectorAll('.hk-sort-buttons .hk-sort-btn').forEach(btn => {
      this.utils.addTapListener(btn, () => {
        if (this.elements.hkSearchInput) this.elements.hkSearchInput.blur();
        document.querySelectorAll('.hk-sort-buttons .hk-sort-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.searchSort = btn.dataset.sort;
         if (this.elements.hkMyAlbumControls) {
             this.elements.hkMyAlbumControls.style.display = 'none';
         }
        const currentQuery = this.elements.hkSearchInput ? this.elements.hkSearchInput.value : '';
        this.search.performSearch(currentQuery);
      });
    });

    if (this.elements.hkSearchElements) {
        this.elements.hkSearchElements.addEventListener('click', (e) => {
            if (e.target.classList.contains('hk-recent-search-item')) {
                const searchTerm = e.target.textContent;
                if (this.elements.hkSearchInput) {
                    this.elements.hkSearchInput.value = searchTerm;
                    this.elements.hkSearchInput.dispatchEvent(new Event('input'));
                    this.elements.hkSearchInput.focus();
                }
                this.ui.toggleRecentSearches(false);
            }
        });
    }

     if (this.elements.hkClearAllBookmarks) {
         this.utils.addTapListener(this.elements.hkClearAllBookmarks, () => {
             if (confirm('MY앨범의 모든 영상을 삭제하시겠습니까?')) {
                 this.controller.clearAllBookmarks();
             }
         });
     }

    this.setupMouseHoverEvents();
    this.setupTouchEvents();

    window.addEventListener('resize', this.utils.debounce(() => {
        this.utils.setScreenSize();
        if (this.state.isPanelVisible && !this.state.isTouchDevice) this.ui.renderActiveGrid();
    }, 200));
     window.addEventListener('orientationchange', () => setTimeout(() => this.utils.setScreenSize(), 300));
     document.addEventListener('visibilitychange', () => {
         if (document.visibilityState === 'visible') setTimeout(() => this.utils.setScreenSize(), 300);
     });
     if (window.visualViewport) {
         window.visualViewport.addEventListener('resize', () => this.utils.setScreenSize());
     }
    // --- 기존 EventListeners 코드 끝 ---
  },
  setupMouseHoverEvents() {
    // --- 기존 코드 (변경 없음) ---
    if (this.state.isTouchDevice || !this.elements.hkSidePanel) return;
    const openPanelWithHover = (mode) => { if (!this.state.isPanelVisible || this.state.panelMode !== mode) { this.state.openedByHover = true; this.ui.togglePanel(mode); } clearTimeout(this.state.panelCloseTimeout); this.state.panelCloseTimeout = null; };
    const rightTrigger = document.querySelector('.hk-mouse-trigger-right');
    if (rightTrigger) rightTrigger.addEventListener('mouseenter', () => openPanelWithHover('search'));
    this.elements.hkSidePanel.addEventListener('mouseleave', () => { if (this.state.isPanelVisible && this.state.openedByHover) { this.state.panelCloseTimeout = setTimeout(() => { if (this.state.isPanelVisible && this.state.openedByHover) this.ui.togglePanel(); }, 300); } });
    this.elements.hkSidePanel.addEventListener('mouseenter', () => clearTimeout(this.state.panelCloseTimeout));
    // --- 기존 코드 끝 ---
  },
  setupTouchEvents() {
    // --- 기존 코드 (변경 없음) ---
    if (!this.elements.hkTouchOverlay || typeof Hammer === 'undefined') return;
    const hammer = new Hammer(this.elements.hkTouchOverlay);
    hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL, threshold: 30, velocity: 0.3 });

    hammer.on('swipeup', (e) => {
        if (!this.state.isPanelVisible && !this.state.isHelpModalVisible && !this.state.isShareModalVisible && !this.state.isTransitioning) {
            this.controller.playNextVideoWithAnimation();
        }
    });
    hammer.on('swipedown', (e) => {
        if (!this.state.isPanelVisible && !this.state.isHelpModalVisible && !this.state.isShareModalVisible && !this.state.isTransitioning) {
            this.controller.playPrevVideoWithAnimation();
        }
    });
    hammer.on('swipeleft', (e) => {
        if (!this.state.isPanelVisible && !this.state.isHelpModalVisible && !this.state.isShareModalVisible && !this.state.isTransitioning) {
            this.controller.prevCategory();
        }
    });
    hammer.on('swiperight', (e) => {
        if (!this.state.isPanelVisible && !this.state.isHelpModalVisible && !this.state.isShareModalVisible && !this.state.isTransitioning) {
            this.controller.nextCategory();
        }
    });

    this.utils.addTapListener(this.elements.hkTouchOverlay, (e) => {
        if (!this.state.isPanelVisible && !this.state.isHelpModalVisible && !this.state.isShareModalVisible) {
             HealingK.ui.toggleUI();
        }
    });
    // --- 기존 코드 끝 ---
  },
  setupAdvancedDragScroll(){
      // --- 기존 코드 (변경 없음) ---
      const setupDrag=(e)=>{if(!e)return;let t=!1,s,o,i=0,l=0,n=0;e.onmousedown=d=>{t=!0,e.classList.add("dragging"),s=d.pageY,o=e.scrollTop,i=0,l=Date.now(),n=d.pageY,d.preventDefault()},e.onmousemove=d=>{if(!t)return;d.preventDefault();const c=Date.now(),r=c-l,a=1.5*(s-d.pageY),h=o+a,p=d.pageY-n;r>0&&(i=p/r),e.scrollTop=Math.max(0,Math.min(h,e.scrollHeight-e.clientHeight)),l=c,n=d.pageY};const u=()=>{t&&(t=!1,e.classList.remove("dragging"),Math.abs(i)>.1&&this.animateInertiaScroll(e,i))};e.onmouseup=u,e.onmouseleave=u,document.onmouseup=u};
      if (!this.state.isTouchDevice && this.elements.hkGridContainer) setupDrag(this.elements.hkGridContainer);
      // --- 기존 코드 끝 ---
  },
  animateInertiaScroll(e,t){let i=t;const s=.95,o=.1,l=()=>{i*=s,Math.abs(i)<o||(e.scrollTop-=10*i,requestAnimationFrame(l))};requestAnimationFrame(l)},
  setupAutoHideUI(){
    // --- 기존 코드 (변경 없음) ---
    const showUI = ()=>{
      if(HealingK.state.isPanelVisible || HealingK.state.isHelpModalVisible || HealingK.state.isShareModalVisible || HealingK.state.isTransitioning) return;

      if(HealingK.elements.hkCategoryTabs) HealingK.elements.hkCategoryTabs.classList.add("visible");
      if(HealingK.elements.hkIndicator) HealingK.elements.hkIndicator.classList.add("visible");

      HealingK.state.uiVisible = true;
      clearTimeout(HealingK.state.uiTimeout);

      if (HealingK.state.player && HealingK.state.player.getPlayerState() === YT.PlayerState.PLAYING) {
        HealingK.state.uiTimeout = setTimeout(()=>{
          HealingK.ui.hideUI();
        }, HealingK.state.uiAutoTimeoutDuration);
      }
    };

    const hideUI = ()=>{
      if(HealingK.elements.hkCategoryTabs) HealingK.elements.hkCategoryTabs.classList.remove("visible");
      if(HealingK.elements.hkIndicator) HealingK.elements.hkIndicator.classList.remove("visible");

      HealingK.state.uiVisible = false;
      clearTimeout(HealingK.state.uiTimeout);
    };

    HealingK.ui.toggleUI = () => {
       if (HealingK.state.uiVisible) {
         hideUI();
       } else {
         showUI();
       }
    };

    document.addEventListener("mousemove", showUI);
    document.addEventListener("touchstart", showUI, { passive: true });

     setTimeout(() => showUI(), 500);

    HealingK.ui.showUI = showUI;
    HealingK.ui.hideUI = hideUI;
    // --- 기존 코드 끝 ---
  },

  // --- 오디오 페이드 아웃 관리 객체 추가 ---
  audioFadeout: {
      startMonitoring() {
          this.stopMonitoring(); // 기존 인터벌 정리
          const { player, soundEnabled, isMuted } = HealingK.state;

          if (player && typeof player.getVolume === 'function' && soundEnabled && !isMuted) {
              try {
                  // 페이드 시작 전 현재 볼륨 저장
                  HealingK.state.volumeBeforeFade = player.getVolume();
                  // 인터벌 시작
                  HealingK.state.fadeoutIntervalId = setInterval(this.checkFadeoutTime.bind(this), 100); // 100ms 마다 체크
              } catch (e) {
                  console.error("Error starting fadeout monitoring:", e);
                  this.stopMonitoring();
              }
          }
      },

      stopMonitoring(restoreVolume = true) {
          if (HealingK.state.fadeoutIntervalId) {
              clearInterval(HealingK.state.fadeoutIntervalId);
              HealingK.state.fadeoutIntervalId = null;
          }
          // 페이드 아웃 중이었다면 볼륨 복원 (옵션)
          if (HealingK.state.isFadingOut && restoreVolume) {
              const { player, isPlayerReady, volumeBeforeFade } = HealingK.state;
              if (player && isPlayerReady && typeof player.setVolume === 'function') {
                  try {
                      player.setVolume(volumeBeforeFade);
                  } catch (e) {
                      console.error("Error restoring volume after fadeout:", e);
                  }
              }
          }
          HealingK.state.isFadingOut = false;
      },

      checkFadeoutTime() {
          const { player, isMuted, soundEnabled, volumeBeforeFade } = HealingK.state;

          if (!player || typeof player.getCurrentTime !== 'function' || typeof player.getDuration !== 'function' || typeof player.getPlayerState !== 'function') {
              this.stopMonitoring(false); // 플레이어 접근 불가 시 모니터링 중단 (볼륨 복원 X)
              return;
          }

          try {
              const playerState = player.getPlayerState();
              // 재생 중이 아니거나, 음소거 상태거나, 사운드가 비활성화된 경우 모니터링 중단
              if (playerState !== YT.PlayerState.PLAYING || isMuted || !soundEnabled) {
                  this.stopMonitoring(false); // 볼륨 복원하지 않고 중단
                  return;
              }

              const currentTime = player.getCurrentTime();
              const duration = player.getDuration();
              const remainingTime = duration - currentTime;

              // 마지막 4초 구간 진입
              if (remainingTime <= 4 && remainingTime > 0) {
                  const fadeRatio = remainingTime / 4;
                  const targetVolume = volumeBeforeFade * fadeRatio;
                  player.setVolume(Math.max(0, targetVolume)); // 볼륨 0 미만 방지
                  HealingK.state.isFadingOut = true;
              }
              // 페이드 아웃 중이었으나, 구간을 벗어난 경우 (예: 뒤로 탐색)
              else if (HealingK.state.isFadingOut) {
                  player.setVolume(volumeBeforeFade); // 원래 볼륨으로 복원
                  HealingK.state.isFadingOut = false;
              }
          } catch (e) {
              console.error("Error during fadeout check:", e);
              this.stopMonitoring(false); // 에러 발생 시 모니터링 중단 (볼륨 복원 X)
          }
      }
  },
  // --- 오디오 페이드 아웃 관리 객체 추가 끝 ---

  progressBar: {
    // --- 기존 코드 (변경 없음) ---
    init() {
        this.setupEventListeners();
        this.updateTooltip(0, 0);
    },
    formatTime(totalSeconds) {
        totalSeconds = Math.max(0, totalSeconds);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const pad = (num) => String(num).padStart(2, '0');
        if (hours > 0) {
            return `${hours}:${pad(minutes)}:${pad(seconds)}`;
        }
        return `${pad(minutes)}:${pad(seconds)}`;
    },
    updateTooltip(currentTime, duration, event) {
        if (!HealingK.elements.hkProgressBarTooltip) return;
        let timeToShow = currentTime;
        let isHovering = event && event.type === 'mousemove';

        if (isHovering) {
            const progressBarRect = HealingK.elements.hkProgressBarContainer.getBoundingClientRect();
            const hoverX = event.clientX - progressBarRect.left;
            const hoverRatio = Math.max(0, Math.min(1, hoverX / progressBarRect.width));
            timeToShow = duration * hoverRatio;
            HealingK.elements.hkProgressBarTooltip.style.left = `${hoverX}px`;
            HealingK.elements.hkProgressBarTooltip.style.opacity = '1';
        } else {
            // 호버 중이 아닐 때는 숨김 (또는 현재 재생 시간 기준으로 위치 업데이트)
             const currentRatio = duration > 0 ? currentTime / duration : 0;
             const currentX = HealingK.elements.hkProgressBarContainer.offsetWidth * currentRatio;
             HealingK.elements.hkProgressBarTooltip.style.left = `${currentX}px`;
             HealingK.elements.hkProgressBarTooltip.style.opacity = '0'; // 기본 숨김
        }

        HealingK.elements.hkProgressBarTooltip.textContent = `${this.formatTime(timeToShow)} / ${this.formatTime(duration)}`;
    },
    setupEventListeners() {
        const container = HealingK.elements.hkProgressBarContainer;
        if (!container) return;

        const handleMouseMove = (event) => {
            const duration = HealingK.state.player?.getDuration() || 0;
            this.updateTooltip(HealingK.state.player?.getCurrentTime() || 0, duration, event);
        };

        const handleMouseLeave = () => {
            if (HealingK.elements.hkProgressBarTooltip) {
                HealingK.elements.hkProgressBarTooltip.style.opacity = '0';
            }
        };

        const handleMouseDown = (event) => {
            if (!HealingK.state.player || typeof HealingK.state.player.seekTo !== 'function') return;
            HealingK.state.isDraggingProgressBar = true;
            HealingK.ui.stopProgressBarUpdate(); // 드래그 시작 시 자동 업데이트 중지
            HealingK.audioFadeout.stopMonitoring(false); // 드래그 시작 시 페이드아웃 중지 (볼륨 복원 X)
            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('mouseup', handleMouseUp);
            this.seekVideo(event);
        };

        const handleDragMove = (event) => {
            if (!HealingK.state.isDraggingProgressBar) return;
            this.seekVideo(event);
        };

        const handleMouseUp = (event) => {
            if (!HealingK.state.isDraggingProgressBar) return;
            HealingK.state.isDraggingProgressBar = false;
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleMouseUp);
            this.seekVideo(event, true); // 마지막 위치로 이동
            // 드래그 종료 후, 플레이어 상태에 따라 업데이트/페이드아웃 재시작
            const playerState = HealingK.state.player?.getPlayerState();
            if (playerState === YT.PlayerState.PLAYING) {
                HealingK.ui.startProgressBarUpdate();
                HealingK.audioFadeout.startMonitoring();
            } else if (playerState === YT.PlayerState.PAUSED) {
                 // 일시정지 상태면 현재 시간으로 진행바/툴팁 업데이트
                 const currentTime = HealingK.state.player.getCurrentTime();
                 const duration = HealingK.state.player.getDuration();
                 if (duration > 0) {
                    const percentage = (currentTime / duration) * 100;
                    if(HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = percentage + '%';
                    this.updateTooltip(currentTime, duration);
                 }
            }
        };

        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseleave', handleMouseLeave);
        container.addEventListener('mousedown', handleMouseDown);
    },
    seekVideo(event, finalSeek = false) {
        const { player, isPlayerReady } = HealingK.state;
        const container = HealingK.elements.hkProgressBarContainer;
        if (!player || !isPlayerReady || !container || typeof player.seekTo !== 'function') return;

        const rect = container.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const width = rect.width;
        const ratio = Math.max(0, Math.min(1, x / width));
        const duration = player.getDuration();
        const seekTime = duration * ratio;

        if (duration > 0) {
            // 실시간 업데이트 (드래그 중)
            if(HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = (ratio * 100) + '%';
            this.updateTooltip(seekTime, duration, event);

            // 최종 이동 (mouseup 시)
            if (finalSeek) {
                player.seekTo(seekTime, true);
                // seekTo 이후 상태 변화를 기다려 페이드아웃 모니터링 시작
                // (onStateChange에서 PLAYING 상태가 되면 시작됨)
            }
        }
    }
    // --- 기존 코드 끝 ---
  },
  utils: {
    // --- 기존 코드 (변경 없음) ---
    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },
    addTapListener(element, callback) {
        if (!element) return;
        let startX, startY, startTime;
        const maxMove = 20; // 최대 이동 허용 거리 (px)
        const maxTime = 300; // 최대 시간 (ms)

        element.addEventListener('touchstart', (e) => {
            // 멀티터치 방지
            if (e.touches.length > 1) return;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            startTime = Date.now();
        }, { passive: true });

        element.addEventListener('touchend', (e) => {
            // 멀티터치 또는 다른 이유로 터치 종료 시 처리 안 함
            if (e.changedTouches.length > 1 || typeof startX === 'undefined') return;

            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const endTime = Date.now();

            const deltaX = Math.abs(endX - startX);
            const deltaY = Math.abs(endY - startY);
            const deltaTime = endTime - startTime;

            // 이동 거리가 짧고, 시간이 짧으면 탭으로 간주
            if (deltaX < maxMove && deltaY < maxMove && deltaTime < maxTime) {
                // 기본 동작(예: 더블탭 확대) 방지 및 콜백 실행
                // e.preventDefault(); // preventDefault는 passive:true와 함께 사용 불가. 필요 시 passive 제거.
                callback(e);
            }
            // 상태 초기화
            startX = undefined;
            startY = undefined;
            startTime = undefined;
        });

        // 데스크탑 클릭 이벤트 리스너
        element.addEventListener('click', (e) => {
             // 터치 기기가 아닐 경우에만 click 이벤트로 콜백 실행
             // 또는 터치 이벤트에서 콜백이 실행되지 않았을 경우 (안전장치)
            if (!HealingK.state.isTouchDevice || typeof startTime === 'undefined') {
                 callback(e);
            }
        });
    },
    getOptimizedThumbnail(videoId) {
        // YouTube 썸네일 URL 생성 로직 (기존과 동일)
        if (!videoId) return 'https://placehold.co/180x320/111/FFF?text=No+Video+ID';
        // 예시: 기본 HQ 썸네일 사용
        return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    },
    saveToStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error(`Failed to save to localStorage (key: ${key}):`, e);
        }
    },
    loadFromStorage(key, defaultValue) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error(`Failed to load from localStorage (key: ${key}):`, e);
            return defaultValue;
        }
    },
    setScreenSize() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);

        const playerRoot = HealingK.elements.healingkPlayerRoot;
        if (playerRoot) {
            const width = playerRoot.clientWidth;
            const height = playerRoot.clientHeight;
            playerRoot.style.setProperty('--player-width', `${width}px`);
            playerRoot.style.setProperty('--player-height', `${height}px`);
        }
    }
    // --- 기존 코드 끝 ---
  },
  search: {
    // --- 기존 코드 (변경 없음) ---
    performSearch(query) {
        HealingK.state.searchQuery = query;
        let videosToSearch = [];

        if (HealingK.state.panelMode === 'search' && HealingK.state.searchSort === 'bookmarks') {
            videosToSearch = HealingK.dataManager.getBookmarkedVideosFullData().map(vid => ({ ...vid, category: "MY앨범" }));
             HealingK.state.searchResults = videosToSearch;
             if (HealingK.state.isPanelVisible && HealingK.state.panelMode === 'search') HealingK.ui.renderSearchGrid();
             return;
        }

        videosToSearch = videoData.flatMap(cat => cat.videos.map(vid => ({ ...vid, category: cat.category })));
        const uniqueVideos = Array.from(new Map(videosToSearch.map(item => [item.id, item])).values());
        videosToSearch = uniqueVideos;

        if (query.trim()) {
            const lq = query.toLowerCase();
            videosToSearch = videosToSearch.filter(v => v.title.toLowerCase().includes(lq) || (v.artist || '').toLowerCase().includes(lq));
        }

        if (HealingK.state.searchSort === 'latest') videosToSearch.sort((a,b) => new Date(b.uploadDate) - new Date(a.uploadDate));
        else if (HealingK.state.searchSort === 'alphabetical') videosToSearch.sort((a,b) => a.title.localeCompare(b.title, 'ko'));

        HealingK.state.searchResults = videosToSearch;
        if (HealingK.state.isPanelVisible && HealingK.state.panelMode === 'search') HealingK.ui.renderSearchGrid();
    },
    playSearchResult(video) {
        const allVideosFlat = videoData.flatMap((cat, catIdx) => cat.videos.map(vid => ({ ...vid, originalCategoryIndex: catIdx })));
        const originalVideoInfo = allVideosFlat.find(v => v.id === video.id);

        if (originalVideoInfo) {
            HealingK.state.currentCategoryIndex = originalVideoInfo.originalCategoryIndex;
            HealingK.state.currentVideoIndex = videoData[originalVideoInfo.originalCategoryIndex].videos.findIndex(v => v.id === video.id);
            HealingK.ui.renderCategoryTabs();
            HealingK.controller.loadCurrentVideo('none');
            HealingK.ui.togglePanel();
        } else {
            console.warn("Original video data not found for search result:", video);
            HealingK.ui.showMessage('영상을 찾을 수 없습니다. 홈으로 이동합니다.', 2000);
            HealingK.controller.goHome();
            HealingK.ui.togglePanel();
        }
    },
    addRecentSearch(query) {
        if (!query) return;
        this.state.recentSearches = this.state.recentSearches.filter(item => item !== query);
        this.state.recentSearches.unshift(query);
        if (this.state.recentSearches.length > 7) {
            this.state.recentSearches = this.state.recentSearches.slice(0, 7);
        }
        HealingK.utils.saveToStorage('hk-recent-searches', this.state.recentSearches);
    }
    // --- 기존 코드 끝 ---
  },
  dataManager: {
    // --- 기존 코드 (변경 없음) ---
    getCurrentCategory: () => {
        if (HealingK.state.currentCategoryIndex === MY_ALBUM_CATEGORY_INDEX) {
            return { category: "MY앨범", videos: HealingK.dataManager.getBookmarkedVideosFullData() };
        }
        return videoData[HealingK.state.currentCategoryIndex] || null;
    },
    getCurrentVideo() {
        const cat = this.getCurrentCategory();
        return cat?.videos?.[HealingK.state.currentVideoIndex] || null;
    },
    toggleBookmark(vId) {
        const idx = HealingK.state.bookmarkedVideos.indexOf(vId);
        const wasBookmarked = idx > -1;

        if(wasBookmarked) {
          HealingK.state.bookmarkedVideos.splice(idx,1);
          HealingK.ui.showMessage('MY앨범에서 삭제');
        } else {
          HealingK.state.bookmarkedVideos.push(vId);
          HealingK.ui.showMessage('MY앨범에 추가');
        }
        HealingK.utils.saveToStorage('hk-bookmarks',HealingK.state.bookmarkedVideos);
        HealingK.ui.updateBottomNav();
        HealingK.ui.renderCategoryTabs();

        if (HealingK.state.currentCategoryIndex === MY_ALBUM_CATEGORY_INDEX || (HealingK.state.isPanelVisible && HealingK.state.panelMode === 'search' && HealingK.state.searchSort === 'bookmarks')) {
            const currentBookmarks = HealingK.dataManager.getBookmarkedVideosFullData();
            if (currentBookmarks.length === 0) {
               if (HealingK.state.currentCategoryIndex === MY_ALBUM_CATEGORY_INDEX) {
                   HealingK.controller.goHome();
               } else {
                   HealingK.ui.renderSearchGrid();
               }
            } else {
               if (HealingK.state.currentCategoryIndex === MY_ALBUM_CATEGORY_INDEX) {
                  HealingK.state.currentVideoIndex = Math.max(0, Math.min(HealingK.state.currentVideoIndex, currentBookmarks.length - 1));
               }
               if ((HealingK.state.isPanelVisible && HealingK.state.panelMode === 'thumbnail' && HealingK.state.currentCategoryIndex === MY_ALBUM_CATEGORY_INDEX) || (HealingK.state.isPanelVisible && HealingK.state.panelMode === 'search' && HealingK.state.searchSort === 'bookmarks')) {
                   HealingK.ui.renderActiveGrid();
               }
               if (HealingK.state.currentCategoryIndex === MY_ALBUM_CATEGORY_INDEX && wasBookmarked && !currentBookmarks.find(v => v.id === vId)) {
                   HealingK.controller.loadCurrentVideo('none');
               } else if (!wasBookmarked) {
               }
            }
        }
    },
    isBookmarked: (vId) => HealingK.state.bookmarkedVideos.includes(vId),
    getBookmarkedVideosFullData: () => {
      const allVideos = videoData.flatMap(cat => cat.videos);
      return HealingK.state.bookmarkedVideos.map(bookmarkId => {
          return allVideos.find(video => video.id === bookmarkId);
      }).filter(video => video);
    },
     clearAllBookmarks() {
          HealingK.state.bookmarkedVideos = [];
          HealingK.utils.saveToStorage('hk-bookmarks', HealingK.state.bookmarkedVideos);
          HealingK.ui.showMessage('MY앨범의 모든 영상이 삭제되었습니다.', 2000);
          HealingK.ui.updateBottomNav();
          HealingK.ui.renderCategoryTabs();

           if (HealingK.state.currentCategoryIndex === MY_ALBUM_CATEGORY_INDEX || (HealingK.state.isPanelVisible && HealingK.state.panelMode === 'search' && HealingK.state.searchSort === 'bookmarks')) {
               HealingK.ui.renderActiveGrid();
               if (HealingK.state.currentCategoryIndex === MY_ALBUM_CATEGORY_INDEX) {
                  HealingK.controller.goHome();
               }
           }
     }
    // --- 기존 코드 끝 ---
  },
  share: {
    // --- 기존 코드 (변경 없음) ---
    generateShareUrl() {
        const currentVideo = HealingK.dataManager.getCurrentVideo();
        const baseUrl = BLOG_POST_URL.replace(/\/+$/, '') + '/?'; // BLOG_POST_URL은 video-data.js에서 정의

        if (currentVideo) {
          return `${baseUrl}videoId=${encodeURIComponent(currentVideo.id)}`;
        }
        return baseUrl;
    },
    async copyToClipboard() {
        const url = this.generateShareUrl();
        if (HealingK.elements.hkShareUrl) HealingK.elements.hkShareUrl.value = url;
        try {
          await navigator.clipboard.writeText(url);
          HealingK.ui.showMessage('링크가 복사되었습니다! 📋');
        } catch (err) {
          console.error('Clipboard write failed:', err);
          if(HealingK.elements.hkShareUrl) {
            HealingK.elements.hkShareUrl.select();
            HealingK.elements.hkShareUrl.setSelectionRange(0, 99999);
            try {
              document.execCommand('copy');
              HealingK.ui.showMessage('링크가 복사되었습니다! 📋');
            } catch (execErr) {
              console.error('ExecCommand copy failed:', execErr);
              HealingK.ui.showMessage('링크 복사에 실패했습니다.');
            }
          } else {
            HealingK.ui.showMessage('링크 복사에 실패했습니다.');
          }
        }
    },
    async nativeShare() {
        const currentVideo = HealingK.dataManager.getCurrentVideo();
        const url = this.generateShareUrl();
        const title = currentVideo ? `${currentVideo.title} - HealingK` : 'HealingK 쇼츠 플레이어';
        const text = currentVideo ? `HealingK에서 "${currentVideo.title}"(${currentVideo.artist || ''}) 영상을 감상해보세요!` : `HealingK 쇼츠 플레이어에서 다양한 영상을 감상해보세요!`;

        try {
          await navigator.share({ title: title, text: text, url: url });
        } catch (err) {
          console.log('Native share failed or user cancelled.', err);
        }
    }
    // --- 기존 코드 끝 ---
  },
  ui: {
    // --- 기존 코드 (renderCategoryTabs, renderActiveGrid, _createGridItem, renderThumbnailGrid, renderSearchGrid, renderRecentSearches, toggleRecentSearches, togglePanel, updateIndicator, updateBottomNav, updatePlayerUIStates, showLoading, hideLoading 등 변경 없음) ---
    renderCategoryTabs() {
        const tabsContainer = HealingK.elements.hkCategoryTabs;
        if(!tabsContainer)return;
        tabsContainer.innerHTML='';
        const categoriesToRender = [...videoData, { category: "MY앨범", videos: [] }];

        categoriesToRender.forEach((catData, idx)=>{
            const tab=document.createElement('button');
            tab.className='hk-category-tab';
            const isMyAlbumTab = (idx === MY_ALBUM_CATEGORY_INDEX);
            if (isMyAlbumTab) {
                tab.classList.add('my-album-tab');
                 const bookmarkCount = HealingK.state.bookmarkedVideos.length;
                 tab.textContent = `MY앨범 (${bookmarkCount})`;
            } else {
                tab.textContent=catData.category;
            }
            if(HealingK.state.currentCategoryIndex === idx) {
                tab.classList.add('active');
            }
            HealingK.utils.addTapListener(tab,()=>HealingK.controller.switchCategory(idx));
            tabsContainer.appendChild(tab);
        });
        const activeTab = tabsContainer.querySelector('.hk-category-tab.active');
        if (activeTab) {
            activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        }
    },
    renderActiveGrid() {
        if (HealingK.state.isGridLayingOut) return;
        if (HealingK.state.panelMode === 'search') {
            this.renderSearchGrid();
        } else {
            this.renderThumbnailGrid();
        }
    },
    _createGridItem(vid, clickHandler) {
        const gi = document.createElement('div');
        gi.className = 'hk-grid-item';
        const curVid = HealingK.dataManager.getCurrentVideo();
        if(curVid && vid && curVid.id === vid.id) gi.classList.add('active');

        if (vid) {
            const img = document.createElement('img');
            img.src = HealingK.utils.getOptimizedThumbnail(vid.videoUrl);
            img.alt = vid.title; img.loading = 'lazy';
            img.onerror = function(){ this.onerror=null; this.src='https://placehold.co/180x320/111/FFF?text=Error+Loading+Thumbnail'; console.error(`Failed to load thumbnail for video ID: ${vid.videoUrl}`); };

            const lbl=document.createElement('div'); lbl.className='hk-grid-item-label';
            const tit=document.createElement('div'); tit.className='hk-grid-item-title'; tit.textContent=vid.title;

            lbl.appendChild(tit); gi.appendChild(img); gi.appendChild(lbl);
            HealingK.utils.addTapListener(gi, clickHandler);
        } else {
            gi.textContent = "정보 없음";
            gi.style.cssText += 'display: flex; align-items: center; justify-content: center; color: var(--text-muted);';
        }
        return gi;
    },
    renderThumbnailGrid() {
        if (!HealingK.elements.hkContentGrid) return;
        const category = HealingK.dataManager.getCurrentCategory();
        const videosToRender = category?.videos || [];

        HealingK.state.isGridLayingOut = true;
        HealingK.elements.hkContentGrid.className = 'hk-thumbnail-grid';
        const fragment = document.createDocumentFragment();

        if (videosToRender.length === 0) {
            const nR=document.createElement('div');
            nR.style.cssText=`grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px 0;`;
            nR.textContent = category.category === "MY앨범" ? 'MY앨범 목록이 비어있습니다.' : '영상이 없습니다.';
            fragment.appendChild(nR);
        } else {
            videosToRender.forEach((vid,idx)=>{
                const item = this._createGridItem(vid, () => HealingK.controller.switchVideo(idx, 'none'));
                fragment.appendChild(item);
            });
        }
        HealingK.elements.hkContentGrid.innerHTML = '';
        HealingK.elements.hkContentGrid.appendChild(fragment);
        requestAnimationFrame(() => { HealingK.state.isGridLayingOut = false; });
    },
    renderSearchGrid() {
        if (!HealingK.elements.hkContentGrid) return;
        HealingK.state.isGridLayingOut = true;
        HealingK.elements.hkContentGrid.className = 'hk-search-grid';
        const fragment = document.createDocumentFragment();

        if (HealingK.elements.hkMyAlbumControls) {
            HealingK.elements.hkMyAlbumControls.style.display = 'none';
        }

        if (HealingK.state.searchResults.length === 0) {
            const nR=document.createElement('div'); nR.style.cssText=`grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px 0;`;
            if (HealingK.state.panelMode === 'search' && HealingK.state.searchSort === 'bookmarks') {
                 nR.textContent = 'MY앨범 목록이 비어있습니다.';
            } else {
                 nR.textContent=HealingK.state.searchQuery.trim()?'검색 결과가 없습니다.':'검색어를 입력하세요.';
            }
            fragment.appendChild(nR);
        } else {
            HealingK.state.searchResults.forEach(vid=>{
                const item = this._createGridItem(vid, () => HealingK.search.playSearchResult(vid));
                fragment.appendChild(item);
            });
        }
        HealingK.elements.hkContentGrid.innerHTML = '';
        HealingK.elements.hkContentGrid.appendChild(fragment);
        requestAnimationFrame(() => { HealingK.state.isGridLayingOut = false; });
   },
   renderRecentSearches() {
       const recentSearchesContainer = HealingK.elements.hkRecentSearches;
       if (!recentSearchesContainer) return;
       recentSearchesContainer.innerHTML = '';
       if (HealingK.state.recentSearches.length === 0) {
           return;
       }
       const fragment = document.createDocumentFragment();
       HealingK.state.recentSearches.forEach(term => {
           const item = document.createElement('div');
           item.className = 'hk-recent-search-item';
           item.textContent = term;
           fragment.appendChild(item);
       });
       recentSearchesContainer.appendChild(fragment);
   },
   toggleRecentSearches(show) {
       if (!HealingK.elements.hkRecentSearches) return;
       const shouldShow = typeof show === 'boolean' ? show : HealingK.elements.hkRecentSearches.style.display === 'none';
       if (HealingK.state.isPanelVisible && HealingK.state.panelMode === 'search') {
           HealingK.elements.hkRecentSearches.style.display = shouldShow ? 'block' : 'none';
       } else {
           HealingK.elements.hkRecentSearches.style.display = 'none';
       }
   },
    togglePanel(mode = null) {
        const { state, elements } = HealingK;
        clearTimeout(state.panelCloseTimeout); state.panelCloseTimeout = null;
        const isCurrentlyVisible = state.isPanelVisible;
        const requestedMode = mode || state.panelMode;
        let shouldBeVisible = !isCurrentlyVisible;

        if (mode) {
            if (isCurrentlyVisible && state.panelMode === mode && !state.openedByHover) {
                shouldBeVisible = false;
            } else {
                shouldBeVisible = true;
                state.panelMode = mode;
            }
        }

        if (!shouldBeVisible) state.openedByHover = false;
        state.isPanelVisible = shouldBeVisible;

        elements.body.classList.toggle('panel-open', shouldBeVisible);
        elements.hkSidePanel.classList.toggle('active', shouldBeVisible);

        if (!shouldBeVisible) {
            if (elements.hkSearchInput) elements.hkSearchInput.blur();
            this.toggleRecentSearches(false);
            if (state.panelMode === 'search') {
                if (elements.hkSearchInput) {
                    elements.hkSearchInput.value = '';
                }
                if (elements.hkSearchClear) {
                    elements.hkSearchClear.style.display = 'none';
                }
                HealingK.search.performSearch('');
            }
        }

        if (elements.hkPanelClose) {
          elements.hkSidePanel.setAttribute('data-mode', shouldBeVisible ? state.panelMode : '');
          elements.hkPanelClose.style.display = shouldBeVisible ? 'flex' : 'none';
        }

        if (shouldBeVisible) {
            if (state.player && state.isPlayerReady && typeof state.player.mute === 'function') {
                state.originalVolume = state.player.getVolume(); // 패널 열 때 볼륨 저장 (기존 로직)
                state.player.mute();
                HealingK.audioFadeout.stopMonitoring(false); // 패널 열면 페이드아웃 중지 (볼륨 복원 X)
            }
            this.renderActiveGrid();
            if (state.panelMode === 'search') {
                if (elements.hkSearchInput) elements.hkSearchInput.focus();
                this.renderRecentSearches();
                this.toggleRecentSearches(true);
            }
             if (state.panelMode === 'search' && state.searchSort === 'bookmarks') {
                  if (elements.hkMyAlbumControls) {
                     elements.hkMyAlbumControls.style.display = 'flex';
                  }
             }
        } else {
            if (state.player && state.isPlayerReady && typeof state.player.unMute === 'function') {
                if (state.soundEnabled && !state.isMuted) {
                    state.player.unMute();
                    if (state.originalVolume !== undefined) state.player.setVolume(state.originalVolume);
                    // 패널 닫고 소리 켤 때 페이드아웃 모니터링 재시작
                    HealingK.audioFadeout.startMonitoring();
                } else {
                    state.player.mute();
                }
            }
        }
        this.updateBottomNav();
    },
    updateIndicator() {
        const indicator = HealingK.elements.hkIndicator;
        if(!indicator)return;
        const curVid=HealingK.dataManager.getCurrentVideo();
        if(curVid) indicator.textContent=`${curVid.title} - ${curVid.artist||'Unknown Artist'}`;
        else indicator.textContent = '';
    },
    updateBottomNav() {
        const { player, isPlayerReady, isMuted, soundEnabled, currentCategoryIndex } = HealingK.state;
        const currentVideo = HealingK.dataManager.getCurrentVideo();
        const isBookmarked = currentVideo ? HealingK.dataManager.isBookmarked(currentVideo.id) : false;

        const playPauseBtn = document.getElementById('hk-nav-play-pause');
        const volumeBtn = document.getElementById('hk-nav-volume');
        const bookmarkBtn = document.getElementById('hk-nav-bookmark');

        if (playPauseBtn) {
            const icon = playPauseBtn.querySelector('i');
            if (icon) {
                let playerState = player?.getPlayerState();
                icon.className = (playerState === YT.PlayerState.PLAYING) ? 'fa fa-pause' : 'fa fa-play';
            }
        }

        if (volumeBtn) {
            const icon = volumeBtn.querySelector('i');
            if (icon) {
                icon.className = (!soundEnabled || isMuted) ? 'fa fa-volume-mute' : 'fa fa-volume-up';
            }
        }

        if (bookmarkBtn) {
            const icon = bookmarkBtn.querySelector('i');
            if (icon) {
                icon.className = isBookmarked ? 'fas fa-heart' : 'far fa-heart';
                bookmarkBtn.classList.toggle('bookmarked', isBookmarked);
            }
        }

        // MY앨범 탭 활성화/비활성화
        const myAlbumTab = document.querySelector('.hk-category-tab.my-album-tab');
        if (myAlbumTab) {
             const bookmarkCount = HealingK.state.bookmarkedVideos.length;
             myAlbumTab.textContent = `MY앨범 (${bookmarkCount})`;
        }
    },
    updatePlayerUIStates() {
        this.updateBottomNav();
        const playerState = HealingK.state.player?.getPlayerState();
        if (playerState === YT.PlayerState.PLAYING) {
            this.updateIndicator();
        }
    },
    showLoading(){
        if(HealingK.elements.hkLoading) {
            HealingK.elements.hkLoading.style.display = 'flex';
            requestAnimationFrame(() => {
                if(HealingK.elements.hkLoading) HealingK.elements.hkLoading.classList.remove('hidden');
            });
        }
    },
    hideLoading(){
        if(HealingK.elements.hkLoading) {
            HealingK.elements.hkLoading.classList.add('hidden');
            setTimeout(() => {
                if (HealingK.elements.hkLoading && HealingK.elements.hkLoading.classList.contains('hidden')) {
                    HealingK.elements.hkLoading.style.display = 'none';
                }
            }, 300);
        }
    },
    toggleHelpModal() {
        HealingK.state.isHelpModalVisible = !HealingK.state.isHelpModalVisible;
        if (HealingK.elements.hkHelpModal) {
            HealingK.elements.hkHelpModal.classList.toggle('active', HealingK.state.isHelpModalVisible);
        }
        HealingK.elements.body.classList.toggle('modal-open', HealingK.state.isHelpModalVisible);

        if (HealingK.state.isHelpModalVisible) {
            if (HealingK.state.player && HealingK.state.isPlayerReady && typeof HealingK.state.player.mute === 'function') {
                // 모달 열 때 볼륨 저장 및 음소거 (기존 로직)
                HealingK.state.originalVolume = HealingK.state.player.getVolume();
                HealingK.state.player.mute();
                HealingK.audioFadeout.stopMonitoring(false); // 모달 열면 페이드아웃 중지 (볼륨 복원 X)
            }
            this.hideUI();
            clearTimeout(HealingK.state.uiTimeout);
        } else {
            if (HealingK.state.player && HealingK.state.isPlayerReady && typeof HealingK.state.player.unMute === 'function') {
                if (HealingK.state.soundEnabled && !HealingK.state.isMuted) {
                    HealingK.state.player.unMute();
                    if (HealingK.state.originalVolume !== undefined) HealingK.state.player.setVolume(HealingK.state.originalVolume);
                    // 모달 닫고 소리 켤 때 페이드아웃 모니터링 재시작
                    HealingK.audioFadeout.startMonitoring();
                } else {
                    HealingK.state.player.mute();
                }
            }
            this.showUI();
        }
        this.updateBottomNav();
    },
    toggleShareModal() {
        HealingK.state.isShareModalVisible = !HealingK.state.isShareModalVisible;
        if (HealingK.elements.hkShareModal) {
            if (HealingK.state.isShareModalVisible) {
                const shareUrl = HealingK.share.generateShareUrl();
                if (HealingK.elements.hkShareUrl) HealingK.elements.hkShareUrl.value = shareUrl;
                if (navigator.share && HealingK.elements.hkShareNative) HealingK.elements.hkShareNative.style.display = 'inline-block';
                else if (HealingK.elements.hkShareNative) HealingK.elements.hkShareNative.style.display = 'none';
            }
            HealingK.elements.hkShareModal.classList.toggle('active', HealingK.state.isShareModalVisible);
        }
        HealingK.elements.body.classList.toggle('modal-open', HealingK.state.isShareModalVisible);

        if (HealingK.state.isShareModalVisible) {
            if (HealingK.state.player && HealingK.state.isPlayerReady && typeof HealingK.state.player.mute === 'function') {
                // 모달 열 때 볼륨 저장 및 음소거 (기존 로직)
                HealingK.state.originalVolume = HealingK.state.player.getVolume();
                HealingK.state.player.mute();
                HealingK.audioFadeout.stopMonitoring(false); // 모달 열면 페이드아웃 중지 (볼륨 복원 X)
            }
            this.hideUI();
            clearTimeout(HealingK.state.uiTimeout);
        } else {
            if (HealingK.state.player && HealingK.state.isPlayerReady && typeof HealingK.state.player.unMute === 'function') {
                if (HealingK.state.soundEnabled && !HealingK.state.isMuted) {
                    HealingK.state.player.unMute();
                    if (HealingK.state.originalVolume !== undefined) HealingK.state.player.setVolume(HealingK.state.originalVolume);
                    // 모달 닫고 소리 켤 때 페이드아웃 모니터링 재시작
                    HealingK.audioFadeout.startMonitoring();
                } else {
                    HealingK.state.player.mute();
                }
            }
            this.showUI();
        }
        this.updateBottomNav();
    },
    showMessage(message, duration = 2000) {
        if (!HealingK.elements.hkMessageBox) return;
        clearTimeout(HealingK.state.messageTimeout);
        HealingK.elements.hkMessageBox.textContent = message;
        HealingK.elements.hkMessageBox.classList.add('visible');
        HealingK.state.messageTimeout = setTimeout(() => {
            if (HealingK.elements.hkMessageBox) HealingK.elements.hkMessageBox.classList.remove('visible');
        }, duration);
    },
    showCenterMuteStatus(isMuted) {
        if (!HealingK.elements.hkCenterMuteStatus) return;
        const icon = HealingK.elements.hkCenterMuteStatus.querySelector('i');
        if (icon) icon.className = isMuted ? 'fa fa-volume-mute' : 'fa fa-volume-up';
        if (HealingK.state.isPanelVisible || HealingK.state.isHelpModalVisible || HealingK.state.isShareModalVisible) return;
        HealingK.elements.hkCenterMuteStatus.classList.add('visible');
        clearTimeout(HealingK.state.centerMuteStatusTimeout);
        HealingK.state.centerMuteStatusTimeout = setTimeout(() => {
            if(HealingK.elements.hkCenterMuteStatus) HealingK.elements.hkCenterMuteStatus.classList.remove('visible');
        }, 1500);
    },
    startProgressBarUpdate() {
        if (!HealingK.elements.hkProgressBarFill || HealingK.state.isDraggingProgressBar) return;
        if (HealingK.state.progressBarRAF) return;

        function update() {
            if (HealingK.state.isDraggingProgressBar) {
                 if (HealingK.state.progressBarRAF) {
                    cancelAnimationFrame(HealingK.state.progressBarRAF);
                    HealingK.state.progressBarRAF = null;
                 }
                return;
            }

            const player = HealingK.state.player;
            if (player && typeof player.getPlayerState === 'function' && player.getPlayerState() === YT.PlayerState.PLAYING) {
                try {
                    const currentTime = player.getCurrentTime();
                    const duration = player.getDuration();
                    if (duration > 0) {
                        const percentage = (currentTime / duration) * 100;
                        if(HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = percentage + '%';
                    } else {
                        if(HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '0%';
                    }
                    HealingK.state.progressBarRAF = requestAnimationFrame(update);
                } catch (e) {
                    console.error("Error updating progress bar:", e);
                    if (HealingK.state.progressBarRAF) {
                        cancelAnimationFrame(HealingK.state.progressBarRAF);
                        HealingK.state.progressBarRAF = null;
                    }
                }
            } else {
                 if (HealingK.state.progressBarRAF) {
                    cancelAnimationFrame(HealingK.state.progressBarRAF);
                    HealingK.state.progressBarRAF = null;
                 }
            }
        }
        HealingK.state.progressBarRAF = requestAnimationFrame(update);
    },
    stopProgressBarUpdate() {
        if (HealingK.state.progressBarRAF) {
            cancelAnimationFrame(HealingK.state.progressBarRAF);
            HealingK.state.progressBarRAF = null;
        }
        if (!HealingK.state.isDraggingProgressBar && HealingK.elements.hkProgressBarFill) {
            const playerState = HealingK.state.player?.getPlayerState();
             if (playerState === YT.PlayerState.ENDED) {
                 if(HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '100%';
             }
        }
    }
    // --- 기존 코드 끝 ---
  },
  youtubeManager: {
    initPlayer(vId, animationDirection = 'none'){ // 페이드아웃 중지 추가
        HealingK.audioFadeout.stopMonitoring(); // 새 플레이어 초기화 시 페이드아웃 중지
        if(HealingK.state.player) {
            HealingK.ui.stopProgressBarUpdate();
            if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '0%';
            HealingK.progressBar.updateTooltip(0,0);

            try {
                HealingK.state.player.destroy();
            } catch(e) { console.error("Error destroying previous player:", e); }
            HealingK.state.player = null;
            HealingK.state.isPlayerReady = false;
        }

        const playerEmbed = HealingK.elements.hkYoutubeEmbed;
        if (!playerEmbed) {
             console.error("hk-youtube-embed element not found!");
             HealingK.ui.hideLoading();
             HealingK.state.isTransitioning = false;
             return;
        }

        if (animationDirection === 'none') {
             HealingK.ui.showLoading();
        }

        try {
            HealingK.state.player=new YT.Player('hk-youtube-embed',{
                height:'100%',width:'100%',videoId:vId,
                playerVars:{autoplay:1,controls:0,disablekb:1,enablejsapi:1,fs:0,iv_load_policy:3,modestbranding:1,rel:0,showinfo:0,mute:HealingK.state.isMuted ? 1:0},
                events:{onReady:(e)=>this.onPlayerReady(e, animationDirection),onStateChange:(e)=>this.onPlayerStateChange(e),onError:(e)=>this.onPlayerError(e)}
            });
        } catch (e) {
            console.error("Error creating YT Player:", e);
            HealingK.ui.hideLoading();
            HealingK.state.isTransitioning = false;
        }
    },

    onPlayerReady(evt, animationDirection){ // 기존과 거의 동일, 볼륨 설정 부분 try-catch 추가
        HealingK.state.isPlayerReady=true;
        const player = evt.target;

        try {
            if (HealingK.state.isMuted || !HealingK.state.soundEnabled || HealingK.state.isPanelVisible || HealingK.state.isHelpModalVisible || HealingK.state.isShareModalVisible) {
                player.mute();
            } else {
                player.unMute();
            }
             // 기존 originalVolume은 모달/음소거 해제 시 사용되므로, 여기서는 기본 100 또는 volumeBeforeFade 사용 고려
             // 여기서는 일단 100으로 설정하고, PLAYING 상태에서 volumeBeforeFade를 제대로 설정하도록 함
             player.setVolume(100);
             HealingK.state.volumeBeforeFade = 100; // 초기화

        } catch (e) {
            console.error("Error setting volume/mute onReady:", e);
        }

         if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '0%';

         try {
             const duration = player.getDuration();
             HealingK.progressBar.updateTooltip(0, duration);
         } catch (e) {
             console.error("Error getting duration onReady:", e);
             HealingK.progressBar.updateTooltip(0, 0);
         }
         // onReady에서 바로 재생이 시작될 수 있으므로, 여기서 상태 체크 후 모니터링 시작 시도
         // (실제로는 onStateChange의 PLAYING에서 시작하는 것이 더 안정적일 수 있음)
         // if (player.getPlayerState() === YT.PlayerState.PLAYING) {
         //     HealingK.audioFadeout.startMonitoring();
         // }
    },

    loadVideo(vId,animationDirection='none'){ // 페이드아웃 중지 추가
        HealingK.audioFadeout.stopMonitoring(); // 새 비디오 로드 시 페이드아웃 중지
        const playerEmbed=HealingK.elements.hkYoutubeEmbed;
        if(!playerEmbed){
          console.error('hk-youtube-embed element not found!');
          HealingK.state.isTransitioning=false;
          HealingK.ui.hideLoading();
          if(HealingK.elements.hkProgressBarFill)
             HealingK.elements.hkProgressBarFill.style.width='0%';
          HealingK.progressBar.updateTooltip(0,0);
          return;
        }

        const ph=HealingK.elements.hkVideoPlaceholder;
        if(ph){
          ph.src=HealingK.utils.getOptimizedThumbnail(vId);
          ph.classList.remove('hidden');
        }

        playerEmbed.style.transition='none';
        if(animationDirection==='fromBottom'){
          playerEmbed.style.transform='translateY(100%)';
          playerEmbed.style.opacity=0;
        }else if(animationDirection==='fromTop'){
          playerEmbed.style.transform='translateY(-100%)';
          playerEmbed.style.opacity=0;
        }else{
          playerEmbed.style.transform='translateY(0)';
          playerEmbed.style.opacity=1;
          playerEmbed.style.transition='opacity .3s ease';
        }

        if(animationDirection!=='none')HealingK.ui.showLoading();
        if(HealingK.elements.hkProgressBarFill)
            HealingK.elements.hkProgressBarFill.style.width='0%';
        HealingK.progressBar.updateTooltip(0,0);

        if(HealingK.state.player&&HealingK.state.isPlayerReady && typeof HealingK.state.player.loadVideoById === 'function'){
            try {
                HealingK.state.player.loadVideoById({
                  videoId:vId,
                  playerVars:{ /* playerVars는 initPlayer에서 설정되므로 여기선 불필요할 수 있음 */
                    autoplay:1,controls:0,disablekb:1,enablejsapi:1,fs:0,
                    iv_load_policy:3,modestbranding:1,rel:0,showinfo:0,
                    mute:HealingK.state.isMuted?1:0
                  }
                });
            } catch (e) {
                console.error("Error loading video by ID:", e);
                // 에러 발생 시 플레이어 재초기화 시도
                this.initPlayer(vId, animationDirection);
            }
        }else{
          this.initPlayer(vId,animationDirection);
        }
        this.preloadNextThumbnail();
    },

    onPlayerStateChange(evt){ // 페이드아웃 로직 연동
        if(!evt.target || typeof evt.target.getPlayerState !== 'function') return;

        const playerState = evt.data;
        const playerEmbed = HealingK.elements.hkYoutubeEmbed;
        let duration = 0;
        try {
             duration = evt.target.getDuration();
             if (duration > 0 && HealingK.state.player) {
                 HealingK.progressBar.updateTooltip(HealingK.state.player.getCurrentTime(), duration);
             }
        } catch(e) { console.error("Error getting duration/currentTime in onStateChange:", e); }

        switch(playerState){
            case YT.PlayerState.ENDED:
                HealingK.audioFadeout.stopMonitoring(false); // 영상 종료 시 페이드아웃 중지 (볼륨 복원 X)
                if (!HealingK.state.isTransitioning) {
                     HealingK.ui.showLoading();
                }
                HealingK.ui.stopProgressBarUpdate();
                if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '100%';
                setTimeout(() => {
                    HealingK.controller.playNextVideoWithAnimation();
                }, 100);
                break;
            case YT.PlayerState.PLAYING:
                const ph=HealingK.elements.hkVideoPlaceholder;
                if(ph&&!ph.classList.contains('hidden')){
                  setTimeout(()=>ph.classList.add('hidden'),50);
                }
                 if (HealingK.state.isTransitioning) {
                     if (playerEmbed) {
                          playerEmbed.style.transition = 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease-out';
                          playerEmbed.style.transform = 'translateY(0)';
                          playerEmbed.style.opacity = 1;
                          setTimeout(() => {
                              HealingK.state.isTransitioning = false;
                              if (playerEmbed) playerEmbed.style.transition = 'opacity 0.3s ease';
                          }, 350);
                     } else {
                          HealingK.state.isTransitioning = false;
                     }
                 } else {
                      if (playerEmbed) {
                          playerEmbed.style.transition = 'opacity 0.3s ease-out';
                          playerEmbed.style.transform = 'translateY(0)';
                          playerEmbed.style.opacity = 1;
                      }
                 }
                HealingK.ui.hideLoading();
                HealingK.ui.startProgressBarUpdate();

                // 음소거 상태, 모달/패널 활성 상태 등 확인 후 볼륨 설정 및 페이드아웃 시작
                try {
                    if(HealingK.state.isPanelVisible||HealingK.state.isHelpModalVisible||HealingK.state.isShareModalVisible || !HealingK.state.soundEnabled||HealingK.state.isMuted){
                        evt.target.mute();
                        HealingK.audioFadeout.stopMonitoring(false); // 음소거/모달 상태면 페이드아웃 중지
                    } else {
                         // 페이드 아웃 시작 전 볼륨을 volumeBeforeFade에 저장
                         HealingK.state.volumeBeforeFade = evt.target.getVolume();
                         evt.target.unMute();
                         // 필요 시 볼륨 복원 (예: 모달 닫힌 직후)
                         // evt.target.setVolume(HealingK.state.volumeBeforeFade);
                         HealingK.audioFadeout.startMonitoring(); // 페이드아웃 모니터링 시작
                    }
                } catch (e) {
                    console.error("Error handling volume/fadeout on PLAYING state:", e);
                }

                if (HealingK.state.uiVisible) HealingK.ui.showUI();
                break;
            case YT.PlayerState.PAUSED:
                HealingK.audioFadeout.stopMonitoring(false); // 일시정지 시 페이드아웃 중지 (볼륨 복원 X)
                HealingK.ui.hideLoading();
                HealingK.ui.stopProgressBarUpdate();
                clearTimeout(HealingK.state.uiTimeout);
                break;
            case YT.PlayerState.BUFFERING:
                HealingK.audioFadeout.stopMonitoring(false); // 버퍼링 시 페이드아웃 중지 (볼륨 복원 X)
                const phBuf=HealingK.elements.hkVideoPlaceholder;
                if(phBuf)phBuf.classList.remove('hidden');
                HealingK.ui.showLoading();
                HealingK.ui.stopProgressBarUpdate();
                if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '0%';
                clearTimeout(HealingK.state.uiTimeout);
                break;
            case YT.PlayerState.CUED:
                HealingK.audioFadeout.stopMonitoring(); // 로드 완료(재생 대기) 시 페이드아웃 중지 및 볼륨 복원
                HealingK.ui.hideLoading();
                HealingK.ui.stopProgressBarUpdate();
                if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '0%';
                if (HealingK.state.isTransitioning) {
                    // CUED 상태에서 애니메이션 처리 (필요한 경우)
                }
                HealingK.ui.updatePlayerUIStates();
                break;
            default:
                HealingK.audioFadeout.stopMonitoring(); // 기타 상태 변경 시 안전하게 중지
                break;
        }
        HealingK.ui.updateBottomNav(); // 모든 상태 변경 시 하단 네비 업데이트
    },

    onPlayerError(evt){ // 페이드아웃 중지 추가
        HealingK.audioFadeout.stopMonitoring(); // 에러 시 페이드아웃 중지
        console.error("Player Error:", evt.data);
        HealingK.ui.hideLoading();
        HealingK.state.isTransitioning = false;
        const currentVideo = HealingK.dataManager.getCurrentVideo();
        HealingK.ui.showMessage(`영상 재생 중 오류 발생 (${currentVideo?.title || '현재 영상'}). 다음 영상으로 넘어갑니다.`, 3000);
        // 에러 발생 시 잠시 후 다음 영상 자동 재생
        setTimeout(() => {
            HealingK.controller.playNextVideoWithAnimation();
        }, 1000);
    },

    preloadNextThumbnail() { // 기존과 동일
        const cat = HealingK.dataManager.getCurrentCategory();
        if (!cat || cat.videos.length === 0) return;
        const nextIndex = (HealingK.state.currentVideoIndex + 1) % cat.videos.length;
        const nextVideo = cat.videos[nextIndex];
        if (nextVideo) {
            const img = new Image();
            img.src = HealingK.utils.getOptimizedThumbnail(nextVideo.videoUrl);
        }
    }
  },
  controller: {
    // --- 기존 코드 (switchCategory, switchVideo, loadCurrentVideo 등 변경 없음) ---
    switchCategory(catIdx) {
        if (HealingK.state.isTransitioning || HealingK.state.currentCategoryIndex === catIdx) return;
        // MY앨범이 비어있으면 선택 불가
        if (catIdx === MY_ALBUM_CATEGORY_INDEX && HealingK.dataManager.getBookmarkedVideosFullData().length === 0) {
            HealingK.ui.showMessage('MY앨범 목록이 비어있습니다.', 1500);
            return;
        }
        HealingK.state.currentCategoryIndex = catIdx;
        HealingK.state.currentVideoIndex = 0;
        HealingK.ui.renderCategoryTabs();
        if (HealingK.state.isPanelVisible && HealingK.state.panelMode === 'thumbnail') {
            HealingK.ui.renderThumbnailGrid();
        } else if (HealingK.state.isPanelVisible && HealingK.state.panelMode === 'search') {
            // 검색 패널에서는 카테고리 변경 시 동작 정의 필요 (예: 패널 닫기 또는 검색 초기화)
             HealingK.ui.togglePanel(); // 일단 패널 닫기
        }
        this.loadCurrentVideo('none');
    },
    switchVideo(vidIdx, animationDirection = 'none') {
        if (HealingK.state.isTransitioning) return;
        const cat = HealingK.dataManager.getCurrentCategory();
        if (!cat || !cat.videos || vidIdx < 0 || vidIdx >= cat.videos.length) return;
        HealingK.state.currentVideoIndex = vidIdx;
        if(HealingK.state.isPanelVisible) HealingK.ui.togglePanel();
        this.loadCurrentVideo(animationDirection);
    },
    loadCurrentVideo(animationDirection = 'none') {
        if (HealingK.state.isTransitioning && animationDirection !== 'none') {
            return;
        }
        if (animationDirection !== 'none') {
            HealingK.state.isTransitioning = true;
        }
        const video = HealingK.dataManager.getCurrentVideo();
        if (video) {
            HealingK.youtubeManager.loadVideo(video.videoUrl, animationDirection);
            HealingK.ui.updateIndicator();
            HealingK.ui.updateBottomNav();
        } else {
            console.warn("No video found at current index.");
            HealingK.state.isTransitioning = false;
            HealingK.ui.hideLoading();
            if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '0%';
            HealingK.progressBar.updateTooltip(0,0);
            HealingK.ui.updateIndicator();
             if (HealingK.state.currentCategoryIndex === MY_ALBUM_CATEGORY_INDEX) {
                  HealingK.ui.showMessage('MY앨범 목록이 비어있습니다. 홈으로 이동합니다.', 2000);
                  this.goHome();
             }
        }
    },
    loadCurrentVideoById(videoId) {
        const allVideosFlat = videoData.flatMap((cat, catIdx) => cat.videos.map(vid => ({ ...vid, originalCategoryIndex: catIdx })));
        const videoInfo = allVideosFlat.find(v => v.id === videoId);

        if (videoInfo) {
            HealingK.state.currentCategoryIndex = videoInfo.originalCategoryIndex;
            HealingK.state.currentVideoIndex = videoData[videoInfo.originalCategoryIndex].videos.findIndex(v => v.id === videoId);
            HealingK.ui.renderCategoryTabs();
            this.loadCurrentVideo('none');
        } else {
            console.warn(`Video ID ${videoId} not found in videoData.`);
            this.goHome();
            HealingK.ui.showMessage('요청하신 영상을 찾을 수 없습니다.', 2000);
        }
    },
    playNextVideoWithAnimation() {
        if (HealingK.state.isTransitioning) {
            return;
        }
        const cat = HealingK.dataManager.getCurrentCategory();
        if (!cat || cat.videos.length === 0) {
          HealingK.state.isTransitioning = false;
           HealingK.ui.hideLoading();
          if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '0%';
          HealingK.progressBar.updateTooltip(0,0);
          if (cat && cat.category === "MY앨범") HealingK.ui.showMessage('MY앨범 목록에 더 이상 영상이 없습니다.', 1500);
          return;
        }
        const nextIndex = (HealingK.state.currentVideoIndex + 1) % cat.videos.length;
        this.switchVideo(nextIndex, 'fromBottom');
    },
    playPrevVideoWithAnimation() {
        if (HealingK.state.isTransitioning) {
            return;
        }
        const cat = HealingK.dataManager.getCurrentCategory();
        if (!cat || cat.videos.length === 0) {
          HealingK.state.isTransitioning = false;
          HealingK.ui.hideLoading();
          if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '0%';
          HealingK.progressBar.updateTooltip(0,0);
          if (cat && cat.category === "MY앨범") HealingK.ui.showMessage('MY앨범 목록에 더 이상 영상이 없습니다.', 1500);
          return;
        }
        const prevIndex = (HealingK.state.currentVideoIndex - 1 + cat.videos.length) % cat.videos.length;
        this.switchVideo(prevIndex, 'fromTop');
    },
    nextCategory(){
        if (HealingK.state.isTransitioning) {
            return;
        }
        const totalCategories = videoData.length + 1;
        let nextCatIndex = (HealingK.state.currentCategoryIndex + 1);
        if (nextCatIndex >= totalCategories) {
            nextCatIndex = 0;
        }
        if (nextCatIndex === MY_ALBUM_CATEGORY_INDEX && HealingK.dataManager.getBookmarkedVideosFullData().length === 0) {
            if (totalCategories > 1) {
                 nextCatIndex = (nextCatIndex + 1) % totalCategories;
                 if (nextCatIndex === MY_ALBUM_CATEGORY_INDEX && HealingK.dataManager.getBookmarkedVideosFullData().length === 0) {
                     nextCatIndex = 0;
                 }
                 HealingK.ui.showMessage('MY앨범 목록이 비어있어 건너뜁니다.', 1500);
            } else {
                 HealingK.ui.showMessage('MY앨범 목록이 비어있어 다른 카테고리로 이동할 수 없습니다.', 1500);
                 return;
            }
        }
        this.switchCategory(nextCatIndex);
    },
    prevCategory(){
        if (HealingK.state.isTransitioning) {
            return;
        }
        const totalCategories = videoData.length + 1;
        let prevCatIndex = (HealingK.state.currentCategoryIndex - 1 + totalCategories) % totalCategories;
        if (prevCatIndex === MY_ALBUM_CATEGORY_INDEX && HealingK.dataManager.getBookmarkedVideosFullData().length === 0) {
             if (totalCategories > 1) {
                 prevCatIndex = (prevCatIndex - 1 + totalCategories) % totalCategories;
                 if (prevCatIndex === MY_ALBUM_CATEGORY_INDEX && HealingK.dataManager.getBookmarkedVideosFullData().length === 0 && totalCategories > 1) {
                     prevCatIndex = totalCategories - 2;
                 } else if (prevCatIndex === MY_ALBUM_CATEGORY_INDEX && HealingK.dataManager.getBookmarkedVideosFullData().length === 0 && totalCategories === 1) {
                      HealingK.ui.showMessage('MY앨범 목록이 비어있어 다른 카테고리로 이동할 수 없습니다.', 1500);
                      return;
                 }
                 HealingK.ui.showMessage('MY앨범 목록이 비어있어 건너뜁니다.', 1500);

             } else {
                  HealingK.ui.showMessage('MY앨범 목록이 비어있어 다른 카테고리로 이동할 수 없습니다.', 1500);
                  return;
             }
        }
        this.switchCategory(prevCatIndex);
    },
    goHome(){
        if (HealingK.state.isTransitioning) {
            return;
        }
        if (HealingK.state.currentCategoryIndex === 0 && HealingK.state.currentVideoIndex === 0) {
            if(HealingK.state.isPanelVisible)HealingK.ui.togglePanel();
            return;
        }
        HealingK.state.currentCategoryIndex=0;
        HealingK.state.currentVideoIndex=0;
        if(HealingK.state.isPanelVisible)HealingK.ui.togglePanel();
        HealingK.ui.renderCategoryTabs();
        this.loadCurrentVideo('none');
    },
    enableSound(){ // 페이드아웃 시작 추가
        HealingK.state.soundEnabled=true;
        HealingK.state.isMuted=false;
        if(HealingK.state.player&&HealingK.state.isPlayerReady && typeof HealingK.state.player.unMute === 'function'){
            if(!HealingK.state.isPanelVisible && !HealingK.state.isHelpModalVisible && !HealingK.state.isShareModalVisible){
                try {
                    HealingK.state.player.unMute();
                    // 사운드 활성화 시 볼륨 설정 (기존 originalVolume 또는 새로 저장된 volumeBeforeFade 사용)
                    HealingK.state.player.setVolume(HealingK.state.volumeBeforeFade); // 페이드 아웃 고려
                    // 사운드 활성화 및 재생 상태이면 페이드아웃 모니터링 시작
                    if (HealingK.state.player.getPlayerState() === YT.PlayerState.PLAYING) {
                        HealingK.audioFadeout.startMonitoring();
                    }
                } catch (e) { console.error("Error enabling sound:", e); }
            }
        }
        if (HealingK.elements.hkSoundToggle) HealingK.elements.hkSoundToggle.classList.add('hidden');
        HealingK.ui.updateBottomNav();
        HealingK.ui.showCenterMuteStatus(false);
         HealingK.ui.showUI();
    },
    toggleMute(){ // 페이드아웃 연동 수정
        if(!HealingK.state.soundEnabled){this.enableSound();return;}
        HealingK.state.isMuted=!HealingK.state.isMuted;
        if(HealingK.state.player&&HealingK.state.isPlayerReady && typeof HealingK.state.player.mute === 'function' && typeof HealingK.state.player.unMute === 'function'){
            try {
                if(HealingK.state.isMuted) {
                    HealingK.state.player.mute();
                    HealingK.audioFadeout.stopMonitoring(false); // 음소거 시 페이드아웃 중지 (볼륨 복원 X)
                } else {
                    if(!HealingK.state.isPanelVisible && !HealingK.state.isHelpModalVisible && !HealingK.state.isShareModalVisible){
                       HealingK.state.player.unMute();
                       // 음소거 해제 시 볼륨 복원 (페이드 아웃 고려)
                       HealingK.state.player.setVolume(HealingK.state.volumeBeforeFade);
                       // 음소거 해제 및 재생 상태이면 페이드아웃 모니터링 시작
                       if (HealingK.state.player.getPlayerState() === YT.PlayerState.PLAYING) {
                           HealingK.audioFadeout.startMonitoring();
                       }
                    } else {
                        // 패널/모달 열려있으면 음소거 유지
                        HealingK.state.player.mute();
                    }
                }
            } catch (e) { console.error("Error toggling mute:", e); }
        }
        HealingK.ui.updateBottomNav();
        HealingK.ui.showCenterMuteStatus(HealingK.state.isMuted);
         HealingK.ui.showUI();
    },
    togglePlayPause(){ // 기존과 동일
        if(HealingK.state.player?.getPlayerState && typeof HealingK.state.player.pauseVideo === 'function' && typeof HealingK.state.player.playVideo === 'function'){
            try {
                const pS=HealingK.state.player.getPlayerState();
                if(pS===YT.PlayerState.PLAYING)HealingK.state.player.pauseVideo();
                else if(pS===YT.PlayerState.PAUSED)HealingK.state.player.playVideo();
                else if (pS === YT.PlayerState.ENDED) {
                    HealingK.state.player.seekTo(0);
                    HealingK.state.player.playVideo();
                } else if (pS === YT.PlayerState.CUED) {
                    HealingK.state.player.playVideo();
                }
            } catch (e) { console.error("Error toggling play/pause:", e); }
             HealingK.ui.showUI();
        }
    },
    toggleBookmark(){ // 기존과 동일
        const cV=HealingK.dataManager.getCurrentVideo();
        if(cV)HealingK.dataManager.toggleBookmark(cV.id);
         HealingK.ui.showUI();
    },
     clearAllBookmarks() { // 기존과 동일
         HealingK.dataManager.clearAllBookmarks();
     },
    goToBlogPost() { // 기존과 동일
        if (BLOG_POST_URL === "https://healingk.com" || !BLOG_POST_URL || BLOG_POST_URL === "#") {
            window.location.href = "https://healingk.com";
        } else {
            window.location.href = BLOG_POST_URL; // BLOG_POST_URL은 video-data.js에서 정의
        }
    }
    // --- 기존 코드 끝 ---
  }
};

function onYouTubeIframeAPIReady(){
    initializeHealingKPlayer();
    requestAnimationFrame(() => HealingK.utils.setScreenSize());
};

function initializeHealingKPlayer(){
    if(typeof YT!=='undefined' && YT.Player && !HealingK.state.isInitialized) {
        HealingK.init();
        const urlParams = new URLSearchParams(window.location.search);
        const sharedVideoId = urlParams.get('videoId');
        if (sharedVideoId) {
            HealingK.controller.loadCurrentVideoById(sharedVideoId);
        }
    }
}

document.addEventListener('DOMContentLoaded',function(){
    // YouTube IFrame API 스크립트 로드 확인 로직 추가 (안전성 강화)
    if (typeof YT === 'undefined' || typeof YT.Player === 'undefined') {
        console.log("YouTube IFrame API not ready yet, waiting...");
        // API 로드를 기다렸다가 초기화 시도 (window.onYouTubeIframeAPIReady가 호출되도록 함)
        // 만약 API 스크립트 자체가 로드되지 않았다면 여기서 로드하는 로직 추가 가능
    } else {
        initializeHealingKPlayer();
    }
    requestAnimationFrame(() => HealingK.utils.setScreenSize());
    setTimeout(() => HealingK.utils.setScreenSize(), 100);
    setTimeout(() => HealingK.utils.setScreenSize(), 500);
});

