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
    fadeOutStartTime: null, // 페이드 아웃 시작 시간
    fadeOutInitialVolume: null, // 페이드 아웃 시작 시 볼륨
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
      // 초기화 함수
    },
    
    startFadeOut() {
      const st = HealingK.state;
      if (!st.player || !st.isPlayerReady || st.isFadingOut) return;
      
      // 페이드 아웃 중복 방지
      st.isFadingOut = true;
      st.fadeOutStartTime = st.player.getCurrentTime();
      st.fadeOutInitialVolume = st.player.getVolume();
      if (st.fadeOutInitialVolume === 0) st.fadeOutInitialVolume = 1; // 0이면 최소 1에서 시작
      
      this._fadeStep();
    },
    
    _fadeStep() {
      const st = HealingK.state;
      if (!st.isFadingOut || !st.player || !st.isPlayerReady) {
        this.stopFadeOut();
        return;
      }
      
      const now = st.player.getCurrentTime();
      const duration = st.player.getDuration();
      
      if (duration <= 0) {
        this.stopFadeOut();
        return;
      }
      
      // 영상 길이가 페이드 아웃 시간보다 짧을 경우 처리
      if (duration < st.fadeOutDuration) {
        const progress = now / duration; // 0에서 1까지 진행도
        const newVolume = Math.round(st.fadeOutInitialVolume * (1 - progress));
        
        try {
          if (Math.abs(st.player.getVolume() - newVolume) > 1) {
            st.player.setVolume(newVolume);
          }
        } catch (e) {
          // setVolume 오류 무시
        }
        
        st.fadeOutRAF = requestAnimationFrame(() => this._fadeStep());
        return;
      }
      
      const remainingTime = duration - now;
      
      // 남은 시간이 페이드 아웃 기간 이내인 경우
      if (remainingTime <= st.fadeOutDuration) {
        const progress = 1 - (remainingTime / st.fadeOutDuration);
        const newVolume = Math.round(st.fadeOutInitialVolume * (1 - progress));
        
        try {
          if (Math.abs(st.player.getVolume() - newVolume) > 1)
복사
안되는데 모두!!! 이거 말고 다른 코드들도 수정을 해야해??
Mixture-of-Agents

GPT-4.1
답변: 영상 마지막 4초 소리 페이드아웃이 안 되는 이유와 전체 적용 방법

1. 단순히 fadeOutManager만 추가한다고 동작하지 않는 이유
영상이 재생되는 동안 언제 마지막 4초인지를 감지해서 fade out을 시작해야 합니다.
따라서 다음과 같이 여러 곳의 코드 수정이 필요합니다.

필수적으로 수정 또는 추가해야 할 포인트
YouTube 플레이어의 시간 업데이트 이벤트 감지
(progress bar 업데이트와 비슷한 방식)
영상이 끝나기 약 4초 전에 fade out이 시작되어야 함
영상이 일시정지되거나 패널이 열릴 때, 혹은 영상이 바뀔 때
페이드아웃이 중단되어야 함
새 영상 재생 시 볼륨을 원래대로 복구
기존의 player.setVolume, mute/unMute 등과 충돌하지 않도록
페이드아웃 상태를 관리해야 함
2. 추가로 수정해야 할 곳 (핵심 요약)
A. fadeOutManager 호출
HealingK.ui.startProgressBarUpdate의 내부 update 함수에서
매 프레임마다 남은 시간을 확인해
남은 시간이 4초 이하일 때만 fadeOutManager.startFadeOut() 호출
그 외의 시간(처음~중간)에는 fadeOutManager.stopFadeOut() 호출
B. 영상이 바뀔 때, 일시정지될 때, 패널이 열릴 때 등
반드시 fadeOutManager.stopFadeOut() 호출
(onPlayerStateChange 등에서)
C. 볼륨 복구
새로운 영상 시작 시, 또는 패널 닫을 때
볼륨을 HealingK.state.originalVolume로 복구
3. 실제로 필요한 코드 예시
fadeOutManager 전체 코드
CopyHealingK.fadeOutManager = {
  startFadeOut() {
    const st = HealingK.state;
    if (!st.player || !st.isPlayerReady) return;
    if (st.isFadingOut) return;
    st.isFadingOut = true;
    st.fadeOutInitialVolume = st.player.getVolume();
    this._fadeStep();
  },
  _fadeStep() {
    const st = HealingK.state;
    if (!st.player || !st.isPlayerReady || !st.isFadingOut) return;
    const duration = st.player.getDuration();
    const now = st.player.getCurrentTime();
    const remaining = duration - now;
    if (remaining > st.fadeOutDuration || st.player.getPlayerState() !== YT.PlayerState.PLAYING) {
      this.stopFadeOut();
      return;
    }
    // linear fade
    const progress = 1 - (remaining / st.fadeOutDuration);
    const newVolume = Math.round(st.fadeOutInitialVolume * (1 - progress));
    try { st.player.setVolume(Math.max(0, newVolume)); } catch(e){}
    st.fadeOutRAF = requestAnimationFrame(() => this._fadeStep());
  },
  stopFadeOut() {
    const st = HealingK.state;
    if (st.fadeOutRAF) cancelAnimationFrame(st.fadeOutRAF);
    st.isFadingOut = false;
    st.fadeOutRAF = null;
    // 볼륨 복원
    if (st.player && st.isPlayerReady && !st.isMuted && st.soundEnabled && st.originalVolume !== undefined) {
      try { st.player.setVolume(st.originalVolume); } catch(e){}
    }
  }
};
startProgressBarUpdate에 fadeOutManager 연결
CopyHealingK.ui.startProgressBarUpdate = function() {
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
    if (player && player.getPlayerState() === YT.PlayerState.PLAYING) {
      const currentTime = player.getCurrentTime();
      const duration = player.getDuration();

      // 페이드아웃 관리 연결 (중요!)
      if (duration > 0 && (duration - currentTime) <= HealingK.state.fadeOutDuration) {
        HealingK.fadeOutManager.startFadeOut();
      } else {
        HealingK.fadeOutManager.stopFadeOut();
      }

      if (duration > 0) {
        const percentage = (currentTime / duration) * 100;
        HealingK.elements.hkProgressBarFill.style.width = percentage + '%';
      } else {
        HealingK.elements.hkProgressBarFill.style.width = '0%';
      }
      HealingK.state.progressBarRAF = requestAnimationFrame(update);
    } else {
      if (HealingK.state.progressBarRAF) {
        cancelAnimationFrame(HealingK.state.progressBarRAF);
        HealingK.state.progressBarRAF = null;
      }
      HealingK.fadeOutManager.stopFadeOut(); // 재생 중이 아니면 페이드아웃 중단
    }
  }
  HealingK.state.progressBarRAF = requestAnimationFrame(update);
};
onPlayerStateChange 등에서 fadeOutManager.stopFadeOut 추가
예시:

CopyonPlayerStateChange(evt){
  // ... 기존 코드 ...
  switch(playerState){
    case YT.PlayerState.ENDED:
      HealingK.fadeOutManager.stopFadeOut();
      // ... 기존 코드 ...
      break;
    case YT.PlayerState.PAUSED:
      HealingK.fadeOutManager.stopFadeOut();
      // ... 기존 코드 ...
      break;
    // ... 기타 상태도 마찬가지로 적절히 stopFadeOut 호출 ...
  }
}
새 영상 시작 시 볼륨 복구
예를 들어, loadVideo, onPlayerReady 등에서

Copyif (HealingK.state.originalVolume !== undefined) {
  evt.target.setVolume(HealingK.state.originalVolume);
}
4. 결론 및 적용 순서
fadeOutManager 객체를 전체 HealingK 객체에 추가
startProgressBarUpdate에서 페이드아웃 트리거 연결
onPlayerStateChange 등에서 fadeOutManager.stopFadeOut() 호출
새 영상/패널 닫을 때 볼륨 복원 코드 추가
(기존 볼륨 관련 로직과 충돌이 없도록 주의)
5. 전체 파일 교체 예시가 필요하다면
"전체 코드를 새로 달라"고 요청해 주세요.
위의 내용을 전체 통합본으로 다시 만들어 드릴 수 있습니다.

요약 한마디
fadeOutManager만 붙인다고 되는 게 아니라,
progress 업데이트(재생 중)에서 4초 남았을 때마다 fadeOutManager.startFadeOut()을
정확히 호출해줘야 하고, 상태 변화마다 fadeOutManager.stopFadeOut() 도 같이 호출해줘야
제대로 동작합니다!

필요하면 완전 통합 전체코드를 다시 드릴 수 있습니다.
통합본 요청을 원하시면 말씀해 주세요!

claude-4-sonnet

Gemini 2.5 Flash
shortsplayer-logic.js.txt
78.52 KB
블로그파일.txt
31.63 KB
shortsplayer.js
3.63 KB
지금 뮤직 플레이어는 3가지로 분리가 되어 있어! 4초 소리 페이드 아웃이 잘 적용될 수 있도록 각각 적용후 전체 코드를 줘...코드가 길 경우, 각각 이름에 해당 되는 파일 이름대로 나눠서 줘
Mixture-of-Agents

GPT-4.1
claude-4-sonnet

Gemini 2.5 Flash
요청하신 대로 뮤직 플레이어의 영상 마지막 4초 동안 소리만 점진적으로 페이드 아웃되는 기능을 구현했습니다. 이 기능을 위해 shortsplayer-logic.js 파일에 새로운 fadeOutManager 객체를 추가하고, 기존의 플레이어 상태 변경 및 UI 상호작용 로직에 페이드 아웃 관리 기능을 통합했습니다.

주요 변경 사항:

HealingK.state 확장: 페이드 아웃 상태(isFadingOut, fadeOutRAF, fadeOutStartTime, fadeOutInitialVolume, fadeOutDuration)를 추가하여 페이드 아웃 진행 상황을 추적합니다.
HealingK.fadeOutManager 객체 추가:
startFadeOut(): 영상 종료 4초 전부터 페이드 아웃을 시작합니다.
_fadeStep(): requestAnimationFrame을 사용하여 볼륨을 점진적으로 감소시킵니다.
stopFadeOut(): 페이드 아웃을 중지하고 필요에 따라 원래 볼륨으로 복원합니다.
restoreVolume(): 플레이어의 볼륨을 원래 상태로 복원합니다.
HealingK.init(): 플레이어 초기화 시 fadeOutManager를 초기화하도록 추가했습니다.
HealingK.ui.startProgressBarUpdate() 수정: 진행바 업데이트 루프 내에서 현재 재생 시간과 전체 영상 길이를 비교하여 페이드 아웃이 시작될 시점인지 지속적으로 확인하고 fadeOutManager.startFadeOut()을 호출합니다.
HealingK.youtubeManager.onPlayerStateChange() 수정:
PLAYING 상태 진입 시, 페이드 아웃 모니터링을 시작하고 originalVolume을 저장합니다.
ENDED, PAUSED, BUFFERING, CUED 상태 진입 시, 또는 오류 발생 시 fadeOutManager.stopFadeOut()을 호출하여 페이드 아웃을 중지하고 볼륨을 복원합니다.
볼륨 관련 UI/컨트롤러 함수 수정: HealingK.controller.toggleMute(), HealingK.controller.enableSound(), HealingK.ui.togglePanel(), HealingK.ui.toggleHelpModal(), HealingK.ui.toggleShareModal() 등 볼륨이나 플레이어 가시성에 영향을 주는 함수들이 호출될 때 fadeOutManager.stopFadeOut()을 호출하여 페이드 아웃 로직과의 충돌을 방지하고 일관된 볼륨 상태를 유지하도록 했습니다.
HealingK.youtubeManager.loadVideo() 및 initPlayer(): 새 영상 로드 또는 플레이어 재초기화 시 페이드 아웃을 중지하도록 추가했습니다.
아래는 각 파일에 적용된 전체 코드입니다.

shortsplayer-logic.js
Copy// GitHub의 "healingmart/player" 레포지토리 내 "shortsplayer-logic.js" 파일의 내용
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
    isFadingOut: false, // NEW: Flag to indicate if fade out is active
    fadeOutRAF: null, // NEW: requestAnimationFrame ID for fade out
    fadeOutStartTime: null, // NEW: Timestamp when fade out started
    fadeOutInitialVolume: null, // NEW: Volume at the start of fade out
    fadeOutDuration: 4 // NEW: Duration of fade out in seconds
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
      // 초기화 함수
    },
    
    // 페이드 아웃 시작
    startFadeOut() {
      const st = HealingK.state;
      if (!st.player || !st.isPlayerReady || st.isFadingOut || st.isMuted || !st.soundEnabled) {
        // 플레이어가 준비되지 않았거나, 이미 페이드 아웃 중이거나, 음소거 상태이거나, 사운드가 비활성화되어 있으면 시작하지 않음
        return;
      }

      const currentTime = st.player.getCurrentTime();
      const duration = st.player.getDuration();

      // 남은 시간이 페이드 아웃 시간보다 작거나 같고, 영상 길이가 0보다 커야 페이드 아웃 시작
      if (duration - currentTime <= st.fadeOutDuration && duration > 0) {
        st.isFadingOut = true;
        st.fadeOutStartTime = currentTime;
        st.fadeOutInitialVolume = st.player.getVolume();
        // 초기 볼륨이 0이면 계산을 위해 최소 1로 설정 (실제 0이 되지 않도록)
        if (st.fadeOutInitialVolume === 0) st.fadeOutInitialVolume = 1; 
        
        this._fadeStep(); // 애니메이션 루프 시작
      }
    },
    
    // 페이드 아웃 애니메이션 스텝
    _fadeStep() {
      const st = HealingK.state;
      if (!st.isFadingOut || !st.player || !st.isPlayerReady) {
        this.stopFadeOut(); // 조건이 충족되지 않으면 중지
        return;
      }
      
      const currentTime = st.player.getCurrentTime();
      const duration = st.player.getDuration();
      
      if (duration <= 0) {
        this.stopFadeOut();
        return;
      }
      
      const remainingTime = duration - currentTime;
      
      // 남은 시간이 페이드 아웃 기간 이내인 경우
      if (remainingTime <= st.fadeOutDuration && remainingTime >= 0) {
        // 페이드 진행도 계산 (0에서 1까지, 1이 완전히 페이드 아웃된 상태)
        const fadeProgress = 1 - (remainingTime / st.fadeOutDuration);
        let newVolume = Math.round(st.fadeOutInitialVolume * (1 - fadeProgress));
        
        // 볼륨이 0 미만이거나 100 초과하지 않도록 보장
        newVolume = Math.max(0, Math.min(100, newVolume));
        
        try {
          // 불필요한 setVolume 호출을 피하기 위해 볼륨이 충분히 변했을 때만 설정
          if (Math.abs(st.player.getVolume() - newVolume) > 1) { // 1% 이상의 변화만 적용
            st.player.setVolume(newVolume);
          }
        } catch (e) {
          console.warn("Error setting volume during fade out:", e);
          this.stopFadeOut(); // 오류 발생 시 페이드 아웃 중지
          return;
        }
        
        if (newVolume <= 0) {
          this.stopFadeOut(); // 완전히 페이드 아웃되면 중지
        } else {
          st.fadeOutRAF = requestAnimationFrame(() => this._fadeStep());
        }
      } else {
        this.stopFadeOut(); // 페이드 아웃 기간이 지나면 중지
      }
    },
    
    // 페이드 아웃 중지 및 필요 시 볼륨 복원
    stopFadeOut(restoreVolume = true) {
      const st = HealingK.state;
      if (st.fadeOutRAF) {
        cancelAnimationFrame(st.fadeOutRAF);
        st.fadeOutRAF = null;
      }
      if (st.isFadingOut) {
        st.isFadingOut = false;
        if (restoreVolume && st.player && st.isPlayerReady && !st.isMuted && st.soundEnabled) {
          // 음소거 상태가 아니고 사운드가 활성화되어 있으면 원래 볼륨으로 복원
          try {
            const targetVolume = st.originalVolume !== undefined ? st.originalVolume : 100;
            if (st.player.getVolume() !== targetVolume) {
              st.player.setVolume(targetVolume);
            }
          } catch (e) {
            console.warn("Error restoring volume after fade out:", e);
          }
        }
      }
    },

    // 볼륨을 원래 상태로 (또는 100) 복원
    restoreVolume() {
        const st = HealingK.state;
        if (st.player && st.isPlayerReady && !st.isMuted && st.soundEnabled) {
            try {
                const targetVolume = st.originalVolume !== undefined ? st.originalVolume : 100;
                if (st.player.getVolume() !== targetVolume) {
                    st.player.setVolume(targetVolume);
                }
            } catch (e) {
                console.warn("Error restoring volume:", e);
            }
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
    },
    setupEventListeners() {
        const progressBarContainer = HealingK.elements.hkProgressBarContainer;
        if (!progressBarContainer) return;

        let isDragging = false;

        const onPointerDown = (event) => {
            isDragging = true;
            HealingK.state.isDraggingProgressBar = true; // 전역 상태 업데이트
            HealingK.fadeOutManager.stopFadeOut(); // 드래그 시작 시 페이드 아웃 중지
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
                this.handleSeek(event); // 마지막 위치로 최종 탐색
                isDragging = false;
                HealingK.state.isDraggingProgressBar = false; // 전역 상태 업데이트
                 // 드래그 종료 후 영상 다시 재생 (선택 사항)
                // if (HealingK.state.player && HealingK.state.player.getPlayerState() === YT.PlayerState.PAUSED) {
                //     HealingK.state.player.playVideo();
                // }
            }
        };
        
        // PC (Mouse)
        progressBarContainer.addEventListener('mousedown', onPointerDown);
        document.addEventListener('mousemove', onPointerMove); // document에 달아서 바깥으로 드래그해도 인식
        document.addEventListener('mouseup', onPointerUp);     // document에 달아서 바깥에서 놓아도 인식

        // Mobile (Touch)
        progressBarContainer.addEventListener('touchstart', (e) => { e.preventDefault(); onPointerDown(e); }, { passive: false });
        document.addEventListener('touchmove', (e) => { if(isDragging) { e.preventDefault(); onPointerMove(e); } }, { passive: false });
        document.addEventListener('touchend', (e) => { if(isDragging) { e.preventDefault(); onPointerUp(e); } }, { passive: false });


        progressBarContainer.addEventListener('mouseenter', () => {
            if (HealingK.elements.hkProgressBarTooltip && HealingK.state.player && HealingK.state.isPlayerReady) {
                const duration = HealingK.state.player.getDuration();
                 // 마우스 진입 시 툴팁 표시 (내용은 mousemove에서 업데이트)
                 // HealingK.elements.hkProgressBarTooltip.classList.add('visible'); // CSS :hover로 처리
                if (duration > 0) {
                    // 초기 툴팁 내용 설정 (00:00 / 총시간)
                    this.updateTooltip(0, duration);
                }
            }
        });

        progressBarContainer.addEventListener('mouseleave', () => {
            if (HealingK.elements.hkProgressBarTooltip && !isDragging) { // 드래그 중이 아닐 때만 숨김
                // HealingK.elements.hkProgressBarTooltip.classList.remove('visible'); // CSS :hover로 처리
            }
        });
    }
};
// --- 여기까지 진행바 관리 객체 ---


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
};

HealingK.dataManager = {
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
};

HealingK.share = {
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
};


HealingK.ui = {
    renderCategoryTabs() {
        const tabsContainer = HealingK.elements.hkCategoryTabs;
        if(!tabsContainer)return;
        tabsContainer.innerHTML='';
        // videoData와 MY_ALBUM_CATEGORY_INDEX는 video-data.js에서 정의
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
          if (state.player && state.isPlayerReady) {
             state.originalVolume = state.player.getVolume();
             state.player.mute();
          }
          this.hideUI();
          clearTimeout(HealingK.state.uiTimeout);
          HealingK.fadeOutManager.stopFadeOut(); // 패널 오픈 시 페이드 아웃 중지

          if (state.panelMode === 'search') {
              elements.hkPanelTitle.innerHTML='🔍 검색';
              elements.hkSearchElements.style.display='block';
               if (elements.hkMyAlbumControls) elements.hkMyAlbumControls.style.display = 'none';
          } else {
              elements.hkPanelTitle.innerHTML = (state.currentCategoryIndex === MY_ALBUM_CATEGORY_INDEX) ? '❤️ MY앨범' : '📋 재생목록';
              elements.hkSearchElements.style.display='none';
               if (HealingK.elements.hkMyAlbumControls) {
                    this.state.panelMode === 'thumbnail' && state.currentCategoryIndex === MY_ALBUM_CATEGORY_INDEX
                        ? HealingK.elements.hkMyAlbumControls.style.display = 'flex'
                        : HealingK.elements.hkMyAlbumControls.style.display = 'none';
               }
          }
          this.renderActiveGrid();
      } else {
          HealingK.fadeOutManager.stopFadeOut(); // 패널 닫을 때 페이드 아웃 중지 및 볼륨 복원
          if (state.player && state.isPlayerReady && state.soundEnabled && !state.isMuted) {
             state.player.unMute();
             if (state.originalVolume !== undefined) state.player.setVolume(state.originalVolume);
          } else if (state.player && state.isPlayerReady) {
             state.player.mute();
          }
          this.showUI();
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
    if (!HealingK.elements.hkIndicator) return;
    clearTimeout(HealingK.indicatorTimeout);

    const tempIndicatorDiv = document.createElement('div');
    tempIndicatorDiv.textContent = message;
    tempIndicatorDiv.style.padding = '5px 10px';
    tempIndicatorDiv.style.fontWeight = 'normal';

    HealingK.elements.hkIndicator.innerHTML = '';
    HealingK.elements.hkIndicator.appendChild(tempIndicatorDiv);
    HealingK.elements.hkIndicator.classList.add('visible');
    HealingK.elements.hkIndicator.style.pointerEvents = 'none';

    clearTimeout(HealingK.indicatorTimeout);
    HealingK.indicatorTimeout = setTimeout(() => {
        this.updateIndicator();
        if (!HealingK.state.uiVisible) {
            HealingK.elements.hkIndicator.classList.remove('visible');
             HealingK.elements.hkIndicator.style.pointerEvents = 'none';
        } else {
            HealingK.elements.hkIndicator.classList.add('visible');
             HealingK.elements.hkIndicator.style.pointerEvents = 'auto';
        }
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
                       if(icon) icon.className = 'fa fa-pause';
                       isActive = true;
                   } else {
                       if(icon) icon.className = (playerState === YT.PlayerState.PLAYING || playerState === YT.PlayerState.BUFFERING) ? 'fa fa-play' : 'fa fa-pause';
                       isActive = (playerState === YT.PlayerState.PLAYING || playerState === YT.PlayerState.BUFFERING);
                   }
                  break;
              case 'hk-nav-volume':
                  const isSoundOff = HealingK.state.isMuted || !HealingK.state.soundEnabled;
                   if (HealingK.state.isPanelVisible || HealingK.state.isHelpModalVisible || HealingK.state.isShareModalVisible) {
                       if(icon) icon.className = 'fa fa-volume-mute';
                       isActive = true;
                   } else {
                       if(icon) icon.className = isSoundOff ? 'fa fa-volume-mute' : 'fa fa-volume-up';
                       isActive = HealingK.state.isMuted;
                   }
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
                      if(icon) icon.className = 'far fa-bookmark';
                  }
                  break;
              case 'hk-nav-help':
                  isActive = HealingK.state.isHelpModalVisible;
                  break;
              case 'hk-nav-share':
                  isActive = HealingK.state.isShareModalVisible;
                  break;
              case 'hk-nav-home':
                  isActive = false;
                  break;
              case 'hk-nav-back-to-blog':
                  isActive = false;
                  break;
          }
          if (['hk-nav-play-pause', 'hk-nav-volume', 'hk-nav-search', 'hk-nav-bookmark', 'hk-nav-help', 'hk-nav-share'].includes(id)) {
            el.classList.toggle('active', isActive);
          } else {
             el.classList.remove('active');
          }
      });
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
              HealingK.elements.hkLoading.classList.remove('hidden');
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
        if (HealingK.state.player && HealingK.state.isPlayerReady) {
            HealingK.state.originalVolume = HealingK.state.player.getVolume();
            HealingK.state.player.mute();
        }
        this.hideUI();
        clearTimeout(HealingK.state.uiTimeout);
        HealingK.fadeOutManager.stopFadeOut(); // 도움말 모달 오픈 시 페이드 아웃 중지
    } else {
        HealingK.fadeOutManager.stopFadeOut(); // 도움말 모달 닫을 때 페이드 아웃 중지 및 볼륨 복원
        if (HealingK.state.player && HealingK.state.isPlayerReady && HealingK.state.soundEnabled && !HealingK.state.isMuted) {
            HealingK.state.player.unMute();
             if (HealingK.state.originalVolume !== undefined) HealingK.state.player.setVolume(HealingK.state.originalVolume);
        } else if (HealingK.state.player && HealingK.state.isPlayerReady) {
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
    HealingK.elements.body.classList.toggle('modal-open', HealingK.state.isShareModalVisible);

    if (HealingK.state.isShareModalVisible) {
        if (HealingK.state.player && HealingK.state.isPlayerReady) {
            HealingK.state.originalVolume = HealingK.state.player.getVolume();
            HealingK.state.player.mute();
        }
        this.hideUI();
        clearTimeout(HealingK.state.uiTimeout);
        HealingK.fadeOutManager.stopFadeOut(); // 공유 모달 오픈 시 페이드 아웃 중지
    } else {
        HealingK.fadeOutManager.stopFadeOut(); // 공유 모달 닫을 때 페이드 아웃 중지 및 볼륨 복원
        if (HealingK.state.player && HealingK.state.isPlayerReady && HealingK.state.soundEnabled && !HealingK.state.isMuted) {
            HealingK.state.player.unMute();
             if (HealingK.state.originalVolume !== undefined) HealingK.state.player.setVolume(HealingK.state.originalVolume);
        } else if (HealingK.state.player && HealingK.state.isPlayerReady) {
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
  toggleCenterPlayPauseButton(show) {
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
    if (!HealingK.elements.hkProgressBarFill || HealingK.state.isDraggingProgressBar) return; // 드래그 중에는 업데이트 안 함
    if (HealingK.state.progressBarRAF) return;

    function update() {
        // 드래그 중이면 업데이트 중단
        if (HealingK.state.isDraggingProgressBar) {
             if (HealingK.state.progressBarRAF) {
                cancelAnimationFrame(HealingK.state.progressBarRAF);
                HealingK.state.progressBarRAF = null;
             }
            return;
        }

        const player = HealingK.state.player;
        if (player && player.getPlayerState() === YT.PlayerState.PLAYING) {
            const currentTime = player.getCurrentTime();
            const duration = player.getDuration();
            if (duration > 0) {
                const percentage = (currentTime / duration) * 100;
                HealingK.elements.hkProgressBarFill.style.width = percentage + '%';
                // 재생 중 툴팁 업데이트 (현재 시간, 총 시간) - 마우스 호버가 아닐 때도 필요하면 여기서 호출
                // HealingK.progressBar.updateTooltip(currentTime, duration); // 실시간 툴팁 원하면 활성화, 단 마우스 위치 기반은 아님

                // --- 페이드 아웃 체크 ---
                // 영상 길이가 페이드 아웃 지속 시간보다 길고, 남은 시간이 페이드 아웃 지속 시간 이하인 경우
                if (duration > HealingK.state.fadeOutDuration && duration - currentTime <= HealingK.state.fadeOutDuration) {
                    HealingK.fadeOutManager.startFadeOut();
                } else {
                    HealingK.fadeOutManager.stopFadeOut(); // 페이드 아웃 구간을 벗어나면 중지
                }
                // --- 페이드 아웃 체크 끝 ---

            } else {
                HealingK.elements.hkProgressBarFill.style.width = '0%';
            }
            HealingK.state.progressBarRAF = requestAnimationFrame(update);
        } else {
             if (HealingK.state.progressBarRAF) {
                cancelAnimationFrame(HealingK.state.progressBarRAF);
                HealingK.state.progressBarRAF = null;
             }
             HealingK.fadeOutManager.stopFadeOut(); // 플레이어가 재생 중이 아니면 페이드 아웃 중지
        }
    }
    HealingK.state.progressBarRAF = requestAnimationFrame(update);
  },
  stopProgressBarUpdate() {
      if (HealingK.state.progressBarRAF) {
          cancelAnimationFrame(HealingK.state.progressBarRAF);
          HealingK.state.progressBarRAF = null;
      }
      // 드래그 중이 아닐 때만 진행바 상태 업데이트
      if (!HealingK.state.isDraggingProgressBar && HealingK.elements.hkProgressBarFill) {
          const playerState = HealingK.state.player?.getPlayerState();
           if (playerState === YT.PlayerState.ENDED) {
               HealingK.elements.hkProgressBarFill.style.width = '100%';
           } else if (playerState !== YT.PlayerState.PAUSED && playerState !== YT.PlayerState.PLAYING) {
               // Paused나 Playing이 아닐 때 (Buffering, Cued 등)는 0%로.
               // 단, seek 직후에는 paused 상태일 수 있으므로, 이 조건은 seek과 충돌하지 않게 주의.
               // HealingK.elements.hkProgressBarFill.style.width = '0%';
           }
           // PAUSED 상태에서는 현재 위치를 유지해야 하므로 특별히 변경하지 않음.
      }
  }
};

HealingK.youtubeManager = {
  initPlayer(vId, animationDirection = 'none'){ // 기존과 동일
    if(HealingK.state.player) {
        HealingK.fadeOutManager.stopFadeOut(); // 플레이어 파괴 전 페이드 아웃 중지
        HealingK.ui.stopProgressBarUpdate();
        if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '0%';
        HealingK.progressBar.updateTooltip(0,0); // 툴팁 초기화

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

  onPlayerReady(evt, animationDirection){ // 기존과 동일
      HealingK.state.isPlayerReady=true;

      // originalVolume이 정의되지 않았거나 0이면 기본값 100으로 설정
      if (HealingK.state.originalVolume === undefined || HealingK.state.originalVolume === 0) {
          HealingK.state.originalVolume = 100;
      }

      if (HealingK.state.isMuted || !HealingK.state.soundEnabled || HealingK.state.isPanelVisible || HealingK.state.isHelpModalVisible || HealingK.state.isShareModalVisible) {
          evt.target.mute();
      } else {
          evt.target.unMute();
      }
      // 음소거 상태가 아니고 사운드가 활성화되어 있다면 originalVolume으로 볼륨 설정
      if (!HealingK.state.isMuted && HealingK.state.soundEnabled) {
          evt.target.setVolume(HealingK.state.originalVolume);
      } else {
          // 그 외의 경우 (음소거, 사운드 비활성화 등) 볼륨을 0으로 설정하거나 음소거
          evt.target.setVolume(0); 
      }
       
       if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '0%';
       
       const duration = evt.target.getDuration();
       HealingK.progressBar.updateTooltip(0, duration);
  },

  /************ loadVideo : 썸네일 먼저 띄우기 ********************/
  loadVideo(vId,animationDirection='none'){
    HealingK.fadeOutManager.stopFadeOut(); // 새 영상 로드 시 페이드 아웃 중지
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

    /* ★ 1) 플레이스홀더 이미지를 교체하고 보여줌 */
    const ph=HealingK.elements.hkVideoPlaceholder;
    if(ph){
      ph.src=HealingK.utils.getOptimizedThumbnail(vId);
      ph.classList.remove('hidden');
    }

    /* 기존 애니메이션 초기화 ---------------------- */
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

    /* 실제 재생 요청 ------------------------------ */
    if(HealingK.state.player&&HealingK.state.isPlayerReady){
      HealingK.state.player.loadVideoById({
        videoId:vId,
        playerVars:{
          autoplay:1,controls:0,disablekb:1,enablejsapi:1,fs:0,
          iv_load_policy:3,modestbranding:1,rel:0,showinfo:0,
          mute:HealingK.state.isMuted?1:0
        }
      });
      
      // 유튜브 더보기 영상 오버레이 완전 차단을 위한 추가 처리
      const iframe = playerEmbed.querySelector('iframe');
      if (iframe) {
        // iframe의 src 속성에 rel=0 파라미터가 확실히 포함되도록 강제 처리
        let src = iframe.getAttribute('src');
        if (src) {
          // 기존 rel 파라미터 제거 후 rel=0 추가
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

    /* ★ 2) 다음 영상 썸네일 프리로드 */
    this.preloadNextThumbnail();
  },

  /************ onPlayerStateChange : 플레이스홀더 숨김 *************/
  onPlayerStateChange(evt){
    if(!evt.target)return;
    const playerState=evt.data;
    const playerEmbed=HealingK.elements.hkYoutubeEmbed;
    const duration = evt.target.getDuration();

    if (duration > 0 && HealingK.state.player) {
        HealingK.progressBar.updateTooltip(HealingK.state.player.getCurrentTime(), duration);
    }

    // 유튜브 더보기 영상 오버레이 차단을 위한 추가 처리
    const iframe = playerEmbed?.querySelector('iframe');
    if (iframe) {
      // 모든 상태 변화에서 rel=0 파라미터 유지 확인
      let src = iframe.getAttribute('src');
      if (src && !src.includes('rel=0')) {
        src = src.replace(/rel=\d+/g, '');
        src += (src.includes('?') ? '&' : '?') + 'rel=0';
        iframe.setAttribute('src', src);
      }
    }

    switch(playerState){
      case YT.PlayerState.ENDED: // 기존 코드 유지
            HealingK.fadeOutManager.stopFadeOut(false); // 영상 종료 시 페이드 아웃 중지, 볼륨 복원 안 함
            if (!HealingK.state.isTransitioning) {
                 HealingK.ui.showLoading();
            }
            HealingK.ui.stopProgressBarUpdate();
            if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '100%';

            setTimeout(() => {
                HealingK.controller.playNextVideoWithAnimation();
            }, 100);
            break;
      /* ------------------------------------------ */
      case YT.PlayerState.PLAYING:{
        /* ★ 1) 첫 프레임 출력 직후 썸네일 페이드-아웃 - 타이밍 조정 */
        const ph=HealingK.elements.hkVideoPlaceholder;
        if(ph&&!ph.classList.contains('hidden')){
          // 페이드아웃 타이밍 조정 (50ms로 단축)
          setTimeout(()=>ph.classList.add('hidden'),50);
        }
        /* 이후 기존 PLAYING 처리 ------------------- */
         if (HealingK.state.isTransitioning) {
             if (playerEmbed) {
                  // 더 부드러운 easing curve와 타이밍 적용
                  playerEmbed.style.transition = 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease-out';
                  playerEmbed.style.transform = 'translateY(0)';
                  playerEmbed.style.opacity = 1;
                  // 트랜지션 완료 시간 단축 (350ms로 조정)
                  setTimeout(() => {
                      HealingK.state.isTransitioning = false;
                      if (playerEmbed) playerEmbed.style.transition = 'opacity 0.3s ease';
                  }, 350);
             } else {
                  HealingK.state.isTransitioning = false;
             }
         } else {
              if (playerEmbed) {
                  // 일반 상태에서도 부드러운 트랜지션 적용
                  playerEmbed.style.transition = 'opacity 0.3s ease-out';
                  playerEmbed.style.transform = 'translateY(0)';
                  playerEmbed.style.opacity = 1;
              }
         }
        HealingK.ui.hideLoading();
        HealingK.ui.startProgressBarUpdate(); // 여기서 페이드 아웃 체크 로직이 포함됨

        // 플레이어가 음소거 상태가 아니고 사운드가 활성화되어 있다면 originalVolume을 저장
        if (!HealingK.state.isMuted && HealingK.state.soundEnabled) {
            HealingK.state.originalVolume = evt.target.getVolume();
            // 페이드 아웃 중이 아니면 볼륨 복원 (재생 시작 시 볼륨 보장)
            if (!HealingK.state.isFadingOut) {
                HealingK.fadeOutManager.restoreVolume();
            }
        }

        if(HealingK.state.isPanelVisible||HealingK.state.isHelpModalVisible||HealingK.state.isShareModalVisible || !HealingK.state.soundEnabled||HealingK.state.isMuted)evt.target.mute();
        else {
             if (HealingK.state.originalVolume !== undefined) {
                 evt.target.setVolume(HealingK.state.originalVolume);
             } else {
                 evt.target.setVolume(100);
             }
             evt.target.unMute();
        }
        if (HealingK.state.uiVisible) HealingK.ui.showUI();
        break;
      }
      /* ------------------------------------------ */
      case YT.PlayerState.PAUSED: // 기존 코드 유지
            HealingK.fadeOutManager.stopFadeOut(); // 일시정지 시 페이드 아웃 중지 및 볼륨 복원
            HealingK.ui.hideLoading();
            HealingK.ui.stopProgressBarUpdate();
            clearTimeout(HealingK.state.uiTimeout);
            break;
      /* ------------------------------------------ */
      case YT.PlayerState.BUFFERING:{
        HealingK.fadeOutManager.stopFadeOut(); // 버퍼링 시 페이드 아웃 중지 및 볼륨 복원
        /* ★ 버퍼링 중 썸네일 다시 노출해 깜빡임 방지 */
        const ph=HealingK.elements.hkVideoPlaceholder;
        if(ph)ph.classList.remove('hidden');
        HealingK.ui.showLoading();
        HealingK.ui.stopProgressBarUpdate();
        if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '0%';
        clearTimeout(HealingK.state.uiTimeout);
        break;
      }
      /* ------------------------------------------ */
      case YT.PlayerState.CUED: // 기존 코드 유지
             HealingK.fadeOutManager.stopFadeOut(); // CUED 시 페이드 아웃 중지 및 볼륨 복원
             HealingK.ui.showLoading();
             HealingK.ui.stopProgressBarUpdate();
             if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '0%';
            clearTimeout(HealingK.state.uiTimeout);
            break;
      default: // 기존 코드 유지
             HealingK.fadeOutManager.stopFadeOut(); // 기타 상태 변화 시 페이드 아웃 중지 및 볼륨 복원
             HealingK.ui.stopProgressBarUpdate();
             if (HealingK.elements.hkProgressBarFill) HealingK.elements.hkProgressBarFill.style.width = '0%';
            clearTimeout(HealingK.state.uiTimeout);
            break;
    }
    HealingK.ui.updatePlayerUIStates();
  },

  onPlayerError(evt){ // 기존과 동일
      console.error('YT Player Error:',evt.data, 'Video ID:', HealingK.state.player?.getVideoData?.()?.video_id);
      HealingK.fadeOutManager.stopFadeOut(); // 오류 발생 시 페이드 아웃 중지 및 볼륨 복원
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

  /************ 썸네일 프리로드 *****************************/
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
    // videoData는 video-data.js에서 정의
    const totalCategories = videoData.length + 1;
    if (idx < 0 || idx >= totalCategories) return;

    if (idx === MY_ALBUM_CATEGORY_INDEX && HealingK.dataManager.getBookmarkedVideosFullData().length === 0) {
        HealingK.ui.showMessage('MY앨범 목록이 비어있습니다.', 2000);
        return;
    }

    HealingK.state.currentCategoryIndex = idx;
    HealingK.state.currentVideoIndex=0;
    HealingK.ui.renderCategoryTabs();
    this.loadCurrentVideo('none');
    if(HealingK.state.isPanelVisible && HealingK.state.panelMode==='thumbnail')HealingK.ui.renderThumbnailGrid();
    if(HealingK.state.isPanelVisible && HealingK.state.panelMode==='thumbnail' && HealingK.elements.hkPanelTitle) {
        HealingK.elements.hkPanelTitle.innerHTML = (idx === MY_ALBUM_CATEGORY_INDEX) ? '❤️ MY앨범' : '📋 재생목록';
         if (HealingK.elements.hkMyAlbumControls) {
             idx === MY_ALBUM_CATEGORY_INDEX
                 ? HealingK.elements.hkMyAlbumControls.style.display = 'flex'
                 : HealingK.elements.hkMyAlbumControls.style.display = 'none';
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
    if (currentVideo && cat.videos[idx] && currentVideo.id === cat.videos[idx].id) {
         HealingK.state.isTransitioning = false;
         HealingK.ui.hideLoading();
         HealingK.ui.stopProgressBarUpdate();
         HealingK.fadeOutManager.stopFadeOut(); // 동일 영상 클릭 시 페이드 아웃 중지
         if(HealingK.state.isPanelVisible && animationDirection === 'none') {
             HealingK.ui.togglePanel();
         }
         return;
    }
    HealingK.state.currentVideoIndex=idx;
    this.loadCurrentVideo(animationDirection);
    if(HealingK.state.isPanelVisible && animationDirection === 'none') {
        HealingK.ui.togglePanel();
    }
  },
  loadCurrentVideo(animationDirection = 'none'){
    if (animationDirection !== 'none') {
         HealingK.state.isTransitioning = true;
    } else {
         HealingK.state.isTransitioning = false;
    }

    const vid=HealingK.dataManager.getCurrentVideo();
    if(vid){
      HealingK.youtubeManager.loadVideo(vid.videoUrl, animationDirection);
    }else{
      HealingK.ui.hideLoading();
      HealingK.state.isTransitioning = false;
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
    // videoData는 video-data.js에서 정의
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
    // videoData는 video-data.js에서 정의
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
    // videoData는 video-data.js에서 정의
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
  enableSound(){
    HealingK.state.soundEnabled=true;
    HealingK.state.isMuted=false;
    HealingK.fadeOutManager.stopFadeOut(); // 사운드 활성화 시 페이드 아웃 중지 및 볼륨 복원
    if(HealingK.state.player&&HealingK.state.isPlayerReady&&!HealingK.state.isPanelVisible && !HealingK.state.isHelpModalVisible && !HealingK.state.isShareModalVisible){
        HealingK.state.player.unMute();
        if (HealingK.state.originalVolume !== undefined) {
            HealingK.state.player.setVolume(HealingK.state.originalVolume);
        } else {
            HealingK.state.player.setVolume(100);
        }
    }
    if (HealingK.elements.hkSoundToggle) HealingK.elements.hkSoundToggle.classList.add('hidden');
    HealingK.ui.updateBottomNav();
    HealingK.ui.showCenterMuteStatus(false);
     HealingK.ui.showUI();
  },
  toggleMute(){
    if(!HealingK.state.soundEnabled){this.enableSound();return;}
    HealingK.state.isMuted=!HealingK.state.isMuted;
    HealingK.fadeOutManager.stopFadeOut(); // 음소거 전환 시 페이드 아웃 중지
    if(HealingK.state.player&&HealingK.state.isPlayerReady){
      if(HealingK.state.isMuted)HealingK.state.player.mute();
      else {
          if(!HealingK.state.isPanelVisible && !HealingK.state.isHelpModalVisible && !HealingK.state.isShareModalVisible){
             HealingK.state.player.unMute();
             if (HealingK.state.originalVolume !== undefined) {
                 HealingK.state.player.setVolume(HealingK.state.originalVolume);
             } else {
                 HealingK.state.player.setVolume(100);
             }
          } else {
              HealingK.state.player.mute();
          }
      }
    }
    HealingK.ui.updateBottomNav();
    HealingK.ui.showCenterMuteStatus(HealingK.state.isMuted);
     HealingK.ui.showUI();
  },
  togglePlayPause(){
    if(HealingK.state.player?.getPlayerState){
        const pS=HealingK.state.player.getPlayerState();
        if(pS===YT.PlayerState.PLAYING)HealingK.state.player.pauseVideo();
        else if(pS===YT.PlayerState.PAUSED)HealingK.state.player.playVideo(); 
        else if (pS === YT.PlayerState.ENDED) {
            HealingK.state.player.seekTo(0);
            HealingK.state.player.playVideo();
        } else if (pS === YT.PlayerState.CUED) {
            HealingK.state.player.playVideo();
        }
         HealingK.ui.showUI();
    }
  },
  toggleBookmark(){
    const cV=HealingK.dataManager.getCurrentVideo();
    if(cV)HealingK.dataManager.toggleBookmark(cV.id);
     HealingK.ui.showUI();
  },
   clearAllBookmarks() {
       HealingK.dataManager.clearAllBookmarks();
   },
  goToBlogPost() {
    if (BLOG_POST_URL === "https://healingk.com" || !BLOG_POST_URL || BLOG_POST_URL === "#") {
        window.location.href = "https://healingk.com";
    } else {
        window.location.href = BLOG_POST_URL; // BLOG_POST_URL은 video-data.js에서 정의
    }
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
    initializeHealingKPlayer();
    requestAnimationFrame(() => HealingK.utils.setScreenSize());
    setTimeout(() => HealingK.utils.setScreenSize(), 100);
    setTimeout(() => HealingK.utils.setScreenSize(), 500);
});
