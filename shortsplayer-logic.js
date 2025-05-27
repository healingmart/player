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
    originalVolume: 100,
    uiAutoTimeoutDuration: 3000,
    recentSearches: [],
    isDraggingProgressBar: false, // 진행바 드래그 상태 추가
    // --- 페이드 아웃 관련 상태 변수 추가 ---
    isFadingOut: false,           // 페이드 아웃 진행 상태
    fadeStartPlayerTime: 0,       // 페이드 아웃 시작 시점의 영상 시간
    initialFadeVolume: 100        // 페이드 아웃 시작 시 볼륨
    // --- 페이드 아웃 관련 상태 변수 추가 끝 ---
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
    if (this.elements.hkHelpMoreLink && typeof HELP_MORE_URL !== 'undefined') { // HELP_MORE_URL 정의 여부 확인
        this.elements.hkHelpMoreLink.href = HELP_MORE_URL;
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
             // Use a custom modal for confirmation instead of confirm()
             HealingK.ui.showConfirmationModal('MY앨범의 모든 영상을 삭제하시겠습니까?', () => {
                 this.controller.clearAllBookmarks();
             });
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
  },
  setupMouseHoverEvents() {
    if (this.state.isTouchDevice || !this.elements.hkSidePanel) return;
    const openPanelWithHover = (mode) => { if (!this.state.isPanelVisible || this.state.panelMode !== mode) { this.state.openedByHover = true; this.ui.togglePanel(mode); } clearTimeout(this.state.panelCloseTimeout); this.state.panelCloseTimeout = null; };
    const rightTrigger = document.querySelector('.hk-mouse-trigger-right');
    if (rightTrigger) rightTrigger.addEventListener('mouseenter', () => openPanelWithHover('search'));
    this.elements.hkSidePanel.addEventListener('mouseleave', () => { if (this.state.isPanelVisible && this.state.openedByHover) { this.state.panelCloseTimeout = setTimeout(() => { if (this.state.isPanelVisible && this.state.openedByHover) this.ui.togglePanel(); }, 300); } });
    this.elements.hkSidePanel.addEventListener('mouseenter', () => clearTimeout(this.state.panelCloseTimeout));
  },
  setupTouchEvents() {
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
  },
  setupAdvancedDragScroll(){
      const setupDrag=(e)=>{if(!e)return;let t=!1,s,o,i=0,l=0,n=0;e.onmousedown=d=>{t=!0,e.classList.add("dragging"),s=d.pageY,o=e.scrollTop,i=0,l=Date.now(),n=d.pageY,d.preventDefault()},e.onmousemove=d=>{if(!t)return;d.preventDefault();const c=Date.now(),r=c-l,a=1.5*(s-d.pageY),h=o+a,p=d.pageY-n;r>0&&(i=p/r),e.scrollTop=Math.max(0,Math.min(h,e.scrollHeight-e.clientHeight)),l=c,n=d.pageY};const u=()=>{t&&(t=!1,e.classList.remove("dragging"),Math.abs(i)>.1&&this.animateInertiaScroll(e,i))};e.onmouseup=u,e.onmouseleave=u,document.onmouseup=u};
      if (!this.state.isTouchDevice && this.elements.hkGridContainer) setupDrag(this.elements.hkGridContainer);
  },
  animateInertiaScroll(e,t){let i=t;const s=.95,o=.1,l=()=>{i*=s,Math.abs(i)<o||(e.scrollTop-=10*i,requestAnimationFrame(l))};requestAnimationFrame(l)},
  setupAutoHideUI(){
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
  }
};

HealingK.progressBar = {
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
        if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
        return `${pad(minutes)}:${pad(seconds)}`;
    },
    updateTooltip(currentTime, duration, event) {
        if (!HealingK.elements.hkProgressBarTooltip) return;
        HealingK.elements.hkProgressBarTooltip.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(duration)}`;
        if (event && HealingK.elements.hkProgressBarContainer) {
            const rect = HealingK.elements.hkProgressBarContainer.getBoundingClientRect();
            let offsetX = event.clientX - rect.left;
            const tooltipWidth = HealingK.elements.hkProgressBarTooltip.offsetWidth;
            const minX = tooltipWidth / 2;
            const maxX = rect.width - tooltipWidth / 2;
            offsetX = Math.max(minX, Math.min(maxX, offsetX));
            HealingK.elements.hkProgressBarTooltip.style.left = `${offsetX}px`;
        }
    },
    handleSeek(event) {
        if (!HealingK.state.player || !HealingK.state.isPlayerReady) return;
        const duration = HealingK.state.player.getDuration();
        if (duration <= 0) return;

        const progressBar = HealingK.elements.hkProgressBarContainer;
        const rect = progressBar.getBoundingClientRect();
        let clientX;

        if (event.type.startsWith('touch')) {
            clientX = event.changedTouches[0].clientX;
        } else {
            clientX = event.clientX;
        }

        const offsetX = clientX - rect.left;
        const barWidth = progressBar.offsetWidth;
        let percentage = offsetX / barWidth;
        percentage = Math.max(0, Math.min(1, percentage));

        const seekTime = percentage * duration;
        HealingK.state.player.seekTo(seekTime, true);

        if (HealingK.elements.hkProgressBarFill) {
            HealingK.elements.hkProgressBarFill.style.width = percentage * 100 + '%';
        }
        this.updateTooltip(seekTime, duration);
        // --- 페이드 아웃 상태 즉시 재평가 ---
        if (HealingK.state.player) { // 플레이어가 존재할 때만
            const FADE_DURATION_SECONDS = 4;
            const currentTime = HealingK.state.player.getCurrentTime(); // seek 후 현재 시간
            const videoDuration = HealingK.state.player.getDuration(); // 총 시간
            const isInFadeZoneAfterSeek = videoDuration > FADE_DURATION_SECONDS && (videoDuration - currentTime) <= FADE_DURATION_SECONDS;

            if (!isInFadeZoneAfterSeek && HealingK.state.isFadingOut) {
                HealingK.state.isFadingOut = false;
                if (!HealingK.state.isMuted && HealingK.state.soundEnabled) {
                    HealingK.state.player.setVolume(HealingK.state.originalVolume);
                }
            } else if (isInFadeZoneAfterSeek && !HealingK.state.isFadingOut) {
                // 만약 seek으로 페이드 구간에 진입했다면, 페이드 시작 상태를 설정
                HealingK.state.isFadingOut = true;
                HealingK.state.fadeStartPlayerTime = currentTime - (FADE_DURATION_SECONDS - (videoDuration - currentTime)); // 페이드가 시작되었어야 할 시간으로 조정
                HealingK.state.initialFadeVolume = HealingK.state.isMuted ? 0 : HealingK.state.originalVolume;
            } else if (isInFadeZoneAfterSeek && HealingK.state.isFadingOut) {
                 // 이미 페이드 중이었고, 여전히 페이드 구간이라면, fadeStartPlayerTime을 현재 상황에 맞게 재조정
                 // (페이드 구간 내에서 앞뒤로 seek 하는 경우를 위함)
                 HealingK.state.fadeStartPlayerTime = currentTime - (FADE_DURATION_SECONDS - (videoDuration - currentTime));
            }
        }
        // --- 페이드 아웃 상태 즉시 재평가 끝 ---
    },
    setupEventListeners() {
        const progressBarContainer = HealingK.elements.hkProgressBarContainer;
        if (!progressBarContainer) return;
        let isDragging = false;
        const onPointerDown = (event) => {
            isDragging = true;
            HealingK.state.isDraggingProgressBar = true;
            this.handleSeek(event);
        };
        const onPointerMove = (event) => {
            if (!isDragging) {
                 if (HealingK.state.player && HealingK.state.isPlayerReady) {
                    const duration = HealingK.state.player.getDuration();
                    if (duration > 0) {
                        const rect = progressBarContainer.getBoundingClientRect();
                        const offsetX = event.clientX - rect.left;
                        const barWidth = progressBarContainer.offsetWidth;
                        let percentage = offsetX / barWidth;
                        percentage = Math.max(0, Math.min(1, percentage));
                        const hoverTime = percentage * duration;
                        this.updateTooltip(hoverTime, duration, event);
                    }
                }
                return;
            }
            this.handleSeek(event);
        };
        const onPointerUp = (event) => {
            if (isDragging) {
                this.handleSeek(event);
                isDragging = false;
                HealingK.state.isDraggingProgressBar = false;
            }
        };
        progressBarContainer.addEventListener('mousedown', onPointerDown);
        document.addEventListener('mousemove', onPointerMove);
        document.addEventListener('mouseup', onPointerUp);
        progressBarContainer.addEventListener('touchstart', (e) => { e.preventDefault(); onPointerDown(e); }, { passive: false });
        document.addEventListener('touchmove', (e) => { if(isDragging) { e.preventDefault(); onPointerMove(e); } }, { passive: false });
        document.addEventListener('touchend', (e) => { if(isDragging) { e.preventDefault(); onPointerUp(e); } }, { passive: false });
        progressBarContainer.addEventListener('mouseenter', () => {
            if (HealingK.elements.hkProgressBarTooltip && HealingK.state.player && HealingK.state.isPlayerReady) {
                const duration = HealingK.state.player.getDuration();
                if (duration > 0) this.updateTooltip(0, duration);
            }
        });
    }
};

HealingK.utils = {
  debounce(func, wait) { let timeout; return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); }; },
  getOptimizedThumbnail(videoId) { const quality = window.innerWidth <= 768 ? 'mqdefault' : 'hqdefault'; return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`; },
  saveToStorage(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.warn('LS save failed:', e); e.message = 'LS save failed: ' + e.message; HealingK.ui.showMessage('데이터 저장에 실패했습니다.', 2000); } },
  loadFromStorage(key, dV = null) { try { const i = localStorage.getItem(key); return i ? JSON.parse(i) : dV; } catch (e) { console.warn('LS load failed:', e); e.message = 'LS load failed: ' + e.message; return dV; } } ,
  setScreenSize() {
    const root = document.getElementById('healingk-player-root');
    if (root) {
        let newHeight = window.innerHeight;
        if (window.visualViewport) {
            newHeight = window.visualViewport.height;
        }
        root.style.height = `${newHeight}px`;
    }
  },
  addTapListener(element, callback) {
    if (!element) return;
    let startX, startY, touchStartTime;
    const tapThreshold = 10;
    const tapDurationThreshold = 300;

    if (HealingK.state.isTouchDevice) {
        element.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            touchStartTime = Date.now();
        }, { passive: true });
        element.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const touchEndTime = Date.now();
            const duration = touchEndTime - touchStartTime;
            const movedX = Math.abs(startX - endX);
            const movedY = Math.abs(startY - endY);

            if (movedX < tapThreshold && movedY < tapThreshold && duration < tapDurationThreshold) {
                callback(e);
            }
        });
        if (!/Mobi|Android/i.test(navigator.userAgent)) {
             element.addEventListener('click', callback);
        }
    } else {
        element.addEventListener('click', callback);
    }
  }
};

HealingK.search = {
  performSearch(query) {
    HealingK.state.searchQuery = query;
    let videosToSearch = [];
    // videoData는 video-data.js에서 로드된다고 가정
    if (typeof videoData === 'undefined') {
        console.error("videoData is not defined. Make sure video-data.js is loaded before shortsplayer-logic.js");
        HealingK.state.searchResults = [];
        if (HealingK.state.isPanelVisible && HealingK.state.panelMode === 'search') HealingK.ui.renderSearchGrid();
        return;
    }

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
    if (typeof videoData === 'undefined') {
        console.error("videoData is not defined.");
        HealingK.ui.showMessage('데이터 오류로 영상을 재생할 수 없습니다.', 2000);
        return;
    }
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
        HealingK.state.recentSearches = HealingK.state.recentSearches.filter(item => item !== query); // HealingK.state 사용
        HealingK.state.recentSearches.unshift(query);
        if (HealingK.state.recentSearches.length > 7) {
            HealingK.state.recentSearches = HealingK.state.recentSearches.slice(0, 7);
        }
        HealingK.utils.saveToStorage('hk-recent-searches', HealingK.state.recentSearches);
    }
};

HealingK.dataManager = {
  getCurrentCategory: () => {
      // MY_ALBUM_CATEGORY_INDEX와 videoData는 video-data.js에서 로드된다고 가정
      if (typeof MY_ALBUM_CATEGORY_INDEX === 'undefined' || typeof videoData === 'undefined') {
          console.error("MY_ALBUM_CATEGORY_INDEX or videoData is not defined.");
          return null;
      }
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

      if (typeof MY_ALBUM_CATEGORY_INDEX === 'undefined') return; // MY_ALBUM_CATEGORY_INDEX 정의 확인

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
             }
          }
      }
  },
  isBookmarked: (vId) => HealingK.state.bookmarkedVideos.includes(vId),
  getBookmarkedVideosFullData: () => {
    if (typeof videoData === 'undefined') { // videoData 정의 확인
        console.error("videoData is not defined for getBookmarkedVideosFullData.");
        return [];
    }
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

        if (typeof MY_ALBUM_CATEGORY_INDEX === 'undefined') return; // MY_ALBUM_CATEGORY_INDEX 정의 확인

         if (HealingK.state.currentCategoryIndex === MY_ALBUM_CATEGORY_INDEX || (HealingK.state.isPanelVisible && HealingK.state.panelMode === 'search' && HealingK.state.searchSort === 'bookmarks')) {
             HealingK.ui.renderActiveGrid();
             if (HealingK.state.currentCategoryIndex === MY_ALBUM_CATEGORY_INDEX) {
                HealingK.controller.goHome();
             }
         }
   }
};

HealingK.share = {
  generateShareUrl() {
    const currentVideo = HealingK.dataManager.getCurrentVideo();
    // BLOG_POST_URL은 video-data.js에서 로드된다고 가정
    const baseUrl = (typeof BLOG_POST_URL !== 'undefined' ? BLOG_POST_URL.replace(/\/+$/, '') : window.location.origin) + '/?';

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
          document.execCommand('copy'); // Fallback for older browsers
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

    if (navigator.share) {
        try {
          await navigator.share({ title: title, text: text, url: url });
        } catch (err) {
          console.log('Native share failed or user cancelled.', err);
          // Do not show error message if user cancelled.
          if (err.name !== 'AbortError') {
            // HealingK.ui.showMessage('공유에 실패했습니다.'); // It's often better not to show an error for native share failure
          }
        }
    } else {
        HealingK.ui.showMessage('이 브라우저에서는 공유 기능을 지원하지 않습니다.');
    }
  }
};

HealingK.ui = {
    renderCategoryTabs() {
        const tabsContainer = HealingK.elements.hkCategoryTabs;
        if(!tabsContainer)return;
        tabsContainer.innerHTML='';
        if (typeof videoData === 'undefined' || typeof MY_ALBUM_CATEGORY_INDEX === 'undefined') { // videoData, MY_ALBUM_CATEGORY_INDEX 정의 확인
            console.error("videoData or MY_ALBUM_CATEGORY_INDEX is not defined for renderCategoryTabs.");
            return;
        }
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
            activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
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
            img.onerror = function(){ this.onerror=null; this.src='https://placehold.co/180x320/111111/FFFFFF?text=Error'; console.error(`Failed to load thumbnail for video ID: ${vid.videoUrl}`); };

            const lbl=document.createElement('div'); lbl.className='hk-grid-item-label';
            const tit=document.createElement('div'); tit.className='hk-grid-item-title'; tit.textContent=vid.title;

            lbl.appendChild(tit); gi.appendChild(img); gi.appendChild(lbl);
            HealingK.utils.addTapListener(gi, clickHandler);
        } else {
            gi.textContent = "정보 없음"; // Should not happen if vid is always provided
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
            nR.textContent = category && category.category === "MY앨범" ? 'MY앨범 목록이 비어있습니다.' : '영상이 없습니다.';
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
      if (elements.hkSidePanel) elements.hkSidePanel.classList.toggle('active', shouldBeVisible);


      if (!shouldBeVisible) {
          if (elements.hkSearchInput) elements.hkSearchInput.blur();
          this.toggleRecentSearches(false);
          if (state.panelMode === 'search') {
              if (elements.hkSearchInput) {
                  elements.hkSearchInput.value = '';
                   if (elements.hkSearchClear) elements.hkSearchClear.style.display = 'none'; // Clear button hide
              }
              HealingK.search.performSearch(''); // Reset search results when closing search panel
          }
      }

      if (elements.hkSidePanel && elements.hkPanelClose) { // Check if elements exist
        elements.hkSidePanel.setAttribute('data-mode', shouldBeVisible ? state.panelMode : '');
        elements.hkPanelClose.style.display = shouldBeVisible ? 'flex' : 'none';
      }


      if (shouldBeVisible) {
          if (state.player && state.isPlayerReady) {
             state.originalVolume = state.player.getVolume(); // Store current volume before muting
             state.player.mute();
          }
          this.hideUI(); // Hide main player UI
          clearTimeout(HealingK.state.uiTimeout); // Clear auto-hide timeout

          if (state.panelMode === 'search') {
              if (elements.hkPanelTitle) elements.hkPanelTitle.innerHTML='🔍 검색';
              if (elements.hkSearchElements) elements.hkSearchElements.style.display='block';
              if (elements.hkMyAlbumControls) elements.hkMyAlbumControls.style.display = 'none';
          } else { // thumbnail mode
              if (elements.hkPanelTitle) elements.hkPanelTitle.innerHTML = (state.currentCategoryIndex === MY_ALBUM_CATEGORY_INDEX) ? '❤️ MY앨범' : '📋 재생목록';
              if (elements.hkSearchElements) elements.hkSearchElements.style.display='none';
              if (elements.hkMyAlbumControls) {
                    elements.hkMyAlbumControls.style.display = (state.panelMode === 'thumbnail' && state.currentCategoryIndex === MY_ALBUM_CATEGORY_INDEX) ? 'flex' : 'none';
               }
          }
          this.renderActiveGrid();
      } else { // Panel is closing
          if (state.player && state.isPlayerReady && state.soundEnabled && !state.isMuted) { // If sound should be on
             state.player.unMute();
             if (state.originalVolume !== undefined) state.player.setVolume(state.originalVolume);
          } else if (state.player && state.isPlayerReady) { // If sound should be off (e.g. user muted it)
             state.player.mute();
          }
          this.showUI(); // Show main player UI
      }
      this.updateBottomNav();
  },
  updateIndicator(){
    if(!HealingK.elements.hkIndicator)return;
    const cat=HealingK.dataManager.getCurrentCategory();
    if(!cat) {
        HealingK.elements.hkIndicator.innerHTML = '';
        return;
    }

    const videos = cat.videos || [];
    const totalVideos = videos.length;
    const currentVideo=HealingK.dataManager.getCurrentVideo();

    if(!currentVideo || totalVideos === 0) {
        HealingK.elements.hkIndicator.innerHTML = cat.category === "MY앨범" ? '<div><strong>MY앨범</strong><small>목록이 비어있습니다.</small></div>' : '';
        return;
    }
    const currentVideoNum = HealingK.state.currentVideoIndex+1;
    const title = currentVideo.title || "";
    const artist = currentVideo.artist || "";

    HealingK.elements.hkIndicator.innerHTML=`
        <div style="line-height: 1.3; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
            <div style="font-weight: bold;">${currentVideoNum}/${totalVideos}</div>
            <div style="font-size: 0.9em; margin-top: 2px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${title}</div>
            ${artist ? `<small style="font-size: 0.8em; opacity: 0.8; margin-top: 1px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; display: block;">${artist}</small>` : ''}
        </div>`;
  },
  showIndicator(message, duration = 2000) {
    // This function is for temporary messages, not the main video info indicator
    if (!HealingK.elements.hkIndicator) return;

    const originalContent = HealingK.elements.hkIndicator.innerHTML; // Save current content
    const originalPointerEvents = HealingK.elements.hkIndicator.style.pointerEvents;

    const tempIndicatorDiv = document.createElement('div');
    tempIndicatorDiv.textContent = message;
    tempIndicatorDiv.style.padding = '5px 10px';
    tempIndicatorDiv.style.fontWeight = 'normal'; // Ensure it doesn't inherit bold from main indicator

    HealingK.elements.hkIndicator.innerHTML = ''; // Clear current content
    HealingK.elements.hkIndicator.appendChild(tempIndicatorDiv);
    HealingK.elements.hkIndicator.classList.add('visible'); // Make sure it's visible
    HealingK.elements.hkIndicator.style.pointerEvents = 'none'; // Prevent interaction with temp message

    clearTimeout(HealingK.indicatorTimeout); // Clear any existing timeout for this specific message
    HealingK.indicatorTimeout = setTimeout(() => {
        HealingK.elements.hkIndicator.innerHTML = originalContent; // Restore original content
        HealingK.elements.hkIndicator.style.pointerEvents = originalPointerEvents; // Restore original pointer events
        // Visibility depends on uiVisible state, which updateIndicator handles
        if (!HealingK.state.uiVisible) {
            HealingK.elements.hkIndicator.classList.remove('visible');
        } else {
            HealingK.elements.hkIndicator.classList.add('visible');
        }
        this.updateIndicator(); // Refresh main indicator content if needed
    }, duration);
  },
  updateBottomNav(){
      const buttonIds = ['hk-nav-back-to-blog', 'hk-nav-search', 'hk-nav-play-pause', 'hk-nav-volume', 'hk-nav-home', 'hk-nav-bookmark', 'hk-nav-share', 'hk-nav-help'];
      buttonIds.forEach(id => {
          const el = document.getElementById(id);
          if (!el) return;
          let isActive = false;
          const icon = el.querySelector('i');

          switch(id) {
              case 'hk-nav-play-pause':
                  const playerState = HealingK.state.player?.getPlayerState();
                   if (HealingK.state.isPanelVisible || HealingK.state.isHelpModalVisible || HealingK.state.isShareModalVisible) {
                       if(icon) icon.className = 'fa fa-pause'; // Show pause when modals/panel open as video is programmatically paused/muted
                       isActive = true; // Consider it "active" in the sense that interaction is with the modal/panel
                   } else {
                       if(icon) icon.className = (playerState === YT.PlayerState.PLAYING || playerState === YT.PlayerState.BUFFERING) ? 'fa fa-play' : 'fa fa-pause';
                       isActive = (playerState === YT.PlayerState.PLAYING || playerState === YT.PlayerState.BUFFERING);
                   }
                  break;
              case 'hk-nav-volume':
                  const isSoundEffectivelyOff = HealingK.state.isMuted || !HealingK.state.soundEnabled || HealingK.state.isPanelVisible || HealingK.state.isHelpModalVisible || HealingK.state.isShareModalVisible;
                  if(icon) icon.className = isSoundEffectivelyOff ? 'fa fa-volume-mute' : 'fa fa-volume-up';
                  isActive = HealingK.state.isMuted; // Active state reflects user's mute preference
                  break;
              case 'hk-nav-search':
                  isActive = HealingK.state.isPanelVisible && HealingK.state.panelMode === 'search';
                  break;
              case 'hk-nav-bookmark':
                  const curVid = HealingK.dataManager.getCurrentVideo();
                  if (curVid) {
                      isActive = HealingK.dataManager.isBookmarked(curVid.id);
                      if(icon) icon.className = isActive ? 'fa fa-bookmark' : 'far fa-bookmark';
                  } else {
                      if(icon) icon.className = 'far fa-bookmark'; // Default if no current video
                  }
                  break;
              case 'hk-nav-help':
                  isActive = HealingK.state.isHelpModalVisible;
                  break;
              case 'hk-nav-share':
                  isActive = HealingK.state.isShareModalVisible;
                  break;
              // For hk-nav-home and hk-nav-back-to-blog, isActive is usually false unless a specific state is desired
              case 'hk-nav-home': isActive = false; break;
              case 'hk-nav-back-to-blog': isActive = false; break;
          }
          // Apply 'active' class for visual feedback on relevant buttons
          if (['hk-nav-play-pause', 'hk-nav-volume', 'hk-nav-search', 'hk-nav-bookmark', 'hk-nav-help', 'hk-nav-share'].includes(id)) {
            el.classList.toggle('active', isActive);
          } else {
             el.classList.remove('active'); // Ensure others don't have it
          }
      });
  },
  updatePlayerUIStates() {
    this.updateBottomNav();
    const playerState = HealingK.state.player?.getPlayerState();
    if (playerState === YT.PlayerState.PLAYING) { // Only update indicator if playing
        this.updateIndicator();
    }
  },
  showLoading(){
      if(HealingK.elements.hkLoading) {
          HealingK.elements.hkLoading.style.display = 'flex';
          requestAnimationFrame(() => { // Ensure display change is processed before class change
              if(HealingK.elements.hkLoading) HealingK.elements.hkLoading.classList.remove('hidden');
          });
      }
  },
  hideLoading(){
      if(HealingK.elements.hkLoading) {
          HealingK.elements.hkLoading.classList.add('hidden');
          // Wait for CSS transition to complete before setting display to none
          setTimeout(() => {
              if (HealingK.elements.hkLoading && HealingK.elements.hkLoading.classList.contains('hidden')) {
                  HealingK.elements.hkLoading.style.display = 'none';
              }
          }, 300); // Match this duration with CSS transition duration for .hk-loading.hidden
      }
  },
  toggleHelpModal() {
    HealingK.state.isHelpModalVisible = !HealingK.state.isHelpModalVisible;
    if (HealingK.elements.hkHelpModal) {
        HealingK.elements.hkHelpModal.classList.toggle('active', HealingK.state.isHelpModalVisible);
    }
    if (HealingK.elements.body) HealingK.elements.body.classList.toggle('modal-open', HealingK.state.isHelpModalVisible);


    if (HealingK.state.isHelpModalVisible) {
        if (HealingK.state.player && HealingK.state.isPlayerReady) {
            HealingK.state.originalVolume = HealingK.state.player.getVolume(); // Store before muting
            HealingK.state.player.mute();
        }
        this.hideUI();
        clearTimeout(HealingK.state.uiTimeout);
    } else {
        if (HealingK.state.player && HealingK.state.isPlayerReady && HealingK.state.soundEnabled && !HealingK.state.isMuted) {
            HealingK.state.player.unMute();
             if (HealingK.state.originalVolume !== undefined) HealingK.state.player.setVolume(HealingK.state.originalVolume);
        } else if (HealingK.state.player && HealingK.state.isPlayerReady) { // Still ensure it's muted if sound shouldn't be on
             HealingK.state.player.mute();
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
    if (HealingK.elements.body) HealingK.elements.body.classList.toggle('modal-open', HealingK.state.isShareModalVisible);


    if (HealingK.state.isShareModalVisible) {
        if (HealingK.state.player && HealingK.state.isPlayerReady) {
            HealingK.state.originalVolume = HealingK.state.player.getVolume(); // Store before muting
            HealingK.state.player.mute();
        }
        this.hideUI();
        clearTimeout(HealingK.state.uiTimeout);
    } else {
        if (HealingK.state.player && HealingK.state.isPlayerReady && HealingK.state.soundEnabled && !HealingK.state.isMuted) {
            HealingK.state.player.unMute();
             if (HealingK.state.originalVolume !== undefined) HealingK.state.player.setVolume(HealingK.state.originalVolume);
        } else if (HealingK.state.player && HealingK.state.isPlayerReady) { // Still ensure it's muted if sound shouldn't be on
             HealingK.state.player.mute();
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

    // Only show if no other major UI element is active
    if (HealingK.state.isPanelVisible || HealingK.state.isHelpModalVisible || HealingK.state.isShareModalVisible) return;

    HealingK.elements.hkCenterMuteStatus.classList.add('visible');
    clearTimeout(HealingK.state.centerMuteStatusTimeout);
    HealingK.state.centerMuteStatusTimeout = setTimeout(() => {
        if(HealingK.elements.hkCenterMuteStatus) HealingK.elements.hkCenterMuteStatus.classList.remove('visible');
    }, 1500);
  },
  startProgressBarUpdate() {
    if (!HealingK.elements.hkProgressBarFill || HealingK.state.isDraggingProgressBar) return;
    if (HealingK.state.progressBarRAF) return; // Already running

    function update() {
        if (HealingK.state.isDraggingProgressBar) {
             if (HealingK.state.progressBarRAF) {
                cancelAnimationFrame(HealingK.state.progressBarRAF);
                HealingK.state.progressBarRAF = null;
             }
            return;
        }

        const player = HealingK.state.player;
        if (player && player.getPlayerState && player.getPlayerState() === YT.PlayerState.PLAYING) {
            const currentTime = player.getCurrentTime();
            const duration = player.getDuration();

            if (duration > 0) {
                const percentage = (currentTime / duration) * 100;
                if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = percentage + '%';

                // --- START FADE OUT LOGIC ---
                const FADE_DURATION_SECONDS = 4;
                const isInFadeZone = duration > FADE_DURATION_SECONDS && (duration - currentTime) <= FADE_DURATION_SECONDS;

                if (isInFadeZone) {
                    if (!HealingK.state.isFadingOut) {
                        HealingK.state.isFadingOut = true;
                        HealingK.state.fadeStartPlayerTime = currentTime;
                        HealingK.state.initialFadeVolume = HealingK.state.isMuted ? 0 : HealingK.state.originalVolume;
                    }

                    const timeIntoFade = currentTime - HealingK.state.fadeStartPlayerTime;
                    let fadeProgress = timeIntoFade / FADE_DURATION_SECONDS;
                    fadeProgress = Math.max(0, Math.min(1, fadeProgress));

                    const targetVolume = HealingK.state.initialFadeVolume * (1 - fadeProgress);

                    if (!HealingK.state.isMuted && HealingK.state.soundEnabled && player.setVolume) {
                        player.setVolume(Math.round(targetVolume));
                    }
                } else {
                    if (HealingK.state.isFadingOut) {
                        HealingK.state.isFadingOut = false;
                        if (player.setVolume && !HealingK.state.isMuted && HealingK.state.soundEnabled) {
                            player.setVolume(HealingK.state.originalVolume);
                        }
                    }
                }
                // --- END FADE OUT LOGIC ---
            } else {
                if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '0%';
            }
            HealingK.state.progressBarRAF = requestAnimationFrame(update);
        } else {
             if (HealingK.state.progressBarRAF) {
                cancelAnimationFrame(HealingK.state.progressBarRAF);
                HealingK.state.progressBarRAF = null;
             }
             // If player stopped/paused not in fade zone, ensure fade state is reset
             if (HealingK.state.isFadingOut) {
                 HealingK.state.isFadingOut = false;
                 // Optionally restore volume if needed, though onPlayerStateChange might handle it
                 if (player && player.setVolume && !HealingK.state.isMuted && HealingK.state.soundEnabled) {
                     player.setVolume(HealingK.state.originalVolume);
                 }
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
          const playerState = HealingK.state.player?.getPlayerState?.();
           if (playerState === YT.PlayerState.ENDED) {
               HealingK.elements.hkProgressBarFill.style.width = '100%';
           }
      }
  },
  // Custom confirmation modal
  showConfirmationModal(message, onConfirm, onCancel) {
    // Remove any existing modal first
    const existingModal = document.getElementById('hk-confirmation-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'hk-confirmation-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0,0,0,0.7); display: flex; align-items: center;
        justify-content: center; z-index: 10000; padding: 15px;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background-color: #333; color: #fff; padding: 25px; border-radius: 8px;
        text-align: center; max-width: 300px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    `;

    const messageP = document.createElement('p');
    messageP.textContent = message;
    messageP.style.marginBottom = '20px';
    messageP.style.fontSize = '16px';
    messageP.style.lineHeight = '1.5';


    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-around';


    const confirmButton = document.createElement('button');
    confirmButton.textContent = '확인';
    confirmButton.style.cssText = `
        padding: 10px 20px; background-color: var(--accent-color, #E91E63); color: white;
        border: none; border-radius: 5px; cursor: pointer; font-size: 14px;
    `;
    confirmButton.onclick = () => {
        if (onConfirm) onConfirm();
        modal.remove();
    };

    const cancelButton = document.createElement('button');
    cancelButton.textContent = '취소';
    cancelButton.style.cssText = `
        padding: 10px 20px; background-color: #555; color: white;
        border: none; border-radius: 5px; cursor: pointer; font-size: 14px;
    `;
    cancelButton.onclick = () => {
        if (onCancel) onCancel();
        modal.remove();
    };

    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(confirmButton);
    modalContent.appendChild(messageP);
    modalContent.appendChild(buttonContainer);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  }
};

HealingK.youtubeManager = {
  initPlayer(vId, animationDirection = 'none'){
    HealingK.state.isFadingOut = false; // Reset fade state for new player
    if(HealingK.state.player) {
        HealingK.ui.stopProgressBarUpdate();
        if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '0%';
        HealingK.progressBar.updateTooltip(0,0);

        HealingK.state.player.destroy();
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

    HealingK.state.player=new YT.Player('hk-youtube-embed',{
        height:'100%',width:'100%',videoId:vId,
        playerVars:{autoplay:1,controls:0,disablekb:1,enablejsapi:1,fs:0,iv_load_policy:3,modestbranding:1,rel:0,showinfo:0,mute:HealingK.state.isMuted ? 1:0},
        events:{onReady:(e)=>this.onPlayerReady(e, animationDirection),onStateChange:(e)=>this.onPlayerStateChange(e),onError:(e)=>this.onPlayerError(e)}
    });
  },

  onPlayerReady(evt, animationDirection){
      HealingK.state.isPlayerReady=true;
      HealingK.state.isFadingOut = false; // Ensure fade state is reset on ready

      if (HealingK.state.isMuted || !HealingK.state.soundEnabled || HealingK.state.isPanelVisible || HealingK.state.isHelpModalVisible || HealingK.state.isShareModalVisible) {
          evt.target.mute();
      } else {
          evt.target.unMute();
      }
       if (HealingK.state.originalVolume !== undefined) {
           evt.target.setVolume(HealingK.state.originalVolume);
       } else {
           evt.target.setVolume(100); // Default volume
       }

       if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '0%';
       const duration = evt.target.getDuration();
       HealingK.progressBar.updateTooltip(0, duration);
  },

  loadVideo(vId,animationDirection='none'){
    HealingK.state.isFadingOut = false; // Reset fade state before loading new video
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

    if(HealingK.state.player&&HealingK.state.isPlayerReady){
      HealingK.state.player.loadVideoById({
        videoId:vId,
        playerVars:{
          autoplay:1,controls:0,disablekb:1,enablejsapi:1,fs:0,
          iv_load_policy:3,modestbranding:1,rel:0,showinfo:0,
          mute:HealingK.state.isMuted?1:0
        }
      });
      const iframe = playerEmbed.querySelector('iframe');
      if (iframe) {
        let src = iframe.getAttribute('src');
        if (src) {
          if (src.includes('rel=')) {
            src = src.replace(/rel=\d+/g, 'rel=0');
          } else {
            src += (src.includes('?') ? '&' : '?') + 'rel=0';
          }
          iframe.setAttribute('src', src);
        }
      }
    }else{
      this.initPlayer(vId,animationDirection);
    }
    this.preloadNextThumbnail();
  },

  onPlayerStateChange(evt){
    if(!evt.target || !evt.target.getPlayerState)return; // Ensure target and method exist
    const playerState=evt.data;
    const playerEmbed=HealingK.elements.hkYoutubeEmbed;
    const duration = evt.target.getDuration ? evt.target.getDuration() : 0;


    if (duration > 0 && HealingK.state.player && HealingK.state.player.getCurrentTime) {
        HealingK.progressBar.updateTooltip(HealingK.state.player.getCurrentTime(), duration);
    }

    const iframe = playerEmbed?.querySelector('iframe');
    if (iframe) {
      let src = iframe.getAttribute('src');
      if (src && !src.includes('rel=0')) {
        src = src.replace(/rel=\d+/g, '');
        src += (src.includes('?') ? '&' : '?') + 'rel=0';
        iframe.setAttribute('src', src);
      }
    }

    switch(playerState){
      case YT.PlayerState.ENDED:
            HealingK.state.isFadingOut = false; // Reset fade state on end
            if (!HealingK.state.isTransitioning) {
                 HealingK.ui.showLoading();
            }
            HealingK.ui.stopProgressBarUpdate();
            if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '100%';

            setTimeout(() => {
                HealingK.controller.playNextVideoWithAnimation();
            }, 100);
            break;
      case YT.PlayerState.PLAYING:{
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
        HealingK.ui.startProgressBarUpdate(); // This will handle fade out if needed

        if(HealingK.state.isPanelVisible||HealingK.state.isHelpModalVisible||HealingK.state.isShareModalVisible || !HealingK.state.soundEnabled||HealingK.state.isMuted) {
            if (evt.target.mute) evt.target.mute();
        } else {
             if (HealingK.state.originalVolume !== undefined && evt.target.setVolume) {
                 evt.target.setVolume(HealingK.state.originalVolume);
             } else if (evt.target.setVolume) {
                 evt.target.setVolume(100);
             }
             if (evt.target.unMute) evt.target.unMute();
        }
        if (HealingK.state.uiVisible) HealingK.ui.showUI(); // Refresh UI visibility based on state
        break;
      }
      case YT.PlayerState.PAUSED:
            HealingK.ui.hideLoading();
            HealingK.ui.stopProgressBarUpdate(); // Stop progress bar and fade out checks
            clearTimeout(HealingK.state.uiTimeout);
            break;
      case YT.PlayerState.BUFFERING:{
        const ph=HealingK.elements.hkVideoPlaceholder;
        if(ph)ph.classList.remove('hidden');
        HealingK.ui.showLoading();
        HealingK.ui.stopProgressBarUpdate();
        if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '0%';
        clearTimeout(HealingK.state.uiTimeout);
        break;
      }
      case YT.PlayerState.CUED:
             HealingK.ui.showLoading();
             HealingK.ui.stopProgressBarUpdate();
             if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '0%';
            clearTimeout(HealingK.state.uiTimeout);
            break;
      default:
             HealingK.ui.stopProgressBarUpdate();
             if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '0%';
            clearTimeout(HealingK.state.uiTimeout);
            break;
    }
    HealingK.ui.updatePlayerUIStates();
  },

  onPlayerError(evt){
      console.error('YT Player Error:',evt.data, 'Video ID:', HealingK.state.player?.getVideoData?.()?.video_id);
      HealingK.state.isFadingOut = false; // Reset fade state on error
      HealingK.ui.hideLoading();
       HealingK.state.isTransitioning = false;
       const playerEmbed = HealingK.elements.hkYoutubeEmbed;
        if (playerEmbed) {
            playerEmbed.style.transition = 'opacity 0.3s ease';
            playerEmbed.style.transform = 'translateY(0)';
            playerEmbed.style.opacity = 1;
        }
       HealingK.ui.stopProgressBarUpdate();
       if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '0%';

       HealingK.controller.playNextVideoWithAnimation();
  },

  preloadNextThumbnail(){
    const cat=HealingK.dataManager.getCurrentCategory();
    if(!cat||cat.videos.length===0)return;
    const nextIdx=(HealingK.state.currentVideoIndex+1)%cat.videos.length;
    const nextVid=cat.videos[nextIdx];
    if(!nextVid)return;
    const img=new Image();
    img.src=HealingK.utils.getOptimizedThumbnail(nextVid.videoUrl);
  }
};

HealingK.controller = {
  switchCategory(idx){
    if (HealingK.state.isTransitioning) {
        return;
    }
    if (typeof videoData === 'undefined' || typeof MY_ALBUM_CATEGORY_INDEX === 'undefined') return;
    const totalCategories = videoData.length + 1; // +1 for MY앨범
    if (idx < 0 || idx >= totalCategories) return;

    if (idx === MY_ALBUM_CATEGORY_INDEX && HealingK.dataManager.getBookmarkedVideosFullData().length === 0) {
        HealingK.ui.showMessage('MY앨범 목록이 비어있습니다.', 2000);
        return;
    }

    HealingK.state.currentCategoryIndex = idx;
    HealingK.state.currentVideoIndex=0;
    HealingK.ui.renderCategoryTabs();
    this.loadCurrentVideo('none');
    if(HealingK.state.isPanelVisible && HealingK.state.panelMode==='thumbnail') {
        HealingK.ui.renderThumbnailGrid();
        if (HealingK.elements.hkPanelTitle) {
            HealingK.elements.hkPanelTitle.innerHTML = (idx === MY_ALBUM_CATEGORY_INDEX) ? '❤️ MY앨범' : '📋 재생목록';
        }
        if (HealingK.elements.hkMyAlbumControls) {
             HealingK.elements.hkMyAlbumControls.style.display = (idx === MY_ALBUM_CATEGORY_INDEX) ? 'flex' : 'none';
        }
    }
  },
  switchVideo(idx, animationDirection = 'none'){
     if (HealingK.state.isTransitioning && animationDirection !== 'none') {
         return;
     }

    const cat=HealingK.dataManager.getCurrentCategory();
    if(!cat || cat.videos.length===0 || idx<0 || idx>=cat.videos.length) {
        HealingK.state.isTransitioning = false;
        HealingK.ui.hideLoading();
        if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '0%';
        HealingK.progressBar.updateTooltip(0,0);
        if (cat && cat.category === "MY앨범") HealingK.ui.showMessage('MY앨범 목록에 더 이상 영상이 없습니다.', 1500);
        return;
    }
    const currentVideo = HealingK.dataManager.getCurrentVideo();
    // Check if it's actually a different video before proceeding
    if (currentVideo && cat.videos[idx] && currentVideo.id === cat.videos[idx].id && animationDirection !== 'none') {
         // If it's the same video and an animation is requested (likely from swipe on single item category),
         // still allow transition for visual feedback, but don't fully reload.
         // Or, if no animation, and it's the same video, just close panel if open.
    } else if (currentVideo && cat.videos[idx] && currentVideo.id === cat.videos[idx].id) {
         HealingK.state.isTransitioning = false;
         HealingK.ui.hideLoading();
         // HealingK.ui.stopProgressBarUpdate(); // No need, it will continue or be handled by state change
         if(HealingK.state.isPanelVisible && animationDirection === 'none') {
             HealingK.ui.togglePanel();
         }
         return;
    }


    HealingK.state.currentVideoIndex=idx;
    this.loadCurrentVideo(animationDirection);
    if(HealingK.state.isPanelVisible && animationDirection === 'none') { // Close panel if a video is selected from it
        HealingK.ui.togglePanel();
    }
  },
  loadCurrentVideo(animationDirection = 'none'){
    if (animationDirection !== 'none') {
         HealingK.state.isTransitioning = true;
    } else {
         HealingK.state.isTransitioning = false; // Ensure it's reset if no animation
    }
    HealingK.state.isFadingOut = false; // Reset fade state for new video


    const vid=HealingK.dataManager.getCurrentVideo();
    if(vid){
      HealingK.youtubeManager.loadVideo(vid.videoUrl, animationDirection);
      HealingK.ui.updateIndicator(); // Update indicator as soon as new video is chosen
      HealingK.ui.updateBottomNav(); // Update bookmark status immediately
    }else{
      HealingK.ui.hideLoading();
      HealingK.state.isTransitioning = false;
      if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '0%';
      HealingK.progressBar.updateTooltip(0,0);
      HealingK.ui.updateIndicator(); // Clear indicator or show empty message
       if (typeof MY_ALBUM_CATEGORY_INDEX !== 'undefined' && HealingK.state.currentCategoryIndex === MY_ALBUM_CATEGORY_INDEX) {
            HealingK.ui.showMessage('MY앨범 목록이 비어있습니다. 홈으로 이동합니다.', 2000);
            this.goHome();
       }
    }
  },
  loadCurrentVideoById(videoId) {
    if (typeof videoData === 'undefined') return;
    const allVideosFlat = videoData.flatMap((cat, catIdx) => cat.videos.map(vid => ({ ...vid, originalCategoryIndex: catIdx })));
    const videoInfo = allVideosFlat.find(v => v.id === videoId);

    if (videoInfo) {
        HealingK.state.currentCategoryIndex = videoInfo.originalCategoryIndex;
        HealingK.state.currentVideoIndex = videoData[videoInfo.originalCategoryIndex].videos.findIndex(v => v.id === videoId);
        HealingK.ui.renderCategoryTabs();
        this.loadCurrentVideo('none');
    } else {
        console.warn(`Video ID ${videoId} not found in videoData.`);
        this.goHome(); // Go to a default state
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
    if (HealingK.state.isTransitioning) return;
    if (typeof videoData === 'undefined' || typeof MY_ALBUM_CATEGORY_INDEX === 'undefined') return;

    const totalCategories = videoData.length + 1; // +1 for MY앨범
    let nextCatIndex = (HealingK.state.currentCategoryIndex + 1);
     if (nextCatIndex >= totalCategories) nextCatIndex = 0; // Loop back to the first category

    // Skip MY앨범 if empty, unless it's the only category
    if (nextCatIndex === MY_ALBUM_CATEGORY_INDEX && HealingK.dataManager.getBookmarkedVideosFullData().length === 0) {
        if (totalCategories > 1) { // If there are other categories to go to
             nextCatIndex = (nextCatIndex + 1) % totalCategories; // Try the one after MY앨범
             // If that's also MY앨범 (e.g., only one real category and empty MY앨범), it will loop to 0
             if (nextCatIndex === MY_ALBUM_CATEGORY_INDEX && HealingK.dataManager.getBookmarkedVideosFullData().length === 0) {
                 nextCatIndex = 0; // Fallback to the very first category
             }
             HealingK.ui.showMessage('MY앨범 목록이 비어있어 건너뜁니다.', 1500);
        } else { // MY앨범 is the only "category" and it's empty
             HealingK.ui.showMessage('MY앨범 목록이 비어있어 다른 카테고리로 이동할 수 없습니다.', 1500);
             return; // No other category to switch to
        }
    }
    this.switchCategory(nextCatIndex);
  },
  prevCategory(){
    if (HealingK.state.isTransitioning) return;
    if (typeof videoData === 'undefined' || typeof MY_ALBUM_CATEGORY_INDEX === 'undefined') return;

    const totalCategories = videoData.length + 1; // +1 for MY앨범
    let prevCatIndex = (HealingK.state.currentCategoryIndex - 1 + totalCategories) % totalCategories;

    // Skip MY앨범 if empty, unless it's the only category
    if (prevCatIndex === MY_ALBUM_CATEGORY_INDEX && HealingK.dataManager.getBookmarkedVideosFullData().length === 0) {
         if (totalCategories > 1) { // If there are other categories
             prevCatIndex = (prevCatIndex - 1 + totalCategories) % totalCategories; // Try the one before MY앨범
             // If that's also MY앨범 (e.g. only one real category and empty MY앨범 was skipped to)
             if (prevCatIndex === MY_ALBUM_CATEGORY_INDEX && HealingK.dataManager.getBookmarkedVideosFullData().length === 0) {
                 // Fallback to the last "real" category if MY앨범 was the one before index 0
                 prevCatIndex = videoData.length -1; // This should be the last actual data category
                 if (prevCatIndex < 0) prevCatIndex = 0; // Safety for no real categories
             }
             HealingK.ui.showMessage('MY앨범 목록이 비어있어 건너뜁니다.', 1500);
         } else { // MY앨범 is the only "category" and it's empty
              HealingK.ui.showMessage('MY앨범 목록이 비어있어 다른 카테고리로 이동할 수 없습니다.', 1500);
              return; // No other category to switch to
         }
    }
    this.switchCategory(prevCatIndex);
  },
  goHome(){
    if (HealingK.state.isTransitioning) return;
    // Check if already at home (first video of first category)
    if (HealingK.state.currentCategoryIndex === 0 && HealingK.state.currentVideoIndex === 0) {
        if(HealingK.state.isPanelVisible) HealingK.ui.togglePanel(); // Just close panel if open
        return;
    }
    HealingK.state.currentCategoryIndex=0;
    HealingK.state.currentVideoIndex=0;
    if(HealingK.state.isPanelVisible) HealingK.ui.togglePanel();
    HealingK.ui.renderCategoryTabs();
    this.loadCurrentVideo('none');
  },
  enableSound(){
    HealingK.state.soundEnabled=true;
    HealingK.state.isMuted=false; // Enabling sound implies unmuting
    if(HealingK.state.player&&HealingK.state.isPlayerReady&&!HealingK.state.isPanelVisible && !HealingK.state.isHelpModalVisible && !HealingK.state.isShareModalVisible){
        HealingK.state.player.unMute();
        if (HealingK.state.originalVolume !== undefined) {
            HealingK.state.player.setVolume(HealingK.state.originalVolume);
        } else {
            HealingK.state.player.setVolume(100); // Default volume
        }
    }
    if (HealingK.elements.hkSoundToggle) HealingK.elements.hkSoundToggle.classList.add('hidden');
    HealingK.ui.updateBottomNav();
    HealingK.ui.showCenterMuteStatus(false); // Show unmuted status
     HealingK.ui.showUI(); // Ensure UI is visible to reflect change
  },
  toggleMute(){
    if(!HealingK.state.soundEnabled){this.enableSound();return;} // First interaction enables sound and unmutes

    HealingK.state.isMuted=!HealingK.state.isMuted;
    if(HealingK.state.player&&HealingK.state.isPlayerReady){
      if(HealingK.state.isMuted) {
          HealingK.state.player.mute();
      } else { // Unmuting
          // Only unmute if no panel/modal is active
          if(!HealingK.state.isPanelVisible && !HealingK.state.isHelpModalVisible && !HealingK.state.isShareModalVisible){
             HealingK.state.player.unMute();
             // Restore to originalVolume when unmuting, unless fade-out is active
             if (!HealingK.state.isFadingOut) {
                 if (HealingK.state.originalVolume !== undefined) {
                     HealingK.state.player.setVolume(HealingK.state.originalVolume);
                 } else {
                     HealingK.state.player.setVolume(100);
                 }
             } else {
                 // If unmuting during fade, let the fade logic handle volume
                 // The initialFadeVolume for fade logic was set considering originalVolume
             }
          } else {
              // If panel/modal is active, keep it programmatically muted
              HealingK.state.player.mute();
          }
      }
    }
    HealingK.ui.updateBottomNav();
    HealingK.ui.showCenterMuteStatus(HealingK.state.isMuted);
     HealingK.ui.showUI(); // Ensure UI is visible
  },
  togglePlayPause(){
    if(HealingK.state.player?.getPlayerState){
        const pS=HealingK.state.player.getPlayerState();
        if(pS===YT.PlayerState.PLAYING)HealingK.state.player.pauseVideo();
        else if(pS===YT.PlayerState.PAUSED)HealingK.state.player.playVideo();
        else if (pS === YT.PlayerState.ENDED) { // If ended, replay from start
            HealingK.state.player.seekTo(0);
            HealingK.state.player.playVideo();
        } else if (pS === YT.PlayerState.CUED) { // If cued, start playing
            HealingK.state.player.playVideo();
        }
         HealingK.ui.showUI(); // Ensure UI is visible
    }
  },
  toggleBookmark(){
    const cV=HealingK.dataManager.getCurrentVideo();
    if(cV)HealingK.dataManager.toggleBookmark(cV.id);
     HealingK.ui.showUI(); // Ensure UI is visible
  },
   clearAllBookmarks() { // This is the method called by the event listener
       HealingK.dataManager.clearAllBookmarks(); // Delegates to dataManager
   },
  goToBlogPost() {
    // BLOG_POST_URL은 video-data.js에서 로드된다고 가정
    const targetUrl = (typeof BLOG_POST_URL !== 'undefined' && BLOG_POST_URL && BLOG_POST_URL !== "#") ? BLOG_POST_URL : "https://healingk.com";
    window.location.href = targetUrl;
  }
};

function onYouTubeIframeAPIReady(){
    initializeHealingKPlayer();
    requestAnimationFrame(() => HealingK.utils.setScreenSize());
};

function initializeHealingKPlayer(){
    // Ensure YT object and Player constructor are available, and not already initialized
    if(typeof YT !=='undefined' && typeof YT.Player === 'function' && !HealingK.state.isInitialized) {
        HealingK.init(); // Initialize main HealingK object
        // Check for shared video ID in URL parameters
        try { // Add try-catch for URLSearchParams for older browser safety, though unlikely needed
            const urlParams = new URLSearchParams(window.location.search);
            const sharedVideoId = urlParams.get('videoId');
            if (sharedVideoId) {
                HealingK.controller.loadCurrentVideoById(sharedVideoId);
            }
        } catch (e) {
            console.warn("Error parsing URL parameters:", e);
        }
    }
}

// DOMContentLoaded is generally preferred over window.onload for faster script execution
document.addEventListener('DOMContentLoaded',function(){
    // Check if API is already loaded (e.g., if script is added dynamically after API loaded)
    if (typeof YT !== 'undefined' && typeof YT.Player === 'function') {
        initializeHealingKPlayer();
    }
    // Initial screen size setup
    requestAnimationFrame(() => HealingK.utils.setScreenSize());
    // Fallback/repeated calls for dynamic viewport changes or delayed rendering
    setTimeout(() => HealingK.utils.setScreenSize(), 100);
    setTimeout(() => HealingK.utils.setScreenSize(), 500);
});
