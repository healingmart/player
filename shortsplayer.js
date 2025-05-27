// GitHub의 "shortsplayer.js" 파일 내용

const BLOG_POST_URL = "https://healingk.com";
const HELP_MORE_URL = "https://healingk.com/player-help";

const videoData = [
  {
    category: "K-POP",
    videos: [
     {
       id: "hk-kpop-h2", // 또는 "esgZFRSB3YU" (YouTube ID로 통일 권장)
       videoUrl: "esgZFRSB3YU",
       title: "명상과 휴식을 위한 음악",    // YouTube 영상 제목 (기본 표시용)
       artist: "Meditation Music",       // 대표 아티스트 또는 채널명 (기본 표시용)
       uploadDate: "2023-07-20",
       // --- 상세 정보 추가 ---
       songTitle: "마음의 숲",             // 실제 곡 제목 (예시)
       album: "고요한 사색",                // 앨범명 (예시)
       originalArtist: "",               // 원곡자 (없으면 빈칸 또는 필드 생략)
       releaseYear: "2023",               // 발매 연도 (예시)
       moreInfo: "이 K-POP 트랙은 편안한 명상과 깊은 휴식을 위해 만들어졌습니다. 잔잔한 멜로디를 즐겨보세요." // 추가 설명 (예시)
     },
     {
       id: "hk-kpop-h3", // 또는 "X5KmIrCjjLc"
       videoUrl: "X5KmIrCjjLc",
       title: "스트레스 해소 음악",
       artist: "Relaxing Sounds",
       uploadDate: "2023-09-25",
       // --- 상세 정보 추가 ---
       songTitle: "비 내리는 창가에서",
       album: "감성 테라피",
       originalArtist: "원곡: A Great Big World & Christina Aguilera - Say Something (커버 예시)", // 커버곡일 경우
       releaseYear: "2023",
       moreInfo: "스트레스 받는 날, 이 노래로 위로 받으세요. K-POP의 감성적인 면모를 담았습니다."
     },
     {
       id: "hk-kpop-h4", // 또는 "Ivjq-fTenTU"
       videoUrl: "Ivjq-fTenTU",
       title: "수면을 위한 편안한 음악",
       artist: "Sleep Music",
       uploadDate: "2023-10-30",
       // --- 상세 정보 추가 (일부만 채워도 됩니다) ---
       songTitle: "꿈 속의 멜로디",
       album: "드림캐쳐",
       // originalArtist: "", // 정보 없으면 생략 가능
       releaseYear: "2023",
       moreInfo: "K-POP 발라드로, 편안한 수면을 유도합니다."
     },
     {
       id: "hk-kpop-h5", // 또는 "eCy_YkOazSU"
       videoUrl: "eCy_YkOazSU",
       title: "숲속의 새소리", // 이 영상은 K-POP이 아닐 수 있지만, 테스트를 위해 K-POP 카테고리에 있다고 가정
       artist: "Forest Birds",
       uploadDate: "2023-11-10",
       // --- 상세 정보 추가 ---
       songTitle: "숲의 노래 (K-POP Ver.)", // K-POP 버전이라고 가정
       album: "네이처 사운드 K-POP 에디션",
       originalArtist: "",
       releaseYear: "2023",
       moreInfo: "자연의 소리와 K-POP의 만남! 특별한 힐링을 경험하세요."
     }
    ]
  },
  {
    category: "힐링", // 이 부분부터는 기존 데이터 유지 (필요시 나중에 추가)
    videos: [
      { id: "hk-h1", videoUrl: "eCy_YkOazSU", title: "자연의 소리 - 힐링 음악", artist: "Nature Sounds", uploadDate: "2024-01-15" },
      // ... (힐링 카테고리 나머지 영상들)
    ]
  },
  {
    category: "ASMR",
    videos: [
      // ... (ASMR 카테고리 영상들 - K-POP 카테고리에서 복사된 중복 데이터는 정리하시는 것이 좋습니다)
      // 예: { id: "hk-a1", videoUrl: "esgZFRSB3YU", title: "빗소리 ASMR - 깊은 잠을 위한", artist: "Rain ASMR", uploadDate: "2023-05-10" },
      // 이전에 ASMR 카테고리에 K-POP 영상이 중복으로 들어가 있던 부분은 실제 ASMR 데이터로 채우시거나,
      // 테스트를 위해 K-POP처럼 상세 정보 필드를 추가해보실 수 있습니다.
      // 여기서는 K-POP만 수정했으므로 나머지는 원래대로 두거나, 실제 데이터로 정리하시는 것을 권장합니다.
      // 아래는 ASMR 원래 첫번째 데이터만 남기고 나머지는 K-POP에서 복사된 것으로 보여 정리 필요
       { id: "hk-a1", videoUrl: "esgZFRSB3YU", title: "빗소리 ASMR - 깊은 잠을 위한", artist: "Rain ASMR", uploadDate: "2023-05-10" }
       // { id: "hk-kpop-h2", videoUrl: "esgZFRSB3YU", title: "명상과 휴식을 위한 음악", artist: "Meditation Music", uploadDate: "2023-07-20" }, // 중복 데이터 예시
       // ...
    ]
  },
  {
    category: "Lo-Fi",
    videos: [
      // ... (Lo-Fi 카테고리 영상들 - 위와 동일하게 중복 데이터 정리 필요)
       { id: "hk-l1", videoUrl: "X5KmIrCjjLc", title: "Lo-Fi Hip Hop 24/7 라이브", artist: "Lo-Fi Beats", uploadDate: "2023-04-20" }
       // ...
    ]
  }
];

// MY_ALBUM_CATEGORY_INDEX는 videoData 정의 이후에 와야 합니다.
const MY_ALBUM_CATEGORY_INDEX = videoData.length;
