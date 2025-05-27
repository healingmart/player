// GitHub의 "shortsplayer" (또는 video-data.js) 파일의 전체 예상 내용:

const BLOG_POST_URL = "https://healingk.com";
const HELP_MORE_URL = "https://healingk.com/player-help";

const videoData = [
  {
    category: "K-POP",
    videos: [
     { id: "hk-kpop-h2", videoUrl: "esgZFRSB3YU", title: "명상과 휴식을 위한 음악", artist: "Meditation Music", uploadDate: "2023-07-20" },
     { id: "hk-kpop-h3", videoUrl: "X5KmIrCjjLc", title: "스트레스 해소 음악", artist: "Relaxing Sounds", uploadDate: "2023-09-25" },
     { id: "hk-kpop-h4", videoUrl: "Ivjq-fTenTU", title: "수면을 위한 편안한 음악", artist: "Sleep Music", uploadDate: "2023-10-30" },
     { id: "hk-kpop-h5", videoUrl: "eCy_YkOazSU", title: "숲속의 새소리", artist: "Forest Birds", uploadDate: "2023-11-10" }
    ]
  },
  {
    category: "힐링",
    videos: [
      { id: "hk-h1", videoUrl: "eCy_YkOazSU", title: "자연의 소리 - 힐링 음악", artist: "Nature Sounds", uploadDate: "2024-01-15" },
      { id: "hk-h2-2", videoUrl: "esgZFRSB3YU", title: "명상과 휴식을 위한 음악 2", artist: "Meditation Music", uploadDate: "2024-02-20" },
      { id: "hk-h3-2", videoUrl: "X5KmIrCjjLc", title: "스트레스 해소 음악 2", artist: "Relaxing Sounds", uploadDate: "2024-03-25" },
      { id: "hk-h4-2", videoUrl: "Ivjq-fTenTU", title: "수면을 위한 편안한 음악 2", artist: "Sleep Music", uploadDate: "2024-04-30" },
      { id: "hk-h5-2", videoUrl: "eCy_YkOazSU", title: "숲속의 새소리 2", artist: "Forest Birds", uploadDate: "2024-05-10" },
      { id: "hk-h6", videoUrl: "esgZFRSB3YU", title: "바다 파도 소리", artist: "Ocean Waves", uploadDate: "2024-05-20" },
      { id: "hk-h7", videoUrl: "X5KmIrCjjLc", title: "빗소리와 함께하는 휴식", artist: "Rain Sounds", uploadDate: "2024-05-22" },
      { id: "hk-h8", videoUrl: "Ivjq-fTenTU", title: "겨울 힐링 컬렉션", artist: "Winter Healing", uploadDate: "2024-05-24" }
    ]
  },
  {
    category: "ASMR",
    videos: [
      { id: "hk-a1", videoUrl: "esgZFRSB3YU", title: "빗소리 ASMR - 깊은 잠을 위한", artist: "Rain ASMR", uploadDate: "2023-05-10" },
      // ... (ASMR 나머지 영상 데이터)
    ]
  },
  {
    category: "Lo-Fi",
    videos: [
      { id: "hk-l1", videoUrl: "X5KmIrCjjLc", title: "Lo-Fi Hip Hop 24/7 라이브", artist: "Lo-Fi Beats", uploadDate: "2023-04-20" },
      // ... (Lo-Fi 나머지 영상 데이터)
    ]
  }
];

// MY_ALBUM_CATEGORY_INDEX는 videoData 정의 이후에 와야 합니다.
const MY_ALBUM_CATEGORY_INDEX = videoData.length;
