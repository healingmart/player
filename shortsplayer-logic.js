// GitHub의 "healingmart/player" 레포지토리 내 "shortsplayer-logic.js" 파일의 내용
// 이 파일은 "video-data.js" 파일이 먼저 로드된 후에 로드되어야 합니다.

const HealingK = {
  state: {
    currentCategoryIndex: 0,
    currentVideoIndex: 0,
    isMuted: true,
    isShuffled: false,
    isRepeated: false,
    isPanelVisible: false,
    panelMode: 'thumbnail',
    player: null,
    isPlayerReady: false,
    bookmarkedVideos: [],
    searchQuery: '',
    searchResults: [],
    searchSort: 'latest',
    isInitialized: false,
    soundEnabled: false,
    uiVisible: true,
    uiTimeout: null,
    panelCloseTimeout: null,
    openedByHover: false,
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
    isDraggingProgressBar: false,
    fadeOutInterval: null // 페이드아웃 타이머 추가
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
      'hk-my-album-controls', 'hk-clear-all-bookmarks', 'hk-nav-play-pause',
      'hk-mouse-trigger-right', 'hk-progress-bar-container', 'hk-progress-bar-fill',
      'hk-progress-bar-tooltip', 'hk-video-placeholder'
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
          if (HealingK.state.isTransitioning && e.key !== 'Escape') return;
          e.preventDefault();
          action();
        }
      });
    }

    document.querySelectorAll('.hk-bottom-nav .hk-nav-btn').forEach(btn => {
      this.utils.addTapListener(btn, (e) => {
        if (this.elements.hkSearchInput) this.elements.hkSearchInput.blur();
        const id = btn.id;
        if (HealingK.state.isTransitioning && !['hk-nav-back-to-blog', 'hk-nav-help', 'hk-nav-share', 'hk-nav-home'].includes(id)) return;
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
      if (query.trim()) this.search.addRecentSearch(query.trim());
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
        setTimeout(() => this.ui.toggleRecentSearches(false), 200);
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
        if (this.elements.hkMyAlbumControls) this.elements.hkMyAlbumControls.style.display = 'none';
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
        if (confirm('MY앨범의 모든 영상을 삭제하시겠습니까?')) this.controller.clearAllBookmarks();
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
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => this.utils.setScreenSize());
  },
  setupMouseHoverEvents() {
    if (this.state.isTouchDevice || !this.elements.hkSidePanel) return;
    const openPanelWithHover = (mode) => {
      if (!this.state.isPanelVisible || this.state.panelMode !== mode) {
        this.state.openedByHover = true;
        this.ui.togglePanel(mode);
      }
      clearTimeout(this.state.panelCloseTimeout);
      this.state.panelCloseTimeout = null;
    };
    const rightTrigger = document.querySelector('.hk-mouse-trigger-right');
    if (rightTrigger) rightTrigger.addEventListener('mouseenter', () => openPanelWithHover('search'));
    this.elements.hkSidePanel.addEventListener('mouseleave', () => {
      if (this.state.isPanelVisible && this.state.openedByHover) {
        this.state.panelCloseTimeout = setTimeout(() => {
          if (this.state.isPanelVisible && this.state.openedByHover) this.ui.togglePanel();
        }, 300);
      }
    });
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
  setupAdvancedDragScroll() {
    const setupDrag = (e) => {
      if (!e) return;
      let t = false, s, o, i = 0, l = 0, n = 0;
      e.onmousedown = d => {
        t = true;
        e.classList.add("dragging");
        s = d.pageY;
        o = e.scrollTop;
        i = 0;
        l = Date.now();
        n = d.pageY;
        d.preventDefault();
      };
      e.onmousemove = d => {
        if (!t) return;
        d.preventDefault();
        const c = Date.now(), r = c - l, a = 1.5 * (s - d.pageY), h = o + a, p = d.pageY - n;
        r > 0 && (i = p / r);
        e.scrollTop = Math.max(0, Math.min(h, e.scrollHeight - e.clientHeight));
        l = c;
        n = d.pageY;
      };
      const u = () => {
        t && (t = false, e.classList.remove("dragging"), Math.abs(i) > 0.1 && this.animateInertiaScroll(e, i));
      };
      e.onmouseup = u;
      e.onmouseleave = u;
      document.onmouseup = u;
    };
    if (!this.state.isTouchDevice && this.elements.hkGridContainer) setupDrag(this.elements.hkGridContainer);
  },
  animateInertiaScroll(e, t) {
    let i = t;
    const s = 0.95, o = 0.1, l = () => {
      i *= s;
      Math.abs(i) < o || (e.scrollTop -= 10 * i, requestAnimationFrame(l));
    };
    requestAnimationFrame(l);
  },
  setupAutoHideUI() {
    const showUI = () => {
      if (HealingK.state.isPanelVisible || HealingK.state.isHelpModalVisible || HealingK.state.isShareModalVisible || HealingK.state.isTransitioning) return;
      if (HealingK.elements.hkCategoryTabs) HealingK.elements.hkCategoryTabs.classList.add("visible");
      if (HealingK.elements.hkIndicator) HealingK.elements.hkIndicator.classList.add("visible");

      HealingK.state.uiVisible = true;
      clearTimeout(HealingK.state.uiTimeout);

      if (HealingK.state.player && HealingK.state.player.getPlayerState() === YT.PlayerState.PLAYING) {
        HealingK.state.uiTimeout = setTimeout(() => HealingK.ui.hideUI(), HealingK.state.uiAutoTimeoutDuration);
      }
    };

    const hideUI = () => {
      if (HealingK.elements.hkCategoryTabs) HealingK.elements.hkCategoryTabs.classList.remove("visible");
      if (HealingK.elements.hkIndicator) HealingK.elements.hkIndicator.classList.remove("visible");

      HealingK.state.uiVisible = false;
      clearTimeout(HealingK.state.uiTimeout);
    };

    HealingK.ui.toggleUI = () => {
      if (HealingK.state.uiVisible) hideUI();
      else showUI();
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
    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
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
      offset
