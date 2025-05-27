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
    isFadingOut: false, // 페이드 아웃 상태 추가
    fadeOutRAF: null, // 페이드 아웃 애니메이션 프레임 ID
    fadeOutDuration: 4 // 페이드 아웃 지속 시간 (초)
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
    this.progressBar.init(); // 진행바 초기화 --- 추가된 부분 ---
    this.fadeOutManager.init(); // 페이드 아웃 초기화 --- 새로 추가 ---
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
        'hk-video-placeholder' /* ★ 추가 */
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
      // 진행바는 항상 표시되므로 여기서 visible 클래스 제어 안 함 --- 수정된 부분 ---
      // if(HealingK.elements.hkProgressBarContainer) HealingK.elements.hkProgressBarContainer.classList.add("visible");


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
      // 진행바는 항상 표시되므로 여기서 visible 클래스 제어 안 함 --- 수정된 부분 ---
      // if(HealingK.elements.hkProgressBarContainer) HealingK.elements.hkProgressBarContainer.classList.remove("visible");

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
  },
  // 페이드 아웃 관리 객체 추가
  fadeOutManager: {
    init() {
      // 페이드 아웃 체크를 위한 인터벌 설정
      setInterval(() => this.checkForFadeOut(), 500);
    },
    
    checkForFadeOut() {
      // 플레이어가 준비되지 않았거나, 패널이 열려 있거나, 모달이 열려 있거나, 음소거 상태면 페이드 아웃 하지 않음
      if (!HealingK.state.player || 
          !HealingK.state.isPlayerReady || 
          HealingK.state.isPanelVisible || 
          HealingK.state.isHelpModalVisible || 
          HealingK.state.isShareModalVisible || 
          HealingK.state.isMuted || 
          !HealingK.state.soundEnabled) {
        return;
      }
      
      // 현재 재생 상태가 재생 중일 때만 체크
      const playerState = HealingK.state.player.getPlayerState();
      if (playerState !== YT.PlayerState.PLAYING) {
        // 재생 중이 아니면 페이드 아웃 중지
        this.stopFadeOut();
        return;
      }
      
      const currentTime = HealingK.state.player.getCurrentTime();
      const duration = HealingK.state.player.getDuration();
      
      // 영상 길이가 유효하고 4초보다 길 때만 페이드 아웃 적용
      if (duration > 0) {
        const timeRemaining = duration - currentTime;
        
        // 남은 시간이 페이드 아웃 기간(4초) 이하이고 아직 페이드 아웃 중이 아니면 페이드 아웃 시작
        if (timeRemaining <= HealingK.state.fadeOutDuration && !HealingK.state.isFadingOut) {
          this.startFadeOut();
        } 
        // 페이드 아웃 중인데 남은 시간이 페이드 아웃 기간보다 길어지면 (사용자가 되감기 등) 페이드 아웃 중지
        else if (timeRemaining > HealingK.state.fadeOutDuration && HealingK.state.isFadingOut) {
          this.stopFadeOut();
          // 원래 볼륨으로 복원
          if (HealingK.state.originalVolume !== undefined) {
            HealingK.state.player.setVolume(HealingK.state.originalVolume);
          }
        }
      }
    },
    
    startFadeOut() {
      const st = HealingK.state;
      if (!st.player || !st.isPlayerReady || st.isFadingOut) return;
      
      // 페이드 아웃 중복 방지
      st.isFadingOut = true;
      
      // 현재 볼륨 저장
      st.fadeOutInitialVolume = st.player.getVolume();
      
      // 페이드 아웃 시작 시간 저장
      st.fadeOutStartTime = Date.now();
      
      // 페이드 아웃 애니메이션 시작
      this._fadeStep();
    },
    
    _fadeStep() {
      const st = HealingK.state;
      if (!st.player || !st.isPlayerReady || !st.isFadingOut) return;
      
      // 현재 시간과 페이드 아웃 시작 시간의 차이 계산
      const elapsedMs = Date.now() - st.fadeOutStartTime;
      const elapsedSec = elapsedMs / 1000;
      
      // 페이드 아웃 진행 비율 계산 (0에서 1 사이)
      const progress = Math.min(elapsedSec / st.fadeOutDuration, 1);
      
      // 볼륨 계산 (초기 볼륨에서 점점 줄어듦)
      const newVolume = Math.max(0, Math.round(st.fadeOutInitialVolume * (1 - progress)));
      
      // 볼륨 설정
      try {
        st.player.setVolume(newVolume);
      } catch (e) {
        console.error('볼륨 설정 중 오류:', e);
      }
      
      // 페이드 아웃이 완료되지 않았으면 다음 프레임 요청
      if (progress < 1) {
        st.fadeOutRAF = requestAnimationFrame(() => this._fadeStep());
      } else {
        // 페이드 아웃 완료
        this.stopFadeOut();
      }
    },
    
    stopFadeOut() {
      const st = HealingK.state;
      st.isFadingOut = false;
      
      if (st.fadeOutRAF) {
        cancelAnimationFrame(st.fadeOutRAF);
        st.fadeOutRAF = null;
      }
    }
  }
};

// --- 진행바 관리 객체 추가 ---
HealingK.progressBar = {
    init() {
        this.setupEventListeners();
        // 초기 툴팁 업데이트 (플레이어 준비 전이므로 기본값 표시)
        this.updateTooltip(0, 0);
    },
    formatTime(totalSeconds) {
        totalSeconds = Math.max(0, totalSeconds); // 음수 방지
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
        HealingK.elements.hkProgressBarTooltip.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(duration)}`;
        if (event && HealingK.elements.hkProgressBarContainer) { // 마우스 이벤트가 있을 때만 위치 조정
            const rect = HealingK.elements.hkProgressBarContainer.getBoundingClientRect();
            let offsetX = event.clientX - rect.left;
            // 툴팁이 진행바 영역을 벗어나지 않도록 위치 제한
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
        percentage = Math.max(0, Math.min(1, percentage)); // 0과 1 사이로 제한

        const seekTime = percentage * duration;
        HealingK.state.player.seekTo(seekTime, true);

        // 진행바 UI 즉시 업데이트
        if (HealingK.elements.hkProgressBarFill) {
            HealingK.elements.hkProgressBarFill.style.width = percentage * 100 + '%';
        }
        // 탐색 후 툴팁 업데이트 (현재 시간으로)
        this.updateTooltip(seekTime, duration);
        
        // 페이드 아웃 관련 처리 - 시크 시 페이드 아웃 상태 체크
        HealingK.fadeOutManager.checkForFadeOut();
    },
    setupEventListeners() {
        const progressBarContainer = HealingK.elements.hkProgressBarContainer;
        if (!progressBarContainer) return;

        let isDragging = false;

        const onPointerDown = (event) => {
            isDragging = true;
            HealingK.state.isDraggingProgressBar = true; // 전역 상태 업데이트
            this.handleSeek(event);
             // 드래그 중에는 영상 일시정지 (선택 사항)
            // if (HealingK.state.player && HealingK.state.player.getPlayerState() === YT.PlayerState.PLAYING) {
            //     HealingK.state.player.pauseVideo();
            // }
        };

        const onPointerMove = (event) => {
            if (!isDragging) { // 드래그 중이 아닐 때는 툴팁만 업데이트
                 if (HealingK.state.player && HealingK.state.isPlayerReady) {
                    const duration = HealingK.state.player.getDuration();
                    if (duration > 0)
