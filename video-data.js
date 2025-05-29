// GitHub의 "healingmart/player" 레포지토리 내 "video-data.js" 파일의 내용
// 이 파일은 독립적으로 로드되어 사용됩니다
// 마지막 업데이트: 2024-05-28

(function() {
  // 전역 변수 정의
  window.BLOG_POST_URL = "https://healingk.com";
  window.HELP_MORE_URL = "https://healingk.com/player-help";

  // 기존 데이터 변수 백업 (이미 로드된 경우 대비)
  const oldVideoData = window.videoData || [];
  
  // 비디오 데이터 정의
  window.videoData = [
    {
      category: "K-POP",
      videos: [
        { id: "kpop-1-esgZFRSB3YU", videoUrl: "esgZFRSB3YU", title: "명상과 휴식을 위한 음악", artist: "Meditation Music", uploadDate: "2023-07-20" },
        { id: "kpop-2-X5KmIrCjjLc", videoUrl: "X5KmIrCjjLc", title: "스트레스 해소 음악", artist: "Relaxing Sounds", uploadDate: "2023-09-25" },
        { id: "kpop-3-Ivjq-fTenTU", videoUrl: "Ivjq-fTenTU", title: "수면을 위한 편안한 음악", artist: "Sleep Music", uploadDate: "2023-10-30" },
        { id: "kpop-4-eCy_YkOazSU", videoUrl: "eCy_YkOazSU", title: "숲속의 새소리", artist: "Forest Birds", uploadDate: "2023-11-10" }
      ]
    },
    {
      category: "힐링",
      videos: [
        { id: "healing-1-eCy_YkOazSU", videoUrl: "eCy_YkOazSU", title: "자연의 소리 - 힐링 음악", artist: "Nature Sounds", uploadDate: "2024-01-15" },
        { id: "healing-2-esgZFRSB3YU", videoUrl: "esgZFRSB3YU", title: "명상과 휴식을 위한 음악 2", artist: "Meditation Music", uploadDate: "2024-02-20" },
        { id: "healing-3-X5KmIrCjjLc", videoUrl: "X5KmIrCjjLc", title: "스트레스 해소 음악 2", artist: "Relaxing Sounds", uploadDate: "2024-03-25" },
        { id: "healing-4-Ivjq-fTenTU", videoUrl: "Ivjq-fTenTU", title: "수면을 위한 편안한 음악 2", artist: "Sleep Music", uploadDate: "2024-04-30" },
        { id: "healing-5-eCy_YkOazSU", videoUrl: "eCy_YkOazSU", title: "숲속의 새소리 2", artist: "Forest Birds", uploadDate: "2024-05-10" },
        { id: "healing-6-esgZFRSB3YU-wave", videoUrl: "esgZFRSB3YU", title: "바다 파도 소리", artist: "Ocean Waves", uploadDate: "2024-05-20" },
        { id: "healing-7-X5KmIrCjjLc-rain", videoUrl: "X5KmIrCjjLc", title: "빗소리와 함께하는 휴식", artist: "Rain Sounds", uploadDate: "2024-05-22" },
        { id: "healing-8-Ivjq-fTenTU-winter", videoUrl: "Ivjq-fTenTU", title: "겨울 힐링 컬렉션", artist: "Winter Healing", uploadDate: "2024-05-24" }
      ]
    },
    {
      category: "ASMR",
      videos: [
        { id: "asmr-1-esgZFRSB3YU", videoUrl: "esgZFRSB3YU", title: "빗소리 ASMR - 깊은 잠을 위한", artist: "Rain ASMR", uploadDate: "2023-05-10" },
        { id: "asmr-2-esgZFRSB3YU-meditation", videoUrl: "esgZFRSB3YU", title: "명상과 휴식을 위한 음악 (ASMR)", artist: "Meditation Music", uploadDate: "2023-07-20" },
        { id: "asmr-3-X5KmIrCjjLc-stress", videoUrl: "X5KmIrCjjLc", title: "스트레스 해소 음악 (ASMR)", artist: "Relaxing Sounds", uploadDate: "2023-09-25" },
        { id: "asmr-4-Ivjq-fTenTU-sleep", videoUrl: "Ivjq-fTenTU", title: "수면을 위한 편안한 음악 (ASMR)", artist: "Sleep Music", uploadDate: "2023-10-30" },
        { id: "asmr-5-eCy_YkOazSU-forest", videoUrl: "eCy_YkOazSU", title: "숲속의 새소리 (ASMR)", artist: "Forest Birds", uploadDate: "2023-11-10" }
      ]
    },
    {
      category: "Lullaby",
      videos: [
        { id: "lullaby-1-07eEniTCUW8", videoUrl: "07eEniTCUW8", title: "반짝반짝 작은별", artist: "Dr.Kim(김박사)", uploadDate: "2023-04-20" },
        { id: "lullaby-2-esgZFRSB3YU-meditation", videoUrl: "esgZFRSB3YU", title: "명상과 휴식을 위한 음악 (Lullaby)", artist: "Meditation Music", uploadDate: "2023-07-20" },
        { id: "lullaby-3-X5KmIrCjjLc-stress", videoUrl: "X5KmIrCjjLc", title: "스트레스 해소 음악 (Lullaby)", artist: "Relaxing Sounds", uploadDate: "2023-09-25" },
        { id: "lullaby-4-Ivjq-fTenTU-sleep", videoUrl: "Ivjq-fTenTU", title: "수면을 위한 편안한 음악 (Lullaby)", artist: "Sleep Music", uploadDate: "2023-10-30" },
        { id: "lullaby-5-eCy_YkOazSU-forest", videoUrl: "eCy_YkOazSU", title: "숲속의 새소리 (Lullaby)", artist: "Forest Birds", uploadDate: "2023-11-10" }
      ]
    }
  ];

  // MY_ALBUM_CATEGORY_INDEX는 videoData 정의 이후에 와야 합니다.
  window.MY_ALBUM_CATEGORY_INDEX = window.videoData.length;
  
  // 이미 HealingK 객체가 초기화되어 있다면 데이터 리로드
  if (window.HealingK && typeof window.HealingK.reloadData === 'function' && 
      JSON.stringify(oldVideoData) !== JSON.stringify(window.videoData)) {
    console.log('데이터가 변경되었습니다. 리로드를 시도합니다...');
    setTimeout(() => window.HealingK.reloadData(), 500);
  }
  
  // 데이터 로드 완료 이벤트 발생
  const event = new CustomEvent('videoDataLoaded', { detail: { timestamp: new Date().getTime() }});
  document.dispatchEvent(event);
  console.log('video-data.js 로드 완료:', new Date().toISOString());
})();

console.log("Video data loaded at: " + new Date().toISOString());

