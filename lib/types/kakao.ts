export type KakaoLocalPlace = {
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string; // 경도 (longitude) — parseFloat → location_lng
  y: string; // 위도 (latitude)  — parseFloat → location_lat
  place_url: string;
};

export type KakaoLocalSearchResponse = {
  documents: KakaoLocalPlace[];
  meta: {
    total_count: number;
    pageable_count: number;
    is_end: boolean;
  };
};
